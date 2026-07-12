// server/services/memory.js
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
function shouldTriggerEvent(userMessage, personaId) {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }),
  );
  const hour = now.getHours();
  const counter = getCounter(personaId);

  if ((hour >= 23 || hour <= 4) && counter.sinceLastSummary >= 20) {
    return "deep_night_chat";
  }

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
async function triggerShortTermSummary(
  personaId,
  reason,
  userMessage = "",
  aiReply = "",
) {
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
  const pronoun = identity.pronoun || "TA";

  const prompt = `你是一个时间线记录系统。判断以下对话是否包含"值得留下痕迹"的瞬间。

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

// ========== 每日沉淀层 ==========
async function dailyConsolidate(personaId) {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);

  const { data: todayMems } = await db
    .from("memories_recent")
    .select("content")
    .eq("persona_id", personaId)
    .eq("source_session", today);

  if (!todayMems || todayMems.length === 0) return;

  const todayContent = todayMems.map((m) => m.content).join("\n");

  const judgePrompt = `判断以下今日记忆是否值得长期保留。
如果只是普通闲聊、没有新信息、没有情绪变化、没有关系进展，回复"跳过"。
如果有值得记住的，提取1-3条最核心的印象（每条不超过15字）。

今日记忆：
${todayContent}

判断：`;

  try {
    const result = await callSubAI(judgePrompt, 80);
    if (!result || result === "跳过" || result.includes("跳过")) {
      console.log(`[记忆] ${personaId} 今日无需沉淀`);
      return;
    }
    await incrementalUpdate(personaId, result);
    console.log(`[记忆] ${personaId} 每日沉淀: ${result}`);
  } catch (e) {
    console.error("[记忆] 每日沉淀失败:", e.message);
  }
}

// ========== 长期档案层 ==========
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
- 如果新印象和已有印象重复，更新权重/时间
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
    const result = await callSubAI(prompt, 250);
    if (!result) return;

    const { data: existing } = await db
      .from("user_profile")
      .select("id")
      .eq("key", profileKey)
      .limit(1);

    if (existing && existing.length > 0) {
      await db
        .from("user_profile")
        .update({ value: result, updated_at: new Date().toISOString() })
        .eq("key", profileKey);
    } else {
      await db.from("user_profile").insert({ key: profileKey, value: result });
    }
  } catch (e) {
    console.error("[记忆] 增量更新失败:", e.message);
  }
}

// ========== 消息配置（唯一版本）==========
async function getMemoryConfig() {
  const db = getDB();
  const { data } = await db
    .from("user_profile")
    .select("value")
    .eq("key", "memory_manage_config")
    .limit(1);
  if (data && data.length > 0) {
    try {
      return JSON.parse(data[0].value);
    } catch {
      // fallback
    }
  }
  return {
    memoryEnabled: true,
    quickExtractEvery: 20,
    summaryEvery: 100,
    compressThreshold: 40,
    timelineAutoRecord: true,
    dailyConsolidate: true,
    weeklyInsight: true,
    forgetCurve: true,
    samplerEnabled: true,
  };
}

// ========== 消息压缩（唯一版本）==========
async function compressOldMessages(personaId, isBeta = false) {
  const db = getDB();
  const tableName = isBeta ? "messages_beta" : "messages";
  const summaryKey = isBeta
    ? `session_summary_beta_${personaId}`
    : `session_summary_${personaId}`;

  const config = await getMemoryConfig();
  const threshold = config.compressThreshold || 40;
  const keepRecent = 20;

  const { data: allMessages } = await db
    .from(tableName)
    .select("*")
    .eq("persona_id", personaId)
    .order("id", { ascending: true });

  if (!allMessages || allMessages.length <= threshold) {
    console.log(
      `[压缩] ${personaId} 消息数 ${allMessages?.length || 0}，无需压缩`,
    );
    return;
  }

  const oldMessages = allMessages.slice(0, -keepRecent);
  const total = oldMessages.length;

  const recentStart = Math.floor(total * 0.6);
  const midStart = Math.floor(total * 0.3);

  const earlyMsgs = oldMessages.slice(0, midStart);
  const midMsgs = oldMessages.slice(midStart, recentStart);
  const recentMsgs = oldMessages.slice(recentStart);

  const { getIdentityConfig } = require("./sediment");
  const identity = await getIdentityConfig(personaId);

  const layerText = `
【早期】（${earlyMsgs.length}条）
${earlyMsgs.map((m) => `${m.role === "user" ? identity.userName : identity.aiName}: ${m.content.slice(0, 100)}`).join("\n")}

【中期】（${midMsgs.length}条）
${midMsgs.map((m) => `${m.role === "user" ? identity.userName : identity.aiName}: ${m.content.slice(0, 150)}`).join("\n")}

【近期】（${recentMsgs.length}条）
${recentMsgs.map((m) => `${m.role === "user" ? identity.userName : identity.aiName}: ${m.content}`).join("\n")}
`;

  const compressPrompt = `你是对话压缩系统。将以下分层对话压缩成摘要。

${layerText}

输出要求：用第三人称。按以下格式输出：

【近期】（500-800字）详细记录最近的对话
【中期】（200-350字）概括较早的对话
【早期】（80-150字）极简记录最早的对话

关键规则：
1. 必须保留所有日程、日期、时间、约定
2. 必须保留具体的数字、人名、地点
3. 必须保留所有承诺和待办
4. 禁止用"讨论了""聊到了"这种空话替代具体内容`;

  try {
    const summary = await callSubAI(compressPrompt, 1000);

    if (!summary || summary.length < 50) {
      console.log(`[压缩] ${personaId} 压缩失败，摘要太短`);
      return;
    }

    const { data: existing } = await db
      .from("user_profile")
      .select("id")
      .eq("key", summaryKey)
      .limit(1);

    if (existing && existing.length > 0) {
      await db
        .from("user_profile")
        .update({ value: summary, updated_at: new Date().toISOString() })
        .eq("key", summaryKey);
    } else {
      await db.from("user_profile").insert({ key: summaryKey, value: summary });
    }

    const oldestIdToDelete = oldMessages[oldMessages.length - 1].id;
    await db
      .from(tableName)
      .delete()
      .eq("persona_id", personaId)
      .lte("id", oldestIdToDelete);

    console.log(
      `[压缩] ${personaId} 压缩完成：${oldMessages.length}条 → 摘要 ${summary.length}字`,
    );
  } catch (e) {
    console.error(`[压缩] ${personaId} 压缩失败:`, e.message);
  }
}

async function getCompressedSummary(personaId, isBeta = false) {
  const db = getDB();
  const summaryKey = `msg_compress_${personaId}${isBeta ? "_beta" : ""}`;
  const { data } = await db
    .from("user_profile")
    .select("value")
    .eq("key", summaryKey)
    .limit(1);
  return data && data.length > 0 ? data[0].value : null;
}

// ========== 遗忘曲线 ==========
async function forgetCurveCleanup(personaId) {
  const db = getDB();
  const now = new Date();
  const day7 = new Date(now - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const day14 = new Date(now - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const day30 = new Date(now - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: allMems } = await db
    .from("memories_recent")
    .select("id, source_session, created_at")
    .eq("persona_id", personaId)
    .order("source_session", { ascending: true });

  if (!allMems || allMems.length === 0) return;

  const toDelete = [];

  allMems.forEach((mem, idx) => {
    const date = mem.source_session;
    if (!date) return;

    if (date >= day7) {
      return;
    } else if (date >= day14) {
      if (idx % 2 === 1) toDelete.push(mem.id);
    } else if (date >= day30) {
      if (idx % 4 !== 0) toDelete.push(mem.id);
    } else {
      const oldMems = allMems.filter((m) => m.source_session < day30);
      const keep = new Set([
        ...oldMems.slice(0, 2).map((m) => m.id),
        ...oldMems.slice(-2).map((m) => m.id),
      ]);
      if (!keep.has(mem.id)) toDelete.push(mem.id);
    }
  });

  if (toDelete.length > 0) {
    await db.from("memories_recent").delete().in("id", toDelete);
    console.log(`[遗忘曲线] ${personaId} 清理了 ${toDelete.length} 条旧记忆`);
  }
}

// ========== 每条消息的处理入口 ==========
async function processMemory(personaId, userMessage, aiReply, isBeta = false) {
  const config = await getMemoryConfig();

  if (!config.memoryEnabled) return;

  const eventReason = shouldTriggerEvent(userMessage, personaId);
  if (eventReason && config.timelineAutoRecord) {
    triggerShortTermSummary(personaId, eventReason, userMessage, aiReply);
    return;
  }

  const counter = getCounter(personaId);
  counter.sinceLastSummary++;
  counter.total++;

  const summaryEvery = config.summaryEvery || 100;
  if (summaryEvery > 0 && counter.sinceLastSummary >= summaryEvery) {
    triggerShortTermSummary(personaId, "basic", userMessage, aiReply);
    counter.sinceLastSummary = 0;
    return;
  }

  const quickEvery = config.quickExtractEvery || 20;
  if (quickEvery > 0 && counter.total % quickEvery === 0) {
    await extractQuickMemory(personaId, userMessage, aiReply);
    extractFragments(personaId, userMessage, aiReply).catch(() => {});
  }

  if (counter.total % 50 === 0) {
    updateArcs(personaId).catch(() => {});
  }

  if (counter.total % 100 === 0) {
    decayFragments(personaId).catch(() => {});
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

用户: ${userMessage}
AI: ${cleanAiReply}

留下了：`;

  try {
    const result = await callSubAI(prompt, 60);
    if (!result || result === "无" || result.length < 2) return;
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

  const profileKey = isBeta
    ? `memory_profile_beta_${personaId}`
    : `memory_profile_${personaId}`;
  const recentTable = isBeta ? "memories_beta" : "memories_recent";
  const summaryKey = isBeta
    ? `session_summary_beta_${personaId}`
    : `session_summary_${personaId}`;

  // 1. 长期档案
  const { data: profileRow } = await db
    .from("user_profile")
    .select("value")
    .eq("key", profileKey)
    .limit(1);

  if (profileRow && profileRow.length > 0 && profileRow[0].value) {
    context += `\n[长期印象] ${profileRow[0].value}\n`;
  }

  // 2. 对话压缩摘要
  const { data: summaryRow } = await db
    .from("user_profile")
    .select("value")
    .eq("key", summaryKey)
    .limit(1);

  if (summaryRow && summaryRow.length > 0 && summaryRow[0].value) {
    context += `\n[早期对话摘要]\n${summaryRow[0].value}\n`;
  }

  // 3. 最近 7 天记忆
  const { data: recentDays } = await db
    .from(recentTable)
    .select("content, source_session")
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false })
    .limit(7);

  if (recentDays && recentDays.length > 0) {
    context += "[近期印象]\n";
    for (const m of recentDays) {
      context += `${m.source_session}: ${m.content}\n`;
    }
  }

  // 4. 记忆碎片
  const fragmentsText = await recallFragments(personaId, userMessage);
  if (fragmentsText) {
    context += `[记忆碎片]\n${fragmentsText}\n`;
  }

  // 5. 弧线
  const arcsText = await recallArcs(personaId);
  if (arcsText) {
    context += `[长期主题]\n${arcsText}\n`;
  }

  // 6. 行为模式
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

