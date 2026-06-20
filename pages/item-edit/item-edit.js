// pages/item-edit/item-edit.js — 物品新增/编辑
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
    isEdit: false,
    itemId: '',
    name: '',
    spaceId: '',
    spaces: [],
    spaceIndex: 0,
    selectedSpacePath: '',
    category: 'cat_other',
    categories: [],
    presetCats: [],
    customCats: [],
    catPickerList: [],
    catIndex: 0,
    quantity: 1,
    purchaseDate: '',
    expireDate: '',
    brand: '',
    price: '',
    remark: '',
    photos: [],
    showCatPicker: false,
    showAddCat: false,
    newCatName: '',
    canEdit: true,
    today: '',
    // 空间层级选择
    spacePickerVisible: false,
    currentParentId: '',
    currentLevelSpaces: [],
    spaceBreadcrumb: []
  },

  onLoad(options) {
    const today = util.today();
    const spaces = store.getSpaces();
    const categories = store.getCategories();
    const presetCats = categories.filter(c => c.is_preset);
    const customCats = categories.filter(c => !c.is_preset);
    const catPickerList = categories;

    this.setData({
      spaces,
      categories,
      presetCats,
      customCats,
      catPickerList,
      today
    });

    if (options.id) {
      // 编辑模式
      const item = store.getItem(options.id);
      if (item) {
        const canEdit = app.canEdit(item.creator_id);
        const spaceIndex = Math.max(0, spaces.findIndex(s => s.space_id === item.space_id));
        const catIndex = Math.max(0, categories.findIndex(c => c.category_id === item.category));
        // 构建空间路径显示
        const spacePath = this.buildSpacePath(item.space_id);
        this.setData({
          isEdit: true,
          itemId: item.item_id,
          name: item.name,
          spaceId: item.space_id,
          spaceIndex,
          selectedSpacePath: spacePath,
          category: item.category,
          catIndex,
          quantity: item.quantity,
          purchaseDate: item.purchase_date,
          expireDate: item.expire_date,
          brand: item.brand,
          price: item.price ? String(item.price) : '',
          remark: item.remark,
          photos: item.photos || [],
          canEdit
        });
        wx.setNavigationBarTitle({ title: '编辑物品' });
        if (!canEdit) {
          util.toast('仅创建者或管理员可编辑');
        }
      }
    } else {
      // 新增模式
      if (options.space_id) {
        const idx = spaces.findIndex(s => s.space_id === options.space_id);
        const spacePath = this.buildSpacePath(options.space_id);
        this.setData({
          spaceId: options.space_id,
          spaceIndex: idx > -1 ? idx : 0,
          selectedSpacePath: spacePath
        });
      } else if (spaces.length > 0) {
        this.setData({ spaceId: spaces[0].space_id, spaceIndex: 0, selectedSpacePath: spaces[0].name });
      }
      wx.setNavigationBarTitle({ title: '添加物品' });
    }

    if (spaces.length === 0) {
      util.toast('请先创建空间');
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onNameInput(e) {
    let val = e.detail.value;
    if (val.length > 50) val = val.substring(0, 50);
    this.setData({ name: val });
  },

  // ============ 空间层级选择 ============

  // 构建空间路径显示（如 "厨房 / 厨房柜子 / 左侧")
  buildSpacePath(spaceId) {
    if (!spaceId) return '';
    const path = store.getSpacePath(spaceId);
    if (!path || path.length === 0) return '';
    return path.map(s => s.name).join(' / ');
  },

  // 打开空间选择器
  openSpacePicker() {
    if (this.data.spaces.length === 0) {
      util.toast('请先创建空间');
      return;
    }
    // 如果已选空间，定位到该空间的父级
    let parentId = '';
    if (this.data.spaceId) {
      const space = this.data.spaces.find(s => s.space_id === this.data.spaceId);
      if (space && space.parent_id) parentId = space.parent_id;
    }
    this.loadLevelSpaces(parentId);
    this.setData({ spacePickerVisible: true, currentParentId: parentId });
  },

  closeSpacePicker() {
    this.setData({ spacePickerVisible: false });
  },

  // 加载某一层级的空间
  loadLevelSpaces(parentId) {
    const allSpaces = store.getSpaces();
    let levelSpaces;
    if (!parentId) {
      // 顶级空间
      levelSpaces = allSpaces.filter(s => !s.parent_id);
    } else {
      levelSpaces = store.getChildSpaces(parentId);
    }
    // 附加图标和子空间数量
    levelSpaces = levelSpaces.map(s => ({
      ...s,
      iconEmoji: getSpaceEmoji(s.icon),
      child_count: store.getChildSpaces(s.space_id).length
    }));

    // 构建面包屑
    let breadcrumb = [];
    if (parentId) {
      breadcrumb = store.getSpacePath(parentId);
    }

    this.setData({
      currentLevelSpaces: levelSpaces,
      spaceBreadcrumb: breadcrumb,
      currentParentId: parentId
    });
  },

  // 点击空间项：有子空间则进入下一级，无子空间则直接选中
  onSpaceItemTap(e) {
    const id = e.currentTarget.dataset.id;
    const space = this.data.currentLevelSpaces.find(s => s.space_id === id);
    if (!space) return;

    if (space.child_count > 0) {
      // 有子空间，进入下一级
      this.loadLevelSpaces(id);
    } else {
      // 无子空间，直接选中
      this.selectSpace(id);
    }
  },

  // 选中某个空间
  selectSpace(spaceId) {
    const path = this.buildSpacePath(spaceId);
    this.setData({
      spaceId: spaceId,
      selectedSpacePath: path,
      spacePickerVisible: false
    });
    util.vibrate('light');
  },

  // 面包屑点击：返回某一级
  onBreadcrumbTap(e) {
    const id = e.currentTarget.dataset.id;
    this.loadLevelSpaces(id || '');
  },

  // 确认选择当前空间
  confirmSpaceSelect() {
    if (!this.data.spaceId) {
      // 如果没选过任何空间，但有当前层级的父级，选父级
      if (this.data.currentParentId) {
        this.selectSpace(this.data.currentParentId);
      } else {
        util.toast('请选择一个空间');
      }
      return;
    }
    this.setData({ spacePickerVisible: false });
  },

  onSpaceChange(e) {
    const idx = Number(e.detail.value);
    this.setData({ spaceIndex: idx, spaceId: this.data.spaces[idx].space_id });
  },

  onCatChange(e) {
    const idx = Number(e.detail.value);
    this.setData({ catIndex: idx, category: this.data.catPickerList[idx].category_id });
  },

  onQtyInput(e) {
    let val = parseInt(e.detail.value) || 1;
    if (val < 1) val = 1;
    if (val > 9999) val = 9999;
    this.setData({ quantity: val });
  },

  onQtyBlur(e) {
    let val = parseInt(e.detail.value) || 1;
    if (val < 1) val = 1;
    if (val > 9999) val = 9999;
    this.setData({ quantity: val });
  },

  onBrandInput(e) {
    this.setData({ brand: e.detail.value });
  },

  onPriceInput(e) {
    let val = e.detail.value;
    // 只允许数字和小数点
    val = val.replace(/[^\d.]/g, '');
    // 只保留一个小数点
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    this.setData({ price: val });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  onPurchaseDateChange(e) {
    this.setData({ purchaseDate: e.detail.value });
  },

  onExpireDateChange(e) {
    this.setData({ expireDate: e.detail.value });
  },

  clearExpireDate() {
    this.setData({ expireDate: '' });
  },

  // 照片上传
  choosePhoto() {
    const count = 9 - this.data.photos.length;
    if (count <= 0) {
      util.toast('最多上传9张照片');
      return;
    }
    wx.chooseMedia({
      count,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const newPhotos = res.tempFiles.map(f => ({ url: f.tempFilePath, temp: true }));
        this.setData({ photos: [...this.data.photos, ...newPhotos].slice(0, 9) });
      }
    });
  },

  removePhoto(e) {
    const idx = e.currentTarget.dataset.index;
    const photos = [...this.data.photos];
    photos.splice(idx, 1);
    this.setData({ photos });
  },

  previewPhoto(e) {
    const idx = e.currentTarget.dataset.index;
    const urls = this.data.photos.map(p => p.url);
    wx.previewImage({ current: urls[idx], urls });
  },

  // 分类管理
  toggleCatPicker() {
    this.setData({ showCatPicker: !this.data.showCatPicker });
  },

  toggleAddCat() {
    this.setData({ showAddCat: !this.data.showAddCat, newCatName: '' });
  },

  onNewCatInput(e) {
    let val = e.detail.value;
    if (val.length > 10) val = val.substring(0, 10);
    this.setData({ newCatName: val });
  },

  addNewCat() {
    const name = this.data.newCatName.trim();
    if (!name) {
      util.toast('请输入分类名称');
      return;
    }
    if (this.data.categories.length >= 20 + 8) {
      util.toast('自定义分类上限20个');
      return;
    }
    // 检查重名
    const dup = this.data.categories.find(c => c.name === name);
    if (dup) {
      util.toast('分类名称已存在');
      return;
    }
    const cat = store.addCategory(name);
    const categories = store.getCategories();
    const catIndex = categories.findIndex(c => c.category_id === cat.category_id);
    this.setData({
      categories,
      catPickerList: categories,
      catIndex,
      category: cat.category_id,
      showAddCat: false,
      newCatName: ''
    });
    util.toast('已添加', 'success');
  },

  // 保存
  async onSave() {
    const name = this.data.name.trim();
    if (!name) {
      util.toast('请输入物品名称');
      return;
    }
    if (!this.data.spaceId) {
      util.toast('请选择所属空间');
      return;
    }

    // 过期日期校验
    if (this.data.expireDate) {
      const days = util.daysFromToday(this.data.expireDate);
      if (days < 0) {
        const ok = await util.confirm('过期日期早于今天，将标记为已过期状态。确认保存？');
        if (!ok) return;
      }
    }

    const data = {
      name,
      space_id: this.data.spaceId,
      category: this.data.category,
      quantity: this.data.quantity,
      purchase_date: this.data.purchaseDate,
      expire_date: this.data.expireDate,
      brand: this.data.brand.trim(),
      price: this.data.price ? parseFloat(this.data.price) : 0,
      remark: this.data.remark.trim(),
      photos: this.data.photos
    };

    util.loading('保存中');

    if (this.data.isEdit) {
      store.updateItem(this.data.itemId, data);
    } else {
      store.addItem(data);
    }

    // 模拟照片上传延迟
    setTimeout(() => {
      util.hideLoading();
      util.toast('保存成功', 'success');
      setTimeout(() => wx.navigateBack(), 800);
    }, 500);
  }
});
