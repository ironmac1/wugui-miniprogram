// components/voice-btn/voice-btn.js — 语音输入按钮组件
const util = require('../../utils/util.js');

Component({
  properties: {
    // 按钮尺寸
    size: { type: String, value: 'normal' },  // normal / large / inline
    // 是否显示文字
    showText: { type: Boolean, value: true }
  },

  data: {
    recording: false,
    recognizing: false,
    pluginReady: false,
    pluginAvailable: true,
    voiceText: ''
  },

  lifetimes: {
    attached() {
      this.initPlugin();
    }
  },

  methods: {
    // 初始化微信同声传译插件
    initPlugin() {
      try {
        this.plugin = requirePlugin('WechatSI');
        this.manager = this.plugin.getRecordRecognitionManager();
        this.bindEvents();
        this.setData({ pluginReady: true, pluginAvailable: true });
      } catch (e) {
        console.warn('[voice-btn] 插件不可用（测试号或未授权），语音功能降级隐藏:', e);
        this.setData({ pluginReady: false, pluginAvailable: false });
        // 通知父组件语音不可用
        this.triggerEvent('unavailable');
      }
    },

    // 绑定识别事件
    bindEvents() {
      if (!this.manager) return;
      this.manager.onRecognize = (res) => {
        // 实时识别中
        if (res.result) {
          this.setData({ voiceText: res.result });
        }
      };
      this.manager.onStop = (res) => {
        // 识别结束
        const text = (res.result || this.data.voiceText || '').trim();
        this.setData({ recording: false, recognizing: false });
        if (text) {
          this.triggerEvent('result', { text });
        } else {
          this.triggerEvent('error', { message: '没有识别到内容' });
        }
      };
      this.manager.onError = (res) => {
        console.error('[voice-btn] 识别错误:', res);
        this.setData({ recording: false, recognizing: false });
        const msg = this.getErrorMessage(res.retcode || res.errCode);
        this.triggerEvent('error', { message: msg });
      };
    },

    // 开始录音
    async startRecord() {
      if (!this.data.pluginReady) {
        util.toast('语音插件未就绪，请使用正式版AppID');
        return;
      }

      // 先检查权限
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        this.requestPermission();
        return;
      }

      try {
        this.setData({ recording: true, voiceText: '', recognizing: false });
        this.manager.start({ lang: 'zh_CN', duration: 60000 });
        util.vibrate('light');
      } catch (e) {
        console.error('[voice-btn] 启动录音失败:', e);
        this.setData({ recording: false });
        util.toast('录音启动失败');
      }
    },

    // 停止录音
    stopRecord() {
      if (!this.data.recording) return;
      this.setData({ recording: false, recognizing: true });
      try {
        this.manager.stop();
      } catch (e) {
        console.error('[voice-btn] 停止录音失败:', e);
        this.setData({ recording: false, recognizing: false });
        this.triggerEvent('error', { message: '停止录音失败' });
      }
    },

    // 检查录音权限
    checkPermission() {
      return new Promise((resolve) => {
        wx.getSetting({
          success: (res) => {
            resolve(res.authSetting['scope.record'] === true);
          },
          fail: () => resolve(false)
        });
      });
    },

    // 申请录音权限
    requestPermission() {
      wx.authorize({
        scope: 'scope.record',
        success: () => {
          util.toast('权限已开启，请再次点击语音按钮');
        },
        fail: () => {
          wx.showModal({
            title: '需要录音权限',
            content: '语音添加物品需要使用麦克风，请在设置中开启',
            confirmText: '去设置',
            confirmColor: '#7C6A58',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      });
    },

    // 错误信息映射
    getErrorMessage(code) {
      const map = {
        '-30001': '录音太短，请长按说话',
        '-30002': '没有听清，请重试',
        '-30003': '识别服务繁忙，请稍后再试',
        '10001': '录音权限未开启',
        '10002': '网络异常'
      };
      return map[String(code)] || '识别失败，请重试';
    },

    // 单击模式：点击开始录音，再次点击停止
    onTap() {
      if (this.data.recognizing) {
        // 正在识别中，忽略点击
        return;
      }
      if (this.data.recording) {
        this.stopRecord();
      } else {
        this.startRecord();
      }
    }
  }
});
