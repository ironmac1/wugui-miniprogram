// pages/space-detail/space-detail.js — 空间详情（子空间 + 物品列表）
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
    space: null,
    spaceIcon: '🏠',
    breadcrumb: [],      // 面包屑路径
    childSpaces: [],     // 子空间
    items: [],
    categories: [],
    maxAdvanceDays: 7,
    sortBy: 'created_desc',
    sortLabel: '最近添加',
    manageMode: false,
    selectedIds: [],
    showSortPicker: false,
    canEdit: false
  },

  onLoad(options) {
    this.spaceId = options.id;
  },

  onShow() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  loadData() {
    const space = store.getSpace(this.spaceId);
    if (!space) {
      util.toast('空间不存在');
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    const iconObj = SPACE_ICONS.find(i => i.id === space.icon);
    let items = store.getItemsBySpace(this.spaceId);
    const categories = store.getCategories();
    const config = store.getReminderConfig();
    const maxAdvance = Math.max(...config.advance_days, 7);

    // 子空间
    const childSpaces = store.getChildSpaces(this.spaceId).map(s => ({
      ...s,
      iconEmoji: getSpaceEmoji(s.icon),
      child_count: store.getChildSpaces(s.space_id).length
    }));

    // 面包屑
    const breadcrumb = store.getSpacePath(this.spaceId).map(s => ({
      ...s,
      iconEmoji: getSpaceEmoji(s.icon)
    }));

    items = this.sortItems(items, this.data.sortBy);

    wx.setNavigationBarTitle({ title: space.name });

    this.setData({
      space,
      spaceIcon: iconObj ? iconObj.emoji : '🏠',
      breadcrumb,
      childSpaces,
      items,
      categories,
      maxAdvanceDays: maxAdvance,
      canEdit: app.canEdit(space.creator_id)
    });
  },

  sortItems(items, sortBy) {
    const arr = [...items];
    switch (sortBy) {
      case 'name': return arr.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
      case 'expire': return arr.sort((a, b) => {
        if (!a.expire_date) return 1;
        if (!b.expire_date) return -1;
        return a.expire_date.localeCompare(b.expire_date);
      });
      default: return arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  },

  // 点击子空间
  onChildSpaceTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/space-detail/space-detail?id=${id}` });
  },

  // 面包屑点击
  onBreadcrumbTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id === this.spaceId) return;
    wx.redirectTo({ url: `/pages/space-detail/space-detail?id=${id}` });
  },

  onItemTap(e) {
    if (this.data.manageMode) {
      const id = typeof e === 'string' ? e : (e.currentTarget.dataset.id || e.detail.item.item_id);
      this.toggleSelect(id);
      return;
    }
    wx.navigateTo({ url: `/pages/item-detail/item-detail?id=${e.detail.item.item_id}` });
  },

  goAddItem() {
    wx.navigateTo({ url: `/pages/item-edit/item-edit?space_id=${this.spaceId}` });
  },

  goAddChildSpace() {
    wx.navigateTo({ url: `/pages/space-edit/space-edit?parent_id=${this.spaceId}` });
  },

  goEditSpace() {
    wx.navigateTo({ url: `/pages/space-edit/space-edit?id=${this.spaceId}` });
  },

  toggleSortPicker() {
    this.setData({ showSortPicker: !this.data.showSortPicker });
  },

  chooseSort(e) {
    const sortBy = e.currentTarget.dataset.value;
    const labels = { 'created_desc': '最近添加', 'name': '按名称', 'expire': '按过期日期' };
    const items = this.sortItems(this.data.items, sortBy);
    this.setData({ sortBy, sortLabel: labels[sortBy], showSortPicker: false, items });
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
    this.setData({ selectedIds: this.data.items.map(i => i.item_id) });
  },

  async batchDelete() {
    if (this.data.selectedIds.length === 0) { util.toast('请先选择物品'); return; }
    const ok = await util.confirm(`确认删除选中的 ${this.data.selectedIds.length} 个物品？此操作不可撤销`);
    if (ok) {
      store.deleteItems(this.data.selectedIds);
      util.toast('删除成功', 'success');
      this.setData({ manageMode: false, selectedIds: [] });
      this.loadData();
    }
  },

  batchMove() {
    if (this.data.selectedIds.length === 0) { util.toast('请先选择物品'); return; }
    const spaces = store.getSpaces().filter(s => s.space_id !== this.spaceId);
    if (spaces.length === 0) { util.toast('没有其他可移动的空间'); return; }
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
  }
});
