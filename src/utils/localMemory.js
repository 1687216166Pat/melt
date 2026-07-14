// src/utils/localMemory.js

// 导入我们刚刚完成的数据库模块
import { STORES, get, getAll, put, remove } from "./mediaDb.js";

// --- 辅助函数：调用大模型 API ---
// 这是一个内部函数，用下划线开头表示私有
async function _callLlmApi(prompt, modelConfig = {}) {
  // 从 localStorage 或 Pinia store 获取用户的 LLM 配置
  // 这是关键一步，确保我们使用的是用户的 key，而不是硬编码的
  // TODO: 你需要根据你项目中存储用户配置的方式来调整这里的代码
  const apiKey = localStorage.getItem("user_llm_api_key");
  const apiBaseUrl =
    localStorage.getItem("user_llm_api_base_url") ||
    "https://api.openai.com/v1";

  if (!apiKey) {
    console.error(
      "[LocalMemory] LLM API Key not found. Aborting memory processing.",
    );
    return null; // 没有 API Key，直接中止
  }

  try {
    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelConfig.model || "gpt-4-turbo",
        messages: [{ role: "system", content: prompt }],
        temperature: modelConfig.temperature || 0.4,
        max_tokens: modelConfig.max_tokens || 256,
        // 请求 JSON 输出，这能极大提高稳定性和解析成功率
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `LLM API request failed: ${response.status} ${response.statusText} - ${errorBody}`,
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("LLM response is empty or has an invalid structure.");
    }

    // 因为我们请求了 json_object，所以可以直接解析
    return JSON.parse(content);
  } catch (error) {
    console.error("[LocalMemory] _callLlmApi failed:", error);
    // 返回 null，让调用方知道操作失败，但不会让整个应用崩溃
    return null;
  }
}

// --- 核心逻辑函数 ---

/**
 * 提取对话中的记忆碎片
 * @param {string} conversationContext - 最近的对话上下文
 */
async function extractFragments(conversationContext) {
  const prompt = `You are a memory extraction system. Analyze the conversation and identify 1-3 new, significant facts or feelings about the user. These are "memory fragments".
Conversation:
"""
${conversationContext}
"""
Return a JSON object with a "fragments" key, which is an array of concise strings. Example: { "fragments": ["She loves rainy days.", "Her dog, Sparky, is sick."] }. If none, return an empty array.`;

  const result = await _callLlmApi(prompt, {
    model: "gpt-3.5-turbo",
    temperature: 0.3,
  });

  if (
    result &&
    Array.isArray(result.fragments) &&
    result.fragments.length > 0
  ) {
    const existingFragments = await getAll(STORES.local_fragments);
    const existingContent = new Set(existingFragments.map((f) => f.content));

    for (const fragmentContent of result.fragments) {
      // 简单去重，避免完全相同的记忆被重复记录
      if (!existingContent.has(fragmentContent)) {
        await put(STORES.local_fragments, {
          content: fragmentContent,
          heat: 100, // 新记忆的初始热度为 100
        });
        console.log(`[LocalMemory] New fragment added: "${fragmentContent}"`);
      }
    }
  }
}

/**
 * 根据对话触发短期总结，生成时间线事件
 * @param {string} userMessage - 用户最新消息
 * @param {string} aiReply - AI 最新回复
 */
async function triggerShortTermSummary(userMessage, aiReply) {
  const prompt = `You are a timeline event recorder for an AI companion, writing from the AI's perspective. Analyze the exchange. Is it a significant event (strong emotions, milestone, plan, major update)?
User: "${userMessage}"
AI: "${aiReply}"
If yes, describe it in one concise sentence.
- Style: First-person, documentary, factual. (e.g., "She was feeling down, so we talked.")
- Constraint: STRICTLY under 25 characters.
- Forbidden Words: "宝宝", "温柔地", "深情地", any AI-like adverbs.
Return JSON: { "shouldRecord": boolean, "eventContent": string }.
Example: { "shouldRecord": true, "eventContent": "她告诉我她升职了。" }`;

  const result = await _callLlmApi(prompt, {
    model: "gpt-4-turbo",
    temperature: 0.1,
    max_tokens: 80,
  });

  if (result && result.shouldRecord && result.eventContent) {
    const today = new Date().toISOString().split("T")[0];
    const allTimelineEvents = await getAll(STORES.local_timeline);

    // 去重检查：避免在短时间内记录内容相似的事件
    const isDuplicate = allTimelineEvents.some(
      (event) => event.content === result.eventContent && event.date === today,
    );

    if (!isDuplicate) {
      await put(STORES.local_timeline, {
        content: result.eventContent,
        date: today,
      });
      console.log(
        `[LocalMemory] New timeline event added: "${result.eventContent}"`,
      );
    }
  }
}

