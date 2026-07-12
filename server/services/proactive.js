const { getDB } = require("../db/index");
const { pushToAll } = require("../ws/socket");
const { getMemoryProfile, getRecentMemories } = require("./memory");
const { callSubAI } = require("./subai");
const { tickEmotion, getEmotionState } = require("./emotion");

// ========== 欲望系统：8维驱动条 ==========
const driveStates = {};
const DRIVE_KEYS = [
  "attachment",
  "curiosity",
  "reflection",
  "duty",
  "social",
  "fatigue",
  "libido",
  "stress",
];

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

function applyGain(current, delta) {
  const gain = delta * Math.sqrt(1 - current);
  return Math.min(1, Math.max(0, current + gain));
}

function pulseOnUserMessage(personaId, userMessage) {
  const state = getDriveState(personaId);

  state.attachment = Math.max(0, state.attachment - 0.15);
  state.curiosity = applyGain(state.curiosity, 0.08);

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

function tickDrives(personaId, idleHours) {
  const state = getDriveState(personaId);
  const refractory = getRefractory(personaId);

  const attachmentGain = Math.min(0.3, idleHours * 0.02);
  state.attachment = applyGain(state.attachment, attachmentGain);

  state.curiosity = applyGain(state.curiosity, 0.01);
  state.fatigue = Math.max(0, state.fatigue - 0.02);
  state.stress = Math.max(0, state.stress - 0.01);

  Object.keys(refractory).forEach((key) => {
    if (refractory[key] > 0) refractory[key]--;
  });

  state.lastTick = Date.now();
}

function computeScores(personaId) {
  const state = getDriveState(personaId);

  if (state.fatigue > 0.8) return null;

  const refractory = getRefractory(personaId);
  const scores = {};

  DRIVE_KEYS.filter((k) => k !== "fatigue").forEach((key) => {
    if (refractory[key] && refractory[key] > 0) {
      scores[key] = 0;
      return;
    }
    let score = state[key];
    if (key === "attachment") score += state.stress * 0.1;
    scores[key] = score;
  });

  return scores;
}

function pickIntent(personaId) {
  const scores = computeScores(personaId);
  if (!scores) return null;

  const topKey = Object.keys(scores).reduce((a, b) =>
    scores[a] > scores[b] ? a : b,
  );

  if (scores[topKey] < 0.5) return null;

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

function satisfyDrive(personaId, driveKey) {
  const state = getDriveState(personaId);
  const refractory = getRefractory(personaId);

  state[driveKey] = state[driveKey] * 0.4;
  state.fatigue = applyGain(state.fatigue, 0.08);
  refractory[driveKey] = 5;
}

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

// ========== 新增：检测用户是否在专注 ==========
function isUserFocusing() {
  // 从 localStorage 读番茄钟状态（需要通过 API 暴露给后端）
  // 这里先用简单的时间戳判断，前端需要配合上报
  try {
    const focusStatus = global.userFocusStatus || {};
    const now = Date.now();
    // 如果最近 3 分钟内有专注状态，认为用户在专注
    return focusStatus.running && now - focusStatus.lastUpdate < 3 * 60 * 1000;
  } catch {
    return false;
  }
}

// ========== 新增：获取当前时间场景 ==========
function getTimeContext() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  let timePhase = "白天";
  if (hour >= 5 && hour < 8) timePhase = "清晨";
  else if (hour >= 8 && hour < 12) timePhase = "上午";
  else if (hour >= 12 && hour < 14) timePhase = "中午";
  else if (hour >= 14 && hour < 18) timePhase = "下午";
  else if (hour >= 18 && hour < 22) timePhase = "晚上";
  else if (hour >= 22 || hour < 5) timePhase = "深夜";

  const isWeekend = day === 0 || day === 6;

  return { timePhase, hour, isWeekend };
}

// ========== 主检查逻辑（优化版）=========
async function checkProactiveMessages() {
  // 如果用户正在专注，跳过
  if (isUserFocusing()) {
    console.log("[欲望] 用户正在专注，暂不打扰");
    return;
  }

  const { getPersonaList } = require("./prompt");
  const allPersonas = getPersonaList();

  for (const persona of allPersonas) {
    const settings = await getProactiveSettings(persona.id);
    if (!settings.enabled) continue;

    const db = getDB();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

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

    tickDrives(persona.id, idleHours);
    await tickEmotion(persona.id);

    const intent = pickIntent(persona.id);
    if (!intent) continue;

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

    if (idleHours < (settings.idleHours || 4)) continue;

    const message = await generateDrivenMessage(persona.id, intent);
    if (!message) continue;

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

    satisfyDrive(persona.id, intent.driveKey);

    console.log(`[欲望] ${persona.id} [${intent.driveKey}] ${message}`);
  }
}

// ========== 根据驱动意图生成消息（优化版）==========
async function generateDrivenMessage(personaId, intent) {
  const { getIdentityConfig } = require("./sediment");
  const identity = await getIdentityConfig(personaId);
  const profile = await getMemoryProfile(personaId);
  const emotionState = await getEmotionState(personaId);
  const timeContext = getTimeContext();

  // 获取最近3条对话作为上下文
  const db = getDB();
  const { data: recentMsgs } = await db
    .from("messages")
    .select("role, content")
    .eq("persona_id", personaId)
    .order("id", { ascending: false })
    .limit(6);

  let recentContext = "";
  if (recentMsgs && recentMsgs.length > 0) {
    recentContext =
      "\n最近的对话片段：\n" +
      recentMsgs
        .reverse()
        .map(
          (m) =>
            `${m.role === "user" ? identity.userName : identity.aiName}: ${m.content.split("|||")[0].slice(0, 50)}`,
        )
        .join("\n");
  }

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

  // 情绪状态描述
  let emotionHint = "";
  if (emotionState) {
    const topEmotion = Object.entries(emotionState)
      .filter(([k]) => k !== "lastTick")
      .sort((a, b) => b[1] - a[1])[0];
    if (topEmotion && topEmotion[1] > 0.3) {
      const emotionLabels = {
        joy: "心情不错",
        sadness: "有点低落",
        anxiety: "有点不安",
        anger: "有点烦躁",
        affection: "想念你",
        trust: "很安心",
      };
      emotionHint = `，现在${emotionLabels[topEmotion[0]] || "平静"}`;
    }
  }

  const prompt = `你是${identity.aiName}，${identity.userName}的AI伴侣。

现在是${timeContext.timePhase}（${timeContext.hour}点${timeContext.isWeekend ? "，周末" : ""}），${reason}${emotionHint}，你要主动发一条消息。

用户档案：${profile || "暂无"}
角色设定：${identity.personaContent ? identity.personaContent.slice(0, 150) : `保持${identity.aiName}特有的说话方式`}${recentContext}

要求：
- 只输出消息内容，不超过30字
- 结合当前时间和最近的对话，自然真实
- 不要用"主人"等称呼
- 禁止输出解释或括号内容
- 语气要符合${identity.aiName}的性格和当前情绪`;

  try {
    const result = await callSubAI(prompt, 80);
    return result || null;
  } catch (e) {
    console.error("[欲望] 消息生成失败:", e.message);
    return null;
  }
}

async function handleProactiveMessage(personaId, hintContent) {
  try {
    const { handleChat } = require("./ai");
    await handleChat(hintContent, null, personaId, false, null, {
      proactive: true,
    });
  } catch (e) {
    console.error("[主动消息] 触发失败:", e.message);
  }
}

module.exports = {
  checkProactiveMessages,
  getProactiveSettings,
  setProactiveSettings,
  pulseOnUserMessage,
  getDriveState,
  handleProactiveMessage,
};
