// components/space-card/space-card.js
const { SPACE_ICONS } = require('../../utils/constants.js');

Component({
  properties: {
    space: { type: Object, value: null }
  },
  data: {
    emoji: '🏠'
  },
  observers: {
    'space': function (space) {
      if (!space) return;
      const icon = SPACE_ICONS.find(i => i.id === space.icon);
      this.setData({ emoji: icon ? icon.emoji : '🏠' });
    }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { space: this.data.space });
    },
    onLongPress() {
      this.triggerEvent('longpress', { space: this.data.space });
    }
  }
});
