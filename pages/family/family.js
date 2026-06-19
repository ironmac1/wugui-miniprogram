// pages/family/family.js — 家庭管理
const app = getApp();
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

Page({
  data: {
    family: null,
    user: null,
    isAdmin: false,
    memberCount: 1,
    inviteCode: '',
    showInviteModal: false
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const family = store.getFamily();
    const user = store.getUser();
    this.setData({
      family,
      user,
      isAdmin: family && family.owner_id === user.user_id,
      memberCount: family ? family.member_ids.length : 1
    });
  },

  // 修改家庭名称
  editFamilyName() {
    if (!this.data.isAdmin) {
      util.toast('仅管理员可修改');
      return;
    }
    wx.showModal({
      title: '修改家庭名称',
      editable: true,
      content: this.data.family.family_name,
      success: (res) => {
        if (res.confirm && res.content) {
          store.updateFamily({ family_name: res.content.trim() });
          this.loadData();
          util.toast('已修改', 'success');
        }
      }
    });
  },

  // 生成邀请码
  generateInvite() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.setData({ inviteCode: code, showInviteModal: true });
  },

  closeInvite() {
    this.setData({ showInviteModal: false });
  },

  copyCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => util.toast('已复制邀请码', 'success')
    });
  },

  // 分享邀请
  onShareAppMessage() {
    return {
      title: `邀请你加入「${this.data.family.family_name}」，一起管理家庭物品`,
      path: `/pages/index/index?invite=${this.data.inviteCode || 'DEMO01'}`
    };
  },

  // 退出家庭
  async leaveFamily() {
    if (this.data.isAdmin) {
      util.toast('管理员请使用解散家庭');
      return;
    }
    const ok = await util.confirm('确认退出当前家庭？退出后将无法查看家庭物品');
    if (ok) {
      util.toast('功能演示：已退出', 'success');
    }
  },

  // 解散家庭
  async dissolveFamily() {
    if (!this.data.isAdmin) {
      util.toast('仅管理员可解散');
      return;
    }
    const ok = await util.confirm('确认解散家庭？所有空间和物品将归属您的个人账户保留', '解散家庭');
    if (!ok) return;
    const ok2 = await util.confirm('再次确认：家庭成员将被移除', '最终确认');
    if (!ok2) return;
    util.toast('功能演示：已解散', 'success');
    setTimeout(() => wx.navigateBack(), 1000);
  }
});
