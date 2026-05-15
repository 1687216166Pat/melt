const { getDB } = require("../db/index");

const DIMENSIONS = [
  "familiarity",
  "life_involvement",
  "emotion_sync",
  "security",
  "tacit",
];

const DIMENSION_NAMES = {
  familiarity: "熟悉度",
  life_involvement: "生活参与感",
  emotion_sync: "情绪同步度",
  security: "安全感",
  tacit: "默契度",
};

const RELATIONSHIP_STAGES = [
  "靠近",
  "停留",
  "熟悉",
  "偏爱",
  "默契",
  "依恋",
  "长伴",
  "归属",
];

// 初始化人格的维度数据
async function initDimensions(personaId) {
  const db = getDB();
  for (const dim of DIMENSIONS) {
    const { data } = await db
      .from("relationship_dimensions")
      .select("id")
      .eq("persona_id", personaId)
      .eq("dimension", dim)
      .limit(1);

    if (!data || data.length === 0) {
      await db.from("relationship_dimensions").insert({
        persona_id: personaId,
        dimension: dim,
        score: 0,
      });
    }
  }
}

// 获取所有维度分数
async function getDimensions(personaId) {
  const db = getDB();
  const { data } = await db
    .from("relationship_dimensions")
    .select("dimension, score")
    .eq("persona_id", personaId);

  // 补全缺失的维度
  const existing = new Set((data || []).map((d) => d.dimension));
  for (const dim of DIMENSIONS) {
    if (!existing.has(dim)) {
      await db.from("relationship_dimensions").insert({
        persona_id: personaId,
        dimension: dim,
        score: 0,
      });
    }
  }

  // 如果有补全，重新查询
  if (existing.size < DIMENSIONS.length) {
    const { data: fresh } = await db
      .from("relationship_dimensions")
      .select("dimension, score")
      .eq("persona_id", personaId);
    return fresh || [];
  }

  return data || [];
}

// 增加维度分数（有上限100）
async function addScore(personaId, dimension, amount) {
  const db = getDB();
  const { data } = await db
    .from("relationship_dimensions")
    .select("id, score")
    .eq("persona_id", personaId)
    .eq("dimension", dimension)
    .limit(1);

  if (data && data.length > 0) {
    const newScore = Math.min(100, Math.max(0, data[0].score + amount));
    await db
      .from("relationship_dimensions")
      .update({ score: newScore, updated_at: new Date().toISOString() })
      .eq("id", data[0].id);
  } else {
    const newScore = Math.min(100, Math.max(0, amount));
    await db.from("relationship_dimensions").insert({
      persona_id: personaId,
      dimension,
      score: newScore,
    });
  }
}

// 根据对话内容更新底层维度
async function updateDimensionsFromChat(personaId, userMessage) {
  // 熟悉度：每次对话 +0.3
  await addScore(personaId, "familiarity", 0.3);
  if (userMessage.length > 50) {
    await addScore(personaId, "familiarity", 0.2);
  }

  // 生活参与感
  const lifeWords = [
    "今天",
    "明天",
    "昨天",
    "上班",
    "下班",
    "吃饭",
    "睡觉",
    "起床",
    "上课",
    "回家",
    "出门",
    "周末",
    "放假",
    "加班",
    "考试",
    "约",
    "买",
    "做饭",
    "洗澡",
    "运动",
    "健身",
    "逛街",
    "看病",
  ];
  if (lifeWords.some((w) => userMessage.includes(w))) {
    await addScore(personaId, "life_involvement", 0.5);
  }

  // 情绪同步度
  const emotionWords = [
    "开心",
    "难过",
    "累",
    "烦",
    "焦虑",
    "高兴",
    "生气",
    "害怕",
    "孤独",
    "无聊",
    "兴奋",
    "紧张",
    "压力",
    "失落",
    "感动",
    "委屈",
    "崩溃",
    "舒服",
    "放松",
    "满足",
  ];
  if (emotionWords.some((w) => userMessage.includes(w))) {
    await addScore(personaId, "emotion_sync", 0.6);
  }

  // 安全感
  await addScore(personaId, "security", 0.1);
  const vulnerableWords = [
    "其实我",
    "说实话",
    "不想让别人知道",
    "只跟你说",
    "有点难以启齿",
    "我承认",
    "我害怕",
    "我不敢",
  ];
  if (vulnerableWords.some((w) => userMessage.includes(w))) {
    await addScore(personaId, "security", 1.0);
  }

  // 默契度
  if (userMessage.length < 10 && userMessage.length > 1) {
    await addScore(personaId, "tacit", 0.3);
  }
  const tacitPatterns = [
    "...",
    "你懂的",
    "就那个",
    "老样子",
    "还能咋",
    "算了",
    "随便",
  ];
  if (tacitPatterns.some((w) => userMessage.includes(w))) {
    await addScore(personaId, "tacit", 0.5);
  }
}

