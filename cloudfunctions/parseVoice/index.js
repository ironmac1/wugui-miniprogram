// cloudfunctions/parseVoice/index.js
// 语音文本 AI 语义解析云函数
// 调用 DeepSeek API 从自然语言提取结构化物品信息

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// DeepSeek API 配置（API Key 从云函数环境变量读取，不硬编码）
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// 日期格式化 YYYY-MM-DD
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 构建系统提示词
function buildSystemPrompt(spaces, categories) {
  const today = formatDate(new Date());
  const spaceNames = spaces.map(s => s.name).join('、');
  const catNames = categories.map(c => `${c.name}(${c.category_id})`).join('、');

  return `你是一个家庭物品管理助手。用户会用一句话描述要添加的物品，你需要从中提取结构化信息。

当前日期：${today}
用户的空间列表：${spaceNames}
分类列表：${catNames}

请从用户的描述中提取以下信息，可能包含多个物品：
1. name: 物品名称（必填）
2. space: 空间名（匹配用户已有空间，如果用户说的空间不在列表里就返回空字符串）
3. category: 分类ID（根据物品名智能匹配分类，返回category_id）
4. quantity: 数量（默认1）
5. brand: 品牌（如果提到）
6. expire_date: 过期日期（格式 YYYY-MM-DD，要理解为真实日期。比如"下个月"就返回下个月今天的日期，"下周三"就返回下周三的日期）

如果一句话包含多个物品（用"和"、"还有"、"、"等分隔），返回多个物品对象。

只返回JSON，不要其他文字。格式：
{
  "items": [
    {
      "name": "洗洁精",
      "space": "厨房",
      "category": "cat_daily",
      "quantity": 1,
      "brand": "蓝月亮",
      "expire_date": "2026-07-20"
    }
  ]
}`;
}

// 调用 DeepSeek API
async function callDeepSeek(text, spaces, categories) {
  const systemPrompt = buildSystemPrompt(spaces, categories);

  const body = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ],
    temperature: 0.1,  // 低温度，结果更稳定
    max_tokens: 1000,
    response_format: { type: 'json_object' }
  };

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || ''}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // 解析JSON
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error('AI返回格式异常: ' + content);
  }

  return parsed;
}

// 空间名匹配到 space_id
function matchSpaceId(spaceName, spaces) {
  if (!spaceName) return '';
  // 完全匹配
  let matched = spaces.find(s => s.name === spaceName);
  if (matched) return matched.space_id;
  // 包含匹配
  matched = spaces.find(s => s.name.includes(spaceName) || spaceName.includes(s.name));
  if (matched) return matched.space_id;
  return '';
}

// 云函数入口
exports.main = async (event, context) => {
  const { text, spaces = [], categories = [] } = event;

  if (!text || !text.trim()) {
    return { success: false, message: '未收到文本' };
  }

  try {
    // 调用 AI 解析
    const aiResult = await callDeepSeek(text, spaces, categories);

    if (!aiResult.items || !Array.isArray(aiResult.items) || aiResult.items.length === 0) {
      return { success: false, message: 'AI未能识别出物品', rawText: text };
    }

    // 后处理：空间名 → space_id
    const items = aiResult.items.map(item => {
      const spaceId = matchSpaceId(item.space, spaces);
      const space = spaces.find(s => s.space_id === spaceId);
      return {
        name: item.name || '',
        space_id: spaceId,
        spaceName: space ? space.name : (item.space || ''),
        category: item.category || 'cat_other',
        quantity: parseInt(item.quantity) || 1,
        brand: item.brand || '',
        expire_date: item.expire_date || '',
        rawText: text
      };
    }).filter(item => item.name); // 过滤掉没有名称的

    if (items.length === 0) {
      return { success: false, message: '未识别到有效物品名称', rawText: text };
    }

    return {
      success: true,
      items,
      rawText: text,
      source: 'ai'
    };
  } catch (err) {
    console.error('[parseVoice] AI解析失败:', err);
    return {
      success: false,
      message: 'AI解析失败：' + err.message,
      rawText: text
    };
  }
};