async function consolidateMemories(personaId) {
  await dailyConsolidate(personaId);
}

// ========== 记忆星图：碎片层 ==========
async function extractFragments(personaId, userMessage, aiReply) {
  const { getIdentityConfig } = require("./sediment");
  const identity = await getIdentityConfig(personaId);
  const cleanReply = aiReply.replace(/\|\|\|/g, " ");

  const prompt = `从以下对话中提取记忆碎片。

身份：${identity.userName}（用户）和${identity.aiName}

规则：
1. 只提取有意义的事实性信息，忽略闲聊
2. 每条碎片是一个独立的事实，第三人称短句
3. 最多提取3条，没有值得记录的就回复"无"
4. 格式：每行一条，不带编号

对话：
${identity.userName}: ${userMessage}
${identity.aiName}: ${cleanReply}

碎片：`;

  try {
    const result = await callSubAI(prompt, 100);
    if (!result || result === "无" || result.trim().length < 3) return;

    const db = getDB();
    const today = new Date().toISOString().slice(0, 10);
    const lines = result
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);

    for (const line of lines) {
      if (line.length < 4) continue;
      await db.from("memory_fragments").insert({
        persona_id: personaId,
        content: line,
        source_date: today,
        heat: 1.0,
        last_recalled_at: new Date().toISOString(),
      });
    }

    console.log(`[碎片] ${personaId} 提取了 ${lines.length} 条碎片`);
  } catch (e) {
    console.error("[碎片] 提取失败:", e.message);
  }
}

