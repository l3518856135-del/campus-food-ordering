// ==================== 顾客端逻辑（API 版） ====================

let currentArea = AREA_ORDER[0];
let currentStore = null;
let currentCategory = null;
let selectedAddrId = null;
let currentPage = 'stores';

// ==================== 初始化 ====================
async function init() {
  // 检查登录
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  // 商家账号显示切换按钮
  const user = getCurrentUser();
  if (user && user.role === 'merchant') {
    document.getElementById('btnSwitchToMerchant').style.display = '';
  }

  // 从 API 加载菜单
  await loadMenuFromAPI();

  // 加载地址
  const addrs = await getAddressesAsync();
  const defAddr = addrs.find(a => a.is_default);
  if (defAddr) selectedAddrId = defAddr.id;

  renderAreaNav();
  renderStoreList(currentArea);
  updateCartBadge();
  bindEvents();
}

// ==================== 事件绑定 ====================
function bindEvents() {
  // 区域切换
  document.getElementById('areaNav').addEventListener('click', (e) => {
    const tab = e.target.closest('.area-tab');
    if (!tab) return;
    currentArea = tab.dataset.area;
    currentStore = null;
    renderAreaNav();
    renderStoreList(currentArea);
    showPage('stores');
    updateHeader();
  });

  // 返回按钮
  document.getElementById('btnBack').addEventListener('click', () => {
    if (currentStore) {
      currentStore = null;
      currentCategory = null;
      showPage('stores');
      updateHeader();
    }
  });

  // 地址管理入口
  document.getElementById('btnAddrManage').addEventListener('click', async () => {
    currentStore = null;
    showPage('address');
    updateHeader();
    await renderAddressList();
  });

  // ========== 底部导航 ==========
  document.getElementById('bottomNav').addEventListener('click', (e) => {
    const item = e.target.closest('.bottom-nav-item');
    if (!item) return;
    const page = item.dataset.page;
    if (page === 'cart') {
      showCartModal();
    } else if (page === 'orders') {
      showOrdersModal();
    } else if (page === 'address') {
      currentStore = null;
      showPage('address');
      updateHeader();
      renderAddressList();
    } else if (page === 'stores') {
      currentStore = null;
      currentCategory = null;
      showPage('stores');
      updateHeader();
    }
    updateBottomNav(page);
  });

  // 购物车弹窗
  document.getElementById('cartModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('cartModal')) hideCartModal();
  });
  document.getElementById('btnClearCart').addEventListener('click', () => {
    clearCart();
    renderCartModal();
    updateCartBadge();
    showToast('购物车已清空', 'info');
  });
  document.getElementById('btnCheckout').addEventListener('click', () => {
    const cart = getCart();
    if (cart.length === 0) { showToast('购物车是空的', 'info'); return; }
    hideCartModal();
    showOrderModal();
  });

  // 订单弹窗
  document.getElementById('ordersModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('ordersModal')) hideOrdersModal();
  });
  document.getElementById('btnCloseOrders').addEventListener('click', hideOrdersModal);

  // 下单弹窗
  document.getElementById('orderModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('orderModal')) hideOrderModal();
  });
  document.getElementById('btnCancelOrder').addEventListener('click', hideOrderModal);
  document.getElementById('btnSubmitOrder').addEventListener('click', submitOrder);

  // 地址选择器
  document.getElementById('addrPickerModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('addrPickerModal')) hideAddrPicker();
  });
  document.getElementById('btnCloseAddrPicker').addEventListener('click', hideAddrPicker);
  document.getElementById('btnAddAddrInPicker').addEventListener('click', () => showAddrEdit(null));

  // 地址编辑
  document.getElementById('addrEditModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('addrEditModal')) hideAddrEdit();
  });
  document.getElementById('btnCancelAddrEdit').addEventListener('click', hideAddrEdit);
  document.getElementById('btnSaveAddr').addEventListener('click', saveAddrEdit);

  // 退出登录
  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      apiLogout();
      window.location.href = 'login.html';
    });
  }

  // 切换到商家版
  const switchBtn = document.getElementById('btnSwitchToMerchant');
  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      window.location.href = 'merchant.html';
    });
  }
}

