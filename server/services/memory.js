const { getDB } = require("../db/index");
const { callSubAI } = require("./subai");

// ========== 消息计数器 ==========
let messageCounters = {};

function getCounter(personaId) {
  if (!messageCounters[personaId]) {
    messageCounters[personaId] = { total: 0, sinceLastSummary: 0 };
  }
  return messageCounters[personaId];
}

// ========== 触发判断 ==========

// 基础触发：80-120条消息
function shouldTriggerBasic(personaId) {
  const counter = getCounter(personaId);
  counter.sinceLastSummary++;
  counter.total++;
  return counter.sinceLastSummary >= 100; // 100条触发
}

// 事件触发：高情绪、深夜长聊、重要变化
function shouldTriggerEvent(userMessage, personaId) {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }),
  );
  const hour = now.getHours();

  // 深夜长聊（23点-4点且已经聊了20条以上）
  const counter = getCounter(personaId);
  if ((hour >= 23 || hour <= 4) && counter.sinceLastSummary >= 20) {
    return "deep_night_chat";
  }

  // 高情绪波动
  const highEmotionWords = [
    "崩溃",
    "好想哭",
    "受不了",
    "太开心了",
    "我爱你",
    "分手",
    "离开",
    "对不起",
    "谢谢你一直在",
  ];
  if (highEmotionWords.some((w) => userMessage.includes(w))) {
    return "high_emotion";
  }

  // 重要关系变化
  const relationWords = [
    "我们在一起吧",
    "你是我的",
    "我信任你",
    "只跟你说",
    "第一次跟人说",
  ];
  if (relationWords.some((w) => userMessage.includes(w))) {
    return "relation_change";
  }

  return null;
}

// ========== 短期总结层 ==========

async function triggerShortTermSummary(personaId, reason) {
  const db = getDB();
  const counter = getCounter(personaId);
  const { getIdentityConfig } = require("./sediment");
  const identity = await getIdentityConfig(personaId);

  const { data: recentMsgs } = await db
    .from("messages")
    .select("role, content, timestamp")
    .eq("persona_id", personaId)
    .order("id", { ascending: false })
    .limit(counter.sinceLastSummary || 100);

  if (!recentMsgs || recentMsgs.length < 5) return;

  const msgs = recentMsgs.reverse();
  const dialogue = msgs
    .map((m) => {
      const name = m.role === "user" ? identity.userName : identity.aiName;
      return `${name}: ${m.content}`;
    })
    .join("\n");
  const cleanAiReply = aiReply.replace(/\|\|\|/g, " ");

  const prompt = `你是一个时间线记录系统。判断以下对话是否包含"值得留下痕迹"的瞬间。

${toneGuide}
注意：用"${pronoun}"来称呼这个角色，不要用"AI"或"它"

只有以下类型才值得记录：
- 高情绪波动
- 关系变化
- 长期习惯形成
- 共同经历
- 特别瞬间

如果不值得记录，回复"无"。
如果值得，用以下格式回复（一行）：
类型|内容描述（用${identity.userName}和${identity.aiName}称呼，像回忆一样，不超过30字）|标签

用户: ${userMessage}
AI: ${cleanAiReply}

判断：`;

  try {
    const result = await callSubAI(prompt, 100);
    if (!result || result === "无" || result.length < 3) return;

    const today = new Date().toISOString().slice(0, 10);
    await saveDailyMemory(personaId, result, today);
    console.log(`[记忆] ${personaId} 短期总结完成: ${result.slice(0, 50)}...`);
    counter.sinceLastSummary = 0;
  } catch (e) {
    console.error("[记忆] 短期总结失败:", e.message);
  }
}

async function initCounters() {
  const db = getDB();
  const { data } = await db
    .from("messages")
    .select("persona_id")
    .order("id", { ascending: false })
    .limit(200);

  if (data) {
    const counts = {};
    data.forEach((m) => {
      counts[m.persona_id] = (counts[m.persona_id] || 0) + 1;
    });
    Object.keys(counts).forEach((pid) => {
      if (!messageCounters[pid]) {
        messageCounters[pid] = {
          total: counts[pid],
          sinceLastSummary: counts[pid] % 100,
        };
      }
    });
  }
}

// ========== 每日沉淀层（零点触发） ==========