// ========== 记忆星图：遗忘衰减 ==========
async function decayFragments(personaId) {
  const db = getDB();
  const now = new Date();
  const day14 = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
  const day30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const day90 = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();

  await db
    .from("memory_fragments")
    .delete()
    .eq("persona_id", personaId)
    .lt("last_recalled_at", day90)
    .lt("heat", 0.3);

  const { data: coldMems } = await db
    .from("memory_fragments")
    .select("id, heat")
    .eq("persona_id", personaId)
    .lt("last_recalled_at", day30)
    .gte("last_recalled_at", day90);

  if (coldMems && coldMems.length > 0) {
    for (const mem of coldMems) {
      await db
        .from("memory_fragments")
        .update({ heat: Math.max(0.1, mem.heat * 0.7) })
        .eq("id", mem.id);
    }
  }

  const { data: coolMems } = await db
    .from("memory_fragments")
    .select("id, heat")
    .eq("persona_id", personaId)
    .lt("last_recalled_at", day14)
    .gte("last_recalled_at", day30);

  if (coolMems && coolMems.length > 0) {
    for (const mem of coolMems) {
      await db
        .from("memory_fragments")
        .update({ heat: Math.max(0.3, mem.heat * 0.9) })
        .eq("id", mem.id);
    }
  }

  console.log(`[衰减] ${personaId} 碎片衰减完成`);
}

