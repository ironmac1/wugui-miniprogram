// utils/store.js — 本地数据存储层
// 接口设计为异步 Promise 形式，日后可无缝替换为真实云 API
const { PRESET_CATEGORIES, DEFAULT_REMINDER_CONFIG, STORAGE_KEYS, SPACE_ICONS } = require('./constants.js');
const { genId, daysFromToday, getItemStatus } = require('./util.js');

// ============ 内部辅助 ============

function read(key, defaultVal) {
  try {
    const val = wx.getStorageSync(key);
    return val !== '' && val !== undefined && val !== null ? val : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function write(key, val) {
  try {
    wx.setStorageSync(key, val);
    return true;
  } catch (e) {
    console.error('Storage write error:', key, e);
    return false;
  }
}

function nextCounter() {
  const c = read(STORAGE_KEYS.COUNTER, 0) + 1;
  write(STORAGE_KEYS.COUNTER, c);
  return c;
}

// 初始化默认数据（首次使用）
function ensureDefaultData() {
  const user = read(STORAGE_KEYS.USER, null);
  if (user) return; // 已初始化

  // 创建默认用户
  const defaultUser = {
    user_id: genId('user'),
    nickname: '微信用户',
    avatar_url: '',
    family_id: 'fam_default',
    family_role: 'admin',
    created_at: new Date().toISOString()
  };
  write(STORAGE_KEYS.USER, defaultUser);

  // 创建默认家庭
  const defaultFamily = {
    family_id: 'fam_default',
    family_name: '我的家',
    owner_id: defaultUser.user_id,
    member_ids: [defaultUser.user_id],
    reminder_config: DEFAULT_REMINDER_CONFIG,
    created_at: new Date().toISOString()
  };
  write(STORAGE_KEYS.FAMILY, defaultFamily);

  // 初始化分类（预设 + 自定义空）
  write(STORAGE_KEYS.CATEGORIES, PRESET_CATEGORIES.map(c => ({
    ...c,
    created_at: new Date().toISOString()
  })));

  // 初始化空间和物品为空
  if (!read(STORAGE_KEYS.SPACES, null)) write(STORAGE_KEYS.SPACES, []);
  if (!read(STORAGE_KEYS.ITEMS, null)) write(STORAGE_KEYS.ITEMS, []);

  // 初始化提醒设置
  write(STORAGE_KEYS.REMINDER, DEFAULT_REMINDER_CONFIG);

  // 写入示例数据（帮助用户快速理解）
  seedDemoData(defaultUser.user_id);
}

// 生成示例数据
function seedDemoData(userId) {
  const now = new Date().toISOString();
  const today = new Date();
  const dateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const kitchenId = genId('space');
  const livingId = genId('space');
  const fridgeId = genId('space');
  const cabinetId = genId('space');

  const spaces = [
    { space_id: kitchenId, family_id: 'fam_default', name: '厨房', icon: 'icon_kitchen', parent_id: '', creator_id: userId, item_count: 2, created_at: now, updated_at: now },
    { space_id: livingId, family_id: 'fam_default', name: '客厅', icon: 'icon_living', parent_id: '', creator_id: userId, item_count: 2, created_at: now, updated_at: now },
    { space_id: fridgeId, family_id: 'fam_default', name: '冰箱', icon: 'icon_fridge', parent_id: kitchenId, creator_id: userId, item_count: 2, created_at: now, updated_at: now },
    { space_id: cabinetId, family_id: 'fam_default', name: '橱柜', icon: 'icon_storage', parent_id: kitchenId, creator_id: userId, item_count: 1, created_at: now, updated_at: now }
  ];

  const futureDate = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return dateStr(d);
  };

  const items = [
    { item_id: genId('item'), family_id: 'fam_default', space_id: kitchenId, name: '洗洁精', category: 'cat_daily', quantity: 1, purchase_date: dateStr(new Date(today.getTime() - 30 * 86400000)), expire_date: '', brand: '立白', price: 12.9, remark: '放在水槽下方', photos: [], status: 'normal', handle_type: '', creator_id: userId, created_at: now, updated_at: now },
    { item_id: genId('item'), family_id: 'fam_default', space_id: kitchenId, name: '生抽', category: 'cat_food', quantity: 1, purchase_date: dateStr(new Date(today.getTime() - 15 * 86400000)), expire_date: futureDate(180), brand: '海天', price: 15.5, remark: '', photos: [], status: 'normal', handle_type: '', creator_id: userId, created_at: now, updated_at: now },
    { item_id: genId('item'), family_id: 'fam_default', space_id: cabinetId, name: '感冒灵颗粒', category: 'cat_medicine', quantity: 2, purchase_date: dateStr(new Date(today.getTime() - 60 * 86400000)), expire_date: futureDate(5), brand: '999', price: 18.0, remark: '备用药', photos: [], status: 'expiring_soon', handle_type: '', creator_id: userId, created_at: now, updated_at: now },
    { item_id: genId('item'), family_id: 'fam_default', space_id: livingId, name: '遥控器电池', category: 'cat_electronics', quantity: 4, purchase_date: dateStr(new Date(today.getTime() - 90 * 86400000)), expire_date: '', brand: '南孚', price: 9.9, remark: 'AA 五号', photos: [], status: 'normal', handle_type: '', creator_id: userId, created_at: now, updated_at: now },
    { item_id: genId('item'), family_id: 'fam_default', space_id: livingId, name: '护照', category: 'cat_document', quantity: 1, purchase_date: '', expire_date: '', brand: '', price: 0, remark: '有效期至2030年', photos: [], status: 'normal', handle_type: '', creator_id: userId, created_at: now, updated_at: now },
    { item_id: genId('item'), family_id: 'fam_default', space_id: fridgeId, name: '牛奶', category: 'cat_food', quantity: 1, purchase_date: dateStr(today), expire_date: futureDate(-1), brand: '蒙牛', price: 6.5, remark: '250ml', photos: [], status: 'expired', handle_type: '', creator_id: userId, created_at: now, updated_at: now },
    { item_id: genId('item'), family_id: 'fam_default', space_id: fridgeId, name: '酸奶', category: 'cat_food', quantity: 6, purchase_date: dateStr(today), expire_date: futureDate(3), brand: '光明', price: 15.9, remark: '整排', photos: [], status: 'expiring_soon', handle_type: '', creator_id: userId, created_at: now, updated_at: now }
  ];

  write(STORAGE_KEYS.SPACES, spaces);
  write(STORAGE_KEYS.ITEMS, items);
}

// ============ 用户 & 家庭 ============

function login() {
  ensureDefaultData();
  return read(STORAGE_KEYS.USER, null);
}

function getUser() {
  return read(STORAGE_KEYS.USER, null);
}

function updateUser(updates) {
  const user = read(STORAGE_KEYS.USER, null);
  if (!user) return null;
  const updated = { ...user, ...updates };
  write(STORAGE_KEYS.USER, updated);
  return updated;
}

function getFamily() {
  return read(STORAGE_KEYS.FAMILY, null);
}

function updateFamily(updates) {
  const family = read(STORAGE_KEYS.FAMILY, null);
  if (!family) return null;
  const updated = { ...family, ...updates };
  write(STORAGE_KEYS.FAMILY, updated);
  return updated;
}

// ============ 提醒设置 ============

function getReminderConfig() {
  return read(STORAGE_KEYS.REMINDER, DEFAULT_REMINDER_CONFIG);
}

function updateReminderConfig(updates) {
  const config = read(STORAGE_KEYS.REMINDER, DEFAULT_REMINDER_CONFIG);
  const updated = { ...config, ...updates };
  write(STORAGE_KEYS.REMINDER, updated);
  return updated;
}

// ============ 空间管理 ============

function getSpaces() {
  return read(STORAGE_KEYS.SPACES, []);
}

function getSpace(spaceId) {
  const spaces = getSpaces();
  return spaces.find(s => s.space_id === spaceId);
}

function addSpace(data) {
  const spaces = getSpaces();
  const now = new Date().toISOString();
  const user = getUser();
  const space = {
    space_id: genId('space'),
    family_id: 'fam_default',
    name: data.name,
    icon: data.icon || 'icon_other',
    parent_id: data.parent_id || '',
    creator_id: user ? user.user_id : '',
    item_count: 0,
    created_at: now,
    updated_at: now
  };
  spaces.push(space);
  write(STORAGE_KEYS.SPACES, spaces);
  return space;
}

function updateSpace(spaceId, updates) {
  const spaces = getSpaces();
  const idx = spaces.findIndex(s => s.space_id === spaceId);
  if (idx === -1) return null;
  spaces[idx] = { ...spaces[idx], ...updates, updated_at: new Date().toISOString() };
  write(STORAGE_KEYS.SPACES, spaces);
  return spaces[idx];
}

function deleteSpace(spaceId) {
  // 校验空间下是否有子空间
  const allSpaces = getSpaces();
  const childSpaces = allSpaces.filter(s => s.parent_id === spaceId);
  if (childSpaces.length > 0) {
    return { success: false, reason: 'has_children', count: childSpaces.length };
  }
  // 校验空间下是否有物品
  const items = getItems();
  const spaceItems = items.filter(i => i.space_id === spaceId);
  if (spaceItems.length > 0) {
    return { success: false, reason: 'has_items', count: spaceItems.length };
  }
  const spaces = allSpaces.filter(s => s.space_id !== spaceId);
  write(STORAGE_KEYS.SPACES, spaces);
  return { success: true };
}

// 获取顶级空间（parent_id 为空）
function getRootSpaces() {
  return getSpaces().filter(s => !s.parent_id);
}

// 获取子空间
function getChildSpaces(parentId) {
  return getSpaces().filter(s => s.parent_id === parentId);
}

// 获取空间层级路径（面包屑）
function getSpacePath(spaceId) {
  const path = [];
  let current = getSpace(spaceId);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? getSpace(current.parent_id) : null;
  }
  return path;
}

