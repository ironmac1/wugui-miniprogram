// pages/items/items.js — 全部物品（带筛选）
const app = getApp();
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

Page({
  data: {
    items: [],
    allItems: [],
    categories: [],
    spaces: [],
    spaceNames: {},
    maxAdvanceDays: 7,
    sortBy: 'expire',
    sortLabel: '按过期临期',
    filterSpace: '',      // 空间筛选
    filterCategory: '',   // 分类筛选
    filterExpire: '',     // 过期状态筛选: '' / expiring / expired / none
    showSortPicker: false,
    showFilterPanel: false,
    manageMode: false,
    selectedIds: [],
    sortOptions: [
      { value: 'expire', label: '按过期临期' },
      { value: 'created_desc', label: '最近添加' },
      { value: 'name', label: '按名称' }
    ]
  },

  onShow() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  loadData() {
    app.refreshData();
    const items = store.getItems();
    const categories = store.getCategories();
    const spaces = store.getSpaces();
    const config = store.getReminderConfig();
    const maxAdvance = Math.max(...config.advance_days, 7);

    const spaceNames = {};
    spaces.forEach(s => { spaceNames[s.space_id] = s.name; });

    this.setData({
      allItems: items,
      categories,
      spaces,
      spaceNames,
      maxAdvanceDays: maxAdvance
    });

    this.applyFilters();
  },

  applyFilters() {
    let items = [...this.data.allItems];

    // 空间筛选
    if (this.data.filterSpace) {
      items = items.filter(i => i.space_id === this.data.filterSpace);
    }
    // 分类筛选
    if (this.data.filterCategory) {
      items = items.filter(i => i.category === this.data.filterCategory);
    }
    // 过期状态筛选
    if (this.data.filterExpire) {
      const maxAdv = this.data.maxAdvanceDays;
      items = items.filter(i => {
        const status = util.getItemStatus(i, maxAdv);
        if (this.data.filterExpire === 'expiring') return status === 'expiring_soon';
        if (this.data.filterExpire === 'expired') return status === 'expired';
        if (this.data.filterExpire === 'none') return !i.expire_date;
        return true;
      });
    }

    // 排序
    items = this.sortItems(items, this.data.sortBy);

    this.setData({ items });
  },

  sortItems(items, sortBy) {
    const arr = [...items];
    const maxAdv = this.data.maxAdvanceDays || 7;
    switch (sortBy) {
      case 'name':
        return arr.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
      case 'expire':
        // 已过期排最前，然后临期按日期升序，最后无过期日期的
        return arr.sort((a, b) => {
          const sa = util.getItemStatus(a, maxAdv);
          const sb = util.getItemStatus(b, maxAdv);
          // 已过期最优先
          if (sa === 'expired' && sb !== 'expired') return -1;
          if (sb === 'expired' && sa !== 'expired') return 1;
          // 都有过期日期，按日期升序
          if (a.expire_date && b.expire_date) return a.expire_date.localeCompare(b.expire_date);
          if (a.expire_date && !b.expire_date) return -1;
          if (!a.expire_date && b.expire_date) return 1;
          return 0;
        });
      default:
        return arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  },

  onItemTap(e) {
    if (this.data.manageMode) {
      this.toggleSelect(e.detail.item.item_id);
      return;
    }
    wx.navigateTo({ url: `/pages/item-edit/item-edit?id=${e.detail.item.item_id}` });
  },

  // 消耗物品
  onConsumeItem(e) {
    const item = e.detail.item;
    if (item.quantity <= 1) {
      wx.showModal({
        title: '提示',
        content: `「${item.name}」数量为1，消耗后将被删除，确认？`,
        confirmColor: '#7C6A58',
        success: (res) => {
          if (res.confirm) {
            store.deleteItem(item.item_id);
            util.toast('已消耗', 'success');
            this.loadData();
          }
        }
      });
    } else {
      store.updateItem(item.item_id, { quantity: item.quantity - 1 });
      util.toast('已消耗1个', 'success');
      this.loadData();
    }
  },

  // 排序
  toggleSortPicker() {
    this.setData({ showSortPicker: !this.data.showSortPicker });
  },

  chooseSort(e) {
    const sortBy = e.currentTarget.dataset.value;
    const labels = { 'created_desc': '最近添加', 'name': '按名称', 'expire': '按过期日期' };
    this.setData({ sortBy, sortLabel: labels[sortBy], showSortPicker: false });
    this.applyFilters();
  },

  // 筛选面板
  toggleFilterPanel() {
    this.setData({ showFilterPanel: !this.data.showFilterPanel });
  },

  onFilterSpace(e) {
    this.setData({ filterSpace: e.currentTarget.dataset.id });
    this.applyFilters();
  },

  onFilterCategory(e) {
    this.setData({ filterCategory: e.currentTarget.dataset.id });
    this.applyFilters();
  },

  onFilterExpire(e) {
    this.setData({ filterExpire: e.currentTarget.dataset.value });
    this.applyFilters();
  },

  resetFilters() {
    this.setData({
      filterSpace: '',
      filterCategory: '',
      filterExpire: ''
    });
    this.applyFilters();
  },

  // 管理模式
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
    this.setData({ selectedIds: this.data.items.map(i => i.item_id) });
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
  },

  batchMove() {
    if (this.data.selectedIds.length === 0) {
      util.toast('请先选择物品');
      return;
    }
    const spaces = store.getSpaces();
    wx.showActionSheet({
      itemList: spaces.map(s => s.name),
      success: (res) => {
        const target = spaces[res.tapIndex];
        store.moveItems(this.data.selectedIds, target.space_id);
        util.toast(`已移动至「${target.name}」`, 'success');
        this.setData({ manageMode: false, selectedIds: [] });
        this.loadData();
      }
    });
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  }
});
