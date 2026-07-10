// server/services/desire.js
const { getDB } = require("../db/index");

// 8维驱动条
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

// 各维度对应的主动行为
const DRIVE_ACTIONS = {
  attachment: "send_care", // 发送关心消息
  curiosity: "ask_question", // 主动发起话题
  reflection: "share_thought", // 分享感受
  duty: "remind", // 提醒事项
  social: "chat", // 闲聊
  fatigue: "rest", // 休息（抑制其他行为）
  libido: "flirt", // 亲密互动
  stress: "vent", // 倾诉/吐槽
};

// 不应期时长（分钟）
const REFRACTORY_MINUTES = {
  attachment: 60,
  curiosity: 45,
  reflection: 90,
  duty: 120,
  social: 30,
  fatigue: 180,
  libido: 120,
  stress: 60,
};

// 触发阈值
const TRIGGER_THRESHOLD = 0.65;

// ========== 获取或初始化欲望状态 ==========
async function getDesireState(personaId) {
  const db = getDB();
  const { data } = await db
    .from("desire_state")
    .select("*")
    .eq("persona_id", personaId)
    .limit(1);

  if (data && data.length > 0) return data[0];

  // 初始化
  await db.from("desire_state").insert({
    persona_id: personaId,
    attachment: 0.3,
    curiosity: 0.3,
    reflection: 0.2,
    duty: 0.2,
    social: 0.2,
    fatigue: 0.1,
    libido: 0.1,
    stress: 0.1,
  });

  const { data: newState } = await db
    .from("desire_state")
    .select("*")
    .eq("persona_id", personaId)
    .limit(1);

  return newState && newState.length > 0 ? newState[0] : null;
}

// ========== 用户发消息时触发 pulse ==========
async function pulseOnUserMessage(personaId, userMessage) {
  try {
    const db = getDB();
    const state = await getDesireState(personaId);
    if (!state) return;

    const updates = {};

    // 用户发消息 → attachment 上涨
    updates.attachment = Math.min(1.0, state.attachment + 0.18);

    // 根据消息内容调整其他维度
    const emotionWords = ["累", "烦", "难受", "崩溃", "郁闷", "焦虑"];
    const positiveWords = ["开心", "高兴", "哈哈", "棒", "爱你"];
    const questionWords = ["为什么", "怎么", "什么", "吗", "?", "？"];

    if (emotionWords.some((w) => userMessage.includes(w))) {
      updates.stress = Math.min(1.0, state.stress + 0.1);
      updates.attachment = Math.min(
        1.0,
        (updates.attachment || state.attachment) + 0.05,
      );
    }

    if (positiveWords.some((w) => userMessage.includes(w))) {
      updates.social = Math.min(1.0, state.social + 0.08);
      updates.fatigue = Math.max(0, state.fatigue - 0.05);
    }

    if (questionWords.some((w) => userMessage.includes(w))) {
      updates.curiosity = Math.min(1.0, state.curiosity + 0.06);
    }

    // fatigue 自然衰减
    updates.fatigue = Math.max(0, (updates.fatigue || state.fatigue) - 0.02);

    updates.last_pulse_at = new Date().toISOString();
    updates.updated_at = new Date().toISOString();

    await db.from("desire_state").update(updates).eq("persona_id", personaId);
  } catch (e) {
    console.error("[欲望系统] pulse 失败:", e.message);
  }
}

// ========== 心跳衰减（每次主动消息检查时调用）==========
async function tickDecay(personaId) {
  try {
    const db = getDB();
    const state = await getDesireState(personaId);
    if (!state) return;

    const now = new Date();
    const lastPulse = new Date(state.last_pulse_at);
    const idleHours = (now - lastPulse) / (1000 * 60 * 60);

    if (idleHours < 0.5) return; // 半小时内不衰减

    const decayRate = Math.min(0.05, idleHours * 0.01);
    const updates = {};

    // attachment 随空闲时间上涨（想念感）
    if (idleHours > 2) {
      updates.attachment = Math.min(0.9, state.attachment + idleHours * 0.02);
    }

    // 其他维度自然衰减
    for (const key of [
      "curiosity",
      "reflection",
      "social",
      "libido",
      "stress",
    ]) {
      updates[key] = Math.max(0.05, state[key] - decayRate);
    }

    // fatigue 缓慢恢复
    updates.fatigue = Math.max(0, state.fatigue - 0.03);

    updates.updated_at = new Date().toISOString();
    await db.from("desire_state").update(updates).eq("persona_id", personaId);
  } catch (e) {
    console.error("[欲望系统] 衰减失败:", e.message);
  }
}

