// components/item-card/item-card.js
const { getStatusTag, getCategoryIcon } = require('../../utils/util.js');

Component({
  properties: {
    item: { type: Object, value: null },
    categories: { type: Array, value: [] },
    advanceDays: { type: Number, value: 7 },
    showSpace: { type: Boolean, value: false },
    spaceName: { type: String, value: '' },
    showConsume: { type: Boolean, value: false }
  },
  data: {
    tag: null,
    catIcon: '📦'
  },
  observers: {
    'item, categories, advanceDays': function (item, categories, advanceDays) {
      if (!item) return;
      const tag = getStatusTag(item, advanceDays);
      const catIcon = getCategoryIcon(categories, item.category);
      this.setData({ tag, catIcon });
    }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { item: this.data.item });
    },
    onLongPress() {
      this.triggerEvent('longpress', { item: this.data.item });
    },
    onConsume() {
      this.triggerEvent('consume', { item: this.data.item });
    }
  }
});
