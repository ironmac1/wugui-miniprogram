// app.js — 物归 · 家庭物品清单管理小程序
const store = require('./utils/store.js');

App({
  globalData: {
    user: null,
    family: null,
    spaces: [],
    categories: [],
    reminderConfig: null,
    systemInfo: null,
    safeArea: null
  },

  onLaunch() {
    // 获取系统信息（安全区域适配）
    try {
      const sysInfo = wx.getWindowInfo();
      const safeArea = wx.getDeviceInfo();
      this.globalData.systemInfo = sysInfo;
      this.globalData.safeArea = {
        top: sysInfo.statusBarHeight || 44,
        bottom: sysInfo.screenHeight - (sysInfo.safeArea ? sysInfo.safeArea.bottom : sysInfo.screenHeight)
      };
    } catch (e) {
      this.globalData.safeArea = { top: 44, bottom: 0 };
    }

    // 初始化本地数据（模拟静默登录 + 云端同步）
    this.initData();
  },

  onShow() {
    // 每次显示时刷新数据
    if (this.globalData.user) {
      this.refreshData();
    }
  },

  // 初始化数据
  initData() {
    // 模拟微信登录
    const user = store.login();
    this.globalData.user = user;

    // 加载家庭数据（本地单用户模拟）
    const family = store.getFamily();
    this.globalData.family = family;

    // 加载空间
    this.globalData.spaces = store.getSpaces();

    // 加载分类
    this.globalData.categories = store.getCategories();

    // 加载提醒设置
    this.globalData.reminderConfig = store.getReminderConfig();
  },

  // 刷新全局数据
  refreshData() {
    this.globalData.spaces = store.getSpaces();
    this.globalData.categories = store.getCategories();
    this.globalData.reminderConfig = store.getReminderConfig();
  },

  // 获取当前用户
  getUser() {
    return this.globalData.user;
  },

  // 获取当前家庭
  getFamily() {
    return this.globalData.family;
  },

  // 检查权限：是否能编辑/删除目标
  canEdit(targetCreatorId) {
    const user = this.globalData.user;
    const family = this.globalData.family;
    if (!user || !family) return false;
    // 管理员拥有全部权限
    if (family.owner_id === user.user_id) return true;
    // 成员只能操作自己创建的
    return targetCreatorId === user.user_id;
  },

  isAdmin() {
    const user = this.globalData.user;
    const family = this.globalData.family;
    if (!user || !family) return false;
    return family.owner_id === user.user_id;
  }
});
