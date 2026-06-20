// utils/voiceParser.js — 语音输入解析
// 第一步：本地规则解析（物品名、数量、空间名匹配）
// 后续可接云函数做AI语义解析（分类、过期日期、品牌）

const { PRESET_CATEGORIES, SPACE_ICONS } = require('./constants.js');

// ============ 本地规则解析 ============

// 中文数字转阿拉伯
const CN_NUM_MAP = {
  '零': 0, '一': 1, '两': 2, '二': 2, '三': 3, '四': 4,
  '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
};

function parseChineseNumber(str) {
  if (!str) return null;
  str = str.trim();
  // 纯数字
  if (/^\d+$/.test(str)) return parseInt(str);
  // 十X (十一、十二)
  if (str.length === 2 && str[0] === '十') {
    return 10 + (CN_NUM_MAP[str[1]] || 0);
  }
  // X十
  if (str.length === 2 && str[1] === '十') {
    return (CN_NUM_MAP[str[0]] || 0) * 10;
  }
  // X十X
  if (str.length === 3 && str[1] === '十') {
    return (CN_NUM_MAP[str[0]] || 0) * 10 + (CN_NUM_MAP[str[2]] || 0);
  }
  // 单字
  if (str.length === 1 && CN_NUM_MAP[str] !== undefined) {
    return CN_NUM_MAP[str];
  }
  return null;
}

// 提取数量：匹配"三瓶"、"两个"、"5包" 等
function extractQuantity(text) {
  // 数字+单位
  let m = text.match(/(\d+)\s*(瓶|包|个|袋|盒|罐|桶|箱|份|件|块|条|只|支)/);
  if (m) return { quantity: parseInt(m[1]), cleaned: text.replace(m[0], '') };

  // 中文数字+单位
  m = text.match(/(零|一|两|二|三|四|五|六|七|八|九|十|十[一二三四五六七八九]|[一二三四五六七八九]十[一二三四五六七八九]?)\s*(瓶|包|个|袋|盒|罐|桶|箱|份|件|块|条|只|支)/);
  if (m) {
    const num = parseChineseNumber(m[1]);
    if (num && num > 0) return { quantity: num, cleaned: text.replace(m[0], '') };
  }
  return { quantity: 1, cleaned: text };
}

// 提取空间名：匹配预设空间关键词
function extractSpace(text, spaces) {
  // 1. 匹配"在XX"句式
  let m = text.match(/在([^，,。的\s]{1,6})(?:里|中|内|的|加|放|添|存|放)/);
  if (m) {
    const spaceName = m[1];
    const matched = matchSpaceByName(spaceName, spaces);
    if (matched) {
      return { space: matched, cleaned: text.replace(m[0], '') };
    }
  }

  // 2. 直接匹配预设空间关键词
  for (const s of spaces) {
    const keywords = getSpaceKeywords(s.name);
    for (const kw of keywords) {
      if (text.includes(kw)) {
        return { space: s, cleaned: text.replace(kw, '') };
      }
    }
  }

  return { space: null, cleaned: text };
}

// 空间名模糊匹配
function matchSpaceByName(input, spaces) {
  // 完全匹配
  let matched = spaces.find(s => s.name === input);
  if (matched) return matched;
  // 包含匹配
  matched = spaces.find(s => s.name.includes(input) || input.includes(s.name));
  if (matched) return matched;
  // 关键词匹配
  for (const s of spaces) {
    const keywords = getSpaceKeywords(s.name);
    if (keywords.some(kw => input.includes(kw) || kw.includes(input))) {
      return s;
    }
  }
  return null;
}

// 获取空间关键词（"客厅"→["客厅"]，"主卧"→["主卧","卧室"]）
function getSpaceKeywords(name) {
  const keywords = [name];
  const keywordMap = {
    '客厅': ['客厅'],
    '厨房': ['厨房'],
    '卧室': ['卧室', '房间'],
    '卫生间': ['卫生间', '浴室', '厕所'],
    '书房': ['书房', '书桌'],
    '阳台': ['阳台'],
    '储物间': ['储物间', '储藏室'],
    '冰箱': ['冰箱'],
    '衣柜': ['衣柜', '柜子'],
    '收纳箱': ['收纳箱', '箱子'],
    '玄关': ['玄关', '门口']
  };
  if (keywordMap[name]) {
    keywords.push(...keywordMap[name]);
  }
  return [...new Set(keywords)];
}

// 提取物品名（去掉指令词和修饰词后剩余的核心词）
function extractItemName(text) {
  let cleaned = text;
  // 去掉指令动词
  const verbs = ['帮我加', '添加', '加一下', '新增', '记录', '登记', '添加一个', '加个', '加', '放', '存放', '放进', '放在', '记一下'];
  for (const v of verbs) {
    if (cleaned.startsWith(v)) {
      cleaned = cleaned.substring(v.length);
      break;
    }
  }
  // 去掉"到"、"里"等连接词
  cleaned = cleaned.replace(/(到|里|中|内|里面)$/, '');
  // 去掉数量单位残留
  cleaned = cleaned.replace(/(瓶|包|个|袋|盒|罐|桶|箱|份|件|块|条|只|支)$/g, '');
  // 去掉标点和空白
  cleaned = cleaned.replace(/[，,。、！!？?了]+/g, '').trim();
  return cleaned;
}

