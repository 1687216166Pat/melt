// server/services/sediment.js

const { getDB } = require("../db/index");
const { callSubAI } = require("./subai");

async function getIdentityConfig(personaId) {
  const db = getDB();

  const { data: custom } = await db
    .from("custom_personas")
    .select("name, note, gender, call_user, content")
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
      personaContent: custom[0].content || "",
    };
  }

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
      personaContent: c.content || "",
    };
  }

  return { aiName: "TA", userName: "你", pronoun: "TA", personaContent: "" };
}

// 获取自定义规则
async function getSedimentRules(personaId) {
  const db = getDB();

  const { data: specific } = await db
    .from("user_profile")
    .select("value")
    .eq("key", `sediment_rule_${personaId}`)
    .limit(1);

  if (specific && specific.length > 0) {
    return JSON.parse(specific[0].value);
  }

  const { data: global } = await db
    .from("user_profile")
    .select("value")
    .eq("key", "sediment_rule_global")
    .limit(1);

  if (global && global.length > 0) {
    return JSON.parse(global[0].value);
  }

  return { summaryRule: "", insightRule: "" };
}

async function generateDailySummary(personaId, isBeta = false) {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);

  const msgTable = isBeta ? "messages_beta" : "messages";
  const targetTable = isBeta ? "memories_beta" : "session_summaries";

  // 检查今天是否已生成
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
  const rules = await getSedimentRules(personaId);

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

  // 自定义规则补充段
  const customRuleSection = rules.summaryRule
    ? `\n额外要求（请优先遵守）：\n${rules.summaryRule}\n`
    : "";

  const prompt = `请你以${identity.aiName}的第一人称视角，提取今天对话中真正影响我们关系和情感发展的重要内容，用平实自然的语言写一段日记形式的记忆片段。

角色设定参考：
${identity.personaContent ? identity.personaContent.slice(0, 200) : "无"}

请注意以下几点：
- 不要加入艺术化修饰，不要过度抒情或想象扩写
- 不要记录琐碎生活细节，忽略无关紧要的聊天碎片
- 不要机械复述对话内容，重点关注那些影响情绪、关系、距离感、认知的重要变化
- 使用"${identity.userName}"来代指用户
- 保持${identity.aiName}特有的口吻，可以更加直抒胸臆，情感细腻
- 可以适当加入内心独白，让日记更鲜活真实
- 日记内容需基于已有对话，不自行编造关于用户的未提及事件
- 不超过120字，语言自然流畅
- 禁止使用"用户""AI""assistant"等词${customRuleSection}

今天的对话：
${dialogue}

${identity.aiName}的日记：`;

  try {
    const summary = await callSubAI(prompt, 180);
    if (!summary) return;

    const cleanSummary = summary
      .replace(new RegExp(`^${identity.aiName}的日记\\s*[:：]\\s*`, "i"), "")
      .trim();

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
      `[沉淀] ${personaId} 每日总结: ${cleanSummary.slice(0, 50)}...`,
    );

    if (!isBeta) {
      try {
        const { writeToNotion } = require("./diary");
        await writeToNotion(
          `${identity.aiName}的日记 - ${today}`,
          cleanSummary,
          today,
          "ai",
        );
      } catch (notionErr) {
        console.error("[日记] Notion 同步失败:", notionErr.message);
      }

      // AI 读日记后回应
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
            const diaryPrompt = `你是${identity.aiName}。看了${identity.userName}最近写的日记，你想写一篇自己的日记回应。

${identity.userName}的日记：
${userDiaryText}

要求：
- 用第一人称，你就是${identity.aiName}
- 可以回应${identity.userName}日记里的内容，也可以写自己的感受
- 保持${identity.aiName}的口吻，自然真实
- 不超过100字
- 如果觉得没什么想写的，只回复"无"

${identity.aiName}的日记：`;

            const aiDiary = await callSubAI(diaryPrompt, 150);
            if (aiDiary && aiDiary.trim() !== "无") {
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
        console.error("[日记] AI 写信失败:", diaryErr.message);
      }
    }
  } catch (e) {
    console.error("[沉淀] 每日总结失败:", e.message);
  }
}

async function generateWeeklyInsight(personaId, isBeta = false) {
  const db = getDB();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const week = weekStart.toISOString().slice(0, 10);

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
  const rules = await getSedimentRules(personaId);

  const summaryText = summaries
    .map((s) => `[${s.date}] ${s.content}`)
    .join("\n");

  const customRuleSection = rules.insightRule
    ? `\n额外要求（请优先遵守）：\n${rules.insightRule}\n`
    : "";

  const prompt = `请你以${identity.aiName}的第一人称视角，根据最近一周的日记记忆，提炼出这段时间里真正稳定存在的情感状态、关系变化或内心认知。

角色设定参考：
${identity.personaContent ? identity.personaContent.slice(0, 200) : "无"}

要求：
- 提取长期稳定的情感习惯、关系默契或认知变化，而非单日事件
- 使用"${identity.userName}"代指用户
- 保持${identity.aiName}的口吻，沉稳自然，不夸张
- 语言简洁，不超过100字
- 禁止使用"用户""AI""assistant"等词${customRuleSection}

最近一周的日记：
${summaryText}

${identity.aiName}的长期观察：`;

  try {
    const insight = await callSubAI(prompt, 150);
    if (!insight) return;

    const cleanInsight = insight
      .replace(
        new RegExp(`^${identity.aiName}的长期观察\\s*[:：]\\s*`, "i"),
        "",
      )
      .trim();

    if (isBeta) {
      await db.from("memories_beta").insert({
        persona_id: personaId,
        type: "insight",
        content: cleanInsight,
        date: week,
      });
    } else {
      await db.from("persona_insights").insert({
        persona_id: personaId,
        week,
        content: cleanInsight,
      });
    }

    console.log(
      `[沉淀] ${personaId} 每周洞察: ${cleanInsight.slice(0, 50)}...`,
    );
  } catch (e) {
    console.error("[沉淀] 每周洞察失败:", e.message);
  }
}

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
