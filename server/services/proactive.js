const { getDB } = require("../db/index");
const { pushToAll } = require("../ws/socket");
const { getMemoryProfile, getRecentMemories } = require("./memory");
const { callSubAI } = require("./subai");
const { tickEmotion } = require("./emotion");

// ========== 欲望系统：8维驱动条 ==========
// 每个 persona 独立维护一份状态
const driveStates = {};

const DRIVE_KEYS = [
  "attachment", // 想念，想和主人说话
  "curiosity", // 好奇，想聊点什么新鲜的
  "reflection", // 想沉淀，想分享感受
  "duty", // 记挂着什么没做完
  "social", // 想热闹
  "fatigue", // 疲惫（抑制项）
  "libido", // 亲密驱动
  "stress", // 压力
];

// 不应期计数器（tick）
const refractoryCounters = {};

function getDriveState(personaId) {
  if (!driveStates[personaId]) {
    driveStates[personaId] = {
      attachment: 0.3,
      curiosity: 0.2,
      reflection: 0.1,
      duty: 0.1,
      social: 0.1,
      fatigue: 0.1,
      libido: 0.1,
      stress: 0.1,
      lastTick: Date.now(),
    };
  }
  return driveStates[personaId];
}

function getRefractory(personaId) {
  if (!refractoryCounters[personaId]) {
    refractoryCounters[personaId] = {};
  }
  return refractoryCounters[personaId];
}

// 边际递减：同一条越高涨得越少
function applyGain(current, delta) {
  const gain = delta * Math.sqrt(1 - current);
  return Math.min(1, Math.max(0, current + gain));
}

// 用户发消息时 pulse 驱动条
function pulseOnUserMessage(personaId, userMessage) {
  const state = getDriveState(personaId);

  // 用户说话 → attachment 下降（被满足），curiosity 轻微上升
  state.attachment = Math.max(0, state.attachment - 0.15);
  state.curiosity = applyGain(state.curiosity, 0.08);

  // 情绪词检测
  const negativeWords = [
    "累",
    "烦",
    "难受",
    "崩溃",
    "郁闷",
    "孤独",
    "难过",
    "压力",
  ];
  const positiveWords = ["开心", "高兴", "哈哈", "太好了", "棒", "爽", "兴奋"];
  const intimateWords = ["想你", "抱抱", "爱你", "亲亲", "贴贴"];

  if (negativeWords.some((w) => userMessage.includes(w))) {
    state.stress = applyGain(state.stress, 0.1);
    state.attachment = applyGain(state.attachment, 0.05);
  }
  if (positiveWords.some((w) => userMessage.includes(w))) {
    state.stress = Math.max(0, state.stress - 0.05);
    state.curiosity = applyGain(state.curiosity, 0.06);
  }
  if (intimateWords.some((w) => userMessage.includes(w))) {
    state.libido = applyGain(state.libido, 0.12);
    state.attachment = Math.max(0, state.attachment - 0.1);
  }

  state.lastTick = Date.now();
}

// idle 时驱动条自然增长（每次心跳调用）
function tickDrives(personaId, idleHours) {
  const state = getDriveState(personaId);
  const refractory = getRefractory(personaId);

  // attachment 随 idle 时间增长
  const attachmentGain = Math.min(0.3, idleHours * 0.02);
  state.attachment = applyGain(state.attachment, attachmentGain);

  // curiosity 缓慢自增
  state.curiosity = applyGain(state.curiosity, 0.01);

  // fatigue 随时间自然恢复
  state.fatigue = Math.max(0, state.fatigue - 0.02);

  // stress 缓慢衰减
  state.stress = Math.max(0, state.stress - 0.01);

  // 不应期递减
  Object.keys(refractory).forEach((key) => {
    if (refractory[key] > 0) refractory[key]--;
  });

  state.lastTick = Date.now();
}

// 计算召唤力（哪维最高就触发对应行为）
function computeScores(personaId) {
  const state = getDriveState(personaId);

  // fatigue 过高时抑制所有行为
  if (state.fatigue > 0.8) return null;

  const refractory = getRefractory(personaId);
  const scores = {};

  DRIVE_KEYS.filter((k) => k !== "fatigue").forEach((key) => {
    // 不应期内的维度跳过
    if (refractory[key] && refractory[key] > 0) {
      scores[key] = 0;
      return;
    }
    // 基础召唤力 = 驱动值，stress 额外加成 attachment
    let score = state[key];
    if (key === "attachment") score += state.stress * 0.1;
    scores[key] = score;
  });

  return scores;
}

// 根据最高召唤力选择意图
function pickIntent(personaId) {
  const scores = computeScores(personaId);
  if (!scores) return null;

  const topKey = Object.keys(scores).reduce((a, b) =>
    scores[a] > scores[b] ? a : b,
  );

  if (scores[topKey] < 0.5) return null; // 阈值，不够高就不触发

  const intentMap = {
    attachment: { action: "idle_message", reason: "有点想说话" },
    curiosity: { action: "idle_message", reason: "想聊点新鲜的" },
    reflection: { action: "idle_message", reason: "想分享一点感受" },
    duty: { action: "idle_message", reason: "记挂着什么" },
    social: { action: "idle_message", reason: "想热闹一下" },
    libido: { action: "idle_message", reason: "想靠近一点" },
    stress: { action: "idle_message", reason: "有点不安稳" },
  };

  return {
    driveKey: topKey,
    score: scores[topKey],
    ...intentMap[topKey],
  };
}

