// ==================== 顾客端逻辑 ====================

// 当前状态
let currentArea = AREA_ORDER[0];
let currentStore = null;
let currentCategory = null;
let selectedAddrId = null; // 当前选中地址ID

// ==================== 初始化 ====================
function init() {
  renderAreaNav();
  renderStoreList(currentArea);
  updateCartBar();
  bindEvents();
  // 默认选中默认地址
  const defAddr = getDefaultAddress();
  if (defAddr) selectedAddrId = defAddr.id;
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
  document.getElementById('btnAddrManage').addEventListener('click', () => {
    currentStore = null;
    currentCategory = null;
    showPage('address');
    updateHeader();
    renderAddressList();
  });

  // 购物车点击
  document.getElementById('cartBarInfo').addEventListener('click', () => {
    renderCartModal();
    document.getElementById('cartModal').style.display = 'flex';
  });

  // 关闭购物车弹窗
  document.getElementById('cartModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('cartModal')) {
      document.getElementById('cartModal').style.display = 'none';
    }
  });

  // 清空购物车
  document.getElementById('btnClearCart').addEventListener('click', () => {
    clearCart();
    renderCartModal();
    updateCartBar();
    showToast('购物车已清空', 'info');
  });

  // 去下单
  document.getElementById('btnCheckout').addEventListener('click', () => {
    const cart = getCart();
    if (cart.length === 0) {
      showToast('购物车是空的，请先添加商品', 'info');
      return;
    }
    document.getElementById('cartModal').style.display = 'none';
    renderOrderModal();
    document.getElementById('orderModal').style.display = 'flex';
  });

  // 关闭订单弹窗
  document.getElementById('orderModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('orderModal')) {
      document.getElementById('orderModal').style.display = 'none';
    }
  });
  document.getElementById('btnCancelOrder').addEventListener('click', () => {
    document.getElementById('orderModal').style.display = 'none';
  });

  // 提交订单
  document.getElementById('btnSubmitOrder').addEventListener('click', submitOrder);

  // 关闭地址选择器
  document.getElementById('btnCloseAddrPicker').addEventListener('click', () => {
    document.getElementById('addrPickerModal').style.display = 'none';
  });
  document.getElementById('addrPickerModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('addrPickerModal')) {
      document.getElementById('addrPickerModal').style.display = 'none';
    }
  });

  // 地址选择器中添加新地址
  document.getElementById('btnAddAddrInPicker').addEventListener('click', () => {
    showAddrEdit(null);
  });

  // 关闭地址编辑弹窗
  document.getElementById('btnCancelAddrEdit').addEventListener('click', () => {
    document.getElementById('addrEditModal').style.display = 'none';
  });
  document.getElementById('addrEditModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('addrEditModal')) {
      document.getElementById('addrEditModal').style.display = 'none';
    }
  });

  // 保存地址
  document.getElementById('btnSaveAddr').addEventListener('click', saveAddrEdit);
}