// ==================== 底部导航 ====================
function updateBottomNav(page) {
  currentPage = page;
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
}

function updateCartBadge() {
  const total = getCart().reduce((s, i) => s + i.quantity, 0);
  const badge = document.getElementById('bottomCartBadge');
  if (total > 0) {
    badge.style.display = 'flex';
    badge.textContent = total > 99 ? '99+' : total;
  } else {
    badge.style.display = 'none';
  }
}

// ==================== 页面切换 ====================
function showPage(page) {
  document.getElementById('pageStores').classList.toggle('active', page === 'stores');
  document.getElementById('pageMenu').classList.toggle('active', page === 'menu');
  document.getElementById('pageAddress').classList.toggle('active', page === 'address');
  const areaNav = document.getElementById('areaNav');
  areaNav.style.display = (page === 'menu' || page === 'stores') ? 'flex' : 'none';
  if (page === 'address') {
    updateBottomNav('address');
  } else if (page === 'stores') {
    updateBottomNav('stores');
  }
}

function updateHeader() {
  const btnBack = document.getElementById('btnBack');
  const title = document.getElementById('headerTitle');
  if (currentStore) {
    btnBack.style.display = 'block';
    title.textContent = currentStore;
  } else {
    btnBack.style.display = 'none';
    title.textContent = '校园点餐';
  }
}

// ==================== 弹窗控制 ====================
function showCartModal() {
  renderCartModal();
  document.getElementById('cartModal').style.display = 'flex';
}
function hideCartModal() {
  document.getElementById('cartModal').style.display = 'none';
}
async function showOrdersModal() {
  await renderOrdersModal();
  document.getElementById('ordersModal').style.display = 'flex';
}
function hideOrdersModal() {
  document.getElementById('ordersModal').style.display = 'none';
}
async function showOrderModal() {
  await renderOrderModal();
  document.getElementById('orderModal').style.display = 'flex';
}
function hideOrderModal() {
  document.getElementById('orderModal').style.display = 'none';
}
async function showAddrPicker() {
  await renderAddrPicker();
  document.getElementById('addrPickerModal').style.display = 'flex';
}
function hideAddrPicker() {
  document.getElementById('addrPickerModal').style.display = 'none';
}
function hideAddrEdit() {
  document.getElementById('addrEditModal').style.display = 'none';
}

// ==================== 区域导航 ====================
function renderAreaNav() {
  const nav = document.getElementById('areaNav');
  nav.innerHTML = AREA_ORDER.map(area => {
    const active = area === currentArea ? ' active' : '';
    const emoji = getAreaEmoji(area);
    return `<div class="area-tab${active}" data-area="${area}">${emoji} ${area}</div>`;
  }).join('');
}

function getAreaEmoji(area) {
  const map = { '南门': '🚪', '一餐': '🍔', '二餐': '🍜', '西门': '🚪', '水晶城': '🏬' };
  return map[area] || '📍';
}

// ==================== 店铺列表 ====================
function renderStoreList(area) {
  const container = document.getElementById('storeList');
  const menu = getMenuData();
  const areaData = menu[area];
  if (!areaData || !areaData.stores || !Object.keys(areaData.stores).length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-text">暂无店铺</div></div>';
    return;
  }
  const stores = areaData.stores;
  const names = Object.keys(stores);
  const icons = ['🍢','🍗','🥞','🍚','🧋','🥙','🍜','🥔','🍧','🍖','🫓','🍕','🐔','☕','🥟','🍲','🍗'];
  container.innerHTML = names.map((n, i) => `
    <div class="store-card" data-store="${n}">
      <div class="store-icon">${icons[i % icons.length]}</div>
      <div class="store-info">
        <div class="store-name">${n}</div>
        <div class="store-category-count">${Object.keys(stores[n].categories).length} 个分类</div>
      </div>
      <div class="store-arrow">›</div>
    </div>`).join('');
  container.querySelectorAll('.store-card').forEach(card => {
    card.addEventListener('click', () => {
      currentStore = card.dataset.store;
      currentCategory = null;
      renderCategoryNav();
      renderMenuItems();
      showPage('menu');
      updateHeader();
    });
  });
}

