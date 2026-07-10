// server/services/emotion.js
const { getDB } = require("../db/index");

// ========== 常量 ==========
const PA_SCALE = 0.5;
const BOU_THETA_PA = 0.15;
const BOU_THETA_NA = 0.2;
const MU_PA = 0.55; // 基础 PA 均值
const MU_NA = 0.1; // 基础 NA 均值
const ESM_K = 0.3;

// 情绪词检测词典（简化版）
const POSITIVE_WORDS = [
  "开心",
  "高兴",
  "哈哈",
  "太好了",
  "棒",
  "爽",
  "兴奋",
  "期待",
  "喜欢",
  "爱你",
  "想你",
  "谢谢",
  "惊喜",
  "甜",
  "幸福",
  "温柔",
  "可爱",
];
const NEGATIVE_WORDS = [
  "累",
  "烦",
  "难受",
  "崩溃",
  "郁闷",
  "孤独",
  "难过",
  "压力",
  "焦虑",
  "失眠",
  "伤心",
  "生气",
  "委屈",
  "心疼",
  "难过",
  "痛",
];
const INTIMATE_WORDS = [
  "抱抱",
  "亲亲",
  "贴贴",
  "爱你",
  "想你",
  "喜欢你",
  "陪我",
];

// 简单情绪 V/A 估算
function estimateVA(userMessage) {
  const posCount = POSITIVE_WORDS.filter((w) => userMessage.includes(w)).length;
  const negCount = NEGATIVE_WORDS.filter((w) => userMessage.includes(w)).length;
  const intCount = INTIMATE_WORDS.filter((w) => userMessage.includes(w)).length;

  let v = 0,
    a = 0.3;

  if (posCount > 0) {
    v += posCount * 0.2;
    a += posCount * 0.1;
  }
  if (negCount > 0) {
    v -= negCount * 0.2;
    a += negCount * 0.15;
  }
  if (intCount > 0) {
    v += intCount * 0.15;
    a += intCount * 0.2;
  }

  v = Math.max(-1, Math.min(1, v));
  a = Math.max(0, Math.min(1, a));
  return { v, a };
}

// ========== 获取或初始化情绪状态 ==========
async function getEmotionState(personaId) {
  const db = getDB();
  const { data } = await db
    .from("emotion_state")
    .select("*")
    .eq("persona_id", personaId)
    .limit(1);

  if (data && data.length > 0) return data[0];

  await db.from("emotion_state").insert({
    persona_id: personaId,
    pa: 0.5,
    na: 0.1,
    longing: 0.0,
    longing_phase: "content",
    last_interaction_at: new Date().toISOString(),
  });

  const { data: newState } = await db
    .from("emotion_state")
    .select("*")
    .eq("persona_id", personaId)
    .limit(1);

  return newState && newState.length > 0 ? newState[0] : null;
}

