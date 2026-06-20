// pages/space-edit/space-edit.js — 空间新增/编辑（支持父空间+图片）
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');
const { SPACE_ICONS } = require('../../utils/constants.js');

Page({
  data: {
    isEdit: false,
    spaceId: '',
    parentId: '',
    parentName: '',
    name: '',
    icon: 'icon_other',
    photo: '',           // 空间图片
    icons: SPACE_ICONS,
    selectedIndex: 0
  },

  onLoad(options) {
    if (options.id) {
      const space = store.getSpace(options.id);
      if (space) {
        const idx = SPACE_ICONS.findIndex(i => i.id === space.icon);
        const parent = space.parent_id ? store.getSpace(space.parent_id) : null;
        this.setData({
          isEdit: true,
          spaceId: space.space_id,
          parentId: space.parent_id || '',
          parentName: parent ? parent.name : '',
          name: space.name,
          icon: space.icon,
          photo: space.photo || '',
          selectedIndex: idx > -1 ? idx : SPACE_ICONS.length - 1
        });
        wx.setNavigationBarTitle({ title: '编辑空间' });
      }
    } else if (options.parent_id) {
      const parent = store.getSpace(options.parent_id);
      this.setData({ parentId: options.parent_id, parentName: parent ? parent.name : '' });
      wx.setNavigationBarTitle({ title: '新建子空间' });
    } else {
      wx.setNavigationBarTitle({ title: '新建空间' });
    }
  },

  onNameInput(e) {
    let val = e.detail.value;
    if (val.length > 20) {
      val = val.substring(0, 20);
      util.toast('空间名称最多20个字符');
    }
    this.setData({ name: val });
  },

  onIconChoose(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ selectedIndex: idx, icon: this.data.icons[idx].id, photo: '' });
  },

  // 上传空间图片
  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        this.setData({ photo: res.tempFiles[0].tempFilePath });
      }
    });
  },

  removePhoto() {
    this.setData({ photo: '' });
  },

  previewPhoto() {
    if (this.data.photo) wx.previewImage({ urls: [this.data.photo] });
  },

  async onSave() {
    const name = this.data.name.trim();
    if (!name) { util.toast('请输入空间名称'); return; }

    const spaces = store.getSpaces();
    const dup = spaces.find(s => s.name === name && s.space_id !== this.data.spaceId);
    if (dup) {
      const ok = await util.confirm('已存在同名空间，确认继续创建？');
      if (!ok) return;
    }

    if (!this.data.isEdit && spaces.length >= 50) {
      util.toast('空间数量已达上限');
      return;
    }

    const saveData = { name, icon: this.data.icon, parent_id: this.data.parentId, photo: this.data.photo };

    if (this.data.isEdit) {
      store.updateSpace(this.data.spaceId, saveData);
      util.toast('保存成功', 'success');
    } else {
      store.addSpace(saveData);
      util.toast('创建成功', 'success');
    }
    setTimeout(() => wx.navigateBack(), 800);
  }
});
