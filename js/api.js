// ==================== API 客户端 ====================
// 所有 API 请求统一通过此模块发送到 Cloudflare Workers

const API_BASE = ''; // 相对路径 = 与前端同域名的 Pages Functions，国内可正常访问

// ==================== Token 管理 ====================

function getToken() {
  return localStorage.getItem('campus_token');
}

function setToken(token) {
  localStorage.setItem('campus_token', token);
}

function clearToken() {
  localStorage.removeItem('campus_token');
  localStorage.removeItem('campus_user');
}

function getCurrentUser() {
  const data = localStorage.getItem('campus_user');
  return data ? JSON.parse(data) : null;
}

function setCurrentUser(user) {
  localStorage.setItem('campus_user', JSON.stringify(user));
}

function isLoggedIn() {
  return !!getToken();
}

// ==================== 通用请求方法 ====================

async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      // 未登录，跳转到登录页
      if (window.location.pathname.indexOf('login.html') === -1) {
        window.location.href = 'login.html';
      }
    }
    throw new Error(data.error || '请求失败');
  }

  return data;
}

// ==================== 认证 API ====================

async function apiRegister(phone, password, name) {
  const res = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ phone, password, name }),
  });
  setToken(res.token);
  setCurrentUser({ userId: res.userId, role: res.role, name: res.name || '', phone: res.phone });
  return res;
}

async function apiLogin(phone, password) {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
  setToken(res.token);
  setCurrentUser({ userId: res.userId, role: res.role, name: res.name || '', phone: res.phone });
  return res;
}

function apiLogout() {
  clearToken();
}

// ==================== 菜单 API ====================

async function apiGetMenu() {
  const res = await api('/api/menu');
  return res.menu;
}

async function apiSaveMenu(menuData) {
  return api('/api/menu', {
    method: 'POST',
    body: JSON.stringify({ data: menuData }),
  });
}

// ==================== 订单 API ====================

async function apiGetOrders() {
  const res = await api('/api/orders');
  return res.orders;
}

async function apiCreateOrder(order) {
  return api('/api/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  });
}

async function apiUpdateOrderStatus(orderId, status) {
  return api(`/api/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

async function apiDeleteOrder(orderId) {
  return api(`/api/orders/${orderId}`, {
    method: 'DELETE',
  });
}

// ==================== 地址 API ====================

async function apiGetAddresses() {
  const res = await api('/api/addresses');
  return res.addresses;
}

async function apiAddAddress(addr) {
  return api('/api/addresses', {
    method: 'POST',
    body: JSON.stringify(addr),
  });
}

async function apiUpdateAddress(addrId, addr) {
  return api(`/api/addresses/${addrId}`, {
    method: 'PUT',
    body: JSON.stringify(addr),
  });
}

async function apiDeleteAddress(addrId) {
  return api(`/api/addresses/${addrId}`, {
    method: 'DELETE',
  });
}

// ==================== 图片上传 API ====================

async function apiUploadImage(file) {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '上传失败');
  return data.url;
}