// pages/index/index.js — 首页
const app = getApp();
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');
const { SPACE_ICONS } = require('../../utils/constants.js');

function getSpaceEmoji(iconId) {
  const icon = SPACE_ICONS.find(i => i.id === iconId);
  return icon ? icon.emoji : '🏠';
}

Page({
  data: {
    user: null,
    expiringItems: [],   // 临期物品
    expiredItems: [],    // 已过期物品
    spaces: [],
    categories: [],
    maxAdvanceDays: 7,
    showExpiringPanel: true,
    showExpiredPanel: true,
    quickAddVisible: false,
    quickAddName: '',
    quickAddSpaceId: '',
    quickAddSpaceIndex: 0,
    quickAddSpaceName: '',
    spaceNames: {},
    todayDate: '',
    totalItems: 0
  },

  onLoad() {
    this.loadToday();
  },

  onShow() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  loadToday() {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const d = new Date();
    this.setData({
      todayDate: `${d.getMonth() + 1}月${d.getDate()}日 星期${days[d.getDay()]}`
    });
  },

  loadData() {
    app.refreshData();
    const user = app.globalData.user;
    const family = app.globalData.family;
    const spaces = store.getSpaces();
    const items = store.getItems();
    const categories = store.getCategories();
    const config = store.getReminderConfig();

    const maxAdvance = Math.max(...config.advance_days, 7);
    const expiringItems = store.getExpiringItems(maxAdvance);
    const expiredItems = store.getExpiredItems();

    // 空间名映射 + 图标 emoji
    const spaceNames = {};
    spaces.forEach(s => { spaceNames[s.space_id] = s.name; });

    // 给 spaces 加上 emoji 用于首页展示
    const spacesWithEmoji = spaces.map(s => ({ ...s, iconEmoji: getSpaceEmoji(s.icon) }));

    this.setData({
      user,
      family,
      spaces: spacesWithEmoji.slice(0, 6),
      categories,
      maxAdvanceDays: maxAdvance,
      expiringItems: expiringItems.slice(0, 5),
      expiredItems: expiredItems.slice(0, 5),
      spaceNames,
      totalItems: items.length,
      quickAddSpaceId: spaces.length > 0 ? spaces[0].space_id : '',
      quickAddSpaceIndex: 0,
      quickAddSpaceName: spaces.length > 0 ? spaces[0].name : ''
    });
  },

  // 快速添加
  openQuickAdd() {
    if (this.data.spaces.length === 0) {
      util.toast('请先创建一个空间');
      wx.navigateTo({ url: '/pages/space-edit/space-edit' });
      return;
    }
    this.setData({ quickAddVisible: true, quickAddName: '' });
  },

  closeQuickAdd() {
    this.setData({ quickAddVisible: false });
  },

  onQuickAddName(e) {
    this.setData({ quickAddName: e.detail.value });
  },

  onQuickAddSpaceChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      quickAddSpaceIndex: idx,
      quickAddSpaceId: this.data.spaces[idx].space_id,
      quickAddSpaceName: this.data.spaces[idx].name
    });
  },

  doQuickAdd() {
    const name = this.data.quickAddName.trim();
    if (!name) {
      util.toast('请输入物品名称');
      return;
    }
    store.addItem({
      name,
      space_id: this.data.quickAddSpaceId,
      quantity: 1
    });
    this.setData({ quickAddVisible: false, quickAddName: '' });
    util.toast('添加成功', 'success');
    this.loadData();
  },

  // 点击临期/过期物品
  onExpiringTap(e) {
    wx.navigateTo({ url: `/pages/item-detail/item-detail?id=${e.detail.item.item_id}` });
  },

  onExpiredTap(e) {
    wx.navigateTo({ url: `/pages/item-detail/item-detail?id=${e.detail.item.item_id}` });
  },

  // 点击空间
  onSpaceTap(e) {
    wx.navigateTo({ url: `/pages/space-detail/space-detail?id=${e.detail.space.space_id}` });
  },

  // 首页空间格子点击
  onTileTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/space-detail/space-detail?id=${id}` });
  },

  // 查看全部临期/过期
  viewAllExpiring() {
    wx.navigateTo({ url: '/pages/expired/expired?type=expiring' });
  },

  viewAllExpired() {
    wx.navigateTo({ url: '/pages/expired/expired?type=expired' });
  },

  // 折叠面板
  toggleExpiring() {
    this.setData({ showExpiringPanel: !this.data.showExpiringPanel });
  },

  toggleExpired() {
    this.setData({ showExpiredPanel: !this.data.showExpiredPanel });
  },

  // 搜索
  goToSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  // 去空间管理
  goToSpaces() {
    wx.switchTab({ url: '/pages/spaces/spaces' });
  },

  // 去全部物品
  goToItems() {
    wx.switchTab({ url: '/pages/items/items' });
  },

  // 去临期过期页
  goToExpired() {
    wx.navigateTo({ url: '/pages/expired/expired?type=expiring' });
  },

  goCreateSpace() {
    wx.navigateTo({ url: '/pages/space-edit/space-edit' });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '物归 — 让家庭物品找得到、管得住、不忘过期',
      path: '/pages/index/index'
    };
  }
});
