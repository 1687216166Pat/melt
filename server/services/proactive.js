// server/services/proactive.js
const { getDB } = require("../db/index");
const { pushToAll } = require("../ws/socket");
const { getMemoryProfile, getRecentMemories } = require("./memory");

// ============ 配置 ============

function getProactiveSettings() {
  const db = getDB();
  const row = db
    .prepare("SELECT value FROM user_profile WHERE key = 'proactive_settings'")
    .get();
  if (row) return JSON.parse(row.value);
  return {
    enabled: true,
    idleHours: 12,
    nightReminder: true,
    memoryReminder: true,
    maxPerDay: 3,
    minInterval: 4,
  };
}

function setProactiveSettings(settings) {
  const db = getDB();
  db.prepare(
    `
    INSERT INTO user_profile (key, value, updated_at)
    VALUES ('proactive_settings', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
  `,
  ).run(JSON.stringify(settings), JSON.stringify(settings));
}

// ============ 边界检查 ============

function checkBoundary(settings) {
  const db = getDB();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // 检查今天已发送次数
  const todayCount = db
    .prepare("SELECT COUNT(*) as count FROM proactive_log WHERE date = ?")
    .get(today);

  if (todayCount && todayCount.count >= settings.maxPerDay) {
    console.log(`今日主动消息已达上限 (${settings.maxPerDay})`);
    return false;
  }

  // 检查距离上次主动消息的间隔
  const lastSent = db
    .prepare("SELECT sent_at FROM proactive_log ORDER BY sent_at DESC LIMIT 1")
    .get();

  if (lastSent) {
    const lastTime = new Date(lastSent.sent_at);
    const hoursSince = (now - lastTime) / (1000 * 60 * 60);
    if (hoursSince < settings.minInterval) {
      console.log(
        `距上次主动消息仅 ${hoursSince.toFixed(1)} 小时，需间隔 ${settings.minInterval} 小时`,
      );
      return false;
    }
  }

  return true;
}

function logProactiveMessage(message) {
  const db = getDB();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // 确保表存在
  db.exec(`
    CREATE TABLE IF NOT EXISTS proactive_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      message TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.prepare("INSERT INTO proactive_log (date, message) VALUES (?, ?)").run(
    today,
    message,
  );
}

// ============ 检查逻辑 ============

async function checkProactiveMessages() {
  const settings = getProactiveSettings();
  if (!settings.enabled) return;

  // 边界检查
  if (!checkBoundary(settings)) return;

  const db = getDB();
  const now = new Date();
  const hour = now.getHours();

  // 获取最后一条用户消息时间
  const lastMsg = db
    .prepare(
      "SELECT timestamp FROM messages WHERE role = 'user' ORDER BY id DESC LIMIT 1",
    )
    .get();

  const lastTime = lastMsg ? new Date(lastMsg.timestamp) : null;
  const idleMs = lastTime ? now - lastTime : Infinity;
  const idleHours = idleMs / (1000 * 60 * 60);

  let message = null;

  // 类型1：长时间未互动
  if (idleHours >= settings.idleHours) {
    message = await generateIdleMessage(idleHours);
  }

  // 类型2：记忆提醒（早上 8-10 点检查）
  if (!message && settings.memoryReminder && hour >= 8 && hour <= 10) {
    message = await generateMemoryReminder();
  }

  // 类型3：状态关联
  if (!message && settings.nightReminder) {
    message = generateStatusMessage(hour, db);
  }

  if (message) {
    // 存入数据库（不带前缀，但标记 is_proactive）
    const session = db
      .prepare("SELECT id FROM sessions ORDER BY updated_at DESC LIMIT 1")
      .get();
    const sid = session ? session.id : "default";
    db.prepare(
      "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
    ).run(sid, "ai", message);

    // 记录发送日志
    logProactiveMessage(message);

    // 推送给前端
    pushToAll(message);
    console.log("主动消息已发送:", message);
  }
}

// ============ 生成消息 ============

async function generateIdleMessage(idleHours) {
  const profile = getMemoryProfile();
  const timeDesc = idleHours >= 24 ? "一天多" : "好久";

  const prompt = `你是用户手机里的AI伴侣。用户已经${timeDesc}没跟你说话了。
用户档案：${profile || "暂无"}
用一句话自然地打招呼或关心一下，不要太刻意。语气温柔自然。只回复消息内容，不要加引号。`;

  return await callAI(prompt);
}

async function generateMemoryReminder() {
  const db = getDB();
  const profile = getMemoryProfile();
  const recentMems = getRecentMemories(5);

  if (recentMems.length === 0 && !profile) return null;

  const recentText = recentMems.map((m) => m.content).join("\n");
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;

  const prompt = `你是用户手机里的AI伴侣。今天是${dateStr}。
用户档案：${profile || "暂无"}
最近记忆：
${recentText || "暂无"}

根据记忆，判断今天是否有值得提醒用户的事情（比如考试、约会、生日、计划等）。
如果有，用一句话温柔地提醒。如果没有，回复"无"。只回复消息内容，不要加引号。`;

  const result = await callAI(prompt);
  if (result === "无" || !result) return null;
  return result;
}

function generateStatusMessage(hour, db) {
  if (hour >= 23 || hour <= 3) {
    const recentMsg = db
      .prepare(
        "SELECT id FROM messages WHERE role = 'user' AND timestamp > datetime('now', '-1 hour')",
      )
      .get();

    if (recentMsg) {
      const nightMessages = [
        "已经很晚了呢...要早点休息哦",
        "夜深了，明天还要早起吧？",
        "这么晚还没睡呀...要注意身体呢",
      ];
      return nightMessages[Math.floor(Math.random() * nightMessages.length)];
    }
  }

  const msgCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM messages WHERE role = 'user' AND timestamp > datetime('now', '-2 hours')",
    )
    .get();

  if (msgCount && msgCount.count >= 20) {
    const freqMessages = [
      "今天聊了好多呀，开心~",
      "我们今天聊了好久呢，要不要休息一下眼睛？",
      "和你聊天时间过得好快呀",
    ];
    return freqMessages[Math.floor(Math.random() * freqMessages.length)];
  }

  return null;
}

// ============ 工具函数 ============

async function callAI(prompt) {
  try {
    const response = await fetch(
      `${process.env.AI_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MEMORY_MODEL || process.env.AI_MODEL,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 60,
          temperature: 0.8,
        }),
      },
    );

    const data = await response.json();
    if (!data.choices || !data.choices[0]) return null;
    return data.choices[0].message.content.trim();
  } catch (e) {
    console.error("主动消息 AI 调用失败:", e);
    return null;
  }
}

module.exports = {
  checkProactiveMessages,
  getProactiveSettings,
  setProactiveSettings,
};
