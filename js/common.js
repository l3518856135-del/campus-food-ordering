// ==================== 公共工具函数（API 版） ====================

// 订单状态常量
const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DELIVERING: 'delivering',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const ORDER_STATUS_TEXT = {
  pending: '待接单',
  accepted: '已接单',
  delivering: '配送中',
  completed: '已完成',
  cancelled: '已取消'
};

// ==================== 购物车管理（localStorage - 仅本地） ====================

function getCart() {
  const data = localStorage.getItem('campus_cart');
  return data ? JSON.parse(data) : [];
}

function saveCart(cart) {
  localStorage.setItem('campus_cart', JSON.stringify(cart));
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(c => c.name === item.name && c.store === item.store && c.area === item.area);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  saveCart(cart);
  return cart;
}

function updateCartQuantity(index, quantity) {
  const cart = getCart();
  if (quantity <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].quantity = quantity;
  }
  saveCart(cart);
  return cart;
}

function clearCart() {
  saveCart([]);
}

// ==================== 菜单数据管理 ====================

// 将静态菜单数据转为对象格式
function _convertStaticMenu() {
  const converted = {};
  for (const area of AREA_ORDER) {
    if (!MENU_DATA[area]) continue;
    converted[area] = { stores: {} };
    const areaData = MENU_DATA[area];
    for (const storeName of Object.keys(areaData.stores)) {
      converted[area].stores[storeName] = { categories: {} };
      const storeData = areaData.stores[storeName];
      for (const catName of Object.keys(storeData.categories)) {
        converted[area].stores[storeName].categories[catName] = storeData.categories[catName].map(name => {
          if (typeof name === 'object' && name.name) {
            return { name: name.name, image: name.image || '' };
          }
          return { name: String(name), image: '' };
        });
      }
    }
  }
  return converted;
}

let _menuCache = null;

// 获取菜单数据（优先 API，回退缓存，最后静态数据）
function getMenuData() {
  // 同步返回：优先缓存，否则静态数据
  if (_menuCache) return _menuCache;
  const cached = localStorage.getItem('campus_menu_data');
  if (cached) {
    try { _menuCache = JSON.parse(cached); return _menuCache; } catch(e) {}
  }
  _menuCache = _convertStaticMenu();
  return _menuCache;
}

// 异步从 API 加载菜单
async function loadMenuFromAPI() {
  try {
    const menu = await apiGetMenu();
    if (menu) {
      _menuCache = menu;
      localStorage.setItem('campus_menu_data', JSON.stringify(menu));
      return menu;
    }
  } catch(e) {
    console.log('API 加载菜单失败，使用本地缓存');
  }
  return getMenuData();
}

// 保存菜单到 API
async function saveMenuDataAsync(data) {
  _menuCache = data;
  localStorage.setItem('campus_menu_data', JSON.stringify(data));
  try {
    await apiSaveMenu(data);
  } catch(e) {
    showToast('菜单保存失败: ' + e.message, 'error');
  }
}

// 同步版本（兼容旧代码，仅更新本地缓存）
function saveMenuData(data) {
  _menuCache = data;
  localStorage.setItem('campus_menu_data', JSON.stringify(data));
}

// 添加菜品
async function addMenuItemAsync(area, store, category, itemName) {
  const menu = getMenuData();
  if (!menu[area]) menu[area] = { stores: {} };
  if (!menu[area].stores[store]) menu[area].stores[store] = { categories: {} };
  if (!menu[area].stores[store].categories[category]) menu[area].stores[store].categories[category] = [];
  const items = menu[area].stores[store].categories[category];
  if (!items.find(i => i.name === itemName)) {
    items.push({ name: itemName, image: '' });
  }
  await saveMenuDataAsync(menu);
  return menu;
}

// 删除菜品
async function deleteMenuItemAsync(area, store, category, itemName) {
  const menu = getMenuData();
  if (!menu[area] || !menu[area].stores[store]) return menu;
  const items = menu[area].stores[store].categories[category];
  if (!items) return menu;
  const idx = items.findIndex(i => i.name === itemName);
  if (idx > -1) items.splice(idx, 1);
  await saveMenuDataAsync(menu);
  return menu;
}