// ==================== 分类导航 ====================
function renderCategoryNav() {
  const nav = document.getElementById('categoryNav');
  const menu = getMenuData();
  const cats = Object.keys(menu[currentArea].stores[currentStore].categories);
  if (!currentCategory && cats.length) currentCategory = cats[0];
  nav.innerHTML = cats.map(c => `<div class="category-tab${c === currentCategory ? ' active' : ''}" data-category="${c}">${c}</div>`).join('');
  nav.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentCategory = tab.dataset.category;
      renderCategoryNav();
      renderMenuItems();
    });
  });
}

// ==================== 菜单列表 ====================
function renderMenuItems() {
  const container = document.getElementById('menuItems');
  const menu = getMenuData();
  const cats = menu[currentArea].stores[currentStore].categories;

  function row(item) {
    const name = typeof item === 'object' ? item.name : item;
    const img = typeof item === 'object' ? (item.image || '') : '';
    const imgTag = img ? `<div class="menu-item-img"><img src="${img}" alt="${name}"></div>` : '';
    return `<div class="menu-item"><div class="menu-item-content">${imgTag}<span class="menu-item-name">${name}</span></div><button class="menu-item-add" data-name="${name}">+</button></div>`;
  }

  if (currentCategory && cats[currentCategory]) {
    container.innerHTML = `<div class="menu-category-title">${currentCategory}</div>${cats[currentCategory].map(row).join('')}`;
  } else {
    container.innerHTML = Object.entries(cats).map(([c, items]) => `<div class="menu-category-title">${c}</div>${items.map(row).join('')}`).join('');
  }
  container.querySelectorAll('.menu-item-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart({ name: btn.dataset.name, store: currentStore, area: currentArea });
      updateCartBadge();
      btn.style.transform = 'scale(0.8)';
      setTimeout(() => { btn.style.transform = ''; }, 150);
      showToast(`已添加：${btn.dataset.name}`, 'success');
    });
  });
}

// ==================== 购物车弹窗 ====================
function renderCartModal() {
  const body = document.getElementById('cartBody');
  const cart = getCart();
  if (!cart.length) {
    body.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🛒</div><div>购物车空空如也</div><div style="font-size:12px;margin-top:4px;">快去挑选美食吧~</div></div>';
    return;
  }
  const grouped = {};
  cart.forEach((item, i) => {
    const k = `${item.area} - ${item.store}`;
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push({ ...item, index: i });
  });
  body.innerHTML = Object.entries(grouped).map(([k, items]) => `
    <div style="font-size:12px;color:var(--primary);font-weight:600;margin:8px 0 4px;">${k}</div>
    ${items.map(it => `
      <div class="cart-item">
        <div class="cart-item-info"><div class="cart-item-name">${it.name}</div></div>
        <div class="cart-item-qty">
          <button onclick="changeCartQty(${it.index},-1)">−</button>
          <span>${it.quantity}</span>
          <button onclick="changeCartQty(${it.index},1)">+</button>
        </div>
        <button class="cart-item-delete" onclick="changeCartQty(${it.index},-${it.quantity})">🗑</button>
      </div>`).join('')}
  `).join('');
}

function changeCartQty(index, delta) {
  const cart = getCart();
  updateCartQuantity(index, cart[index].quantity + delta);
  renderCartModal();
  updateCartBadge();
  if (!getCart().length) hideCartModal();
}

// ==================== 订单弹窗 ====================
async function renderOrderModal() {
  const cart = getCart();
  const grouped = {};
  cart.forEach(item => {
    const k = `${item.area} - ${item.store}`;
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(item);
  });
  document.getElementById('orderSummary').innerHTML = Object.entries(grouped).map(([k, items]) => `
    <div style="font-size:11px;color:var(--primary);font-weight:600;margin-top:6px;">${k}</div>
    ${items.map(it => `<div class="order-summary-item"><span>${it.name}</span><span>x${it.quantity}</span></div>`).join('')}
  `).join('');
  await refreshSelectedAddr();
  document.getElementById('orderNote').value = '';
}

