const { getDB } = require("../db/index");

let messageCount = {};
const EXTRACT_INTERVAL = 1;

function shouldExtract(personaId) {
  if (!messageCount[personaId]) messageCount[personaId] = 0;
  messageCount[personaId]++;
  if (messageCount[personaId] >= EXTRACT_INTERVAL) {
    messageCount[personaId] = 0;
    return true;
  }
  return false;
}

// ========== 记忆提取 ==========

async function extractMemoryByAI(personaId, userMessage, aiReply) {
  if (!shouldExtract(personaId)) return null;

  const today = new Date().toISOString().slice(0, 10);

  const prompt = `从以下对话中提取所有值得记住的内容。可以包括：
- 用户分享的事实、计划、经历、情绪
- 对话中产生的共识、约定、玩笑
- 值得以后回忆的瞬间或话题
- 用户的偏好、习惯、关系信息

注意：
- 不要提取角色扮演中的虚构设定作为真实记忆
- 不要提取关于聊天界面、显示格式、技术问题的内容
- 不要提取用户在调试或测试系统功能的对话
每条一行，简短描述。没有值得记住的回复"无"。

今天日期：${today}
用户: ${userMessage}
AI: ${aiReply}

提取：`;

  try {
    console.log(
      `[记忆] 调用API提取, 模型:`,
      process.env.AI_MEMORY_MODEL || process.env.AI_MODEL,
    );
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

    console.log(`[记忆] API响应状态:`, response.status);
    const data = await response.json();
    console.log(`[记忆] API返回:`, JSON.stringify(data).slice(0, 200));

    if (!data.choices || !data.choices[0]) return null;

    const result = data.choices[0].message.content.trim();
    console.log(`[记忆] 提取原始返回:`, result);
    if (result === "无" || result.length < 2) return null;

    return result;
  } catch (e) {
    console.error("[记忆] 提取失败:", e.message);
    return null;
  }
}

// ========== 每日记忆存储 ==========

async function saveDailyMemory(personaId, content) {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await db
    .from("memories_recent")
    .select("id, content")
    .eq("persona_id", personaId)
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
  } else {
    await db
      .from("memories_recent")
      .insert({ persona_id: personaId, content, source_session: today });
  }
}

// ========== 行为模式检测 ==========

async function detectPatterns(personaId, userMessage) {
  const db = getDB();
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 23 || hour <= 3) {
    await upsertPattern(
      db,
      personaId,
      "late_night",
      "用户经常深夜聊天，可能有熬夜习惯",
    );
  }

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
    await upsertPattern(
      db,
      personaId,
      "emotion_negative",
      "用户近期情绪偏低落，需要关心",
    );
  }

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
    await upsertPattern(db, personaId, "emotion_positive", "用户近期心情不错");
  }

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
    await upsertPattern(
      db,
      personaId,
      "work_pressure",
      "用户工作/学习压力较大",
    );
  }
}

async function upsertPattern(db, personaId, type, description) {
  const { data: existing } = await db
    .from("memory_patterns")
    .select("id, frequency")
    .eq("persona_id", personaId)
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
    await db.from("memory_patterns").insert({
      persona_id: personaId,
      pattern_type: type,
      description,
      frequency: 1,
    });
  }
}

// ========== 记忆召回 ==========

async function buildMemoryContextAsync(personaId, userMessage) {
  const db = getDB();
  let context = "";

  // 总档案
  const { data: profileRow } = await db
    .from("user_profile")
    .select("value")
    .eq("key", `memory_profile_${personaId}`)
    .limit(1);

  if (profileRow && profileRow.length > 0 && profileRow[0].value) {
    context += `\n[用户档案] ${profileRow[0].value}\n`;
  }

  // 最近 7 天记忆
  const { data: recentDays } = await db
    .from("memories_recent")
    .select("content, source_session")
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false })
    .limit(7);

  if (recentDays && recentDays.length > 0) {
    context += "[近期记忆]\n";
    for (const m of recentDays) {
      context += `${m.source_session}: ${m.content}\n`;
    }
  }

  // 行为模式
  const { data: patterns } = await db
    .from("memory_patterns")
    .select("pattern_type, description, frequency, last_seen")
    .eq("persona_id", personaId)
    .gte("frequency", 3)
    .order("frequency", { ascending: false })
    .limit(5);

  if (patterns && patterns.length > 0) {
    context += "[行为模式]\n";
    for (const p of patterns) {
      context += `${p.description}（已出现${p.frequency}次，最近: ${p.last_seen.slice(0, 10)}）\n`;
    }
  }

  // 互动状态
  const { data: lastMsg } = await db
    .from("messages")
    .select("timestamp")
    .eq("persona_id", personaId)
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
      "[记忆使用提示] 以上是你的记忆背景。规则：1.不要主动提起记忆，除非用户的话题自然关联到 2.绝对不要在每句话末尾追问记忆相关的事 3.记忆只用来理解用户，不用来展示你记得什么 4.如果用户没提到相关话题，就当这些记忆不存在\n";
  }

  return context;
}

// ========== 记忆合并 ==========

async function consolidateMemories(personaId) {
  const db = getDB();

  const { data: dailyMems } = await db
    .from("memories_recent")
    .select("*")
    .eq("persona_id", personaId)
    .order("created_at", { ascending: true });

  if (!dailyMems || dailyMems.length === 0) return;

  const { data: profileRow } = await db
    .from("user_profile")
    .select("value")
    .eq("key", `memory_profile_${personaId}`)
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
    const profileKey = `memory_profile_${personaId}`;

    const { data: existing } = await db
      .from("user_profile")
      .select("id")
      .eq("key", profileKey)
      .limit(1);

    if (existing && existing.length > 0) {
      await db
        .from("user_profile")
        .update({ value: newProfile, updated_at: new Date().toISOString() })
        .eq("key", profileKey);
    } else {
      await db
        .from("user_profile")
        .insert({ key: profileKey, value: newProfile });
    }

    // 清理 7 天前的
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await db
      .from("memories_recent")
      .delete()
      .eq("persona_id", personaId)
      .lt("created_at", sevenDaysAgo);

    console.log(`[${personaId}] 总档案更新: ${newProfile}`);
  } catch (e) {
    console.error("记忆合并失败:", e);
  }
}

// ========== 基础查询 ==========

async function getSessionMemory(personaId, limit = 10) {
  const db = getDB();
  const { data } = await db
    .from("messages")
    .select("role, content")
    .eq("persona_id", personaId)
    .order("id", { ascending: false })
    .limit(limit);
  return (data || []).reverse();
}

async function getRecentMemories(personaId, limit = 50) {
  const db = getDB();
  const { data } = await db
    .from("memories_recent")
    .select("*")
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

async function deleteRecentMemory(id) {
  const db = getDB();
  await db.from("memories_recent").delete().eq("id", id);
}

async function getMemoryProfile(personaId) {
  const db = getDB();
  const { data } = await db
    .from("user_profile")
    .select("value")
    .eq("key", `memory_profile_${personaId}`)
    .limit(1);
  return data && data.length > 0 ? data[0].value : "";
}

async function setMemoryProfile(personaId, content) {
  const db = getDB();
  const profileKey = `memory_profile_${personaId}`;

  const { data: existing } = await db
    .from("user_profile")
    .select("id")
    .eq("key", profileKey)
    .limit(1);

  if (existing && existing.length > 0) {
    await db
      .from("user_profile")
      .update({ value: content, updated_at: new Date().toISOString() })
      .eq("key", profileKey);
  } else {
    await db.from("user_profile").insert({ key: profileKey, value: content });
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
