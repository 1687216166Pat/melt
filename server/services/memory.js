// server/services/memory.js
const { getDB } = require("../db/index");

// 消息计数器，每 3 条消息才提取一次记忆
let messageCount = 0;
const EXTRACT_INTERVAL = 3;

// ============ 记忆提取（AI 驱动） ============

function shouldExtract() {
  messageCount++;
  if (messageCount >= EXTRACT_INTERVAL) {
    messageCount = 0;
    return true;
  }
  return false;
}

async function extractMemoryByAI(userMessage, aiReply) {
  // 每 3 条消息才提取一次
  if (!shouldExtract()) {
    return null;
  }

  const prompt = `从以下对话提取值得记住的事实信息。用|分隔，格式如：名:xx|住:xx。没有则回复"无"。

用户: ${userMessage}
AI: ${aiReply}

提取：`;

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
          max_tokens: 80,
          temperature: 0,
        }),
      },
    );

    const data = await response.json();
    if (!data.choices || !data.choices[0]) return null;

    const result = data.choices[0].message.content.trim();
    if (result === "无" || result.length < 2) return null;

    console.log("记忆提取结果:", result);
    return result;
  } catch (e) {
    console.error("记忆提取失败:", e);
    return null;
  }
}

// ============ 存储记忆 ============

function saveDailyMemory(content) {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);

  const existing = db
    .prepare("SELECT id, content FROM memories_recent WHERE source_session = ?")
    .get(today);

  if (existing) {
    const oldItems = existing.content.split("|").map((s) => s.trim());
    const newItems = content.split("|").map((s) => s.trim());
    const merged = [...new Set([...oldItems, ...newItems])].join("|");

    db.prepare("UPDATE memories_recent SET content = ? WHERE id = ?").run(
      merged,
      existing.id,
    );
    console.log(`今日记忆更新: ${merged}`);
  } else {
    db.prepare(
      "INSERT INTO memories_recent (content, source_session) VALUES (?, ?)",
    ).run(content, today);
    console.log(`今日记忆新建: ${content}`);
  }
}

// ============ 总档案管理 ============

async function consolidateMemories() {
  const db = getDB();

  const dailyMems = db
    .prepare(
      "SELECT content, source_session FROM memories_recent ORDER BY created_at ASC",
    )
    .all();

  if (dailyMems.length === 0) return;

  const currentProfile = db
    .prepare("SELECT value FROM user_profile WHERE key = 'memory_profile'")
    .get();

  const allDaily = dailyMems
    .map((m) => `[${m.source_session}] ${m.content}`)
    .join("\n");
  const currentProfileText = currentProfile ? currentProfile.value : "空";

  const prompt = `将以下记忆合并成精简档案。用|分隔，200字内，重要信息在前。

当前档案：${currentProfileText}
每日记忆：
${allDaily}

合并后：`;

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
          max_tokens: 200,
          temperature: 0,
        }),
      },
    );

    const data = await response.json();
    if (!data.choices || !data.choices[0]) return;

    const newProfile = data.choices[0].message.content.trim();

    db.prepare(
      `
      INSERT INTO user_profile (key, value, updated_at)
      VALUES ('memory_profile', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `,
    ).run(newProfile, newProfile);

    db.prepare(
      "DELETE FROM memories_recent WHERE created_at < datetime('now', '-7 days')",
    ).run();

    console.log(`总档案更新: ${newProfile}`);
  } catch (e) {
    console.error("记忆合并失败:", e);
  }
}

// ============ 组装记忆上下文 ============

function buildMemoryContext(sessionId, userMessage) {
  const db = getDB();
  let context = "";

  const profile = db
    .prepare("SELECT value FROM user_profile WHERE key = 'memory_profile'")
    .get();
  if (profile && profile.value) {
    context += `\n[用户档案] ${profile.value}\n`;
  }

  const recentDays = db
    .prepare(
      "SELECT content, source_session FROM memories_recent ORDER BY created_at DESC LIMIT 3",
    )
    .all();
  if (recentDays.length > 0) {
    context += "[近期]\n";
    for (const m of recentDays) {
      context += `${m.source_session}: ${m.content}\n`;
    }
  }

  return context;
}

// ============ 对外接口 ============

function getRecentMemories(limit = 50) {
  const db = getDB();
  return db
    .prepare("SELECT * FROM memories_recent ORDER BY created_at DESC LIMIT ?")
    .all(limit);
}

function deleteRecentMemory(id) {
  const db = getDB();
  db.prepare("DELETE FROM memories_recent WHERE id = ?").run(id);
}

function getMemoryProfile() {
  const db = getDB();
  const row = db
    .prepare("SELECT value FROM user_profile WHERE key = 'memory_profile'")
    .get();
  return row ? row.value : "";
}

function setMemoryProfile(content) {
  const db = getDB();
  db.prepare(
    `
    INSERT INTO user_profile (key, value, updated_at)
    VALUES ('memory_profile', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
  `,
  ).run(content, content);
}

function getSessionMemory(sessionId, limit = 10) {
  const db = getDB();
  return db
    .prepare(
      "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT ?",
    )
    .all(sessionId, limit)
    .reverse();
}

module.exports = {
  extractMemoryByAI,
  saveDailyMemory,
  consolidateMemories,
  buildMemoryContext,
  getSessionMemory,
  getRecentMemories,
  deleteRecentMemory,
  getMemoryProfile,
  setMemoryProfile,
};
