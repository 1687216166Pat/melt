const { getDB } = require("../db/index");
const { pushNotification } = require("./push");
const { getFullPrompt, getActivePersona } = require("./prompt");
const {
  processMemory,
  buildMemoryContextAsync,
  getSessionMemory,
  detectPatterns,
} = require("./memory");

const {
  updateDimensionsFromChat,
  buildRelationshipContext,
  evaluateRelationship,
} = require("./relationship");

function getTimeContext() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }),
  );
  const hour = now.getHours();
  const minute = now.getMinutes();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = weekdays[now.getDay()];
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const year = now.getFullYear();

  let period = "";
  if (hour >= 5 && hour < 9) period = "清晨";
  else if (hour >= 9 && hour < 12) period = "上午";
  else if (hour >= 12 && hour < 14) period = "中午";
  else if (hour >= 14 && hour < 17) period = "下午";
  else if (hour >= 17 && hour < 19) period = "傍晚";
  else if (hour >= 19 && hour < 22) period = "晚上";
  else if (hour >= 22 || hour < 2) period = "深夜";
  else period = "凌晨";

  return `[当前时间] 现在是${year}年${month}月${date}日 周${weekday} ${hour}:${minute.toString().padStart(2, "0")} ${period}。你能感知到这个时间。`;
}

function detectEmotion(userMessage) {
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
    "孤独",
    "难过",
    "伤心",
  ];
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
    "喜欢",
    "爱",
  ];
  const neutralWords = ["嗯", "哦", "好的", "知道了"];

  if (negativeWords.some((w) => userMessage.includes(w))) return "低落";
  if (positiveWords.some((w) => userMessage.includes(w))) return "积极";
  if (neutralWords.some((w) => userMessage === w)) return "平淡";
  return "正常";
}

async function handleChat(userMessage, ws, personaId) {
  const db = getDB();
  const pid = personaId || "xiaorou";
  const nowISO = new Date().toISOString();

  // 存用户消息
  await db.from("messages").insert({
    persona_id: pid,
    role: "user",
    content: userMessage,
    timestamp: nowISO,
  });

  // 检测行为模式
  detectPatterns(pid, userMessage);
  updateDimensionsFromChat(pid, userMessage);

  // 获取历史
  const history = await getSessionMemory(pid, 10);

  // 构建 prompt
  const timeContext = getTimeContext();
  const fullPrompt = getFullPrompt();
  const memoryContext = await buildMemoryContextAsync(pid, userMessage);
  const relationshipContext = await buildRelationshipContext(pid);

  let systemContent = `${fullPrompt}
${timeContext}
${memoryContext}
${relationshipContext}`;

  systemContent += `\n[重要] 严格遵守上述所有输出风格规则，每次回复都必须执行。`;

  const messages = [
    { role: "system", content: systemContent },
    ...history.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    })),
  ];

  const body = JSON.stringify({
    model: process.env.AI_MODEL,
    messages,
  });

  const totalChars =
    systemContent.length +
    history.reduce((sum, m) => sum + m.content.length, 0) +
    userMessage.length;
  const estimatedTokens = Math.round(totalChars * 1.5);

  console.log("System prompt 长度:", systemContent.length, "字符");
  console.log("开始请求 AI...");
  const startTime = Date.now();

  let apiError = null;
  let data = null;

  try {
    const response = await fetch(
      `${process.env.AI_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        body: body,
      },
    );

    data = await response.json();

    if (!response.ok) {
      apiError = `HTTP ${response.status}: ${JSON.stringify(data)}`;
      console.error("[handleChat] API错误:", apiError);
    }
  } catch (e) {
    apiError = e.message;
    console.error("[handleChat] 请求异常:", e.message);
  }

  const elapsed = Date.now() - startTime;
  console.log(`AI 响应耗时: ${elapsed}ms`);

  if (apiError || !data || !data.choices || !data.choices[0]) {
    console.error("AI 返回异常:", apiError || data);
    ws.send(
      JSON.stringify({
        type: "chat",
        role: "ai",
        content: "抱歉，我暂时无法回复。",
        timestamp: new Date().toISOString(),
        debug: {
          layer1: {
            model: process.env.AI_MODEL,
            status: "error",
            error: apiError || "无有效回复",
            estimatedTokens,
            actualTokens: null,
            elapsed,
          },
          layer2: {
            persona: pid,
            memoryContext: memoryContext ? memoryContext.slice(0, 300) : "无",
            memoryLength: memoryContext ? memoryContext.length : 0,
          },
          layer3: {
            historyCount: history.length,
            systemPromptLength: systemContent.length,
            timeContext: timeContext.trim(),
          },
          memory: {
            messagesSinceSummary: getCounter(pid).sinceLastSummary,
            totalMessages: getCounter(pid).total,
            nextTriggerIn: 100 - getCounter(pid).sinceLastSummary,
            longTermProfile: "未知",
            recentMemories: "未知",
          },
        },
      }),
    );
    return;
  }

  let aiReply = data.choices[0].message.content;
  // 过滤思维链
  aiReply = aiReply.replace(/\[思考\][\s\S]*?\[思考\]/g, "").trim();
  aiReply = aiReply.replace(/\[思考\][\s\S]*/g, "").trim();
  aiReply = aiReply.replace(/[\s\S]*?<\/think>/g, "").trim();

  // 存 AI 回复
  await db.from("messages").insert({
    persona_id: pid,
    role: "ai",
    content: aiReply,
    timestamp: new Date().toISOString(),
  });

  // 触发关系评估
  evaluateRelationship(pid, history);

  // 记忆处理（双触发机制）
  processMemory(pid, userMessage, aiReply);

  // 获取今日消息数
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayMsgs } = await db
    .from("messages")
    .select("id", { count: "exact" })
    .eq("persona_id", pid)
    .gte("timestamp", today + "T00:00:00Z");

  // 获取行为模式
  const { data: patterns } = await db
    .from("memory_patterns")
    .select("pattern_type, frequency")
    .eq("persona_id", pid)
    .gte("frequency", 2)
    .order("frequency", { ascending: false })
    .limit(3);

  // 获取记忆计数器
  const counter = getCounter(pid);

  ws.send(
    JSON.stringify({
      type: "chat",
      role: "ai",
      content: aiReply,
      timestamp: new Date().toISOString(),
      debug: {
        layer1: {
          model: process.env.AI_MODEL,
          status: "success",
          error: null,
          estimatedTokens,
          actualTokens: data.usage || null,
          elapsed,
        },
        layer2: {
          persona: pid,
          memoryContext: memoryContext ? memoryContext.slice(0, 300) : "无",
          memoryLength: memoryContext ? memoryContext.length : 0,
        },
        layer3: {
          historyCount: history.length,
          systemPromptLength: systemContent.length,
          timeContext: timeContext.trim(),
        },
        memory: {
          messagesSinceSummary: counter.sinceLastSummary,
          totalMessages: counter.total,
          nextTriggerIn: 100 - counter.sinceLastSummary,
          longTermProfile: memoryContext.includes("[长期印象]") ? "有" : "无",
          recentMemories: memoryContext.includes("[近期印象]") ? "有" : "无",
        },
      },
    }),
  );

  const preview = aiReply.length > 60 ? aiReply.slice(0, 60) + "..." : aiReply;
  pushNotification("AI 助手", preview);
}

module.exports = { handleChat };
