// ==================== 菜单管理逻辑（API 版） ====================

let mgrArea = AREA_ORDER[0];
let mgrStore = null;

// ==================== 初始化菜单管理器 ====================
function initMenuManager() {
  renderMgrAreaNav();
  updateMgrStoreSelect();
  if (mgrStore) {
    renderMenuEditor();
  }
  bindMgrEvents();
}

function bindMgrEvents() {
  // 区域切换
  document.getElementById('menuAreaNav').addEventListener('click', (e) => {
    const tab = e.target.closest('.menu-mgr-area-tab');
    if (!tab) return;
    mgrArea = tab.dataset.area;
    mgrStore = null;
    renderMgrAreaNav();
    updateMgrStoreSelect();
    showEmptyEditor();
  });

  // 店铺选择
  document.getElementById('menuStoreSelect').addEventListener('change', (e) => {
    mgrStore = e.target.value || null;
    if (mgrStore) {
      renderMenuEditor();
    } else {
      showEmptyEditor();
    }
  });

  // 添加店铺
  document.getElementById('btnAddStore').addEventListener('click', () => {
    showInputModal('添加店铺', '请输入新店铺名称', '', async (name) => {
      if (!name.trim()) return;
      await addStoreAsync(mgrArea, name.trim());
      updateMgrStoreSelect();
      mgrStore = name.trim();
      document.getElementById('menuStoreSelect').value = mgrStore;
      renderMenuEditor();
      showToast('店铺已添加', 'success');
    });
  });
}

// ==================== 区域导航 ====================
function renderMgrAreaNav() {
  const nav = document.getElementById('menuAreaNav');
  nav.innerHTML = AREA_ORDER.map(area => {
    const active = area === mgrArea ? ' active' : '';
    const emoji = getAreaEmoji(area);
    return `<div class="menu-mgr-area-tab${active}" data-area="${area}">${emoji} ${area}</div>`;
  }).join('');
}

// ==================== 店铺选择 ====================
function updateMgrStoreSelect() {
  const select = document.getElementById('menuStoreSelect');
  const menu = getMenuData();
  const stores = menu[mgrArea] ? Object.keys(menu[mgrArea].stores) : [];
  select.innerHTML = '<option value="">-- 选择店铺 --</option>' +
    stores.map(s => `<option value="${s}" ${s === mgrStore ? 'selected' : ''}>${s}</option>`).join('');
}