async function refreshSelectedAddr() {
  const addrs = await getAddressesAsync();
  const addr = addrs.find(a => a.id === selectedAddrId);
  const ph = document.getElementById('addrPlaceholder');
  const info = document.getElementById('addrSelectInfo');
  if (addr) {
    ph.style.display = 'none'; info.style.display = 'block';
    document.getElementById('addrSelectName').textContent = addr.name;
    document.getElementById('addrSelectPhone').textContent = addr.phone;
    document.getElementById('addrSelectDorm').textContent = addr.dorm;
  } else {
    ph.style.display = 'flex'; info.style.display = 'none';
  }
}

// ==================== 地址选择器 ====================
async function renderAddrPicker() {
  const container = document.getElementById('addrPickerList');
  const addresses = await getAddressesAsync();
  if (!addresses.length) {
    container.innerHTML = '<div class="empty-state" style="padding:20px;"><div class="empty-state-text">还没有收货地址，请添加</div></div>';
    return;
  }
  container.innerHTML = addresses.map(addr => `
    <div class="addr-card ${addr.id === selectedAddrId ? 'selected' : ''}" data-addr-id="${addr.id}" style="margin-bottom:8px;">
      <div class="addr-card-body">
        <div class="addr-card-top">
          <span class="addr-card-name">${addr.name}</span>
          <span class="addr-card-phone">${addr.phone}</span>
          ${addr.is_default ? '<span class="addr-card-tag">默认</span>' : ''}
        </div>
        <div class="addr-card-dorm">${addr.dorm}</div>
      </div>
      <div class="addr-card-actions">
        <button class="btn btn-outline btn-sm addr-edit-btn" data-addr-id="${addr.id}">编辑</button>
        ${addr.id === selectedAddrId ? '<span style="color:var(--success);font-size:20px;">✓</span>' : ''}
      </div>
    </div>`).join('');
  container.querySelectorAll('.addr-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      if (e.target.closest('.addr-edit-btn')) return;
      selectedAddrId = card.dataset.addrId;
      await renderAddrPicker();
      await refreshSelectedAddr();
    });
  });
  container.querySelectorAll('.addr-edit-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const addrs = await getAddressesAsync();
      const addr = addrs.find(a => a.id === btn.dataset.addrId);
      if (addr) showAddrEdit(addr);
    });
  });
}

// ==================== 地址编辑 ====================
function showAddrEdit(addr) {
  const isEdit = !!addr;
  document.getElementById('addrEditTitle').textContent = isEdit ? '编辑收货地址' : '添加收货地址';
  document.getElementById('addrEditId').value = isEdit ? addr.id : '';
  document.getElementById('addrEditName').value = isEdit ? addr.name : '';
  document.getElementById('addrEditPhone').value = isEdit ? addr.phone : '';
  document.getElementById('addrEditDorm').value = isEdit ? addr.dorm : '';
  document.getElementById('addrEditDefault').checked = isEdit ? addr.is_default : false;
  document.getElementById('addrEditModal').style.display = 'flex';
}

async function saveAddrEdit() {
  const id = document.getElementById('addrEditId').value;
  const name = document.getElementById('addrEditName').value.trim();
  const phone = document.getElementById('addrEditPhone').value.trim();
  const dorm = document.getElementById('addrEditDorm').value.trim();
  const isDefault = document.getElementById('addrEditDefault').checked;
  if (!name) { showToast('请输入收货人姓名', 'error'); return; }
  if (!phone) { showToast('请输入联系电话', 'error'); return; }
  if (!dorm) { showToast('请输入宿舍楼/地址', 'error'); return; }

  try {
    if (id) {
      await updateAddressAsync(id, { name, phone, dorm, isDefault });
    } else {
      const res = await addAddressAsync({ name, phone, dorm, isDefault });
      selectedAddrId = res.id;
    }
    hideAddrEdit();
    await refreshSelectedAddr();
    await renderAddrPicker();
    if (document.getElementById('pageAddress').classList.contains('active')) await renderAddressList();
    showToast(id ? '地址已更新' : '地址已添加', 'success');
  } catch(e) {
    showToast(e.message, 'error');
  }
}

