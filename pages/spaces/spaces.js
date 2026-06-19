// pages/spaces/spaces.js — 空间管理列表
const app = getApp();
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

Page({
  data: {
    spaces: [],
    items: [],
    manageMode: false,
    selectedIds: []
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
    const spaces = store.getSpaces();
    const items = store.getItems();
    this.setData({ spaces, items, manageMode: false, selectedIds: [] });
  },

  onSpaceTap(e) {
    if (this.data.manageMode) {
      this.toggleSelect(e.detail.space.space_id);
      return;
    }
    wx.navigateTo({ url: `/pages/space-detail/space-detail?id=${e.detail.space.space_id}` });
  },

  onSpaceLongPress(e) {
    const space = e.detail.space;
    this.showSpaceActions(space);
  },

  showSpaceActions(space) {
    const isAdmin = app.isAdmin();
    const canEdit = app.canEdit(space.creator_id);
    const actions = [];
    if (canEdit) {
      actions.push('编辑空间');
    }
    actions.push('删除空间');

    wx.showActionSheet({
      itemList: actions,
      itemColor: '#2D2A26',
      success: (res) => {
        const action = actions[res.tapIndex];
        if (action === '编辑空间') {
          wx.navigateTo({ url: `/pages/space-edit/space-edit?id=${space.space_id}` });
        } else if (action === '删除空间') {
          this.confirmDelete(space);
        }
      }
    });
  },

  async confirmDelete(space) {
    // 先检查是否有物品（不执行删除）
    const items = store.getItemsBySpace(space.space_id);
    if (items.length > 0) {
      util.toast(`该空间下还有${items.length}个物品，请先迁移或删除物品`);
      return;
    }
    // 确认后再删除
    const ok = await util.confirm(`确认删除空间「${space.name}」？此操作不可撤销`);
    if (ok) {
      store.deleteSpace(space.space_id);
      this.setData({ spaces: store.getSpaces() });
      util.toast('已删除', 'success');
    }
  },

  goAddSpace() {
    wx.navigateTo({ url: '/pages/space-edit/space-edit' });
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

  onShareAppMessage() {
    return { title: '物归 — 家庭物品管理', path: '/pages/index/index' };
  }
});
