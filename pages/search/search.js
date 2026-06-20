// pages/search/search.js — 搜索
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

Page({
  data: {
    keyword: '',
    results: [],
    categories: [],
    spaces: [],
    spaceNames: {},
    maxAdvanceDays: 7,
    hasSearched: false,
    recentKeywords: []
  },

  onLoad() {
    const categories = store.getCategories();
    const spaces = store.getSpaces();
    const config = store.getReminderConfig();
    const maxAdvance = Math.max(...config.advance_days, 7);
    const spaceNames = {};
    spaces.forEach(s => { spaceNames[s.space_id] = s.name; });
    this.setData({
      categories,
      spaces,
      spaceNames,
      maxAdvanceDays: maxAdvance,
      recentKeywords: this.getRecentKeywords()
    });
  },

  getRecentKeywords() {
    try {
      return wx.getStorageSync('wugui_recent_search') || [];
    } catch (e) {
      return [];
    }
  },

  saveRecentKeyword(kw) {
    let list = this.getRecentKeywords();
    list = list.filter(k => k !== kw);
    list.unshift(kw);
    list = list.slice(0, 8);
    wx.setStorageSync('wugui_recent_search', list);
  },

  onInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });
    this.doSearch(keyword);
  },

  onSearch(e) {
    const keyword = e.detail.value || this.data.keyword;
    this.doSearch(keyword);
    if (keyword.trim()) {
      this.saveRecentKeyword(keyword.trim());
      this.setData({ recentKeywords: this.getRecentKeywords() });
    }
  },

  doSearch(keyword) {
    if (!keyword || !keyword.trim()) {
      this.setData({ results: [], hasSearched: false });
      return;
    }
    const results = store.searchItems(keyword);
    this.setData({ results, hasSearched: true });
  },

  onRecentTap(e) {
    const kw = e.currentTarget.dataset.keyword;
    this.setData({ keyword: kw });
    this.doSearch(kw);
  },

  clearRecent() {
    wx.setStorageSync('wugui_recent_search', []);
    this.setData({ recentKeywords: [] });
  },

  onItemTap(e) {
    wx.navigateTo({ url: `/pages/item-edit/item-edit?id=${e.detail.item.item_id}` });
  },

  clearInput() {
    this.setData({ keyword: '', results: [], hasSearched: false });
  }
});