// 添加分类
async function addCategoryAsync(area, store, categoryName) {
  const menu = getMenuData();
  if (!menu[area]) menu[area] = { stores: {} };
  if (!menu[area].stores[store]) menu[area].stores[store] = { categories: {} };
  if (!menu[area].stores[store].categories[categoryName]) {
    menu[area].stores[store].categories[categoryName] = [];
  }
  await saveMenuDataAsync(menu);
  return menu;
}

// 删除分类
async function deleteCategoryAsync(area, store, categoryName) {
  const menu = getMenuData();
  if (!menu[area] || !menu[area].stores[store]) return menu;
  delete menu[area].stores[store].categories[categoryName];
  await saveMenuDataAsync(menu);
  return menu;
}

// 添加店铺
async function addStoreAsync(area, storeName) {
  const menu = getMenuData();
  if (!menu[area]) menu[area] = { stores: {} };
  if (!menu[area].stores[storeName]) {
    menu[area].stores[storeName] = { categories: {} };
  }
  await saveMenuDataAsync(menu);
  return menu;
}

// 删除店铺
async function deleteStoreAsync(area, storeName) {
  const menu = getMenuData();
  if (!menu[area]) return menu;
  delete menu[area].stores[storeName];
  await saveMenuDataAsync(menu);
  return menu;
}

// 设置菜品图片
async function setItemImageAsync(area, store, category, itemName, imageBase64) {
  const menu = getMenuData();
  if (!menu[area]) menu[area] = { stores: {} };
  if (!menu[area].stores[store]) menu[area].stores[store] = { categories: {} };
  if (!menu[area].stores[store].categories[category]) menu[area].stores[store].categories[category] = [];
  const items = menu[area].stores[store].categories[category];
  const item = items.find(i => i.name === itemName);
  if (item) {
    item.image = imageBase64;
  }
  await saveMenuDataAsync(menu);
}

// 重置菜单
async function resetMenuDataAsync() {
  _menuCache = _convertStaticMenu();
  localStorage.removeItem('campus_menu_data');
  await saveMenuDataAsync(_menuCache);
  return _menuCache;
}

// ==================== 订单管理（API） ====================

// 异步获取订单
async function getOrdersAsync() {
  try {
    return await apiGetOrders();
  } catch(e) {
    showToast('加载订单失败: ' + e.message, 'error');
    return [];
  }
}

// 创建订单
async function addOrderAsync(order) {
  try {
    return await apiCreateOrder(order);
  } catch(e) {
    showToast('下单失败: ' + e.message, 'error');
    throw e;
  }
}

// 更新订单状态
async function updateOrderStatusAsync(orderId, newStatus) {
  try {
    return await apiUpdateOrderStatus(orderId, newStatus);
  } catch(e) {
    showToast('操作失败: ' + e.message, 'error');
    throw e;
  }
}

// 删除订单
async function deleteOrderAsync(orderId) {
  try {
    return await apiDeleteOrder(orderId);
  } catch(e) {
    showToast('删除失败: ' + e.message, 'error');
    throw e;
  }
}

// ==================== 收货地址管理（API） ====================

async function getAddressesAsync() {
  try {
    return await apiGetAddresses();
  } catch(e) {
    return [];
  }
}

async function addAddressAsync(address) {
  try {
    return await apiAddAddress(address);
  } catch(e) {
    showToast('添加地址失败: ' + e.message, 'error');
    throw e;
  }
}

async function updateAddressAsync(id, updates) {
  try {
    return await apiUpdateAddress(id, updates);
  } catch(e) {
    showToast('更新地址失败: ' + e.message, 'error');
    throw e;
  }
}

async function deleteAddressAsync(id) {
  try {
    return await apiDeleteAddress(id);
  } catch(e) {
    showToast('删除地址失败: ' + e.message, 'error');
    throw e;
  }
}

async function getDefaultAddressAsync() {
  const addrs = await getAddressesAsync();
  return addrs.find(a => a.is_default) || (addrs.length > 0 ? addrs[0] : null);
}

// ==================== 工具函数 ====================

function formatTime(isoString) {
  const d = new Date(isoString);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

function getStatusBadgeClass(status) {
  const map = {
    pending: 'badge-warning',
    accepted: 'badge-info',
    delivering: 'badge-primary',
    completed: 'badge-success',
    cancelled: 'badge-danger'
  };
  return map[status] || 'badge-secondary';
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => { toast.classList.add('show'); }, 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}