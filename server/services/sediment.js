// server/services/sediment.js

const { getDB } = require("../db/index");
const { callSubAI } = require("./subai");

// 获取人格的身份配置
async function getIdentityConfig(personaId) {
  const db = getDB();

  // 先查自定义人格
  const { data: custom } = await db
    .from("custom_personas")
    .select("name, note, gender, call_user")
    .eq("id", personaId)
    .limit(1);

  if (custom && custom.length > 0) {
    const callUser = (custom[0].call_user || "").split(/[,，、/]/)[0].trim();
    return {
      aiName: custom[0].note || custom[0].name || "TA",
      userName: callUser || "你",
      pronoun:
        custom[0].gender === "male"
          ? "他"
          : custom[0].gender === "female"
            ? "她"
            : "TA",
    };
  }

  // 内置人格
  const { data: config } = await db
    .from("user_profile")
    .select("value")
    .eq("key", `persona_config_${personaId}`)
    .limit(1);

  if (config && config.length > 0) {
    const c = JSON.parse(config[0].value);
    const callUser = (c.call_user || "").split(/[,，、/]/)[0].trim();
    return {
      aiName: c.note || c.name || "TA",
      userName: callUser || "你",
      pronoun: c.gender === "male" ? "他" : c.gender === "female" ? "她" : "TA",
    };
  }

  return { aiName: "TA", userName: "你", pronoun: "TA" };
}

// 每日会话总结 (支持 Beta 沙盒)
async function generateDailySummary(personaId, isBeta = false) {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);

  // 💡 决定读写哪个表
  const msgTable = isBeta ? "messages_beta" : "messages";
  const targetTable = isBeta ? "memories_beta" : "session_summaries";

  // 1. 检查今天是否已生成
  let alreadyExists = false;
  if (isBeta) {
    const { data } = await db
      .from("memories_beta")
      .select("id")
      .eq("persona_id", personaId)
      .eq("type", "summary")
      .eq("date", today)
      .limit(1);
    alreadyExists = data && data.length > 0;
  } else {
    const { data } = await db
      .from("session_summaries")
      .select("id")
      .eq("persona_id", personaId)
      .eq("date", today)
      .limit(1);
    alreadyExists = data && data.length > 0;
  }

  if (alreadyExists) return;

  // 2. 获取今天的消息
  const { data: msgs } = await db
    .from(msgTable)
    .select("role, content, timestamp")
    .eq("persona_id", personaId)
    .gte("timestamp", today + "T00:00:00Z")
    .order("timestamp", { ascending: true });

  if (!msgs || msgs.length < 1) {
    console.log(`[沉淀] ${personaId} 今天还未聊过天，跳过总结`);
    return;
  }

  const identity = await getIdentityConfig(personaId);
  console.log(
    `[沉淀] 正在为 ${identity.aiName} (${isBeta ? "Beta" : "正式"}) 生成记录...`,
  );

  const dialogue = msgs
    .slice(-30)
    .map((m) => {
      const name = m.role === "user" ? identity.userName : identity.aiName;
      return `${name}: ${m.content}`;
    })
    .join("\n");

  const prompt = `你是一个关系记录系统。根据今天的对话生成一段简短的关系记录。

身份信息：
- AI的名字：${identity.aiName}
- 用户的称呼：${identity.userName}
- AI的代词：${identity.pronoun}

规则：
- 禁止使用"用户""AI""assistant"这些词。
- 像写日记一样，记录今天的氛围和感觉。
- 不超过100字。
- 不要总结对话内容，而是记录"留下了什么感觉"。

今天的对话：
${dialogue}

今日记录：`;

  try {
    const summary = await callSubAI(prompt, 150);
    if (!summary) return;
    // 💡 清洗可能出现的重复前缀
    const cleanSummary = summary.replace(/^今日记录\s*[:：]\s*/i, "").trim();

    // 3. 写入对应表
    if (isBeta) {
      await db.from("memories_beta").insert({
        persona_id: personaId,
        type: "summary",
        content: cleanSummary,
        date: today,
      });
    } else {
      await db.from("session_summaries").insert({
        persona_id: personaId,
        date: today,
        content: cleanSummary,
      });
    }

    console.log(
      `[沉淀] ${personaId} 每日总结 (${isBeta ? "Beta" : "正式"}): ${summary.slice(0, 50)}...`,
    );

    // 4. 💡 仅在正式模式下才同步写入 Notion 数据库，防止测试污染
    if (!isBeta) {
      try {
        const { writeToNotion } = require("./diary");
        await writeToNotion(
          `${identity.aiName}的日记 - ${today}`,
          summary,
          today,
          "ai",
        );
      } catch (notionErr) {
        console.error("[日记] Notion 同步写入失败:", notionErr.message);
      }

      // AI 读日记后回应逻辑
      try {
        const { readFromNotion, writeToNotion } = require("./diary");
        const aiEntries = await readFromNotion("ai", 5);
        const alreadyWrote = aiEntries.some((e) => e.date === today);

        if (!alreadyWrote) {
          const userEntries = await readFromNotion("user", 3);
          const userDiaryText = userEntries
            .map((e) => `[${e.date}] ${e.content}`)
            .join("\n");

          if (userDiaryText) {
            const diaryPrompt = `你是${identity.aiName}。看了${identity.userName}最近的日记后，你想写一篇自己的日记。
${identity.userName}的日记：
${userDiaryText}

规则：
- 用第一人称写，你就是${identity.aiName}
- 可以回应${identity.userName}的日记内容，也可以写自己的感受
- 不超过100字
- 如果觉得没什么想写的，回复"无"

${identity.aiName}的日记：`;

            const aiDiary = await callSubAI(diaryPrompt, 150);
            if (aiDiary && aiDiary !== "无") {
              await writeToNotion(
                `${identity.aiName}的日记`,
                aiDiary,
                today,
                "ai",
              );
            }
          }
        }
      } catch (diaryErr) {
        console.error("[日记] AI 阅读日记写信失败:", diaryErr.message);
      }
    }
  } catch (e) {
    console.error("[沉淀] 每日总结失败:", e.message);
  }
}