// ==================== 页面切换 ====================
function showPage(page) {
  document.getElementById('pageStores').classList.toggle('active', page === 'stores');
  document.getElementById('pageMenu').classList.toggle('active', page === 'menu');
  document.getElementById('pageAddress').classList.toggle('active', page === 'address');
  document.getElementById('areaNav').style.display = (page === 'menu') ? 'none' : 'flex';
  // 地址管理页隐藏区域导航
  if (page === 'address') {
    document.getElementById('areaNav').style.display = 'none';
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
  if (!areaData || !areaData.stores || Object.keys(areaData.stores).length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-text">暂无店铺</div></div>';
    return;
  }

  const stores = areaData.stores;
  const storeNames = Object.keys(stores);
  const storeIcons = ['🍢', '🍗', '🥞', '🍚', '🧋', '🥙', '🍜', '🥔', '🍧', '🍖', '🫓', '🍕', '🐔', '☕', '🥟', '🍲', '🍗'];

  container.innerHTML = storeNames.map((name, i) => {
    const catCount = Object.keys(stores[name].categories).length;
    const icon = storeIcons[i % storeIcons.length];
    return `
      <div class="store-card" data-store="${name}">
        <div class="store-icon">${icon}</div>
        <div class="store-info">
          <div class="store-name">${name}</div>
          <div class="store-category-count">${catCount} 个分类</div>
        </div>
        <div class="store-arrow">›</div>
      </div>
    `;
  }).join('');

  // 绑定店铺点击
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
  const categories = Object.keys(menu[currentArea].stores[currentStore].categories);

  if (!currentCategory && categories.length > 0) {
    currentCategory = categories[0];
  }

  nav.innerHTML = categories.map(cat => {
    const active = cat === currentCategory ? ' active' : '';
    return `<div class="category-tab${active}" data-category="${cat}">${cat}</div>`;
  }).join('');

  // 绑定分类点击
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
  const categories = menu[currentArea].stores[currentStore].categories;

  function renderItemRow(item) {
    const itemName = typeof item === 'object' ? item.name : item;
    const itemImage = typeof item === 'object' ? (item.image || '') : '';
    const catName = currentCategory || '';

    const imgTag = itemImage
      ? `<div class="menu-item-img"><img src="${itemImage}" alt="${itemName}"></div>`
      : '';

    return `
      <div class="menu-item">
        <div class="menu-item-content">
          ${imgTag}
          <span class="menu-item-name">${itemName}</span>
        </div>
        <button class="menu-item-add" data-name="${itemName}" data-category="${catName}">+</button>
      </div>
    `;
  }

  if (currentCategory && categories[currentCategory]) {
    const items = categories[currentCategory];
    container.innerHTML = `
      <div class="menu-category-title">${currentCategory}</div>
      ${items.map(item => renderItemRow(item)).join('')}
    `;
  } else {
    container.innerHTML = Object.entries(categories).map(([cat, items]) => `
      <div class="menu-category-title">${cat}</div>
      ${items.map(item => renderItemRow(item)).join('')}
    `).join('');
  }

  container.querySelectorAll('.menu-item-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.name;
      addToCart({ name: name, store: currentStore, area: currentArea });
      updateCartBar();
      btn.style.transform = 'scale(0.8)';
      setTimeout(() => { btn.style.transform = ''; }, 150);
      showToast(`已添加：${name}`, 'success');
    });
  });
}

// ==================== 购物车相关 ====================
function updateCartBar() {
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cartBadge');
  const totalEl = document.getElementById('cartTotal');

  totalEl.textContent = total;
  if (total > 0) {
    badge.style.display = 'flex';
    badge.textContent = total > 99 ? '99+' : total;
  } else {
    badge.style.display = 'none';
  }
}

function renderCartModal() {
  const body = document.getElementById('cartBody');
  const cart = getCart();

  if (cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <div>购物车空空如也</div>
        <div style="font-size:12px;margin-top:4px;">快去挑选美食吧~</div>
      </div>`;
    return;
  }

  const grouped = {};
  cart.forEach((item, index) => {
    const key = `${item.area} - ${item.store}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ ...item, index });
  });

  body.innerHTML = Object.entries(grouped).map(([storeKey, items]) => `
    <div style="font-size:12px;color:var(--primary);font-weight:600;margin:8px 0 4px;">${storeKey}</div>
    ${items.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
        </div>
        <div class="cart-item-qty">
          <button onclick="changeCartQty(${item.index}, -1)">−</button>
          <span>${item.quantity}</span>
          <button onclick="changeCartQty(${item.index}, 1)">+</button>
        </div>
        <button class="cart-item-delete" onclick="changeCartQty(${item.index}, -${item.quantity})">🗑</button>
      </div>
    `).join('')}
  `).join('');
}

function changeCartQty(index, delta) {
  const cart = getCart();
  const newQty = cart[index].quantity + delta;
  updateCartQuantity(index, newQty);
  renderCartModal();
  updateCartBar();
  if (cart.length === 0) {
    document.getElementById('cartModal').style.display = 'none';
  }
}

// ==================== 订单弹窗 ====================
function renderOrderModal() {
  const cart = getCart();
  const summary = document.getElementById('orderSummary');

  const grouped = {};
  cart.forEach(item => {
    const key = `${item.area} - ${item.store}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  summary.innerHTML = Object.entries(grouped).map(([storeKey, items]) => `
    <div style="font-size:11px;color:var(--primary);font-weight:600;margin-top:6px;">${storeKey}</div>
    ${items.map(item => `
      <div class="order-summary-item">
        <span>${item.name}</span>
        <span>x${item.quantity}</span>
      </div>
    `).join('')}
  `).join('');

  // 刷新地址显示
  refreshSelectedAddr();
  document.getElementById('orderNote').value = '';
}

