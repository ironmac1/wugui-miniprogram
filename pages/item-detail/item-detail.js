// pages/item-detail/item-detail.js — 物品详情
const app = getApp();
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');
const { getStatusTag, getCategoryName, getCategoryIcon, daysFromToday, formatPrice, formatDateTime } = util;

Page({
  data: {
    item: null,
    space: null,
    catName: '',
    catIcon: '📦',
    tag: null,
    daysLeft: null,
    canEdit: false,
    showActionSheet: false,
    showHandleSheet: false,
    photos: [],
    previewPhotos: [],
    creatorName: '',
    handleTypeLabels: { consumed: '已消耗', discarded: '已丢弃', handled: '已处理' }
  },

  onLoad(options) {
    this.itemId = options.id;
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const item = store.getItem(this.itemId);
    if (!item) {
      util.toast('物品不存在');
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    const space = store.getSpace(item.space_id);
    const categories = store.getCategories();
    const config = store.getReminderConfig();
    const maxAdvance = Math.max(...config.advance_days, 7);
    const tag = getStatusTag(item, maxAdvance);
    const catName = getCategoryName(categories, item.category);
    const catIcon = getCategoryIcon(categories, item.category);
    const days = item.expire_date ? daysFromToday(item.expire_date) : null;

    this.setData({
      item,
      space,
      catName,
      catIcon,
      tag,
      daysLeft: days,
      canEdit: app.canEdit(item.creator_id),
      photos: item.photos || [],
      previewPhotos: (item.photos || []).map(p => p.url || p),
      creatorName: item.creator_id === app.globalData.user.user_id ? '我' : '家庭成员'
    });

    wx.setNavigationBarTitle({ title: item.name });
  },

  // 预览照片
  previewPhoto(e) {
    const idx = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.previewPhotos[idx],
      urls: this.data.previewPhotos
    });
  },

  // 编辑
  goEdit() {
    wx.navigateTo({ url: `/pages/item-edit/item-edit?id=${this.itemId}` });
  },

  // 更多操作
  showActions() {
    const isAdmin = app.isAdmin();
    const canEdit = this.data.canEdit;
    const actions = [];
    if (canEdit) {
      actions.push('编辑物品');
      actions.push('移动到其他空间');
    }
    if (this.data.item.status === 'expired' || this.data.item.status === 'expiring_soon') {
      actions.push('标记处理状态');
    }
    if (canEdit) {
      actions.push('删除物品');
    }

    wx.showActionSheet({
      itemList: actions,
      itemColor: '#2D2A26',
      success: (res) => {
        const action = actions[res.tapIndex];
        if (action === '编辑物品') {
          this.goEdit();
        } else if (action === '移动到其他空间') {
          this.showMovePicker();
        } else if (action === '标记处理状态') {
          this.setData({ showHandleSheet: true });
        } else if (action === '删除物品') {
          this.confirmDelete();
        }
      }
    });
  },

  // 移动空间
  showMovePicker() {
    const spaces = store.getSpaces().filter(s => s.space_id !== this.data.item.space_id);
    if (spaces.length === 0) {
      util.toast('没有其他可移动的空间');
      return;
    }
    wx.showActionSheet({
      itemList: spaces.map(s => s.name),
      success: (res) => {
        const target = spaces[res.tapIndex];
        store.updateItem(this.itemId, { space_id: target.space_id });
        util.toast(`已移动至「${target.name}」`, 'success');
        this.loadData();
      }
    });
  },

  // 标记处理
  chooseHandle(e) {
    const type = e.currentTarget.dataset.type;
    store.updateItem(this.itemId, { status: 'handled', handle_type: type });
    util.toast('已标记', 'success');
    this.setData({ showHandleSheet: false });
    this.loadData();
  },

  closeHandleSheet() {
    this.setData({ showHandleSheet: false });
  },

  // 删除
  async confirmDelete() {
    const ok = await util.confirm(`确认删除「${this.data.item.name}」？此操作不可撤销`);
    if (ok) {
      store.deleteItem(this.itemId);
      util.toast('已删除', 'success');
      setTimeout(() => wx.navigateBack(), 800);
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: `物归 — ${this.data.item.name}`,
      path: `/pages/index/index`
    };
  }
});
