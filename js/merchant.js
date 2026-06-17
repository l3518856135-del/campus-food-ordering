// ==================== 商家端逻辑 ====================

let currentFilter = 'all';
let searchKeyword = '';
let refreshTimer = null;
let currentMerchantView = 'orders';

// ==================== 初始化 ====================
function init() {
  renderAll();
  bindEvents();
  // 每5秒自动刷新
  refreshTimer = setInterval(() => {
    renderAll();
    updateRefreshTime();
  }, 5000);
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
}

// ==================== 渲染全部 ====================
function renderAll() {
  renderStats();
  renderOrders();
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
function renderStats() {
  const orders = getOrders();
  const counts = {
    pending: orders.filter(o => o.status === 'pending').length,
    accepted: orders.filter(o => o.status === 'accepted').length,
    delivering: orders.filter(o => o.status === 'delivering').length,
    completed: orders.filter(o => o.status === 'completed').length
  };

  document.getElementById('statPending').textContent = counts.pending;
  document.getElementById('statAccepted').textContent = counts.accepted;
  document.getElementById('statDelivering').textContent = counts.delivering;
  document.getElementById('statCompleted').textContent = counts.completed;
}

function updateFilterCounts() {
  const orders = getOrders();
  const counts = {
    pending: orders.filter(o => o.status === 'pending').length,
    accepted: orders.filter(o => o.status === 'accepted').length,
    delivering: orders.filter(o => o.status === 'delivering').length,
    completed: orders.filter(o => o.status === 'completed').length
  };

  const elPending = document.getElementById('countPending');
  const elAccepted = document.getElementById('countAccepted');
  const elDelivering = document.getElementById('countDelivering');
  const elCompleted = document.getElementById('countCompleted');

  elPending.textContent = counts.pending > 0 ? `(${counts.pending})` : '';
  elAccepted.textContent = counts.accepted > 0 ? `(${counts.accepted})` : '';
  elDelivering.textContent = counts.delivering > 0 ? `(${counts.delivering})` : '';
  elCompleted.textContent = counts.completed > 0 ? `(${counts.completed})` : '';

  // 待接单标签闪烁
  const pendingTab = document.querySelector('[data-filter="pending"]');
  if (counts.pending > 0 && currentFilter !== 'pending') {
    pendingTab.classList.add('new-order-badge');
  } else {
    pendingTab.classList.remove('new-order-badge');
  }
}

// ==================== 订单列表 ====================
function renderOrders() {
  const container = document.getElementById('orderList');
  let orders = getOrders();

  // 筛选
  if (currentFilter !== 'all') {
    orders = orders.filter(o => o.status === currentFilter);
  }

  // 搜索
  if (searchKeyword) {
    orders = orders.filter(o => {
      const searchStr = [
        o.customerName,
        o.customerPhone,
        o.store,
        o.area,
        o.note || '',
        ...(o.items || []).map(i => i.name)
      ].join(' ').toLowerCase();
      return searchStr.includes(searchKeyword);
    });
  }

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">暂无订单</div>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => renderOrderCard(order)).join('');

  // 绑定操作按钮
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.dataset.orderId;
      const action = btn.dataset.action;
      handleOrderAction(orderId, action);
    });
  });

  // 绑定查看详情
  container.querySelectorAll('.order-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // 不拦截按钮点击
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
        👤 ${order.customerName} &nbsp; 📱 ${order.customerPhone}
      </div>
      ${order.customerDorm ? `<div class="order-card-dorm">🏠 ${order.customerDorm}</div>` : ''}
      ${order.note ? `<div class="order-card-note">📝 ${order.note}</div>` : ''}
      <div class="order-card-items">${itemsHtml}</div>
      <div class="order-card-time">${formatTime(order.createdAt)}</div>
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

function handleOrderAction(orderId, action) {
  const order = getOrders().find(o => o.id === orderId);
  if (!order) return;

  let message = '';
  switch (action) {
    case 'accept':
      updateOrderStatus(orderId, ORDER_STATUS.ACCEPTED);
      message = `已接单：${order.store} - ${order.customerName}`;
      break;
    case 'cancel':
      updateOrderStatus(orderId, ORDER_STATUS.CANCELLED);
      message = `已拒单：${order.store} - ${order.customerName}`;
      break;
    case 'deliver':
      updateOrderStatus(orderId, ORDER_STATUS.DELIVERING);
      message = `开始配送：${order.store} - ${order.customerName}`;
      break;
    case 'complete':
      updateOrderStatus(orderId, ORDER_STATUS.COMPLETED);
      message = `配送完成：${order.store} - ${order.customerName}`;
      break;
    case 'delete':
      if (confirm('确定要删除此订单吗？')) {
        const orders = getOrders();
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx > -1) {
          orders.splice(idx, 1);
          saveOrders(orders);
          message = '订单已删除';
        }
      }
      break;
  }

  renderAll();
  if (message) showToast(message, 'success');
}

// ==================== 订单详情 ====================
function showOrderDetail(orderId) {
  const order = getOrders().find(o => o.id === orderId);
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
      <div>👤 ${order.customerName}</div>
      <div>📱 ${order.customerPhone}</div>
      ${order.customerDorm ? `<div>🏠 ${order.customerDorm}</div>` : ''}
      ${order.note ? `<div>📝 ${order.note}</div>` : ''}
      <div style="margin-top:4px;">🕐 ${formatTime(order.createdAt)}</div>
    </div>
    <div class="order-summary">${itemsHtml}</div>
    <div class="order-card-actions" style="margin-top:12px;justify-content:center;">
      ${getActionButtons(order)}
    </div>
    <button class="btn btn-outline" style="width:100%;margin-top:12px;"
      onclick="document.getElementById('detailModal').style.display='none'">关闭</button>
  `;

  // 绑定详情中的操作按钮
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

// 页面关闭时清理定时器
window.addEventListener('beforeunload', () => {
  if (refreshTimer) clearInterval(refreshTimer);
});