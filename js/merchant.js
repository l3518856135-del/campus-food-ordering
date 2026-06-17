// ==================== 商家端逻辑（API 版） ====================

let currentFilter = 'all';
let searchKeyword = '';
let refreshTimer = null;
let currentMerchantView = 'orders';

// ==================== 初始化 ====================
async function init() {
  // 检查登录 & 商家权限
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
  const user = getCurrentUser();
  if (user.role !== 'merchant') {
    showToast('需要商家权限', 'error');
    setTimeout(() => { apiLogout(); window.location.href = 'login.html'; }, 1500);
    return;
  }

  // 加载菜单
  await loadMenuFromAPI();

  renderAll();
  bindEvents();
  // 每8秒自动刷新订单
  refreshTimer = setInterval(async () => {
    await renderAll();
    updateRefreshTime();
  }, 8000);
}

function bindEvents() {
  // 视图切换
  document.getElementById('merchantTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.merchant-tab');
    if (!tab) return;
    currentMerchantView = tab.dataset.view;
    document.querySelectorAll('.merchant-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.merchant-view').forEach(v => v.classList.remove('active'));
    if (currentMerchantView === 'orders') {
      document.getElementById('viewOrders').classList.add('active');
      document.getElementById('lastRefresh').style.display = '';
      renderAll();
    } else {
      document.getElementById('viewMenu').classList.add('active');
      document.getElementById('lastRefresh').style.display = 'none';
      if (typeof initMenuManager === 'function') initMenuManager();
    }
  });

  // 筛选标签
  document.getElementById('orderTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.order-tab');
    if (!tab) return;
    currentFilter = tab.dataset.filter;
    document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderOrders();
  });

  // 搜索
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchKeyword = e.target.value.trim().toLowerCase();
    renderOrders();
  });

  // 关闭详情弹窗
  document.getElementById('detailModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('detailModal')) {
      document.getElementById('detailModal').style.display = 'none';
    }
  });

  // 关闭输入弹窗
  document.getElementById('inputModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('inputModal')) {
      document.getElementById('inputModal').style.display = 'none';
    }
  });

  // 退出登录
  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      apiLogout();
      window.location.href = 'login.html';
    });
  }

  // 切换到顾客版
  const switchBtn = document.getElementById('btnSwitchToCustomer');
  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      window.location.href = 'customer.html';
    });
  }
}

// ==================== 渲染全部 ====================
async function renderAll() {
  await renderStats();
  await renderOrders();
  updateFilterCounts();
}

function updateRefreshTime() {
  const now = new Date();
  const time = now.getHours().toString().padStart(2, '0') + ':' +
               now.getMinutes().toString().padStart(2, '0') + ':' +
               now.getSeconds().toString().padStart(2, '0');
  document.getElementById('lastRefresh').textContent = '更新 ' + time;
}

// ==================== 统计面板 ====================
let _cachedOrders = [];

async function renderStats() {
  _cachedOrders = await getOrdersAsync();
  const counts = {
    pending: _cachedOrders.filter(o => o.status === 'pending').length,
    accepted: _cachedOrders.filter(o => o.status === 'accepted').length,
    delivering: _cachedOrders.filter(o => o.status === 'delivering').length,
    completed: _cachedOrders.filter(o => o.status === 'completed').length
  };
  document.getElementById('statPending').textContent = counts.pending;
  document.getElementById('statAccepted').textContent = counts.accepted;
  document.getElementById('statDelivering').textContent = counts.delivering;
  document.getElementById('statCompleted').textContent = counts.completed;
}

function updateFilterCounts() {
  const counts = {
    pending: _cachedOrders.filter(o => o.status === 'pending').length,
    accepted: _cachedOrders.filter(o => o.status === 'accepted').length,
    delivering: _cachedOrders.filter(o => o.status === 'delivering').length,
    completed: _cachedOrders.filter(o => o.status === 'completed').length
  };
  document.getElementById('countPending').textContent = counts.pending > 0 ? `(${counts.pending})` : '';
  document.getElementById('countAccepted').textContent = counts.accepted > 0 ? `(${counts.accepted})` : '';
  document.getElementById('countDelivering').textContent = counts.delivering > 0 ? `(${counts.delivering})` : '';
  document.getElementById('countCompleted').textContent = counts.completed > 0 ? `(${counts.completed})` : '';

  const pendingTab = document.querySelector('[data-filter="pending"]');
  if (counts.pending > 0 && currentFilter !== 'pending') {
    pendingTab.classList.add('new-order-badge');
  } else {
    pendingTab.classList.remove('new-order-badge');
  }
}

// ==================== 订单列表 ====================
async function renderOrders() {
  const container = document.getElementById('orderList');
  let orders = _cachedOrders;

  // 筛选
  if (currentFilter !== 'all') {
    orders = orders.filter(o => o.status === currentFilter);
  }

  // 搜索
  if (searchKeyword) {
    orders = orders.filter(o => {
      const searchStr = [
        o.customer_name, o.customer_phone, o.store, o.area, o.note || '',
        ...(o.items || []).map(i => i.name)
      ].join(' ').toLowerCase();
      return searchStr.includes(searchKeyword);
    });
  }

  if (orders.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">暂无订单</div></div>';
    return;
  }

  container.innerHTML = orders.map(order => renderOrderCard(order)).join('');

  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      handleOrderAction(btn.dataset.orderId, btn.dataset.action);
    });
  });

  container.querySelectorAll('.order-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      showOrderDetail(card.dataset.orderId);
    });
  });
}