// ==================== 空编辑区 ====================
function showEmptyEditor() {
  document.getElementById('menuEditor').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-text">请选择区域和店铺开始管理菜单</div>
    </div>
  `;
}

// ==================== 渲染菜单编辑器 ====================
function renderMenuEditor() {
  if (!mgrArea || !mgrStore) {
    showEmptyEditor();
    return;
  }

  const menu = getMenuData();
  const storeData = menu[mgrArea] && menu[mgrArea].stores[mgrStore];
  if (!storeData) {
    showEmptyEditor();
    return;
  }

  const categories = storeData.categories || {};
  const catNames = Object.keys(categories);

  let html = '';

  catNames.forEach(catName => {
    const items = categories[catName] || [];
    html += `
      <div class="menu-mgr-category">
        <div class="menu-mgr-cat-header">
          <span class="menu-mgr-cat-title">${catName} (${items.length})</span>
          <div class="menu-mgr-cat-actions">
            <button onclick="handleAddItem('${escJS(catName)}')">+ 添加菜品</button>
            <button class="btn-del-cat" onclick="handleDeleteCategory('${escJS(catName)}')">删除分类</button>
          </div>
        </div>
        ${items.map((item, idx) => renderItemRow(catName, item, idx)).join('')}
        <div class="menu-mgr-add-row" id="addRow_${escJS(catName)}" style="display:none;">
          <input type="text" id="addInput_${escJS(catName)}" placeholder="输入新菜品名称">
          <button class="btn btn-primary btn-sm" onclick="confirmAddItem('${escJS(catName)}')">确认添加</button>
          <button class="btn btn-outline btn-sm" onclick="cancelAddItem('${escJS(catName)}')">取消</button>
        </div>
      </div>
    `;
  });

  html += `
    <div class="menu-mgr-bottom-bar">
      <button class="btn btn-primary btn-sm" onclick="handleAddCategory()">+ 添加分类</button>
      <button class="btn btn-danger btn-sm" onclick="handleDeleteStore()">删除店铺</button>
      <button class="btn btn-outline btn-sm" onclick="handleResetMenu()">重置菜单</button>
    </div>
  `;

  document.getElementById('menuEditor').innerHTML = html;
}

function renderItemRow(catName, item, idx) {
  const imgHtml = item.image
    ? `<img src="${item.image}" alt="${item.name}">`
    : `<span class="img-placeholder">📷</span>`;

  return `
    <div class="menu-mgr-item">
      <div class="menu-mgr-item-img" onclick="handleUploadImage('${escJS(catName)}', '${escJS(item.name)}')" title="点击更换图片">
        ${imgHtml}
        <div class="img-edit-hint">更换</div>
      </div>
      <span class="menu-mgr-item-name">${item.name}</span>
      <button class="menu-mgr-item-del" onclick="handleDeleteItem('${escJS(catName)}', '${escJS(item.name)}')" title="删除菜品">🗑</button>
    </div>
  `;
}

// ==================== 操作函数 ====================

function handleAddItem(catName) {
  const row = document.getElementById('addRow_' + escJS(catName));
  if (row) {
    row.style.display = 'flex';
    const input = document.getElementById('addInput_' + escJS(catName));
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }
  }
}

async function confirmAddItem(catName) {
  const input = document.getElementById('addInput_' + escJS(catName));
  const name = input ? input.value.trim() : '';
  if (!name) {
    showToast('请输入菜品名称', 'error');
    return;
  }
  await addMenuItemAsync(mgrArea, mgrStore, catName, name);
  renderMenuEditor();
  showToast(`已添加：${name}`, 'success');
}

function cancelAddItem(catName) {
  const row = document.getElementById('addRow_' + escJS(catName));
  if (row) row.style.display = 'none';
}

async function handleDeleteItem(catName, itemName) {
  if (!confirm(`确定要删除菜品 "${itemName}" 吗？`)) return;
  await deleteMenuItemAsync(mgrArea, mgrStore, catName, itemName);
  renderMenuEditor();
  showToast(`已删除：${itemName}`, 'info');
}

async function handleAddCategory() {
  showInputModal('添加分类', '请输入新分类名称', '', async (name) => {
    if (!name.trim()) return;
    await addCategoryAsync(mgrArea, mgrStore, name.trim());
    renderMenuEditor();
    showToast('分类已添加', 'success');
  });
}

async function handleDeleteCategory(catName) {
  if (!confirm(`确定要删除分类 "${catName}" 及其所有菜品吗？`)) return;
  await deleteCategoryAsync(mgrArea, mgrStore, catName);
  renderMenuEditor();
  showToast(`已删除分类：${catName}`, 'info');
}

async function handleDeleteStore() {
  if (!confirm(`确定要删除店铺 "${mgrStore}" 及其所有数据吗？此操作不可恢复！`)) return;
  await deleteStoreAsync(mgrArea, mgrStore);
  mgrStore = null;
  updateMgrStoreSelect();
  showEmptyEditor();
  showToast('店铺已删除', 'info');
}

async function handleResetMenu() {
  if (!confirm('确定要重置菜单为默认数据吗？所有自定义修改将丢失！')) return;
  await resetMenuDataAsync();
  mgrStore = null;
  updateMgrStoreSelect();
  showEmptyEditor();
  showToast('菜单已重置为默认数据', 'success');
}

// ==================== 图片上传 ====================
async function handleUploadImage(catName, itemName) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 尝试上传到 API，失败则用 base64 本地存储
    try {
      const url = await apiUploadImage(file);
      await setItemImageAsync(mgrArea, mgrStore, catName, itemName, url);
      renderMenuEditor();
      showToast(`图片已上传：${itemName}`, 'success');
    } catch(e) {
      // 降级：使用 base64
      if (file.size > 500 * 1024) {
        showToast('图片大小不能超过 500KB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        await setItemImageAsync(mgrArea, mgrStore, catName, itemName, ev.target.result);
        renderMenuEditor();
        showToast(`图片已更新：${itemName}`, 'success');
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

// ==================== 通用弹窗 ====================
function showInputModal(title, placeholder, defaultValue, onConfirm) {
  const modal = document.getElementById('inputModal');
  const content = document.getElementById('inputContent');

  content.innerHTML = `
    <div class="order-modal-title">${title}</div>
    <div class="order-form-group">
      <input class="order-form-input" id="modalInput" placeholder="${placeholder}" value="${defaultValue}" maxlength="30">
    </div>
    <button class="order-submit-btn" id="modalConfirm">确认</button>
    <button class="btn btn-outline" style="width:100%;margin-top:8px;" id="modalCancel">取消</button>
  `;

  modal.style.display = 'flex';

  const input = document.getElementById('modalInput');
  setTimeout(() => input.focus(), 100);

  document.getElementById('modalConfirm').addEventListener('click', () => {
    const value = input.value.trim();
    modal.style.display = 'none';
    if (onConfirm) onConfirm(value);
  });

  document.getElementById('modalCancel').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const value = input.value.trim();
      modal.style.display = 'none';
      if (onConfirm) onConfirm(value);
    }
  });
}

// ==================== 工具函数 ====================
function escJS(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getAreaEmoji(area) {
  const map = { '南门': '🚪', '一餐': '🍔', '二餐': '🍜', '西门': '🚪', '水晶城': '🏬' };
  return map[area] || '📍';
}