// 获取空间及其所有后代空间ID（递归）
function getDescendantSpaceIds(spaceId) {
  const result = [spaceId];
  const children = getChildSpaces(spaceId);
  children.forEach(child => {
    result.push(...getDescendantSpaceIds(child.space_id));
  });
  return result;
}

// 更新空间物品计数
function syncSpaceItemCount(spaceId) {
  const items = getItems();
  const count = items.filter(i => i.space_id === spaceId).length;
  updateSpace(spaceId, { item_count: count });
}

// ============ 物品管理 ============

function getItems() {
  return read(STORAGE_KEYS.ITEMS, []);
}

function getItem(itemId) {
  return getItems().find(i => i.item_id === itemId);
}

function getItemsBySpace(spaceId) {
  return getItems().filter(i => i.space_id === spaceId);
}

function addItem(data) {
  const items = getItems();
  const now = new Date().toISOString();
  const user = getUser();
  const item = {
    item_id: genId('item'),
    family_id: 'fam_default',
    space_id: data.space_id,
    name: data.name,
    category: data.category || 'cat_other',
    quantity: data.quantity || 1,
    purchase_date: data.purchase_date || '',
    expire_date: data.expire_date || '',
    brand: data.brand || '',
    price: data.price || 0,
    remark: data.remark || '',
    photos: data.photos || [],
    status: 'normal',
    handle_type: '',
    creator_id: user ? user.user_id : '',
    created_at: now,
    updated_at: now
  };
  // 自动计算状态
  const config = getReminderConfig();
  const maxAdvance = Math.max(...config.advance_days, 7);
  item.status = getItemStatus(item, maxAdvance);
  items.push(item);
  write(STORAGE_KEYS.ITEMS, items);
  syncSpaceItemCount(item.space_id);
  return item;
}