// 提取品牌（如果语音里说了品牌名，做简单启发式）
function extractBrand(text) {
  // 匹配"XX牌"
  let m = text.match(/([\u4e00-\u9fa5]{2,4})牌/);
  if (m) return { brand: m[1], cleaned: text.replace(m[0], '') };
  return { brand: '', cleaned: text };
}

// 提取过期日期关键词（基础版，复杂日期留给云函数）
function extractExpireDate(text) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 今天过期
  if (text.includes('今天') && text.includes('过期')) {
    return { expireDate: formatDate(today), cleaned: text.replace(/今天.*过期/g, '') };
  }
  // 明天过期
  if (text.includes('明天') && text.includes('过期')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return { expireDate: formatDate(d), cleaned: text.replace(/明天.*过期/g, '') };
  }
  // 后天过期
  if (text.includes('后天') && text.includes('过期')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return { expireDate: formatDate(d), cleaned: text.replace(/后天.*过期/g, '') };
  }
  // X天后过期
  let m = text.match(/(\d+|十|十几|一二十)\s*天.*过期/);
  if (m) {
    let days = 7;
    if (/^\d+$/.test(m[1])) days = parseInt(m[1]);
    else if (m[1] === '十') days = 10;
    else if (m[1] === '十几') days = 13;
    else if (m[1] === '一二十') days = 15;
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return { expireDate: formatDate(d), cleaned: text.replace(m[0], '') };
  }
  // 下周过期
  if (text.includes('下周') && text.includes('过期')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return { expireDate: formatDate(d), cleaned: text.replace(/下周.*过期/g, '') };
  }
  // 下个月过期
  if (text.includes('下个月') && text.includes('过期')) {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 1);
    return { expireDate: formatDate(d), cleaned: text.replace(/下个月.*过期/g, '') };
  }
  return { expireDate: '', cleaned: text };
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 智能匹配分类（根据物品名关键词）
function matchCategory(itemName, categories) {
  const categoryKeywords = {
    'cat_food': ['酱油', '醋', '油', '米', '面', '牛奶', '酸奶', '面包', '鸡蛋', '肉', '鱼', '菜', '水果', '苹果', '香蕉', '橙', '零食', '饼干', '巧克力', '糖', '盐', '味精', '调料', '茶', '咖啡', '饮料', '果汁', '啤酒', '红酒', '白酒', '罐头', '果酱', '蜂蜜', '面粉', '米粉', '面条', '方便面', '速食', '冷冻', '冰淇淋', '雪糕', '蛋糕', '派', '麦片', '燕麦', '坚果', '瓜子', '花生', '腰果', '葡萄干', '果干', '蔬菜'],
    'cat_medicine': ['药', '感冒药', '退烧药', '止痛药', '消炎药', '维生素', '钙片', '胶囊', '冲剂', '糖浆', '药膏', '创可贴', '棉签', '酒精', '碘伏', '体温计', '血压计', '血糖仪'],
    'cat_daily': ['洗洁精', '洗衣液', '洗衣粉', '肥皂', '香皂', '洗发水', '沐浴露', '牙膏', '牙刷', '毛巾', '纸巾', '卫生纸', '抽纸', '湿巾', '垃圾袋', '保鲜膜', '洗洁精', '洗洁', '清洁剂', '消毒液', '柔顺剂', '洗手液', '护发素', '护肤品', '面霜', '乳液', '防晒', '面膜', '化妆品', '剃须刀', '卫生巾', '纸尿裤'],
    'cat_clothing': ['衣服', '裤子', '裙子', '外套', '衬衫', 'T恤', '毛衣', '羽绒服', '内衣', '袜子', '鞋子', '帽子', '围巾', '手套', '皮带', '领带'],
    'cat_electronics': ['手机', '电脑', '平板', '充电器', '数据线', '耳机', '音箱', '电视', '相机', '电池', '插线板', '路由器', '键盘', '鼠标', '投影仪', '游戏机'],
    'cat_tool': ['螺丝刀', '扳手', '锤子', '钳子', '剪刀', '刀具', '胶带', '胶水', '钉子', '螺丝', '电钻', '梯子', '工具箱', '卷尺'],
    'cat_document': ['护照', '身份证', '户口本', '结婚证', '房产证', '合同', '发票', '收据', '说明书', '保修卡', '银行卡', '存折']
  };

  for (const [catId, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => itemName.includes(kw))) {
      const cat = categories.find(c => c.category_id === catId);
      if (cat) return cat;
    }
  }
  return null;
}

