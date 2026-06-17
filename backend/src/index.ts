// ==================== 校园点餐 Cloudflare Workers API ====================
// 部署到 Cloudflare Workers，使用 D1 数据库

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  MERCHANT_PHONE: string;
}

// ==================== 工具函数 ====================

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}

function error(msg: string, status = 400): Response {
  return json({ error: msg }, status);
}

// ==================== 密码哈希（SHA-256） ====================

async function hashPassword(password: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + secret);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==================== JWT Token 管理 ====================

async function base64UrlEncode(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function createToken(userId: number, role: string, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { userId, role, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 }; // 7天过期
  const headerB64 = await base64UrlEncode(JSON.stringify(header));
  const payloadB64 = await base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${signingInput}.${sigB64}`;
}

async function verifyToken(token: string, secret: string): Promise<{ userId: number; role: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

function getToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// ==================== 认证中间件 ====================

async function authRequired(request: Request, env: Env): Promise<{ userId: number; role: string } | Response> {
  const token = getToken(request);
  if (!token) return error('请先登录', 401);
  const user = await verifyToken(token, env.JWT_SECRET);
  if (!user) return error('登录已过期，请重新登录', 401);
  return user;
}

async function merchantRequired(request: Request, env: Env): Promise<{ userId: number; role: string } | Response> {
  const auth = await authRequired(request, env);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'merchant') return error('需要商家权限', 403);
  return auth;
}

// ==================== 路由处理 ====================

async function handleAuth(request: Request, env: Env, path: string): Promise<Response> {
  const url = new URL(request.url);

  // POST /api/auth/register - 注册
  if (path === '/api/auth/register' && request.method === 'POST') {
    const { phone, password, name } = await request.json() as { phone: string; password: string; name: string };
    if (!phone || !password) return error('手机号和密码不能为空');
    if (!/^1[3-9]\d{9}$/.test(phone)) return error('手机号格式不正确');
    if (password.length < 6) return error('密码至少6位');

    const existing = await env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).first();
    if (existing) return error('该手机号已注册');

    const role = (phone === env.MERCHANT_PHONE) ? 'merchant' : 'customer';
    const passwordHash = await hashPassword(password, env.JWT_SECRET);
    const result = await env.DB.prepare('INSERT INTO users (phone, password_hash, name, role) VALUES (?, ?, ?, ?)')
      .bind(phone, passwordHash, name || '', role).run();
    const userId = result.meta.last_row_id as number;
    const token = await createToken(userId, role, env.JWT_SECRET);
    return json({ token, userId, role, name: name || '', phone });
  }

  // POST /api/auth/login - 登录
  if (path === '/api/auth/login' && request.method === 'POST') {
    const { phone, password } = await request.json() as { phone: string; password: string };
    if (!phone || !password) return error('手机号和密码不能为空');

    const user = await env.DB.prepare('SELECT * FROM users WHERE phone = ?').bind(phone).first() as Record<string, unknown> | null;
    if (!user) return error('账号不存在，请先注册');

    const passwordHash = await hashPassword(password, env.JWT_SECRET);
    if (user.password_hash !== passwordHash) return error('密码错误');

    const token = await createToken(user.id as number, user.role as string, env.JWT_SECRET);
    return json({ token, userId: user.id, role: user.role, name: user.name, phone: user.phone });
  }

  return error('Not Found', 404);
}

async function handleMenu(request: Request, env: Env, path: string): Promise<Response> {
  // GET /api/menu - 获取菜单（所有人可访问）
  if (path === '/api/menu' && request.method === 'GET') {
    const row = await env.DB.prepare('SELECT data FROM menu_data ORDER BY id DESC LIMIT 1').first() as { data: string } | null;
    return json({ menu: row ? JSON.parse(row.data) : null });
  }

  // POST /api/menu - 保存菜单（商家）
  if (path === '/api/menu' && request.method === 'POST') {
    const auth = await merchantRequired(request, env);
    if (auth instanceof Response) return auth;
    const { data } = await request.json() as { data: unknown };
    if (!data) return error('菜单数据不能为空');
    await env.DB.prepare('INSERT INTO menu_data (data) VALUES (?)').bind(JSON.stringify(data)).run();
    return json({ success: true });
  }

  return error('Not Found', 404);
}

async function handleOrders(request: Request, env: Env, path: string): Promise<Response> {
  const url = new URL(request.url);

  // GET /api/orders - 获取订单列表
  if (path === '/api/orders' && request.method === 'GET') {
    const auth = await authRequired(request, env);
    if (auth instanceof Response) return auth;

    let query: string;
    let params: unknown[];
    if (auth.role === 'merchant') {
      query = 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 200';
      params = [];
    } else {
      query = 'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50';
      params = [auth.userId];
    }
    const result = await env.DB.prepare(query).bind(...params).all();
    const orders = (result.results as Record<string, unknown>[]).map(o => ({
      ...o,
      items: JSON.parse(o.items as string),
    }));
    return json({ orders });
  }

  // POST /api/orders - 创建订单
  if (path === '/api/orders' && request.method === 'POST') {
    const auth = await authRequired(request, env);
    if (auth instanceof Response) return auth;
    const body = await request.json() as {
      area: string; store: string; items: unknown[]; customerName: string;
      customerPhone: string; customerDorm: string; note: string;
    };
    if (!body.area || !body.store || !body.items || !body.items.length) return error('订单信息不完整');
    const orderId = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 6);
    await env.DB.prepare(
      'INSERT INTO orders (id, customer_id, customer_name, customer_phone, customer_dorm, area, store, items, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(orderId, auth.userId, body.customerName, body.customerPhone, body.customerDorm || '', body.area, body.store, JSON.stringify(body.items), 'pending', body.note || '').run();
    return json({ success: true, orderId });
  }

  // PUT /api/orders/:id/status - 更新订单状态（商家）
  const statusMatch = path.match(/^\/api\/orders\/(.+)\/status$/);
  if (statusMatch && request.method === 'PUT') {
    const auth = await merchantRequired(request, env);
    if (auth instanceof Response) return auth;
    const orderId = statusMatch[1];
    const { status } = await request.json() as { status: string };
    const validStatuses = ['pending', 'accepted', 'delivering', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return error('无效的状态');
    await env.DB.prepare('UPDATE orders SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(status, orderId).run();
    return json({ success: true });
  }

  // DELETE /api/orders/:id - 删除订单
  const deleteMatch = path.match(/^\/api\/orders\/(.+)$/);
  if (deleteMatch && request.method === 'DELETE') {
    const auth = await authRequired(request, env);
    if (auth instanceof Response) return auth;
    const orderId = deleteMatch[1];
    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first() as Record<string, unknown> | null;
    if (!order) return error('订单不存在');
    if (auth.role !== 'merchant' && order.customer_id !== auth.userId) return error('无权操作', 403);
    await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(orderId).run();
    return json({ success: true });
  }

  return error('Not Found', 404);
}

async function handleAddresses(request: Request, env: Env, path: string): Promise<Response> {
  const url = new URL(request.url);

  // GET /api/addresses
  if (path === '/api/addresses' && request.method === 'GET') {
    const auth = await authRequired(request, env);
    if (auth instanceof Response) return auth;
    const result = await env.DB.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC').bind(auth.userId).all();
    return json({ addresses: result.results });
  }

  // POST /api/addresses
  if (path === '/api/addresses' && request.method === 'POST') {
    const auth = await authRequired(request, env);
    if (auth instanceof Response) return auth;
    const body = await request.json() as { name: string; phone: string; dorm: string; isDefault: boolean };
    if (!body.name || !body.phone || !body.dorm) return error('地址信息不完整');
    const id = 'addr_' + Date.now();
    if (body.isDefault) {
      await env.DB.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').bind(auth.userId).run();
    }
    await env.DB.prepare('INSERT INTO addresses (id, user_id, name, phone, dorm, is_default) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, auth.userId, body.name, body.phone, body.dorm, body.isDefault ? 1 : 0).run();
    return json({ success: true, id });
  }

  // PUT /api/addresses/:id
  const putMatch = path.match(/^\/api\/addresses\/(.+)$/);
  if (putMatch && request.method === 'PUT') {
    const auth = await authRequired(request, env);
    if (auth instanceof Response) return auth;
    const addrId = putMatch[1];
    const body = await request.json() as { name: string; phone: string; dorm: string; isDefault: boolean };
    if (body.isDefault) {
      await env.DB.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').bind(auth.userId).run();
    }
    await env.DB.prepare('UPDATE addresses SET name = ?, phone = ?, dorm = ?, is_default = ? WHERE id = ? AND user_id = ?')
      .bind(body.name, body.phone, body.dorm, body.isDefault ? 1 : 0, addrId, auth.userId).run();
    return json({ success: true });
  }

  // DELETE /api/addresses/:id
  if (putMatch && request.method === 'DELETE') {
    const auth = await authRequired(request, env);
    if (auth instanceof Response) return auth;
    const addrId = putMatch[1];
    await env.DB.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').bind(addrId, auth.userId).run();
    return json({ success: true });
  }

  return error('Not Found', 404);
}

// ==================== 主入口 ====================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 路由分发
      if (path.startsWith('/api/auth/')) return handleAuth(request, env, path);
      if (path === '/api/menu') return handleMenu(request, env, path);
      if (path.startsWith('/api/orders')) return handleOrders(request, env, path);
      if (path.startsWith('/api/addresses')) return handleAddresses(request, env, path);

      return error('Not Found', 404);
    } catch (e) {
      console.error(e);
      return error('服务器内部错误', 500);
    }
  },
};