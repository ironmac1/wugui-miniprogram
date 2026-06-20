// pages/spaces/spaces.js — 空间管理列表（顶级空间）
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
    const spaces = store.getRootSpaces();
    const items = store.getItems();
    // 给每个空间加上子空间数量和图标
    spaces.forEach(s => {
      s.child_count = store.getChildSpaces(s.space_id).length;
      s.iconEmoji = getSpaceEmoji(s.icon);
    });
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
    const canEdit = app.canEdit(space.creator_id);
    const actions = [];
    if (canEdit) {
      actions.push('编辑空间');
      actions.push('添加子空间');
    }
    actions.push('删除空间');

    wx.showActionSheet({
      itemList: actions,
      itemColor: '#2B2825',
      success: (res) => {
        const action = actions[res.tapIndex];
        if (action === '编辑空间') {
          wx.navigateTo({ url: `/pages/space-edit/space-edit?id=${space.space_id}` });
        } else if (action === '添加子空间') {
          wx.navigateTo({ url: `/pages/space-edit/space-edit?parent_id=${space.space_id}` });
        } else if (action === '删除空间') {
          this.confirmDelete(space);
        }
      }
    });
  },

  async confirmDelete(space) {
    // 先检查子空间和物品（不执行删除）
    const childSpaces = store.getChildSpaces(space.space_id);
    if (childSpaces.length > 0) {
      util.toast(`该空间下有${childSpaces.length}个子空间，请先删除子空间`);
      return;
    }
    const spaceItems = store.getItemsBySpace(space.space_id);
    if (spaceItems.length > 0) {
      util.toast(`该空间下有${spaceItems.length}个物品，请先迁移或删除物品`);
      return;
    }
    const ok = await util.confirm(`确认删除空间「${space.name}」？此操作不可撤销`);
    if (ok) {
      store.deleteSpace(space.space_id);
      this.setData({ spaces: store.getRootSpaces() });
      util.toast('已删除', 'success');
    }
  },

  goAddSpace() {
    wx.navigateTo({ url: '/pages/space-edit/space-edit' });
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

  onShareAppMessage() {
    return { title: '物归 — 家庭物品管理', path: '/pages/index/index' };
  }
});