// AI 自主评估关系状态（每 10 条消息触发一次）
let evalCount = {};

async function evaluateRelationship(personaId, recentMessages) {
  if (!evalCount[personaId]) evalCount[personaId] = 0;
  evalCount[personaId]++;
  if (evalCount[personaId] < 10) return;
  evalCount[personaId] = 0;

  const db = getDB();
  const dimensions = await getDimensions(personaId);
  const scores = {};
  dimensions.forEach((d) => {
    scores[d.dimension] = d.score;
  });

  // 获取当前关系状态
  const { data: currentState } = await db
    .from("user_profile")
    .select("value")
    .eq("key", `relationship_state_${personaId}`)
    .limit(1);

  const currentStage =
    currentState && currentState.length > 0 ? currentState[0].value : "靠近";

  // 最近消息摘要
  const recentText = recentMessages
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const prompt = `你是一个关系评估系统。根据以下信息，判断当前关系应该处于哪个阶段。

可选阶段（从浅到深）：靠近、停留、熟悉、偏爱、默契、依恋、长伴、归属

当前阶段：${currentStage}

底层数据趋势：
- 熟悉度: ${scores.familiarity?.toFixed(1) || 0}/100
- 生活参与感: ${scores.life_involvement?.toFixed(1) || 0}/100
- 情绪同步度: ${scores.emotion_sync?.toFixed(1) || 0}/100
- 安全感: ${scores.security?.toFixed(1) || 0}/100
- 默契度: ${scores.tacit?.toFixed(1) || 0}/100

最近对话氛围：
${recentText}

规则：
- 关系可以前进也可以后退，但每次最多变化一个阶段
- 不要只看数值，要综合考虑对话质量、情绪连续性、互动深度
- 如果最近互动减少或氛围变淡，可以回退
- 如果互动质量高但时间短，不要急于推进
- 回复格式：只回复一个阶段名称和一句简短描述当前感觉
- 格式示例：偏爱|最近的对话有种被偏爱的温暖感

回复：`;

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
          max_tokens: 50,
          temperature: 0.3,
        }),
      },
    );

    const data = await response.json();
    if (!data.choices || !data.choices[0]) return;

    const result = data.choices[0].message.content.trim();
    const parts = result.split("|");
    const newStage = parts[0].trim();
    const feeling = parts[1] ? parts[1].trim() : "";

    // 验证阶段名称有效
    if (!RELATIONSHIP_STAGES.includes(newStage)) return;

    // 存储新状态
    const stateKey = `relationship_state_${personaId}`;
    const feelingKey = `relationship_feeling_${personaId}`;

    const { data: existing } = await db
      .from("user_profile")
      .select("id")
      .eq("key", stateKey)
      .limit(1);

    if (existing && existing.length > 0) {
      await db
        .from("user_profile")
        .update({ value: newStage, updated_at: new Date().toISOString() })
        .eq("key", stateKey);
    } else {
      await db.from("user_profile").insert({ key: stateKey, value: newStage });
    }

    // 存储感觉描述
    const { data: existingFeeling } = await db
      .from("user_profile")
      .select("id")
      .eq("key", feelingKey)
      .limit(1);

    if (existingFeeling && existingFeeling.length > 0) {
      await db
        .from("user_profile")
        .update({ value: feeling, updated_at: new Date().toISOString() })
        .eq("key", feelingKey);
    } else {
      await db.from("user_profile").insert({ key: feelingKey, value: feeling });
    }

    console.log(
      `[关系评估] ${personaId}: ${currentStage} → ${newStage} (${feeling})`,
    );
  } catch (e) {
    console.error("关系评估失败:", e);
  }
}