// 刷新选中地址显示
function refreshSelectedAddr() {
  const addr = getAddresses().find(a => a.id === selectedAddrId);
  const placeholder = document.getElementById('addrPlaceholder');
  const info = document.getElementById('addrSelectInfo');

  if (addr) {
    placeholder.style.display = 'none';
    info.style.display = 'block';
    document.getElementById('addrSelectName').textContent = addr.name;
    document.getElementById('addrSelectPhone').textContent = addr.phone;
    document.getElementById('addrSelectDorm').textContent = addr.dorm;
  } else {
    placeholder.style.display = 'flex';
    info.style.display = 'none';
  }
}

// ==================== 地址选择器 ====================
function showAddrPicker() {
  renderAddrPicker();
  document.getElementById('addrPickerModal').style.display = 'flex';
}

function renderAddrPicker() {
  const container = document.getElementById('addrPickerList');
  const addresses = getAddresses();

  if (addresses.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:20px;"><div class="empty-state-text">还没有收货地址，请添加</div></div>';
    return;
  }

  container.innerHTML = addresses.map(addr => {
    const isSelected = addr.id === selectedAddrId;
    const isDefault = addr.isDefault;
    return `
      <div class="addr-card ${isSelected ? 'selected' : ''}" data-addr-id="${addr.id}" style="margin-bottom:8px;">
        <div class="addr-card-body">
          <div class="addr-card-top">
            <span class="addr-card-name">${addr.name}</span>
            <span class="addr-card-phone">${addr.phone}</span>
            ${isDefault ? '<span class="addr-card-tag">默认</span>' : ''}
          </div>
          <div class="addr-card-dorm">${addr.dorm}</div>
        </div>
        <div class="addr-card-actions">
          <button class="btn btn-outline btn-sm addr-edit-btn" data-addr-id="${addr.id}">编辑</button>
          ${isSelected ? '<span style="color:var(--success);font-size:20px;">✓</span>' : ''}
        </div>
      </div>
    `;
  }).join('');

  // 点击选择地址
  container.querySelectorAll('.addr-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.addr-edit-btn')) return;
      selectedAddrId = card.dataset.addrId;
      renderAddrPicker();
      refreshSelectedAddr();
    });
  });

  // 编辑按钮
  container.querySelectorAll('.addr-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const addr = getAddresses().find(a => a.id === btn.dataset.addrId);
      if (addr) showAddrEdit(addr);
    });
  });
}

// ==================== 地址编辑弹窗 ====================
function showAddrEdit(addr) {
  const isEdit = !!addr;
  document.getElementById('addrEditTitle').textContent = isEdit ? '编辑收货地址' : '添加收货地址';
  document.getElementById('addrEditId').value = isEdit ? addr.id : '';
  document.getElementById('addrEditName').value = isEdit ? addr.name : '';
  document.getElementById('addrEditPhone').value = isEdit ? addr.phone : '';
  document.getElementById('addrEditDorm').value = isEdit ? addr.dorm : '';
  document.getElementById('addrEditDefault').checked = isEdit ? addr.isDefault : false;
  document.getElementById('addrEditModal').style.display = 'flex';
}

