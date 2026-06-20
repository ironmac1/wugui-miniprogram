// utils/util.js — 工具函数

// 生成唯一 ID
function genId(prefix) {
  prefix = prefix || 'id';
  return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
}

// 格式化日期 YYYY-MM-DD
function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') date = new Date(date);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 格式化日期时间
function formatDateTime(date) {
  if (!date) return '';
  if (typeof date === 'string') date = new Date(date);
  return formatDate(date) + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

// 获取今天的日期字符串
function today() {
  return formatDate(new Date());
}

// 计算距今天数（正数=未来，负数=过去）
function daysFromToday(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((date - now) / (1000 * 60 * 60 * 24));
}

// 获取物品过期状态
function getItemStatus(item, advanceDays) {
  if (item.status === 'handled') return 'handled';
  if (!item.expire_date) return 'normal';
  const days = daysFromToday(item.expire_date);
  if (days < 0) return 'expired';
  if (days <= (advanceDays || 7)) return 'expiring_soon';
  return 'normal';
}

// 获取状态标签信息
function getStatusTag(item, advanceDays) {
  const status = getItemStatus(item, advanceDays);
  switch (status) {
    case 'expired':
      return { text: '已过期', class: 'tag-danger', status: 'expired' };
    case 'expiring_soon': {
      const days = daysFromToday(item.expire_date);
      const text = days === 0 ? '今天过期' : `${days}天后过期`;
      return { text, class: 'tag-warning', status: 'expiring_soon' };
    }
    case 'handled':
      return { text: '已处理', class: 'tag-default', status: 'handled' };
    default:
      return null;
  }
}

// 获取分类名称
function getCategoryName(categories, categoryId) {
  const cat = categories.find(c => c.category_id === categoryId);
  return cat ? cat.name : '其他';
}

// 获取分类图标
function getCategoryIcon(categories, categoryId) {
  const cat = categories.find(c => c.category_id === categoryId);
  return cat ? cat.icon : '📦';
}

// 获取空间图标
function getSpaceIcon(icons, iconId) {
  const icon = icons.find(i => i.id === iconId);
  return icon ? icon.emoji : '🏠';
}

// 防抖
function debounce(fn, delay) {
  let timer = null;
  return function () {
    const args = arguments;
    const ctx = this;
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(ctx, args), delay || 300);
  };
}

// 安全震动（不阻断后续逻辑）
function vibrate(type) {
  try {
    wx.vibrateShort({
      type: type || 'light',
      fail: () => {}
    });
  } catch (e) {}
}

// 显示提示
function toast(title, icon) {
  wx.showToast({ title, icon: icon || 'none', duration: 2000 });
}

// 显示加载
function loading(title) {
  wx.showLoading({ title: title || '加载中', mask: true });
}

function hideLoading() {
  wx.hideLoading();
}

// 确认弹窗
function confirm(content, title) {
  return new Promise((resolve) => {
    wx.showModal({
      title: title || '提示',
      content: content,
      confirmColor: '#C0623E',
      success: (res) => resolve(res.confirm)
    });
  });
}

// 深拷贝
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// 价格格式化
function formatPrice(price) {
  if (!price && price !== 0) return '';
  return '¥' + Number(price).toFixed(2);
}

module.exports = {
  genId,
  formatDate,
  formatDateTime,
  today,
  daysFromToday,
  getItemStatus,
  getStatusTag,
  getCategoryName,
  getCategoryIcon,
  getSpaceIcon,
  debounce,
  toast,
  vibrate,
  loading,
  hideLoading,
  confirm,
  deepClone,
  formatPrice
};