// 主解析函数（支持多个物品）
function parseVoiceText(text, spaces, categories) {
  if (!text || !text.trim()) {
    return { success: false, message: '未识别到内容' };
  }

  text = text.trim();

  // 1. 先提取全局信息：空间、过期日期（适用于所有物品）
  let working = text;
  let globalSpace = null;
  let globalExpireDate = '';

  // 提取全局过期日期
  const expireResult = extractExpireDate(working);
  globalExpireDate = expireResult.expireDate;
  working = expireResult.cleaned;

  // 提取全局空间
  const spaceResult = extractSpace(working, spaces);
  if (spaceResult.space) {
    globalSpace = spaceResult.space;
  }
  working = spaceResult.cleaned;

  // 2. 按分隔符拆分多个物品
  // 支持："和"、"还有"、"、"、"，"、"再"、"+"、"加上"
  const segments = splitMultipleItems(working);

  // 3. 对每段解析出独立物品
  const items = [];
  for (const seg of segments) {
    const segTrim = seg.trim();
    if (!segTrim) continue;

    let segWorking = segTrim;
    const item = {
      name: '',
      space_id: globalSpace ? globalSpace.space_id : '',
      spaceName: globalSpace ? globalSpace.name : '',
      category: 'cat_other',
      quantity: 1,
      brand: '',
      expire_date: globalExpireDate,
      rawText: segTrim
    };

    // 段内提取品牌
    const brandResult = extractBrand(segWorking);
    item.brand = brandResult.brand;
    segWorking = brandResult.cleaned;

    // 段内提取数量
    const qtyResult = extractQuantity(segWorking);
    item.quantity = qtyResult.quantity;
    segWorking = qtyResult.cleaned;

    // 段内提取空间（覆盖全局）
    const segSpaceResult = extractSpace(segWorking, spaces);
    if (segSpaceResult.space) {
      item.space_id = segSpaceResult.space.space_id;
      item.spaceName = segSpaceResult.space.name;
    }
    segWorking = segSpaceResult.cleaned;

    // 段内提取物品名
    item.name = extractItemName(segWorking);

    // 段内提取过期日期（覆盖全局）
    const segExpireResult = extractExpireDate(segTrim);
    if (segExpireResult.expireDate) {
      item.expire_date = segExpireResult.expireDate;
    }

    // 智能匹配分类
    const matchedCat = matchCategory(item.name, categories);
    if (matchedCat) {
      item.category = matchedCat.category_id;
    }

    if (item.name) {
      items.push(item);
    }
  }

  if (items.length === 0) {
    return { success: false, message: '未识别到物品名称，请重试' };
  }

  return { success: true, items, rawText: text };
}

// 拆分多个物品
function splitMultipleItems(text) {
  // 用正则按分隔符拆分，保留分隔符上下文
  // 支持：和、还有、再、加上、+、以及、、，,
  const separators = /(?:和|还有|再|加上|以及|、|，|,|\+)/g;
  const parts = text.split(separators);
  // 过滤空段
  return parts.map(p => p.trim()).filter(p => p.length > 0);
}

// 兼容旧接口：单物品解析
function parseVoiceTextSingle(text, spaces, categories) {
  const result = parseVoiceText(text, spaces, categories);
  if (!result.success) return result;
  return { ...result, ...result.items[0] };
}

// ============ AI 语义解析（路线B） ============

// 调用云函数做 AI 解析，失败时自动回退到本地规则解析
function parseWithAI(text, spaces, categories) {
  return new Promise((resolve) => {
    const app = getApp();
    if (!app || !app.globalData || !app.globalData.cloudReady) {
      // 云开发未就绪，直接走本地解析
      const local = parseVoiceText(text, spaces, categories);
      local.source = 'local';
      resolve(local);
      return;
    }

    wx.cloud.callFunction({
      name: 'parseVoice',
      data: { text, spaces, categories },
      success: (res) => {
        if (res.result && res.result.success) {
          // AI 解析成功
          resolve({ ...res.result, source: 'ai' });
        } else {
          // AI 返回失败，回退本地
          const local = parseVoiceText(text, spaces, categories);
          local.source = 'local';
          local.aiError = res.result ? res.result.message : 'AI解析失败';
          resolve(local);
        }
      },
      fail: (err) => {
        console.warn('[voiceParser] 云函数调用失败，回退本地解析:', err);
        const local = parseVoiceText(text, spaces, categories);
        local.source = 'local';
        local.aiError = err.errMsg || '云函数调用失败';
        resolve(local);
      }
    });
  });
}

module.exports = {
  parseVoiceText,
  parseVoiceTextSingle,
  parseWithAI,
  splitMultipleItems,
  parseChineseNumber,
  extractQuantity,
  extractSpace,
  extractItemName,
  extractBrand,
  extractExpireDate,
  matchCategory
};
