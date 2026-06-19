// pages/expired/expired.js — 临期/过期物品列表
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

Page({
  data: {
    activeTab: 'expiring',  // expiring / expired
    expiringItems: [],
    expiredItems: [],
    categories: [],
    spaces: [],
    spaceNames: {},
    maxAdvanceDays: 7,
    manageMode: false,
    selectedIds: []
  },

  onLoad(options) {
    if (options.type) {
      this.setData({ activeTab: options.type });
    }
  },

  onShow() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  loadData() {
    const categories = store.getCategories();
    const spaces = store.getSpaces();
    const config = store.getReminderConfig();
    const maxAdvance = Math.max(...config.advance_days, 7);
    const spaceNames = {};
    spaces.forEach(s => { spaceNames[s.space_id] = s.name; });

    this.setData({
      categories,
      spaces,
      spaceNames,
      maxAdvanceDays: maxAdvance,
      expiringItems: store.getExpiringItems(maxAdvance),
      expiredItems: store.getExpiredItems()
    });
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab, manageMode: false, selectedIds: [] });
  },

  onItemTap(e) {
    if (this.data.manageMode) {
      this.toggleSelect(e.detail.item.item_id);
      return;
    }
    wx.navigateTo({ url: `/pages/item-detail/item-detail?id=${e.detail.item.item_id}` });
  },

  toggleManage() {
    this.setData({ manageMode: !this.data.manageMode, selectedIds: [] });
  },

  toggleSelect(e) {
    const id = typeof e === 'string' ? e : (e.currentTarget.dataset.id || e);
    const ids = [...this.data.selectedIds];
    const idx = ids.indexOf(id);
    if (idx > -1) ids.splice(idx, 1);
    else ids.push(id);
    this.setData({ selectedIds: ids });
  },

  selectAll() {
    const items = this.data.activeTab === 'expiring' ? this.data.expiringItems : this.data.expiredItems;
    this.setData({ selectedIds: items.map(i => i.item_id) });
  },

  // 批量处理
  batchHandle(e) {
    const type = e.currentTarget.dataset.type;
    if (this.data.selectedIds.length === 0) {
      util.toast('请先选择物品');
      return;
    }
    if (this.data.selectedIds.length > 50) {
      util.toast('一次最多处理50个');
      return;
    }
    const labels = { consumed: '已消耗', discarded: '已丢弃', handled: '已处理' };
    this.data.selectedIds.forEach(id => {
      store.updateItem(id, { status: 'handled', handle_type: type });
    });
    util.toast(`已标记${labels[type]}`, 'success');
    this.setData({ manageMode: false, selectedIds: [] });
    this.loadData();
  },

  async batchDelete() {
    if (this.data.selectedIds.length === 0) {
      util.toast('请先选择物品');
      return;
    }
    const ok = await util.confirm(`确认删除选中的 ${this.data.selectedIds.length} 个物品？此操作不可撤销`);
    if (ok) {
      store.deleteItems(this.data.selectedIds);
      util.toast('删除成功', 'success');
      this.setData({ manageMode: false, selectedIds: [] });
      this.loadData();
    }
  }
});