// ========== 检查不应期 ==========
async function isInRefractory(personaId, driveKey) {
  try {
    const db = getDB();
    const now = new Date().toISOString();
    const { data } = await db
      .from("desire_refractory")
      .select("cooldown_until")
      .eq("persona_id", personaId)
      .eq("drive_key", driveKey)
      .gte("cooldown_until", now)
      .limit(1);
    return data && data.length > 0;
  } catch {
    return false;
  }
}

// ========== 设置不应期 ==========
async function setRefractory(personaId, driveKey) {
  try {
    const db = getDB();
    const minutes = REFRACTORY_MINUTES[driveKey] || 60;
    const cooldownUntil = new Date(
      Date.now() + minutes * 60 * 1000,
    ).toISOString();

    const { data: existing } = await db
      .from("desire_refractory")
      .select("id")
      .eq("persona_id", personaId)
      .eq("drive_key", driveKey)
      .limit(1);

    if (existing && existing.length > 0) {
      await db
        .from("desire_refractory")
        .update({ cooldown_until: cooldownUntil })
        .eq("persona_id", personaId)
        .eq("drive_key", driveKey);
    } else {
      await db.from("desire_refractory").insert({
        persona_id: personaId,
        drive_key: driveKey,
        cooldown_until: cooldownUntil,
      });
    }
  } catch (e) {
    console.error("[欲望系统] 设置不应期失败:", e.message);
  }
}

// ========== 计算召唤力 ==========
function calcScores(state) {
  const scores = {};
  for (const key of DRIVE_KEYS) {
    if (key === "fatigue") continue; // fatigue 不参与召唤力
    scores[key] = state[key] || 0;
  }
  return scores;
}

// ========== 决定是否主动触发 ==========
async function pickIntent(personaId) {
  try {
    await tickDecay(personaId);

    const state = await getDesireState(personaId);
    if (!state) return null;

    // fatigue 过高时抑制所有行为
    if (state.fatigue > 0.7) {
      console.log(`[欲望系统] ${personaId} 疲劳度过高，跳过`);
      return null;
    }

    const scores = calcScores(state);

    // 找到召唤力最高且不在不应期的维度
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    for (const [key, score] of sorted) {
      if (score < TRIGGER_THRESHOLD) break;

      const inRefractory = await isInRefractory(personaId, key);
      if (inRefractory) continue;

      // 触发后设置不应期，降低该维度
      await setRefractory(personaId, key);

      const db = getDB();
      const decay = {};
      decay[key] = Math.max(0.1, state[key] * 0.6);
      decay.updated_at = new Date().toISOString();
      await db.from("desire_state").update(decay).eq("persona_id", personaId);

      return {
        drive_key: key,
        want_action: DRIVE_ACTIONS[key],
        score,
        reason: buildReason(key, state),
      };
    }

    return null;
  } catch (e) {
    console.error("[欲望系统] pickIntent 失败:", e.message);
    return null;
  }
}

// ========== 生成第一人称原因 ==========
function buildReason(key, state) {
  const reasons = {
    attachment: "我一直在想Ta，有点想发消息了",
    curiosity: "我想聊聊最近有趣的事",
    reflection: "我想把最近的感受说给Ta听",
    duty: "我记挂着有件事要提醒Ta",
    social: "我想和Ta随便聊聊",
    libido: "我想靠近Ta",
    stress: "我有点烦，想说说",
  };
  return reasons[key] || "我想联系Ta";
}

// ========== 获取状态接口（供前端展示）==========
async function getDesireStatus(personaId) {
  try {
    const state = await getDesireState(personaId);
    if (!state) return null;

    const scores = calcScores(state);
    const topIntent = await pickIntent(personaId);

    return {
      drives: {
        attachment: state.attachment,
        curiosity: state.curiosity,
        reflection: state.reflection,
        duty: state.duty,
        social: state.social,
        fatigue: state.fatigue,
        libido: state.libido,
        stress: state.stress,
      },
      scores,
      intent: topIntent,
      last_pulse_at: state.last_pulse_at,
    };
  } catch (e) {
    console.error("[欲望系统] getDesireStatus 失败:", e.message);
    return null;
  }
}

module.exports = {
  pulseOnUserMessage,
  pickIntent,
  getDesireStatus,
  tickDecay,
};