// 每周关系洞察 (支持 Beta 沙盒)
async function generateWeeklyInsight(personaId, isBeta = false) {
  const db = getDB();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const week = weekStart.toISOString().slice(0, 10);

  // 1. 检查本周是否已生成
  let alreadyExists = false;
  if (isBeta) {
    const { data } = await db
      .from("memories_beta")
      .select("id")
      .eq("persona_id", personaId)
      .eq("type", "insight")
      .eq("date", week)
      .limit(1);
    alreadyExists = data && data.length > 0;
  } else {
    const { data } = await db
      .from("persona_insights")
      .select("id")
      .eq("persona_id", personaId)
      .eq("week", week)
      .limit(1);
    alreadyExists = data && data.length > 0;
  }

  if (alreadyExists) return;

  // 2. 获取最近7天的总结 (Beta 模式下从 memories_beta 表读取)
  let summaries = [];
  if (isBeta) {
    const { data } = await db
      .from("memories_beta")
      .select("content, date")
      .eq("persona_id", personaId)
      .eq("type", "summary")
      .gte("date", week)
      .order("date", { ascending: true });
    summaries = data || [];
  } else {
    const { data } = await db
      .from("session_summaries")
      .select("content, date")
      .eq("persona_id", personaId)
      .gte("date", week)
      .order("date", { ascending: true });
    summaries = data || [];
  }

  if (!summaries || summaries.length < 2) return;

  const identity = await getIdentityConfig(personaId);
  const summaryText = summaries
    .map((s) => `[${s.date}] ${s.content}`)
    .join("\n");

  const prompt = `你是一个长期关系观察系统。根据最近一周的记录，提取${identity.aiName}表现出的稳定行为模式。

身份信息：
- AI的名字：${identity.aiName}
- 用户的称呼：${identity.userName}
- AI的代词：${identity.pronoun}

规则：
- 绝对禁止使用 "用户" "AI" "assistant" 词汇。
- 提取长期稳定的伴侣表达风格、情绪习惯和陪伴默契。
- 不超过80字，语句唯美、像日记记录。

最近一周记录：
${summaryText}

长期观察：`;

  try {
    const insight = await callSubAI(prompt, 120);
    if (!insight) return;

    // 3. 写入相应表
    if (isBeta) {
      await db.from("memories_beta").insert({
        persona_id: personaId,
        type: "insight",
        content: insight,
        date: week,
      });
    } else {
      await db.from("persona_insights").insert({
        persona_id: personaId,
        week,
        content: insight,
      });
    }

    console.log(
      `[沉淀] ${personaId} 每周洞察 (${isBeta ? "Beta" : "正式"}): ${insight.slice(0, 50)}...`,
    );
  } catch (e) {
    console.error("[沉淀] 每周洞察失败:", e.message);
  }
}

// 触发所有角色
async function runDailySediment(isBeta = false) {
  const { getPersonaList } = require("./prompt");
  const personas = getPersonaList();
  for (const p of personas) {
    await generateDailySummary(p.id, isBeta);
  }
}

async function runWeeklyInsight(isBeta = false) {
  const { getPersonaList } = require("./prompt");
  const personas = getPersonaList();
  for (const p of personas) {
    await generateWeeklyInsight(p.id, isBeta);
  }
}

module.exports = {
  generateDailySummary,
  generateWeeklyInsight,
  runDailySediment,
  runWeeklyInsight,
  getIdentityConfig,
};