function saveAddrEdit() {
  const id = document.getElementById('addrEditId').value;
  const name = document.getElementById('addrEditName').value.trim();
  const phone = document.getElementById('addrEditPhone').value.trim();
  const dorm = document.getElementById('addrEditDorm').value.trim();
  const isDefault = document.getElementById('addrEditDefault').checked;

  if (!name) { showToast('请输入收货人姓名', 'error'); return; }
  if (!phone) { showToast('请输入联系电话', 'error'); return; }
  if (!dorm) { showToast('请输入宿舍楼/地址', 'error'); return; }

  if (id) {
    updateAddress(id, { name, phone, dorm, isDefault });
  } else {
    const newAddr = addAddress({ name, phone, dorm, isDefault });
    selectedAddrId = newAddr.id;
  }

  document.getElementById('addrEditModal').style.display = 'none';
  refreshSelectedAddr();
  renderAddrPicker();
  // 如果地址管理页打开着，也刷新
  if (document.getElementById('pageAddress').classList.contains('active')) {
    renderAddressList();
  }
  showToast(id ? '地址已更新' : '地址已添加', 'success');
}

// ==================== 地址管理页 ====================
function renderAddressList() {
  const container = document.getElementById('addressList');
  const addresses = getAddresses();

  if (addresses.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📍</div>
        <div class="empty-state-text">还没有收货地址</div>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="showAddrEdit(null)">添加收货地址</button>
      </div>`;
    return;
  }

  let html = '';
  addresses.forEach(addr => {
    html += `
      <div class="addr-manage-card">
        <div class="addr-manage-body">
          <div class="addr-manage-top">
            <span class="addr-manage-name">${addr.name}</span>
            <span class="addr-manage-phone">${addr.phone}</span>
            ${addr.isDefault ? '<span class="addr-card-tag">默认</span>' : ''}
          </div>
          <div class="addr-manage-dorm">${addr.dorm}</div>
        </div>
        <div class="addr-manage-actions">
          ${!addr.isDefault ? `<button class="btn btn-outline btn-sm" onclick="handleSetDefault('${addr.id}')">设为默认</button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="showAddrEditById('${addr.id}')">编辑</button>
          <button class="btn btn-outline btn-sm" style="color:var(--danger);" onclick="handleDeleteAddr('${addr.id}')">删除</button>
        </div>
      </div>
    `;
  });

  html += `<button class="btn btn-primary" style="width:100%;margin-top:12px;" onclick="showAddrEdit(null)">+ 添加新地址</button>`;

  container.innerHTML = html;
}

function showAddrEditById(id) {
  const addr = getAddresses().find(a => a.id === id);
  if (addr) showAddrEdit(addr);
}

function handleSetDefault(id) {
  setDefaultAddress(id);
  selectedAddrId = id;
  renderAddressList();
  refreshSelectedAddr();
  showToast('已设为默认地址', 'success');
}

function handleDeleteAddr(id) {
  if (!confirm('确定删除这个地址吗？')) return;
  const addresses = deleteAddress(id);
  if (selectedAddrId === id) {
    selectedAddrId = addresses.length > 0 ? addresses[0].id : null;
  }
  renderAddressList();
  refreshSelectedAddr();
  showToast('地址已删除', 'info');
}

// ==================== 提交订单 ====================
function submitOrder() {
  const addr = getAddresses().find(a => a.id === selectedAddrId);
  if (!addr) {
    showToast('请先选择收货地址', 'error');
    return;
  }

  const note = document.getElementById('orderNote').value.trim();
  const cart = getCart();

  if (cart.length === 0) {
    showToast('购物车是空的', 'error');
    return;
  }

  // 按店铺拆分订单
  const storeGroups = {};
  cart.forEach(item => {
    const key = `${item.area}|||${item.store}`;
    if (!storeGroups[key]) storeGroups[key] = [];
    storeGroups[key].push({ name: item.name, quantity: item.quantity });
  });

  Object.entries(storeGroups).forEach(([key, items]) => {
    const [area, store] = key.split('|||');
    addOrder({
      area: area,
      store: store,
      items: items,
      customerName: addr.name,
      customerPhone: addr.phone,
      customerDorm: addr.dorm,
      note: note
    });
  });

  clearCart();
  updateCartBar();
  document.getElementById('orderModal').style.display = 'none';
  showToast('下单成功！商家已收到订单', 'success');
}

// ==================== 启动 ====================
document.addEventListener('DOMContentLoaded', init);