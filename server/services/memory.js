const { getDB } = require("../db/index");

let messageCount = 0;
const EXTRACT_INTERVAL = 3;

function shouldExtract() {
  messageCount++;
  if (messageCount >= EXTRACT_INTERVAL) {
    messageCount = 0;
    return true;
  }
  return false;
}

// ========== 记忆提取 ==========

async function extractMemoryByAI(userMessage, aiReply) {
  if (!shouldExtract()) return null;

  const today = new Date().toISOString().slice(0, 10);

  const prompt = `从以下对话提取值得长期记住的信息。包含事件、情绪、偏好、计划等。
格式：每条一行，带简短描述。没有值得记住的回复"无"。

示例输出：
明天有英语考试，很紧张
最近在学吉他
喜欢吃辣，不吃香菜

今天日期：${today}
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
          max_tokens: 100,
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

// ========== 每日记忆存储 ==========

async function saveDailyMemory(content) {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await db
    .from("memories_recent")
    .select("id, content")
    .eq("source_session", today)
    .limit(1);

  if (existing && existing.length > 0) {
    const oldItems = existing[0].content
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const newItems = content
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const merged = [...new Set([...oldItems, ...newItems])].join("\n");

    await db
      .from("memories_recent")
      .update({ content: merged })
      .eq("id", existing[0].id);
    console.log(`今日记忆更新: ${merged}`);
  } else {
    await db.from("memories_recent").insert({ content, source_session: today });
    console.log(`今日记忆新建: ${content}`);
  }
}

// ========== 行为模式检测 ==========

async function detectPatterns(userMessage) {
  const db = getDB();
  const now = new Date();
  const hour = now.getHours();

  // 深夜聊天检测
  if (hour >= 23 || hour <= 3) {
    await upsertPattern(db, "late_night", "用户经常深夜聊天，可能有熬夜习惯");
  }

  // 负面情绪检测
  const negativeWords = [
    "累",
    "烦",
    "难受",
    "压力",
    "焦虑",
    "失眠",
    "不想",
    "好烦",
    "崩溃",
    "郁闷",
    "无聊",
    "孤独",
    "难过",
    "伤心",
  ];
  if (negativeWords.some((w) => userMessage.includes(w))) {
    await upsertPattern(db, "emotion_negative", "用户近期情绪偏低落，需要关心");
  }

  // 积极情绪检测
  const positiveWords = [
    "开心",
    "高兴",
    "哈哈",
    "太好了",
    "nice",
    "棒",
    "爽",
    "兴奋",
    "期待",
  ];
  if (positiveWords.some((w) => userMessage.includes(w))) {
    await upsertPattern(db, "emotion_positive", "用户近期心情不错");
  }

  // 工作/学习压力检测
  const workWords = [
    "加班",
    "赶工",
    "deadline",
    "考试",
    "作业",
    "论文",
    "项目",
    "忙死",
  ];
  if (workWords.some((w) => userMessage.includes(w))) {
    await upsertPattern(db, "work_pressure", "用户工作/学习压力较大");
  }
}

async function upsertPattern(db, type, description) {
  const { data: existing } = await db
    .from("memory_patterns")
    .select("id, frequency")
    .eq("pattern_type", type)
    .limit(1);

  if (existing && existing.length > 0) {
    await db
      .from("memory_patterns")
      .update({
        frequency: existing[0].frequency + 1,
        last_seen: new Date().toISOString(),
        description,
      })
      .eq("id", existing[0].id);
  } else {
    await db
      .from("memory_patterns")
      .insert({ pattern_type: type, description, frequency: 1 });
  }
}

// ========== 记忆召回 ==========

async function buildMemoryContextAsync(sessionId, userMessage) {
  const db = getDB();
  let context = "";

  // 第一层：总档案
  const { data: profileRow } = await db
    .from("user_profile")
    .select("value")
    .eq("key", "memory_profile")
    .limit(1);

  if (profileRow && profileRow.length > 0 && profileRow[0].value) {
    context += `\n[用户档案] ${profileRow[0].value}\n`;
  }

  // 第二层：最近 7 天的记忆
  const { data: recentDays } = await db
    .from("memories_recent")
    .select("content, source_session")
    .order("created_at", { ascending: false })
    .limit(7);

  if (recentDays && recentDays.length > 0) {
    context += "[近期记忆]\n";
    for (const m of recentDays) {
      context += `${m.source_session}: ${m.content}\n`;
    }
  }

  // 第三层：行为模式（频率>=3才展示，说明是真正的模式）
  const { data: patterns } = await db
    .from("memory_patterns")
    .select("pattern_type, description, frequency, last_seen")
    .gte("frequency", 3)
    .order("frequency", { ascending: false })
    .limit(5);

  if (patterns && patterns.length > 0) {
    context += "[行为模式]\n";
    for (const p of patterns) {
      context += `${p.description}（已出现${p.frequency}次，最近: ${p.last_seen.slice(0, 10)}）\n`;
    }
  }

  // 第四层：互动状态
  const { data: lastMsg } = await db
    .from("messages")
    .select("timestamp")
    .eq("role", "user")
    .order("id", { ascending: false })
    .limit(1);

  if (lastMsg && lastMsg.length > 0) {
    const hoursSince =
      (Date.now() - new Date(lastMsg[0].timestamp).getTime()) /
      (1000 * 60 * 60);
    if (hoursSince > 48) {
      context += `[互动状态] 用户已经${Math.floor(hoursSince / 24)}天没来聊天了，可以自然地表达想念或关心\n`;
    } else if (hoursSince > 12) {
      context += `[互动状态] 用户${Math.floor(hoursSince)}小时没来了\n`;
    }
  }

  if (context) {
    context +=
      "[记忆使用提示] 以上是你记住的信息。在合适时机自然引用，像真正记得一样。不要每句都提，只在相关时提起。\n";
  }

  return context;
}

// ========== 记忆合并 ==========

async function consolidateMemories() {
  const db = getDB();

  const { data: dailyMems } = await db
    .from("memories_recent")
    .select("*")
    .order("created_at", { ascending: true });

  if (!dailyMems || dailyMems.length === 0) return;

  const { data: profileRow } = await db
    .from("user_profile")
    .select("value")
    .eq("key", "memory_profile")
    .limit(1);

  const currentProfileText =
    profileRow && profileRow.length > 0 ? profileRow[0].value : "空";
  const allDaily = dailyMems
    .map((m) => `[${m.source_session}] ${m.content}`)
    .join("\n");

  const prompt = `将以下记忆合并成精简的用户档案。保留重要的事实、偏好、习惯、人际关系。
按重要性排序，最重要的在前。300字以内。

当前档案：${currentProfileText}
每日记忆：
${allDaily}

合并后的档案：`;

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
          max_tokens: 300,
          temperature: 0,
        }),
      },
    );

    const data = await response.json();
    if (!data.choices || !data.choices[0]) return;

    const newProfile = data.choices[0].message.content.trim();

    const { data: existing } = await db
      .from("user_profile")
      .select("id")
      .eq("key", "memory_profile")
      .limit(1);

    if (existing && existing.length > 0) {
      await db
        .from("user_profile")
        .update({ value: newProfile, updated_at: new Date().toISOString() })
        .eq("key", "memory_profile");
    } else {
      await db
        .from("user_profile")
        .insert({ key: "memory_profile", value: newProfile });
    }

    // 清理 7 天前的每日记忆
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await db.from("memories_recent").delete().lt("created_at", sevenDaysAgo);

    console.log(`总档案更新: ${newProfile}`);
  } catch (e) {
    console.error("记忆合并失败:", e);
  }
}

// ========== 基础查询 ==========

async function getSessionMemory(sessionId, limit = 10) {
  const db = getDB();
  const { data } = await db
    .from("messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("id", { ascending: false })
    .limit(limit);
  return (data || []).reverse();
}

async function getRecentMemories(limit = 50) {
  const db = getDB();
  const { data } = await db
    .from("memories_recent")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

async function deleteRecentMemory(id) {
  const db = getDB();
  await db.from("memories_recent").delete().eq("id", id);
}

async function getMemoryProfile() {
  const db = getDB();
  const { data } = await db
    .from("user_profile")
    .select("value")
    .eq("key", "memory_profile")
    .limit(1);
  return data && data.length > 0 ? data[0].value : "";
}

async function setMemoryProfile(content) {
  const db = getDB();

  const { data: existing } = await db
    .from("user_profile")
    .select("id")
    .eq("key", "memory_profile")
    .limit(1);

  if (existing && existing.length > 0) {
    await db
      .from("user_profile")
      .update({ value: content, updated_at: new Date().toISOString() })
      .eq("key", "memory_profile");
  } else {
    await db
      .from("user_profile")
      .insert({ key: "memory_profile", value: content });
  }
}

module.exports = {
  extractMemoryByAI,
  saveDailyMemory,
  consolidateMemories,
  buildMemoryContextAsync,
  getSessionMemory,
  getRecentMemories,
  deleteRecentMemory,
  getMemoryProfile,
  setMemoryProfile,
  detectPatterns,
};