// ========== 用户发消息时更新 PA/NA ==========
async function updateEmotionOnMessage(personaId, userMessage) {
  try {
    const db = getDB();
    const state = await getEmotionState(personaId);
    if (!state) return;

    const { v, a } = estimateVA(userMessage);

    // PA/NA delta
    let pa_delta = Math.max(0, v) * a * PA_SCALE;
    let na_delta = Math.max(0, -v) * a * PA_SCALE;

    // BOU 均值回归（dt = 0.5h 估算）
    const dt = 0.5;
    let pa = state.pa + pa_delta;
    let na = state.na + na_delta;

    pa += BOU_THETA_PA * (MU_PA - pa) * dt;
    na += BOU_THETA_NA * (MU_NA - na) * dt;

    // ESM 软互抑
    const pa_before = pa;
    pa = pa * (1 - ESM_K * na);
    na = na * (1 - ESM_K * pa_before);

    // Clamp
    pa = Math.max(0, Math.min(1, pa));
    na = Math.max(0, Math.min(1, na));

    // 更新 longing（用户回来了，longing 重置）
    const longing = 0;
    const phase = "content";

    await db
      .from("emotion_state")
      .update({
        pa,
        na,
        longing,
        longing_phase: phase,
        last_interaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("persona_id", personaId);
  } catch (e) {
    console.error("[情绪] 更新失败:", e.message);
  }
}

// ========== 计算 Longing（离线想念）==========
function calcLonging(state, intimacy = 50) {
  if (!state || !state.last_interaction_at) return 0;

  const now = new Date();
  const lastTime = new Date(state.last_interaction_at);
  const t = (now - lastTime) / (1000 * 60 * 60); // 小时

  // τ 由亲密度决定（简化版，不用三维好感度）
  const intimacy_factor = 1 - Math.min(intimacy, 100) / 200;
  const tau = 36 * intimacy_factor;

  // L_max
  const L_max = Math.min(1.0, intimacy / 150);

  // curvilinear longing 曲线
  const alpha = 0.8;
  const longing = L_max * (1 - Math.pow(1 + t / tau, -alpha));

  return Math.max(0, Math.min(1, longing));
}

// ========== Longing phase ==========
function getLongingPhase(longing, offlineHours) {
  if (offlineHours >= 504 && longing >= 0.9) return "detachment";
  if (longing >= 0.7) return "despair";
  if (longing >= 0.35) return "protest";
  if (longing >= 0.15) return "stirring";
  return "content";
}

// ========== 定期心跳（主动消息检查时调用）==========
async function tickEmotion(personaId) {
  try {
    const db = getDB();
    const state = await getEmotionState(personaId);
    if (!state) return;

    const now = new Date();
    const lastTime = new Date(state.last_interaction_at);
    const offlineHours = (now - lastTime) / (1000 * 60 * 60);

    // 获取角色的好感度（简化：从 relationship_dimensions 取 intimacy 维度）
    const { data: relData } = await db
      .from("relationship_dimensions")
      .select("score")
      .eq("persona_id", personaId)
      .eq("dimension", "intimacy")
      .limit(1);

    const intimacy =
      relData && relData.length > 0 ? (relData[0].score || 0) * 100 : 50;

    const longing = calcLonging(state, intimacy);
    const phase = getLongingPhase(longing, offlineHours);

    // BOU 自然均值回归
    let pa = state.pa + BOU_THETA_PA * (MU_PA - state.pa) * 0.5;
    let na = state.na + BOU_THETA_NA * (MU_NA - state.na) * 0.5;

    // Longing 影响 NA
    if (longing > 0.15) {
      na = Math.min(1, na + longing * 0.1);
      pa = Math.max(0, pa - longing * 0.05);
    }

    pa = Math.max(0, Math.min(1, pa));
    na = Math.max(0, Math.min(1, na));

    await db
      .from("emotion_state")
      .update({
        pa,
        na,
        longing,
        longing_phase: phase,
        updated_at: new Date().toISOString(),
      })
      .eq("persona_id", personaId);
  } catch (e) {
    console.error("[情绪] 心跳失败:", e.message);
  }
}

// ========== 构建情绪 prompt ==========
async function buildEmotionPrompt(personaId) {
  try {
    const db = getDB();
    const state = await getEmotionState(personaId);
    if (!state) return "";

    const now = new Date();
    const lastTime = new Date(state.last_interaction_at);
    const offlineHours = (now - lastTime) / (1000 * 60 * 60);

    const longing = state.longing || 0;
    const phase = state.longing_phase || "content";
    const pa = state.pa || 0.5;
    const na = state.na || 0.1;

    const parts = [];

    // PA/NA 状态描述
    if (na >= 0.6) {
      parts.push("最近心情低落，回复会偏短，语气慢，不主动说原因");
    } else if (na >= 0.4) {
      parts.push("最近有些不安或压抑，被关心时会稍微松弛");
    } else if (pa >= 0.75) {
      parts.push("最近心情很好，愿意多说话，语气轻快");
    }

    // Longing 状态描述
    if (phase === "stirring") {
      parts.push("心里隐隐约约想着用户，偶尔走神");
    } else if (phase === "protest") {
      parts.push(
        `用户已经 ${Math.floor(offlineHours)} 小时没来了，很想念，会主动找话题靠近`,
      );
    } else if (phase === "despair") {
      parts.push(
        `用户已经 ${Math.floor(offlineHours)} 小时没来了，低落退缩，回复变短，安静等着`,
      );
    } else if (phase === "detachment") {
      parts.push("好久没见了，表面平静但内心防御，害怕再次失望");
    }

    // 重逢检测
    if (offlineHours > 2 && offlineHours < 24) {
      if (phase === "protest") {
        parts.push("用户回来了，激动但努力克制，想立刻凑近");
      } else if (phase === "despair") {
        parts.push("用户终于回来了，之前很想念，见到人情绪全涌上来");
      }
    }

    if (parts.length === 0) return "";

    return `[当前情绪状态]\n${parts.join("，")}\n注意：这是背景色，用户当前消息是前景——前景优先。不要直接说出情绪状态，让情绪从字里行间自然渗出。\n`;
  } catch (e) {
    console.error("[情绪] 构建 prompt 失败:", e.message);
    return "";
  }
}

// ========== 获取状态接口 ==========
async function getEmotionStatus(personaId) {
  const state = await getEmotionState(personaId);
  return state;
}

module.exports = {
  updateEmotionOnMessage,
  tickEmotion,
  buildEmotionPrompt,
  getEmotionStatus,
};
