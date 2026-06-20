// pages/settings/settings.js — 设置
const app = getApp();
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

Page({
  data: {
    user: null,
    family: null,
    config: null,
    version: '1.0.0'
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    app.refreshData();
    const user = app.globalData.user;
    const family = app.globalData.family || {};
    const config = store.getReminderConfig() || { advance_days: [7] };

    this.setData({
      user: user || { nickname: '微信用户' },
      family,
      config: util.deepClone(config)
    });
  },

  // 提前天数（点击已有天数=移除）
  onAdvanceDaysChange(e) {
    const value = Number(e.currentTarget.dataset.value);
    let days = [...this.data.config.advance_days];
    const idx = days.indexOf(value);
    if (idx > -1) {
      days.splice(idx, 1);
    }
    if (days.length === 0) {
      util.toast('至少保留一个提醒天数');
      return;
    }
    store.updateReminderConfig({ advance_days: days });
    store.refreshAllItemStatus();
    this.setData({ 'config.advance_days': days });
  },

  // 自定义天数
  onCustomDaysTap() {
    wx.showModal({
      title: '添加提醒天数',
      editable: true,
      placeholderText: '请输入 1-90 之间的数字',
      content: '',
      success: (res) => {
        if (!res.confirm) return;
        const input = (res.content || '').trim();
        const num = parseInt(input);
        if (!num || num < 1 || num > 90) {
          util.toast('请输入 1-90 之间的数字');
          return;
        }
        let days = [...this.data.config.advance_days];
        if (days.includes(num)) {
          util.toast('该天数已存在');
          return;
        }
        days.push(num);
        days.sort((a, b) => b - a);
        store.updateReminderConfig({ advance_days: days });
        store.refreshAllItemStatus();
        this.setData({ 'config.advance_days': days });
        util.toast('已添加', 'success');
      }
    });
  },

  // 编辑昵称
  editNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: this.data.user.nickname,
      content: this.data.user.nickname,
      success: (res) => {
        if (res.confirm && res.content) {
          store.updateUser({ nickname: res.content.trim() });
          this.loadData();
          util.toast('已修改', 'success');
        }
      }
    });
  },

  // 主空间管理
  goFamily() {
    wx.navigateTo({ url: '/pages/family/family' });
  },

  // 标签管理
  goTags() {
    wx.navigateTo({ url: '/pages/tags/tags' });
  },

  // 清空数据
  async clearData() {
    const ok = await util.confirm('确认清空所有数据？此操作不可恢复！', '危险操作');
    if (!ok) return;
    const ok2 = await util.confirm('再次确认：所有空间、物品和分类将被永久删除', '最终确认');
    if (!ok2) return;
    wx.removeStorageSync('wugui_user');
    wx.removeStorageSync('wugui_family');
    wx.removeStorageSync('wugui_spaces');
    wx.removeStorageSync('wugui_items');
    wx.removeStorageSync('wugui_categories');
    wx.removeStorageSync('wugui_reminder');
    wx.removeStorageSync('wugui_counter');
    app.initData();
    util.toast('已清空', 'success');
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/index/index' });
    }, 1000);
  },

  onShareAppMessage() {
    return { title: '物归 — 家庭物品管理', path: '/pages/index/index' };
  }
});