// 满足后乘性回落，进入不应期
function satisfyDrive(personaId, driveKey) {
  const state = getDriveState(personaId);
  const refractory = getRefractory(personaId);

  state[driveKey] = state[driveKey] * 0.4; // 主驱动明显降
  state.fatigue = applyGain(state.fatigue, 0.08); // 发完消息略疲惫

  // 不应期：该维度 5 个 tick 内不再触发
  refractory[driveKey] = 5;
}

// ========== 设置读写 ==========
async function getProactiveSettings(personaId) {
  const db = getDB();
  const key = personaId
    ? `proactive_settings_${personaId}`
    : "proactive_settings";
  const { data } = await db
    .from("user_profile")
    .select("value")
    .eq("key", key)
    .limit(1);
  if (data && data.length > 0) return JSON.parse(data[0].value);

  const { data: globalData } = await db
    .from("user_profile")
    .select("value")
    .eq("key", "proactive_settings")
    .limit(1);
  if (globalData && globalData.length > 0)
    return JSON.parse(globalData[0].value);

  return { enabled: true, idleHours: 12, maxPerDay: 3, minInterval: 4 };
}

async function setProactiveSettings(personaId, settings) {
  const db = getDB();
  const key = personaId
    ? `proactive_settings_${personaId}`
    : "proactive_settings";

  const { data: existing } = await db
    .from("user_profile")
    .select("id")
    .eq("key", key)
    .limit(1);

  if (existing && existing.length > 0) {
    await db
      .from("user_profile")
      .update({
        value: JSON.stringify(settings),
        updated_at: new Date().toISOString(),
      })
      .eq("key", key);
  } else {
    await db
      .from("user_profile")
      .insert({ key, value: JSON.stringify(settings) });
  }
}

// ========== 主检查逻辑 ==========
async function checkProactiveMessages() {
  const { getPersonaList } = require("./prompt");
  const allPersonas = getPersonaList();

  for (const persona of allPersonas) {
    const settings = await getProactiveSettings(persona.id);
    if (!settings.enabled) continue;

    const db = getDB();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // 获取最后用户消息时间，计算 idle
    const { data: lastMsg } = await db
      .from("messages")
      .select("timestamp")
      .eq("persona_id", persona.id)
      .eq("role", "user")
      .order("id", { ascending: false })
      .limit(1);

    const lastTime =
      lastMsg && lastMsg.length > 0 ? new Date(lastMsg[0].timestamp) : null;
    const idleHours = lastTime ? (now - lastTime) / (1000 * 60 * 60) : Infinity;

    // tick 驱动条
    tickDrives(persona.id, idleHours);

    await tickEmotion(persona.id);

    // 欲望系统决策
    const intent = pickIntent(persona.id);
    if (!intent) continue;

    // 基础限制：今日上限、最小间隔
    const { data: todayLogs } = await db
      .from("proactive_log")
      .select("id")
      .eq("persona_id", persona.id)
      .eq("date", today);

    if (todayLogs && todayLogs.length >= (settings.maxPerDay || 3)) continue;

    const { data: lastLog } = await db
      .from("proactive_log")
      .select("sent_at")
      .eq("persona_id", persona.id)
      .order("sent_at", { ascending: false })
      .limit(1);

    if (lastLog && lastLog.length > 0) {
      const hoursSince =
        (now - new Date(lastLog[0].sent_at)) / (1000 * 60 * 60);
      const minInterval = settings.minInterval || 4;
      if (hoursSince < minInterval) continue;
    }

    // idle 时间门槛
    if (idleHours < (settings.idleHours || 4)) continue;

    // 生成消息
    const message = await generateDrivenMessage(persona.id, intent);
    if (!message) continue;

    // 记录并推送
    await db.from("proactive_log").insert({
      persona_id: persona.id,
      date: today,
      sent_at: now.toISOString(),
      message,
      drive_key: intent.driveKey,
    });

    pushToAll(
      JSON.stringify({
        type: "push",
        content: message,
        personaId: persona.id,
        timestamp: now.toISOString(),
      }),
    );

    // 满足驱动，进入不应期
    satisfyDrive(persona.id, intent.driveKey);

    console.log(`[欲望] ${persona.id} [${intent.driveKey}] ${message}`);
  }
}

// ========== 根据驱动意图生成消息 ==========
async function generateDrivenMessage(personaId, intent) {
  const { getIdentityConfig } = require("./sediment");
  const identity = await getIdentityConfig(personaId);
  const profile = await getMemoryProfile(personaId);

  const reasonMap = {
    attachment: `你有点想和${identity.userName}说话，已经有一段时间没聊了`,
    curiosity: `你突然有点好奇，想聊点什么新鲜的`,
    reflection: `你想分享一点自己的感受或者最近在想的事`,
    duty: `你记挂着什么还没说完的事`,
    social: `你想热闹一下，想说说话`,
    libido: `你想靠近${identity.userName}一点`,
    stress: `你有点不安稳，想找${identity.userName}说说话`,
  };

  const reason = reasonMap[intent.driveKey] || "你突然想说点什么";

  const prompt = `你是${identity.aiName}，${identity.userName}的AI伴侣。

现在${reason}，你要主动发一条消息。

用户档案：${profile || "暂无"}
角色设定：保持${identity.aiName}特有的说话方式

要求：
- 只输出消息内容，不超过30字
- 自然真实，不要刻意
- 不要用"主人"等称呼，用"${identity.userName}"
- 禁止输出解释或括号内容`;

  try {
    const result = await callSubAI(prompt, 60);
    return result || null;
  } catch (e) {
    console.error("[欲望] 消息生成失败:", e.message);
    return null;
  }
}

module.exports = {
  checkProactiveMessages,
  getProactiveSettings,
  setProactiveSettings,
  pulseOnUserMessage,
  getDriveState,
};
