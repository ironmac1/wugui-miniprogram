// pages/settings/settings.js — 设置
const app = getApp();
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');
const { REMIND_DAYS_OPTIONS } = require('../../utils/constants.js');

Page({
  data: {
    user: null,
    family: null,
    config: null,
    remindOptions: REMIND_DAYS_OPTIONS,
    totalSpaces: 0,
    totalItems: 0,
    expiringCount: 0,
    expiredCount: 0,
    version: '1.0.0'
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    app.refreshData();
    const user = app.globalData.user;
    const family = app.globalData.family;
    const config = store.getReminderConfig();
    const spaces = store.getSpaces();
    const items = store.getItems();
    const maxAdvance = Math.max(...config.advance_days, 7);

    this.setData({
      user,
      family,
      config,
      totalSpaces: spaces.length,
      totalItems: items.length,
      expiringCount: store.getExpiringItems(maxAdvance).length,
      expiredCount: store.getExpiredItems().length
    });
  },

  // 提醒开关
  onReminderToggle(e) {
    const enabled = e.detail.value;
    store.updateReminderConfig({ enabled });
    this.setData({ 'config.enabled': enabled });
    if (!enabled) {
      util.toast('已关闭提醒，首页仍会展示临期物品');
    }
  },

  // 提前天数
  onAdvanceDaysChange(e) {
    const value = Number(e.currentTarget.dataset.value);
    let days = [...this.data.config.advance_days];
    const idx = days.indexOf(value);
    if (idx > -1) {
      days.splice(idx, 1);
    } else {
      days.push(value);
      days.sort((a, b) => b - a);
    }
    if (days.length === 0) {
      util.toast('至少保留一个提醒时间');
      return;
    }
    store.updateReminderConfig({ advance_days: days });
    store.refreshAllItemStatus();
    this.setData({ 'config.advance_days': days });
  },

  // 周汇总开关
  onSummaryToggle(e) {
    const weekly_summary = e.detail.value;
    store.updateReminderConfig({ weekly_summary });
    this.setData({ 'config.weekly_summary': weekly_summary });
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

  // 家庭管理
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
    // 重新初始化全局数据
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
