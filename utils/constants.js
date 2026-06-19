// utils/constants.js — 常量定义

// 预设分类
const PRESET_CATEGORIES = [
  { category_id: 'cat_food', name: '食品', icon: '🍜', is_preset: true },
  { category_id: 'cat_medicine', name: '药品', icon: '💊', is_preset: true },
  { category_id: 'cat_daily', name: '日用品', icon: '🧴', is_preset: true },
  { category_id: 'cat_clothing', name: '衣物', icon: '👕', is_preset: true },
  { category_id: 'cat_electronics', name: '电子产品', icon: '📱', is_preset: true },
  { category_id: 'cat_tool', name: '工具', icon: '🔧', is_preset: true },
  { category_id: 'cat_document', name: '文件证件', icon: '📋', is_preset: true },
  { category_id: 'cat_other', name: '其他', icon: '📦', is_preset: true }
];

// 空间图标
const SPACE_ICONS = [
  { id: 'icon_living', emoji: '🛋️', name: '客厅' },
  { id: 'icon_kitchen', emoji: '🍳', name: '厨房' },
  { id: 'icon_bedroom', emoji: '🛏️', name: '卧室' },
  { id: 'icon_bathroom', emoji: '🚿', name: '卫生间' },
  { id: 'icon_study', emoji: '📚', name: '书房' },
  { id: 'icon_balcony', emoji: '🌿', name: '阳台' },
  { id: 'icon_storage', emoji: '🗃️', name: '储物间' },
  { id: 'icon_fridge', emoji: '🧊', name: '冰箱' },
  { id: 'icon_wardrobe', emoji: '👔', name: '衣柜' },
  { id: 'icon_box', emoji: '📦', name: '收纳箱' },
  { id: 'icon_door', emoji: '🚪', name: '玄关' },
  { id: 'icon_other', emoji: '🏠', name: '其他' }
];

// 物品状态
const ITEM_STATUS = {
  NORMAL: 'normal',
  EXPIRING_SOON: 'expiring_soon',
  EXPIRED: 'expired',
  HANDLED: 'handled'
};

// 处理类型
const HANDLE_TYPE = {
  CONSUMED: 'consumed',   // 已消耗
  DISCARDED: 'discarded', // 已丢弃
  HANDLED: 'handled'      // 已处理
};

const HANDLE_TYPE_LABELS = {
  consumed: '已消耗',
  discarded: '已丢弃',
  handled: '已处理'
};

// 提前提醒天数选项
const REMIND_DAYS_OPTIONS = [
  { value: 30, label: '30天' },
  { value: 14, label: '14天' },
  { value: 7, label: '7天' },
  { value: 3, label: '3天' },
  { value: 1, label: '1天' }
];

// 默认提醒设置
const DEFAULT_REMINDER_CONFIG = {
  enabled: true,
  advance_days: [7, 3],
  quiet_hours: { start: '21:00', end: '09:00' },
  weekly_summary: false
};

// 存储键名
const STORAGE_KEYS = {
  USER: 'wugui_user',
  FAMILY: 'wugui_family',
  SPACES: 'wugui_spaces',
  ITEMS: 'wugui_items',
  CATEGORIES: 'wugui_categories',
  REMINDER: 'wugui_reminder',
  COUNTER: 'wugui_counter'
};

module.exports = {
  PRESET_CATEGORIES,
  SPACE_ICONS,
  ITEM_STATUS,
  HANDLE_TYPE,
  HANDLE_TYPE_LABELS,
  REMIND_DAYS_OPTIONS,
  DEFAULT_REMINDER_CONFIG,
  STORAGE_KEYS
};