function renderOrderCard(order) {
  const statusText = ORDER_STATUS_TEXT[order.status];
  const badgeClass = getStatusBadgeClass(order.status);
  const itemsHtml = (order.items || []).map(item =>
    `<div class="order-card-item">${item.name} x${item.quantity}</div>`
  ).join('');

  const actionButtons = getActionButtons(order);

  return `
    <div class="order-card" data-order-id="${order.id}">
      <div class="order-card-header">
        <span class="order-card-id">#${order.id.slice(-8)}</span>
        <span class="badge ${badgeClass}">${statusText}</span>
      </div>
      <div class="order-detail-store">${order.store}</div>
      <div class="order-detail-area">${order.area}</div>
      <div class="order-card-customer">
        👤 ${order.customer_name} &nbsp; 📱 ${order.customer_phone}
      </div>
      ${order.customer_dorm ? `<div class="order-card-dorm">🏠 ${order.customer_dorm}</div>` : ''}
      ${order.note ? `<div class="order-card-note">📝 ${order.note}</div>` : ''}
      <div class="order-card-items">${itemsHtml}</div>
      <div class="order-card-time">${formatTime(order.created_at)}</div>
      <div class="order-card-actions">${actionButtons}</div>
    </div>
  `;
}

function getActionButtons(order) {
  const buttons = [];
  switch (order.status) {
    case 'pending':
      buttons.push(
        `<button class="btn btn-primary btn-sm" data-action="accept" data-order-id="${order.id}">接单</button>`,
        `<button class="btn btn-danger btn-sm" data-action="cancel" data-order-id="${order.id}">拒单</button>`
      );
      break;
    case 'accepted':
      buttons.push(
        `<button class="btn btn-primary btn-sm" data-action="deliver" data-order-id="${order.id}">开始配送</button>`
      );
      break;
    case 'delivering':
      buttons.push(
        `<button class="btn btn-success btn-sm" data-action="complete" data-order-id="${order.id}">完成配送</button>`
      );
      break;
    case 'completed':
    case 'cancelled':
      buttons.push(
        `<button class="btn btn-outline btn-sm" data-action="delete" data-order-id="${order.id}">删除</button>`
      );
      break;
  }
  return buttons.join('');
}

async function handleOrderAction(orderId, action) {
  try {
    let message = '';
    switch (action) {
      case 'accept':
        await updateOrderStatusAsync(orderId, 'accepted');
        message = '已接单';
        break;
      case 'cancel':
        await updateOrderStatusAsync(orderId, 'cancelled');
        message = '已拒单';
        break;
      case 'deliver':
        await updateOrderStatusAsync(orderId, 'delivering');
        message = '开始配送';
        break;
      case 'complete':
        await updateOrderStatusAsync(orderId, 'completed');
        message = '配送完成';
        break;
      case 'delete':
        if (confirm('确定要删除此订单吗？')) {
          await deleteOrderAsync(orderId);
          message = '订单已删除';
        }
        break;
    }
    await renderAll();
    if (message) showToast(message, 'success');
  } catch(e) {
    showToast('操作失败: ' + e.message, 'error');
  }
}

// ==================== 订单详情 ====================
function showOrderDetail(orderId) {
  const order = _cachedOrders.find(o => o.id === orderId);
  if (!order) return;

  const modal = document.getElementById('detailModal');
  const content = document.getElementById('detailContent');
  const itemsHtml = (order.items || []).map(item =>
    `<div class="order-summary-item"><span>${item.name}</span><span>x${item.quantity}</span></div>`
  ).join('');

  const statusText = ORDER_STATUS_TEXT[order.status];
  const badgeClass = getStatusBadgeClass(order.status);

  content.innerHTML = `
    <div class="order-modal-title">订单详情</div>
    <div style="text-align:center;margin-bottom:12px;">
      <span class="badge ${badgeClass}" style="font-size:13px;">${statusText}</span>
    </div>
    <div style="margin-bottom:10px;">
      <div class="order-detail-store">${order.store}</div>
      <div class="order-detail-area">${order.area}</div>
    </div>
    <div style="font-size:13px;margin-bottom:10px;color:var(--text-light);">
      <div>👤 ${order.customer_name}</div>
      <div>📱 ${order.customer_phone}</div>
      ${order.customer_dorm ? `<div>🏠 ${order.customer_dorm}</div>` : ''}
      ${order.note ? `<div>📝 ${order.note}</div>` : ''}
      <div style="margin-top:4px;">🕐 ${formatTime(order.created_at)}</div>
    </div>
    <div class="order-summary">${itemsHtml}</div>
    <div class="order-card-actions" style="margin-top:12px;justify-content:center;">
      ${getActionButtons(order)}
    </div>
    <button class="btn btn-outline" style="width:100%;margin-top:12px;"
      onclick="document.getElementById('detailModal').style.display='none'">关闭</button>
  `;

  content.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      handleOrderAction(orderId, btn.dataset.action);
      modal.style.display = 'none';
    });
  });

  modal.style.display = 'flex';
}

// ==================== 启动 ====================
document.addEventListener('DOMContentLoaded', init);

window.addEventListener('beforeunload', () => {
  if (refreshTimer) clearInterval(refreshTimer);
});