// pages/tags/tags.js — 标签（分类）管理
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

Page({
  data: {
    presetCats: [],
    customCats: [],
    items: [],
    showAdd: false,
    newCatName: '',
    usageMap: {}  // 分类ID → 使用数量
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const categories = store.getCategories();
    const items = store.getItems();
    const presetCats = categories.filter(c => c.is_preset);
    const customCats = categories.filter(c => !c.is_preset);

    // 统计每个分类被多少物品使用
    const usageMap = {};
    items.forEach(i => {
      usageMap[i.category] = (usageMap[i.category] || 0) + 1;
    });

    this.setData({ presetCats, customCats, items, usageMap });
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
    const all = [...this.data.presetCats, ...this.data.customCats];
    if (all.find(c => c.name === name)) {
      util.toast('标签名称已存在');
      return;
    }
    if (this.data.customCats.length >= 20) {
      util.toast('自定义标签上限20个');
      return;
    }
    store.addCategory(name);
    util.toast('添加成功', 'success');
    this.setData({ showAdd: false, newCatName: '' });
    this.loadData();
  },

  // 删除标签
  async deleteCat(e) {
    const cat = e.currentTarget.dataset.cat;
    const usage = this.data.usageMap[cat.category_id] || 0;

    if (usage > 0) {
      util.toast(`该标签下有 ${usage} 个物品关联，无法删除`);
      return;
    }

    const ok = await util.confirm(`确认删除标签「${cat.name}」？`);
    if (ok) {
      store.deleteCategory(cat.category_id);
      util.toast('已删除', 'success');
      this.loadData();
    }
  }
});