function updateItem(itemId, updates) {
  const items = getItems();
  const idx = items.findIndex(i => i.item_id === itemId);
  if (idx === -1) return null;
  const oldSpaceId = items[idx].space_id;
  items[idx] = { ...items[idx], ...updates, updated_at: new Date().toISOString() };
  // 重新计算状态
  const config = getReminderConfig();
  const maxAdvance = Math.max(...config.advance_days, 7);
  if (updates.expire_date !== undefined || updates.handle_type !== undefined) {
    items[idx].status = getItemStatus(items[idx], maxAdvance);
  }
  write(STORAGE_KEYS.ITEMS, items);
  // 如果空间变了，同步两个空间的计数
  if (updates.space_id && updates.space_id !== oldSpaceId) {
    syncSpaceItemCount(oldSpaceId);
    syncSpaceItemCount(updates.space_id);
  }
  return items[idx];
}

function deleteItem(itemId) {
  const items = getItems();
  const item = items.find(i => i.item_id === itemId);
  if (!item) return false;
  const filtered = items.filter(i => i.item_id !== itemId);
  write(STORAGE_KEYS.ITEMS, filtered);
  syncSpaceItemCount(item.space_id);
  return true;
}

function deleteItems(itemIds) {
  const items = getItems();
  const toDelete = items.filter(i => itemIds.includes(i.item_id));
  const filtered = items.filter(i => !itemIds.includes(i.item_id));
  write(STORAGE_KEYS.ITEMS, filtered);
  // 同步受影响的空间计数
  const affectedSpaces = [...new Set(toDelete.map(i => i.space_id))];
  affectedSpaces.forEach(sid => syncSpaceItemCount(sid));
  return true;
}

