// pages/tags/tags.js — 标签（分类）管理
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

Page({
  data: {
    allCats: [],       // 所有标签（预设+自定义）统一列表
    showAdd: false,
    newCatName: '',
    usageMap: {}       // 分类ID → 使用数量
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const categories = store.getCategories();
    const items = store.getItems();

    // 统计每个分类被多少物品使用
    const usageMap = {};
    items.forEach(i => {
      usageMap[i.category] = (usageMap[i.category] || 0) + 1;
    });

    // 统一列表：自定义标签排前面，预设标签排后面
    const customCats = categories.filter(c => !c.is_preset);
    const presetCats = categories.filter(c => c.is_preset);
    const allCats = [...customCats, ...presetCats];

    console.log('[tags] categories count:', categories.length);
    console.log('[tags] custom count:', customCats.length);
    console.log('[tags] preset count:', presetCats.length);
    console.log('[tags] allCats:', allCats.map(c => ({ name: c.name, is_preset: c.is_preset })));

    this.setData({ allCats, usageMap });
  },

  // 新增标签
  toggleAdd() {
    this.setData({ showAdd: !this.data.showAdd, newCatName: '' });
  },

  onNewCatInput(e) {
    let val = e.detail.value;
    if (val.length > 10) val = val.substring(0, 10);
    this.setData({ newCatName: val });
  },

  doAddCat() {
    const name = this.data.newCatName.trim();
    if (!name) {
      util.toast('请输入标签名称');
      return;
    }
    // 检查重名
    const categories = store.getCategories();
    if (categories.find(c => c.name === name)) {
      util.toast('标签名称已存在');
      return;
    }
    const customCount = categories.filter(c => !c.is_preset).length;
    if (customCount >= 20) {
      util.toast('自定义标签上限20个');
      return;
    }
    store.addCategory(name);
    util.toast('添加成功', 'success');
    this.setData({ showAdd: false, newCatName: '' });
    this.loadData();
  },

  // 删除标签（系统标签和自定义标签都可删除）
  async deleteCat(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    const isPreset = e.currentTarget.dataset.preset;
    const usage = this.data.usageMap[id] || 0;

    if (usage > 0) {
      util.toast(`该标签下有 ${usage} 个物品关联，无法删除`);
      return;
    }

    // 系统标签二次确认
    let ok;
    if (isPreset) {
      ok = await util.confirm(`「${name}」是系统预设标签，确认删除？删除后不可恢复`);
    } else {
      ok = await util.confirm(`确认删除标签「${name}」？`);
    }
    if (ok) {
      const success = store.deleteCategory(id);
      if (success) {
        util.toast('已删除', 'success');
        this.loadData();
      } else {
        util.toast('删除失败');
      }
    }
  }
});