async function dailyConsolidate(personaId) {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);

  // 获取今天的近期记忆
  const { data: todayMems } = await db
    .from("memories_recent")
    .select("content")
    .eq("persona_id", personaId)
    .eq("source_session", today);

  if (!todayMems || todayMems.length === 0) return;

  const todayContent = todayMems.map((m) => m.content).join("\n");

  // 判断是否值得沉淀
  const judgePrompt = `判断以下今日记忆是否值得长期保留。
如果只是普通闲聊、没有新信息、没有情绪变化、没有关系进展，回复"跳过"。
如果有值得记住的，提取1-3条最核心的印象（每条不超过15字）。

今日记忆：
${todayContent}

判断：`;

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
          messages: [{ role: "user", content: judgePrompt }],
          max_tokens: 80,
          temperature: 0.1,
        }),
      },
    );

    const data = await response.json();
    if (!data.choices || !data.choices[0]) return;

    const result = data.choices[0].message.content.trim();
    if (result === "跳过" || result.includes("跳过")) {
      console.log(`[记忆] ${personaId} 今日无需沉淀`);
      return;
    }

    // 增量更新长期档案
    await incrementalUpdate(personaId, result);
    console.log(`[记忆] ${personaId} 每日沉淀: ${result}`);
  } catch (e) {
    console.error("[记忆] 每日沉淀失败:", e.message);
  }
}

// ========== 长期档案层（增量更新） ==========

async function incrementalUpdate(personaId, newImpression) {
  const db = getDB();
  const profileKey = `memory_profile_${personaId}`;

  const { data: profileRow } = await db
    .from("user_profile")
    .select("value")
    .eq("key", profileKey)
    .limit(1);

  const currentProfile =
    profileRow && profileRow.length > 0 ? profileRow[0].value : "";

  const prompt = `你是长期记忆管理系统。对现有印象进行增量更新。

规则：
- 不要重新总结全部，只做增量修改
- 如果新印象和已有印象重复，更新权重/时间（如"经常熬夜"→"一直在熬夜，最近更频繁"）
- 如果是全新信息，追加到合适的类别
- 如果某条旧印象已经过时或被否定，删除它
- 保持总量不超过200字
- 格式：每条一行，按重要性排序

当前长期印象：
${currentProfile || "（空）"}

新增印象：
${newImpression}

更新后的长期印象：`;

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
          max_tokens: 250,
          temperature: 0.1,
        }),
      },
    );

    const data = await response.json();
    if (!data.choices || !data.choices[0]) return;

    const newProfile = data.choices[0].message.content.trim();

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
  } catch (e) {
    console.error("[记忆] 增量更新失败:", e.message);
  }
}

// ========== 每条消息的处理入口 ==========

async function processMemory(personaId, userMessage, aiReply) {
  // 检查事件触发
  const eventReason = shouldTriggerEvent(userMessage, personaId);
  if (eventReason) {
    triggerShortTermSummary(personaId, eventReason);
    return;
  }

  // 检查基础触发
  if (shouldTriggerBasic(personaId)) {
    triggerShortTermSummary(personaId, "basic");
    return;
  }

  // 即时提取（每8条提取一次轻量记忆）
  const counter = getCounter(personaId);
  if (counter.total % 8 === 0) {
    await extractQuickMemory(personaId, userMessage, aiReply);
  }
}

// ========== 轻量即时提取 ==========

async function extractQuickMemory(personaId, userMessage, aiReply) {
  const today = new Date().toISOString().slice(0, 10);
  const { getIdentityConfig } = require("./sediment");
  const identity = await getIdentityConfig(personaId);

  const cleanAiReply = aiReply.replace(/\|\|\|/g, " ");

  const prompt = `从这段对话中提取"留下了什么"。

身份：${identity.userName}（用户）和${identity.aiName}（${identity.pronoun}）

规则：
1. 绝对禁止使用 "AI"、"用户"、"assistant" 等称呼。
2. 必须用 "${identity.userName}" 和 "${identity.aiName}"。
3. 不要记录对话过程，要记录"关系沉淀"。
4. 格式：1-2条，每条10字以内，不带编号。

示例：
${identity.aiName}在等${identity.userName}回家
${identity.userName}今天心情很好

留下了：`;

  try {
    const result = await callSubAI(prompt, 60);
    if (result === "无" || result.length < 2) return;

    await saveDailyMemory(personaId, result, today);
    console.log(`[记忆] ${personaId} 即时提取: ${result}`);
  } catch (e) {
    console.error("[记忆] 即时提取失败:", e.message);
  }
}

// ========== 存储 ==========

async function saveDailyMemory(personaId, content, date, isBeta = false) {
  const db = getDB();
  const tableName = isBeta ? "memories_beta" : "memories_recent";

  const { data: existing } = await db
    .from(tableName)
    .select("id, content")
    .eq("persona_id", personaId)
    .eq("source_session", date)
    .limit(1);

  if (existing && existing.length > 0) {
    // 合并去重逻辑保持不变
    const oldItems = existing[0].content
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const newItems = content
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const uniqueNew = newItems.filter(
      (item) => !oldItems.some((old) => old === item || old.includes(item)),
    );
    if (uniqueNew.length === 0) return;
    const merged = [...oldItems, ...uniqueNew].join("\n");
    await db
      .from(tableName)
      .update({ content: merged })
      .eq("id", existing[0].id);
  } else {
    await db
      .from(tableName)
      .insert({ persona_id: personaId, content, source_session: date });
  }
}

