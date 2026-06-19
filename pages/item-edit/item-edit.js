// pages/item-edit/item-edit.js — 物品新增/编辑
const app = getApp();
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

Page({
  data: {
    isEdit: false,
    itemId: '',
    name: '',
    spaceId: '',
    spaces: [],
    spaceIndex: 0,
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
    today: ''
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
        this.setData({
          isEdit: true,
          itemId: item.item_id,
          name: item.name,
          spaceId: item.space_id,
          spaceIndex,
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
        this.setData({
          spaceId: options.space_id,
          spaceIndex: idx > -1 ? idx : 0
        });
      } else if (spaces.length > 0) {
        this.setData({ spaceId: spaces[0].space_id, spaceIndex: 0 });
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