/**
 * 碎片遗忘曲线：衰减所有碎片的热度，并移除冷记忆
 */
async function decayFragments() {
  console.log("[LocalMemory] Running fragment decay process...");
  const allFragments = await getAll(STORES.local_fragments);
  const DECAY_RATE = 5; // 每次衰减 5 点热度
  const COLD_THRESHOLD = 10; // 低于此热度的碎片将被移除

  const updates = allFragments.map((fragment) => {
    const newHeat = fragment.heat - DECAY_RATE;
    if (newHeat < COLD_THRESHOLD) {
      console.log(`[LocalMemory] Cold fragment removed: "${fragment.content}"`);
      return remove(STORES.local_fragments, fragment.id);
    } else {
      // 关键修改：这里使用 put 替代了 update
      // put 函数本身就包含了更新的功能
      return put(STORES.local_fragments, { ...fragment, heat: newHeat });
    }
  });

  await Promise.allSettled(updates);
}

/**
 * 根据高热度碎片更新长期主题弧线
 */
async function updateArcs() {
  console.log("[LocalMemory] Running arc update process...");
  const allFragments = await getAll(STORES.local_fragments);
  const HOT_THRESHOLD = 150; // 热度高于此值的碎片可用于提炼主题
  const hotFragments = allFragments.filter((f) => f.heat > HOT_THRESHOLD);

  if (hotFragments.length < 5) {
    // 需要足够多的高热度碎片
    return console.log(
      "[LocalMemory] Not enough hot fragments to update arcs.",
    );
  }

  const fragmentContents = hotFragments.map((f) => `- ${f.content}`).join("\n");
  const prompt = `You are a narrative synthesizer. Below are high-intensity memory fragments. Identify a single, overarching theme or "narrative arc".
Fragments:
"""
${fragmentContents}
"""
Return JSON with "arcTitle" (short, evocative title) and "arcSummary" (one-sentence summary).
Example: { "arcTitle": "The Job Search Journey", "arcSummary": "We've been exploring her career path and interview preparations." }`;

  const result = await _callLlmApi(prompt, {
    model: "gpt-4-turbo",
    temperature: 0.6,
  });

  if (result && result.arcTitle && result.arcSummary) {
    const existingArcs = await getAll(STORES.local_arcs);
    // 简单相似性检查，防止重复创建主题
    const isSimilar = existingArcs.some(
      (arc) =>
        arc.title.includes(result.arcTitle) ||
        result.arcTitle.includes(arc.title),
    );

    if (!isSimilar) {
      await put(STORES.local_arcs, {
        title: result.arcTitle,
        summary: result.arcSummary,
        fragmentIds: hotFragments.map((f) => f.id), // 关联相关碎片的ID
      });
      console.log(`[LocalMemory] New arc created: "${result.arcTitle}"`);
    }
  }
}

/**
 * 核心入口函数：处理本地记忆的异步管道
 * @param {Array<object>} recentMessages - 最近的消息历史 (例如最近10条)
 * @param {string} userMessage - 用户的最新消息
 * @param {string} aiReply - AI 的最新回复
 * @param {number} totalMessageCount - 当前会话的总消息数
 */
export async function processLocalMemory(
  recentMessages,
  userMessage,
  aiReply,
  totalMessageCount,
) {
  console.log("[LocalMemory] Starting background memory processing...");
  try {
    const conversationContext = recentMessages
      .map((msg) => `${msg.role === "user" ? "User" : "AI"}: ${msg.content}`)
      .join("\n");

    // 将轻量级任务放入一个数组
    const lightTasks = [triggerShortTermSummary(userMessage, aiReply)];

    // 每发送 n 条消息，触发一次碎片提取（比每次都提炼要高效）
    // 你可以调整这个频率，这里设为 3
    if (totalMessageCount % 3 === 0) {
      lightTasks.push(extractFragments(conversationContext));
    }

    // 使用 Promise.allSettled 并发执行轻量任务，即使一个失败也不影响其他
    await Promise.allSettled(lightTasks);

    // 每 20 条消息执行一次重量级维护任务
    if (totalMessageCount > 0 && totalMessageCount % 20 === 0) {
      console.log(
        "[LocalMemory] Triggering periodic heavy tasks (decay & arcs)...",
      );
      // 这两个任务可以串行执行，避免争抢资源
      await decayFragments();
      await updateArcs();
    }

    console.log("[LocalMemory] Background memory processing finished.");
  } catch (error) {
    // 这是一个最终的保险措施，确保此模块的任何未知错误都不会使应用崩溃
    console.error(
      "A critical error occurred in processLocalMemory pipeline:",
      error,
    );
  }
}
