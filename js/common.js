// ==================== 公共工具函数 ====================

// localStorage 键名
const STORAGE_KEYS = {
  ORDERS: 'campus_orders',
  CART: 'campus_cart',
  CURRENT_AREA: 'campus_current_area',
  CURRENT_STORE: 'campus_current_store',
  MENU_DATA: 'campus_menu_data',
  ADDRESSES: 'campus_addresses'
};

// 订单状态
const ORDER_STATUS = {
  PENDING: 'pending',       // 待接单
  ACCEPTED: 'accepted',     // 已接单
  DELIVERING: 'delivering', // 配送中
  COMPLETED: 'completed',   // 已完成
  CANCELLED: 'cancelled'    // 已取消
};

const ORDER_STATUS_TEXT = {
  pending: '待接单',
  accepted: '已接单',
  delivering: '配送中',
  completed: '已完成',
  cancelled: '已取消'
};

// ==================== 订单管理 ====================

function getOrders() {
  const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
  return data ? JSON.parse(data) : [];
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

function addOrder(order) {
  const orders = getOrders();
  order.id = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 6);
  order.status = ORDER_STATUS.PENDING;
  order.createdAt = new Date().toISOString();
  orders.unshift(order);
  saveOrders(orders);
  return order;
}

function updateOrderStatus(orderId, newStatus) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    saveOrders(orders);
  }
  return order;
}

// ==================== 购物车管理 ====================

function getCart() {
  const data = localStorage.getItem(STORAGE_KEYS.CART);
  return data ? JSON.parse(data) : [];
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
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

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
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

function getCartCount() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + item.quantity, 0);
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

// ==================== 菜单数据管理（支持自定义修改） ====================

// 将静态菜单数据中字符串格式的菜品转为对象格式 { name, image }
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
          // 如果已经是对象格式则保留，否则转为对象
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

// 获取菜单数据（优先从 localStorage 读取自定义数据）
function getMenuData() {
  const custom = localStorage.getItem(STORAGE_KEYS.MENU_DATA);
  if (custom) {
    try {
      return JSON.parse(custom);
    } catch (e) {
      // 数据损坏，回退到静态数据
    }
  }
  return _convertStaticMenu();
}

// 保存菜单数据到 localStorage
function saveMenuData(data) {
  localStorage.setItem(STORAGE_KEYS.MENU_DATA, JSON.stringify(data));
}

// 重置菜单为默认数据
function resetMenuData() {
  localStorage.removeItem(STORAGE_KEYS.MENU_DATA);
}

// 获取某个菜品的图片
function getItemImage(area, store, category, itemName) {
  const menu = getMenuData();
  try {
    const items = menu[area].stores[store].categories[category];
    const item = items.find(i => i.name === itemName);
    return item ? item.image : '';
  } catch (e) {
    return '';
  }
}

// 设置某个菜品的图片
function setItemImage(area, store, category, itemName, imageBase64) {
  const menu = getMenuData();
  if (!menu[area]) menu[area] = { stores: {} };
  if (!menu[area].stores[store]) menu[area].stores[store] = { categories: {} };
  if (!menu[area].stores[store].categories[category]) menu[area].stores[store].categories[category] = [];
  const items = menu[area].stores[store].categories[category];
  const item = items.find(i => i.name === itemName);
  if (item) {
    item.image = imageBase64;
  }
  saveMenuData(menu);
}

// 添加菜品
function addMenuItem(area, store, category, itemName) {
  const menu = getMenuData();
  if (!menu[area]) menu[area] = { stores: {} };
  if (!menu[area].stores[store]) menu[area].stores[store] = { categories: {} };
  if (!menu[area].stores[store].categories[category]) menu[area].stores[store].categories[category] = [];
  const items = menu[area].stores[store].categories[category];
  if (!items.find(i => i.name === itemName)) {
    items.push({ name: itemName, image: '' });
  }
  saveMenuData(menu);
  return menu;
}

// 删除菜品
function deleteMenuItem(area, store, category, itemName) {
  const menu = getMenuData();
  if (!menu[area] || !menu[area].stores[store]) return menu;
  const items = menu[area].stores[store].categories[category];
  if (!items) return menu;
  const idx = items.findIndex(i => i.name === itemName);
  if (idx > -1) items.splice(idx, 1);
  saveMenuData(menu);
  return menu;
}

// 添加分类
function addCategory(area, store, categoryName) {
  const menu = getMenuData();
  if (!menu[area]) menu[area] = { stores: {} };
  if (!menu[area].stores[store]) menu[area].stores[store] = { categories: {} };
  if (!menu[area].stores[store].categories[categoryName]) {
    menu[area].stores[store].categories[categoryName] = [];
  }
  saveMenuData(menu);
  return menu;
}

// 删除分类
function deleteCategory(area, store, categoryName) {
  const menu = getMenuData();
  if (!menu[area] || !menu[area].stores[store]) return menu;
  delete menu[area].stores[store].categories[categoryName];
  saveMenuData(menu);
  return menu;
}

// 添加店铺
function addStore(area, storeName) {
  const menu = getMenuData();
  if (!menu[area]) menu[area] = { stores: {} };
  if (!menu[area].stores[storeName]) {
    menu[area].stores[storeName] = { categories: {} };
  }
  saveMenuData(menu);
  return menu;
}

// 删除店铺
function deleteStore(area, storeName) {
  const menu = getMenuData();
  if (!menu[area]) return menu;
  delete menu[area].stores[storeName];
  saveMenuData(menu);
  return menu;
}

// ==================== 收货地址管理 ====================

function getAddresses() {
  const data = localStorage.getItem(STORAGE_KEYS.ADDRESSES);
  return data ? JSON.parse(data) : [];
}

function saveAddresses(addresses) {
  localStorage.setItem(STORAGE_KEYS.ADDRESSES, JSON.stringify(addresses));
}

function addAddress(address) {
  const addresses = getAddresses();
  address.id = 'addr_' + Date.now();
  if (!address.isDefault && addresses.length === 0) {
    address.isDefault = true;
  }
  if (address.isDefault) {
    addresses.forEach(a => a.isDefault = false);
  }
  addresses.push(address);
  saveAddresses(addresses);
  return address;
}

function updateAddress(id, updates) {
  const addresses = getAddresses();
  const addr = addresses.find(a => a.id === id);
  if (!addr) return null;
  if (updates.isDefault) {
    addresses.forEach(a => a.isDefault = false);
  }
  Object.assign(addr, updates);
  saveAddresses(addresses);
  return addr;
}

function deleteAddress(id) {
  let addresses = getAddresses();
  const deleted = addresses.find(a => a.id === id);
  addresses = addresses.filter(a => a.id !== id);
  if (deleted && deleted.isDefault && addresses.length > 0) {
    addresses[0].isDefault = true;
  }
  saveAddresses(addresses);
  return addresses;
}

function getDefaultAddress() {
  const addresses = getAddresses();
  return addresses.find(a => a.isDefault) || (addresses.length > 0 ? addresses[0] : null);
}

function setDefaultAddress(id) {
  const addresses = getAddresses();
  addresses.forEach(a => a.isDefault = (a.id === id));
  saveAddresses(addresses);
}

// 通知动画
function showToast(message, type = 'success') {
  // 移除已有的 toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}