// ========== 记忆召回 ==========

async function buildMemoryContextAsync(personaId, userMessage, isBeta = false) {
  const db = getDB();
  let context = "";

  // 💡 根据 isBeta 决定读取的 Key
  const profileKey = isBeta
    ? `memory_profile_beta_${personaId}`
    : `memory_profile_${personaId}`;
  const recentTable = isBeta ? "memories_beta" : "memories_recent";

  // 1. 长期档案
  const { data: profileRow } = await db
    .from("user_profile")
    .select("value")
    .eq("key", profileKey)
    .limit(1);

  if (profileRow && profileRow.length > 0 && profileRow[0].value) {
    context += `\n[长期印象] ${profileRow[0].value}\n`;
  }

  // 2. 最近 7 天记忆 (Beta 模式从 memories_beta 读)
  const { data: recentDays } = await db
    .from(recentTable)
    .select("content, source_session")
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false })
    .limit(7);

  // ... 剩余组装逻辑保持不变 ...
  if (recentDays && recentDays.length > 0) {
    context += "[近期印象]\n";
    for (const m of recentDays) {
      context += `${m.source_session}: ${m.content}\n`;
    }
  }

  // 3. 行为模式 (Beta 模式下通常不需要模式干扰，可以跳过或加判断)
  if (!isBeta) {
    const { data: patterns } = await db
      .from("memory_patterns")
      .select("description")
      .eq("persona_id", personaId)
      .gte("frequency", 3)
      .limit(3);
    if (patterns && patterns.length > 0) {
      context +=
        "[行为模式]\n" + patterns.map((p) => p.description).join("\n") + "\n";
    }
  }

  return context;
}

// ========== 行为模式检测 ==========

async function detectPatterns(personaId, userMessage) {
  const db = getDB();
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }),
  );
  const hour = now.getHours();

  if (hour >= 23 || hour <= 3) {
    await upsertPattern(db, personaId, "late_night", "经常深夜聊天");
  }

  const negativeWords = [
    "累",
    "烦",
    "难受",
    "压力",
    "焦虑",
    "失眠",
    "崩溃",
    "郁闷",
    "孤独",
    "难过",
  ];
  if (negativeWords.some((w) => userMessage.includes(w))) {
    await upsertPattern(db, personaId, "emotion_negative", "情绪容易低落");
  }

  const positiveWords = ["开心", "高兴", "哈哈", "太好了", "棒", "爽", "兴奋"];
  if (positiveWords.some((w) => userMessage.includes(w))) {
    await upsertPattern(
      db,
      personaId,
      "emotion_positive",
      "心情不错的时候很活跃",
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

// ========== 基础查询 ==========

async function getSessionMemory(personaId, limit = 10, isBeta = false) {
  const db = getDB();
  // 💡 根据 isBeta 决定读哪个表
  const tableName = isBeta ? "messages_beta" : "messages";
  const { data } = await db
    .from(tableName)
    .select("role, content, timestamp")
    .eq("persona_id", personaId)
    .order("id", { ascending: false })
    .limit(limit);
  return (data || []).reverse();
}

async function getRecentMemories(personaId, limit = 50, isBeta = false) {
  const db = getDB();
  // 💡 根据 isBeta 切换读取的表
  const tableName = isBeta ? "memories_beta" : "memories_recent";
  const { data } = await db
    .from(tableName)
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

async function getMemoryProfile(personaId, isBeta = false) {
  const db = getDB();
  // 💡 根据 isBeta 切换读取的 Key
  const profileKey = isBeta
    ? `memory_profile_beta_${personaId}`
    : `memory_profile_${personaId}`;
  const { data } = await db
    .from("user_profile")
    .select("value")
    .eq("key", profileKey)
    .limit(1);
  return data && data.length > 0 ? data[0].value : "";
}

async function setMemoryProfile(personaId, content, isBeta = false) {
  const db = getDB();
  const profileKey = isBeta
    ? `memory_profile_beta_${personaId}`
    : `memory_profile_${personaId}`;

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

// ========== 兼容旧接口 ==========

async function consolidateMemories(personaId) {
  await dailyConsolidate(personaId);
}

module.exports = {
  processMemory,
  saveDailyMemory,
  consolidateMemories,
  dailyConsolidate,
  buildMemoryContextAsync,
  getSessionMemory,
  getRecentMemories,
  deleteRecentMemory,
  getMemoryProfile,
  setMemoryProfile,
  detectPatterns,
  triggerShortTermSummary,
  getCounter,
  initCounters,
};