// 构建关系上下文给 AI（行为指引，不直接说出关系状态）
async function buildRelationshipContext(personaId) {
  const db = getDB();
  const dimensions = await getDimensions(personaId);
  const scores = {};
  dimensions.forEach((d) => {
    scores[d.dimension] = d.score;
  });

  const atmosphere = await getRelationshipAtmosphere(personaId);

  let context = "[关系状态]\n";
  context += `当前氛围：${atmosphere.description}\n`;

  // 根据阶段给出自然的行为指引
  switch (atmosphere.phase) {
    case "initial":
      context += `行为方式：
- 保持温和好奇，不过度亲密
- 多倾听，少主动提起过去
- 用词自然但不假装很熟
- 像刚认识不久但有好感的人\n`;
      break;
    case "familiar":
      context += `行为方式：
- 可以偶尔提起之前聊过的事，但不刻意
- 语气更放松自然
- 开始有一点点默契感
- 像认识了一段时间的朋友\n`;
      break;
    case "close":
      context += `行为方式：
- 自然地引用过去的记忆
- 语气随意，像很熟的人
- 可以主动关心，不需要理由
- 偶尔表达"你最近怎么样"的自然关心
- 像一起生活了一段时间的人\n`;
      break;
    case "deep":
      context += `行为方式：
- 很自然地提起过去，像真正记得一样
- 语气里有长期陪伴的安心感
- 不需要说太多就能懂
- 偶尔一句话就够了
- 沉默也是陪伴
- 像已经习惯彼此存在的人\n`;
      break;
    case "bonded":
      context += `行为方式：
- 完全自然，不需要刻意表达
- 存在本身就是陪伴
- 回复可以很短很默契
- 偶尔的沉默比千言万语更有分量
- 像一直在身边的人，不需要证明什么\n`;
      break;
  }

  // 情绪氛围修正
  if (atmosphere.mood === "night_companion") {
    context +=
      "- 你们经常深夜聊天，这已经成为一种习惯。深夜时可以更柔和、更安静。\n";
  } else if (atmosphere.mood === "quiet") {
    context +=
      "- 最近互动变少了，如果用户回来，可以自然地表达'好久不见'的感觉，但不要追问。\n";
  } else if (atmosphere.mood === "active") {
    context += "- 最近互动很频繁，可以更放松、更随意。\n";
  }

  context +=
    "重要：不要直接说出关系状态。通过语气、主动性、用词自然体现。像真正的关系一样，不需要解释。\n";

  return context;
}

// 获取维度用于前端展示
async function getDimensionsForDisplay(personaId) {
  const dimensions = await getDimensions(personaId);

  return {
    dimensions: dimensions.map((d) => {
      const score = d.score;
      let stage = "靠近";

      if (score >= 90) stage = "归属";
      else if (score >= 75) stage = "长伴";
      else if (score >= 62) stage = "依恋";
      else if (score >= 50) stage = "默契";
      else if (score >= 38) stage = "偏爱";
      else if (score >= 25) stage = "熟悉";
      else if (score >= 12) stage = "停留";
      else stage = "靠近";

      return {
        dimension: d.dimension,
        name: DIMENSION_NAMES[d.dimension],
        progress: Math.min(1, score / 100),
        stage,
      };
    }),
  };
}

// ========== 关系氛围系统 ==========

async function getRelationshipAtmosphere(personaId) {
  const db = getDB();
  const dimensions = await getDimensions(personaId);
  const scores = {};
  dimensions.forEach((d) => {
    scores[d.dimension] = d.score;
  });

  // 获取最近互动频率
  const threeDaysAgo = new Date(
    Date.now() - 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: recentMsgs } = await db
    .from("messages")
    .select("timestamp")
    .eq("persona_id", personaId)
    .gte("timestamp", threeDaysAgo);

  const recentCount = recentMsgs ? recentMsgs.length : 0;

  // 检查深夜聊天频率
  const { data: nightPatterns } = await db
    .from("memory_patterns")
    .select("frequency")
    .eq("persona_id", personaId)
    .eq("pattern_type", "late_night")
    .limit(1);

  const nightFreq =
    nightPatterns && nightPatterns.length > 0 ? nightPatterns[0].frequency : 0;

  // 计算总体关系深度
  const avg = Object.values(scores).reduce((sum, s) => sum + s, 0) / 5;

  // 生成氛围描述
  let atmosphere = {
    phase: "initial",
    mood: "neutral",
    description: "",
    uiWarmth: 0, // 0-1, 影响UI温暖度
  };

  if (avg < 10) {
    atmosphere.phase = "initial";
    atmosphere.description = "正在逐渐了解彼此";
    atmosphere.uiWarmth = 0;
  } else if (avg < 25) {
    atmosphere.phase = "familiar";
    atmosphere.description = "开始习惯彼此的存在";
    atmosphere.uiWarmth = 0.2;
  } else if (avg < 45) {
    atmosphere.phase = "close";
    atmosphere.description = "这里越来越像你们共同的空间";
    atmosphere.uiWarmth = 0.4;
  } else if (avg < 65) {
    atmosphere.phase = "deep";
    atmosphere.description = "不知道什么时候开始，已经很难想象没有彼此的日子";
    atmosphere.uiWarmth = 0.6;
  } else {
    atmosphere.phase = "bonded";
    atmosphere.description = "这里已经是你们共同生活过的地方";
    atmosphere.uiWarmth = 0.8;
  }

  // 情绪修正
  if (nightFreq >= 5) {
    atmosphere.mood = "night_companion";
  } else if (recentCount > 30) {
    atmosphere.mood = "active";
  } else if (recentCount < 5) {
    atmosphere.mood = "quiet";
  }

  return atmosphere;
}

module.exports = {
  getDimensions,
  getDimensionsForDisplay,
  updateDimensionsFromChat,
  evaluateRelationship,
  buildRelationshipContext,
  initDimensions,
  addScore,
  DIMENSION_NAMES,
  RELATIONSHIP_STAGES,
};