// ==================== 地址管理页 ====================
async function renderAddressList() {
  const container = document.getElementById('addressList');
  const addresses = await getAddressesAsync();
  if (!addresses.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📍</div><div class="empty-state-text">还没有收货地址</div><button class="btn btn-primary" style="margin-top:16px;" onclick="showAddrEdit(null)">添加收货地址</button></div>';
    return;
  }
  let html = '';
  addresses.forEach(addr => {
    html += `<div class="addr-manage-card">
      <div class="addr-manage-body">
        <div class="addr-manage-top"><span class="addr-manage-name">${addr.name}</span><span class="addr-manage-phone">${addr.phone}</span>${addr.is_default ? '<span class="addr-card-tag">默认</span>' : ''}</div>
        <div class="addr-manage-dorm">${addr.dorm}</div>
      </div>
      <div class="addr-manage-actions">
        ${!addr.is_default ? `<button class="btn btn-outline btn-sm" onclick="handleSetDefault('${addr.id}')">设为默认</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="showAddrEditById('${addr.id}')">编辑</button>
        <button class="btn btn-outline btn-sm" style="color:var(--danger);" onclick="handleDeleteAddr('${addr.id}')">删除</button>
      </div></div>`;
  });
  html += '<button class="btn btn-primary" style="width:100%;margin-top:12px;" onclick="showAddrEdit(null)">+ 添加新地址</button>';
  container.innerHTML = html;
}

async function showAddrEditById(id) {
  const addrs = await getAddressesAsync();
  const a = addrs.find(x => x.id === id);
  if (a) showAddrEdit(a);
}

async function handleSetDefault(id) {
  await updateAddressAsync(id, { isDefault: true });
  await renderAddressList();
  await refreshSelectedAddr();
  showToast('已设为默认地址', 'success');
}

async function handleDeleteAddr(id) {
  if (!confirm('确定删除这个地址吗？')) return;
  await deleteAddressAsync(id);
  const addrs = await getAddressesAsync();
  if (selectedAddrId === id) selectedAddrId = addrs.length > 0 ? addrs[0].id : null;
  await renderAddressList();
  await refreshSelectedAddr();
  showToast('地址已删除', 'info');
}

// ==================== 订单列表（API） ====================
async function renderOrdersModal() {
  const body = document.getElementById('ordersBody');
  const orders = await getOrdersAsync();
  if (!orders.length) {
    body.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">暂无订单</div></div>';
    return;
  }
  body.innerHTML = orders.map(order => `
    <div class="order-card">
      <div class="order-card-header">
        <span class="order-detail-store">${order.store}</span>
        <span class="badge ${getStatusBadgeClass(order.status)}">${ORDER_STATUS_TEXT[order.status]}</span>
      </div>
      <div class="order-detail-area">${order.area}</div>
      <div class="order-card-items">${(order.items || []).map(it => `<div class="order-card-item">${it.name} x${it.quantity}</div>`).join('')}</div>
      ${order.note ? `<div class="order-card-note">📝 ${order.note}</div>` : ''}
      <div class="order-card-time">${formatTime(order.created_at)}</div>
    </div>`).join('');
}

// ==================== 提交订单 ====================
async function submitOrder() {
  const addrs = await getAddressesAsync();
  const addr = addrs.find(a => a.id === selectedAddrId);
  if (!addr) { showToast('请先选择收货地址', 'error'); return; }
  const note = document.getElementById('orderNote').value.trim();
  const cart = getCart();
  if (!cart.length) { showToast('购物车是空的', 'error'); return; }

  const groups = {};
  cart.forEach(item => {
    const k = `${item.area}|||${item.store}`;
    if (!groups[k]) groups[k] = [];
    groups[k].push({ name: item.name, quantity: item.quantity });
  });

  try {
    for (const [k, items] of Object.entries(groups)) {
      const [area, store] = k.split('|||');
      await addOrderAsync({
        area, store, items,
        customerName: addr.name,
        customerPhone: addr.phone,
        customerDorm: addr.dorm,
        note
      });
    }
    clearCart();
    updateCartBadge();
    hideOrderModal();
    showToast('下单成功！商家已收到订单', 'success');
  } catch(e) {
    showToast('下单失败: ' + e.message, 'error');
  }
}

// ==================== 启动 ====================
document.addEventListener('DOMContentLoaded', init);