// ========== 记忆星图：弧线层 ==========
async function updateArcs(personaId) {
  const db = getDB();

  const { data: fragments } = await db
    .from("memory_fragments")
    .select("id, content, heat, source_date")
    .eq("persona_id", personaId)
    .gte("heat", 0.5)
    .order("heat", { ascending: false })
    .limit(30);

  if (!fragments || fragments.length < 5) return;

  const fragmentText = fragments
    .map((f) => `[${f.source_date}] ${f.content}`)
    .join("\n");

  const { getIdentityConfig } = require("./sediment");
  const identity = await getIdentityConfig(personaId);

  const prompt = `从以下记忆碎片中，提炼出跨越时间的长期主题弧线。

碎片列表：
${fragmentText}

规则：
1. 找出反复出现的模式、习惯、偏好或关系变化
2. 每条弧线是一个长期主题，不超过20字的标题 + 50字以内的描述
3. 最多提取3条弧线
4. 没有明显主题则回复"无"
5. 格式：标题|描述

弧线：`;

  try {
    const result = await callSubAI(prompt, 300);
    if (!result || result === "无") return;

    const lines = result
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.includes("|"))
      .slice(0, 3);

    for (const line of lines) {
      const [theme, summary] = line.split("|").map((s) => s.trim());
      if (!theme || !summary) continue;

      const { data: existing } = await db
        .from("memory_arcs")
        .select("id")
        .eq("persona_id", personaId)
        .eq("theme", theme)
        .limit(1);

      const fragmentIds = fragments.slice(0, 10).map((f) => f.id);

      if (existing && existing.length > 0) {
        await db
          .from("memory_arcs")
          .update({
            summary,
            fragment_ids: fragmentIds,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing[0].id);
      } else {
        await db.from("memory_arcs").insert({
          persona_id: personaId,
          theme,
          summary,
          fragment_ids: fragmentIds,
        });
      }
    }

    console.log(`[弧线] ${personaId} 弧线更新完成`);
  } catch (e) {
    console.error("[弧线] 更新失败:", e.message);
  }
}

// ========== 碎片召回 ==========
async function recallFragments(personaId, userMessage) {
  const db = getDB();

  const { data: fragments } = await db
    .from("memory_fragments")
    .select("id, content, heat")
    .eq("persona_id", personaId)
    .gte("heat", 0.4)
    .order("heat", { ascending: false })
    .limit(8);

  if (!fragments || fragments.length === 0) return "";

  const ids = fragments.map((f) => f.id);
  for (const id of ids) {
    const frag = fragments.find((f) => f.id === id);
    if (frag) {
      await db
        .from("memory_fragments")
        .update({
          heat: Math.min(1.0, frag.heat + 0.1),
          last_recalled_at: new Date().toISOString(),
        })
        .eq("id", id);
    }
  }

  return fragments.map((f) => f.content).join("\n");
}

async function recallArcs(personaId) {
  const db = getDB();

  const { data: arcs } = await db
    .from("memory_arcs")
    .select("theme, summary")
    .eq("persona_id", personaId)
    .order("updated_at", { ascending: false })
    .limit(3);

  if (!arcs || arcs.length === 0) return "";

  return arcs.map((a) => `${a.theme}：${a.summary}`).join("\n");
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
  compressOldMessages,
  getCompressedSummary,
  getMemoryConfig,
  extractFragments,
  decayFragments,
  updateArcs,
  recallFragments,
  recallArcs,
  forgetCurveCleanup,
};