// 批量移动物品
function moveItems(itemIds, targetSpaceId) {
  const items = getItems();
  const now = new Date().toISOString();
  const affectedSpaces = new Set();
  items.forEach(item => {
    if (itemIds.includes(item.item_id)) {
      affectedSpaces.add(item.space_id);
      item.space_id = targetSpaceId;
      item.updated_at = now;
    }
  });
  affectedSpaces.add(targetSpaceId);
  write(STORAGE_KEYS.ITEMS, items);
  affectedSpaces.forEach(sid => syncSpaceItemCount(sid));
  return true;
}

// 搜索物品
function searchItems(keyword) {
  if (!keyword || !keyword.trim()) return [];
  const kw = keyword.trim().toLowerCase();
  return getItems().filter(i =>
    i.name.toLowerCase().includes(kw) ||
    (i.brand && i.brand.toLowerCase().includes(kw)) ||
    (i.remark && i.remark.toLowerCase().includes(kw))
  );
}

// 获取临期物品
function getExpiringItems(advanceDays) {
  const items = getItems();
  const maxAdvance = advanceDays || 7;
  return items.filter(i => {
    if (i.status === 'handled') return false;
    if (!i.expire_date) return false;
    const days = daysFromToday(i.expire_date);
    return days >= 0 && days <= maxAdvance;
  }).sort((a, b) => daysFromToday(a.expire_date) - daysFromToday(b.expire_date));
}

// 获取已过期物品
function getExpiredItems() {
  const items = getItems();
  return items.filter(i => {
    if (i.status === 'handled') return false;
    if (!i.expire_date) return false;
    return daysFromToday(i.expire_date) < 0;
  }).sort((a, b) => daysFromToday(a.expire_date) - daysFromToday(b.expire_date));
}

// 获取过期相关物品（临期+已过期）
function getExpireRelatedItems(advanceDays) {
  return [...getExpiringItems(advanceDays), ...getExpiredItems()];
}

// ============ 分类管理 ============

function getCategories() {
  return read(STORAGE_KEYS.CATEGORIES, PRESET_CATEGORIES);
}

function getPresetCategories() {
  return getCategories().filter(c => c.is_preset);
}

function getCustomCategories() {
  return getCategories().filter(c => !c.is_preset);
}

function addCategory(name) {
  const categories = getCategories();
  const cat = {
    category_id: genId('cat'),
    family_id: 'fam_default',
    name: name,
    is_preset: false,
    created_at: new Date().toISOString()
  };
  categories.push(cat);
  write(STORAGE_KEYS.CATEGORIES, categories);
  return cat;
}

function deleteCategory(categoryId) {
  const categories = getCategories();
  const cat = categories.find(c => c.category_id === categoryId);
  if (!cat || cat.is_preset) return false;
  // 检查是否有物品使用
  const items = getItems();
  const usedCount = items.filter(i => i.category === categoryId).length;
  if (usedCount > 0) {
    // 将使用该分类的物品改为"其他"
    items.forEach(i => {
      if (i.category === categoryId) i.category = 'cat_other';
    });
    write(STORAGE_KEYS.ITEMS, items);
  }
  const filtered = categories.filter(c => c.category_id !== categoryId);
  write(STORAGE_KEYS.CATEGORIES, filtered);
  return true;
}

// 刷新所有物品状态（提醒设置变更后调用）
function refreshAllItemStatus() {
  const items = getItems();
  const config = getReminderConfig();
  const maxAdvance = Math.max(...config.advance_days, 7);
  let changed = false;
  items.forEach(item => {
    if (item.status === 'handled') return;
    const newStatus = getItemStatus(item, maxAdvance);
    if (item.status !== newStatus) {
      item.status = newStatus;
      changed = true;
    }
  });
  if (changed) write(STORAGE_KEYS.ITEMS, items);
}

module.exports = {
  // 用户 & 家庭
  login,
  getUser,
  updateUser,
  getFamily,
  updateFamily,
  // 提醒设置
  getReminderConfig,
  updateReminderConfig,
  // 空间
  getSpaces,
  getSpace,
  addSpace,
  updateSpace,
  deleteSpace,
  syncSpaceItemCount,
  getRootSpaces,
  getChildSpaces,
  getSpacePath,
  getDescendantSpaceIds,
  // 物品
  getItems,
  getItem,
  getItemsBySpace,
  addItem,
  updateItem,
  deleteItem,
  deleteItems,
  moveItems,
  searchItems,
  getExpiringItems,
  getExpiredItems,
  getExpireRelatedItems,
  // 分类
  getCategories,
  getPresetCategories,
  getCustomCategories,
  addCategory,
  deleteCategory,
  refreshAllItemStatus
};
