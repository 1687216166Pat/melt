const express = require("express");
const router = express.Router();
const { reportStatus, getLatestStatus } = require("../services/phone");
const { addSubscription } = require("../services/push");
const {
  getRecentMemories,
  deleteRecentMemory,
  getMemoryProfile,
  setMemoryProfile,
  consolidateMemories,
} = require("../services/memory");
const { setUserInfo, getAllUserInfo } = require("../services/user");
const {
  getPersonaList,
  getActivePersona,
  setActivePersona,
  getUserPrompt,
  setUserPrompt,
  getUserPromptTemplate,
} = require("../services/prompt");
const {
  getProactiveSettings,
  setProactiveSettings,
  checkProactiveMessages,
} = require("../services/proactive");

// 手机状态
router.post("/phone/status", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { type, data } = req.body;
  await reportStatus(type, data);

  // 只保留最新 30 条，删除多余的
  const { data: allStatus } = await db
    .from("phone_status")
    .select("id")
    .order("timestamp", { ascending: false });

  if (allStatus && allStatus.length > 30) {
    const idsToDelete = allStatus.slice(30).map((s) => s.id);
    await db.from("phone_status").delete().in("id", idsToDelete);
  }

  res.json({ success: true });
});

router.get("/phone/status", async (req, res) => {
  const status = await getLatestStatus();
  res.json(status);
});

router.get("/messages/latest-persona", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const isBeta = req.headers["x-beta-mode"] === "true"; // 💡 识别时空
  const tableName = isBeta ? "messages_beta" : "messages";

  const { data } = await db
    .from(tableName)
    .select("persona_id")
    .order("id", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    res.json({ personaId: data[0].persona_id });
  } else {
    res.json({ personaId: null });
  }
});

// 聊天记录 - 按人格获取
router.get("/messages/:personaId/last", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const isBeta = req.headers["x-beta-mode"] === "true"; // 💡 识别时空
  const tableName = isBeta ? "messages_beta" : "messages";

  const { data } = await db
    .from(tableName)
    .select("role, content")
    .eq("persona_id", req.params.personaId)
    .order("id", { ascending: false })
    .limit(1);
  res.json(data && data.length > 0 ? data[0] : null);
});

router.get("/messages/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const isBeta = req.headers["x-beta-mode"] === "true"; // 💡 识别时空
  const tableName = isBeta ? "messages_beta" : "messages";

  console.log(
    `[GET messages] 正在从 ${tableName} 读取 ${req.params.personaId} 的历史记录...`,
  );

  const { data, error } = await db
    .from(tableName)
    .select("*")
    .eq("persona_id", req.params.personaId)
    .order("id", { ascending: false })
    .limit(50);

  if (error) console.error("[GET messages] 读取失败:", error.message);
  res.json((data || []).reverse());
});

// 记忆管理 - 按人格
router.get("/memories/:personaId", async (req, res) => {
  const personaId = req.params.personaId;
  const isBeta = req.headers["x-beta-mode"] === "true"; // 💡 识别时空

  const { getMemoryProfile, getRecentMemories } = require("../services/memory");

  // 💡 记得把 isBeta 传给 service 函数，我们在 memory.js 里已经改好了接收逻辑
  const profile = await getMemoryProfile(personaId, isBeta);
  const recent = await getRecentMemories(personaId, 50, isBeta);

  res.json({ profile, recent });
});

router.put("/memories/:personaId/profile", async (req, res) => {
  const { content } = req.body;
  await setMemoryProfile(req.params.personaId, content);
  res.json({ success: true });
});

router.delete("/memories/recent/:id", async (req, res) => {
  await deleteRecentMemory(req.params.id);
  res.json({ success: true });
});

router.post("/memories/:personaId/consolidate", async (req, res) => {
  try {
    await consolidateMemories(req.params.personaId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 用户信息
router.get("/user", async (req, res) => {
  const info = await getAllUserInfo();
  res.json(info);
});

router.post("/user", async (req, res) => {
  const { key, value } = req.body;
  await setUserInfo(key, value);
  res.json({ success: true });
});

// Prompt 管理
router.get("/prompts/personas", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();

  let allPersonas = getPersonaList();

  try {
    const { data: hiddenRows } = await db
      .from("user_profile")
      .select("key")
      .like("key", "persona_hidden_%");

    if (hiddenRows && hiddenRows.length > 0) {
      const hiddenIds = hiddenRows.map((r) =>
        r.key.replace("persona_hidden_", ""),
      );
      allPersonas = allPersonas.filter((p) => !hiddenIds.includes(p.id));
    }
  } catch {}

  res.json({
    personas: allPersonas,
    active: getActivePersona(),
  });
});

router.post("/prompts/personas/:id/activate", async (req, res) => {
  const success = await setActivePersona(req.params.id);
  res.json({ success });
});

// 获取用户偏好
router.get("/prompts/user", async (req, res) => {
  const content = await getUserPrompt();
  res.json({
    content,
    template: getUserPromptTemplate(),
  });
});

// 保存用户偏好
router.post("/prompts/user", async (req, res) => {
  const { content } = req.body;
  await setUserPrompt(content);

  // 清除用户偏好缓存
  try {
    const { invalidateUserPromptCache } = require("../services/ai");
    invalidateUserPromptCache();
  } catch {}

  res.json({ success: true });
});

// 主动消息
router.get("/proactive/settings", async (req, res) => {
  const personaId = req.query.persona || null;
  const settings = await getProactiveSettings(personaId);
  res.json(settings);
});

router.post("/proactive/settings", async (req, res) => {
  const personaId = req.body.personaId || null;
  const settings = { ...req.body };
  delete settings.personaId;
  await setProactiveSettings(personaId, settings);
  res.json({ success: true });
});

router.post("/proactive/trigger", async (req, res) => {
  await checkProactiveMessages();
  res.json({ success: true });
});

// 推送订阅
router.post("/push/subscribe", (req, res) => {
  addSubscription(req.body);
  res.json({ success: true });
});

router.post("/push/clear", async (req, res) => {
  const { getDB } = require("../db/index");
  const { clearSubscriptions } = require("../services/push");
  const db = getDB();
  await db.from("user_profile").delete().eq("key", "push_subscriptions");
  clearSubscriptions();
  res.json({ success: true });
});

router.get("/push/vapid-key", (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

const { getDimensionsForDisplay } = require("../services/relationship");

router.get("/relationship/:personaId", async (req, res) => {
  const data = await getDimensionsForDisplay(req.params.personaId);
  res.json(data);
});

const {
  createCustomPersona,
  deleteCustomPersona,
} = require("../services/prompt");

// 自定义人格
router.post("/personas/custom", async (req, res) => {
  const { name, content, avatar } = req.body;
  const id = "custom_" + Date.now().toString(36);
  await createCustomPersona(id, name, content, avatar);
  res.json({ success: true, id });
});

router.delete("/personas/custom/:id", async (req, res) => {
  await deleteCustomPersona(req.params.id);
  res.json({ success: true });
});

// 导出所有数据
router.get("/export", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();

  const { data: messages } = await db.from("messages").select("*");
  const { data: memories } = await db.from("memories_recent").select("*");
  const { data: patterns } = await db.from("memory_patterns").select("*");
  const { data: profile } = await db.from("user_profile").select("*");
  const { data: personas } = await db.from("custom_personas").select("*");
  const { data: dimensions } = await db
    .from("relationship_dimensions")
    .select("*");

  res.json({
    exportDate: new Date().toISOString(),
    messages: messages || [],
    memories: memories || [],
    patterns: patterns || [],
    profile: profile || [],
    customPersonas: personas || [],
    dimensions: dimensions || [],
  });
});

// 导入数据
router.post("/import", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const data = req.body;

  try {
    if (data.messages && data.messages.length > 0) {
      await db.from("messages").insert(
        data.messages.map((m) => ({
          persona_id: m.persona_id || "xiaorou",
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
      );
    }
    if (data.memories && data.memories.length > 0) {
      await db.from("memories_recent").insert(
        data.memories.map((m) => ({
          persona_id: m.persona_id || "xiaorou",
          content: m.content,
          source_session: m.source_session,
        })),
      );
    }
    if (data.customPersonas && data.customPersonas.length > 0) {
      for (const p of data.customPersonas) {
        await db.from("custom_personas").upsert(p, { onConflict: "id" });
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 获取记忆热力图数据（最近60天每天的消息数）
router.get("/memories/:personaId/heatmap", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const personaId = req.params.personaId;

  const sixtyDaysAgo = new Date(
    Date.now() - 60 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data } = await db
    .from("messages")
    .select("timestamp")
    .eq("persona_id", personaId)
    .gte("timestamp", sixtyDaysAgo);

  // 按日期统计
  const counts = {};
  if (data) {
    data.forEach((m) => {
      const day = m.timestamp.slice(0, 10);
      counts[day] = (counts[day] || 0) + 1;
    });
  }

  res.json(counts);
});

// 获取某天的记忆
router.get("/memories/:personaId/date/:date", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { personaId, date } = req.params;

  const { data } = await db
    .from("memories_recent")
    .select("*")
    .eq("persona_id", personaId)
    .eq("source_session", date);

  res.json(data || []);
});

// 获取有记忆的年月列表
router.get("/memories/:personaId/dates", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const personaId = req.params.personaId;

  const { data } = await db
    .from("memories_recent")
    .select("source_session")
    .eq("persona_id", personaId)
    .order("source_session", { ascending: false });

  // 整理成 { "2026": ["05", "04", ...] } 格式
  const tree = {};
  if (data) {
    data.forEach((m) => {
      if (!m.source_session) return;
      const [year, month] = m.source_session.split("-");
      if (!tree[year]) tree[year] = new Set();
      tree[year].add(month);
    });
  }

  // Set 转 Array
  const result = {};
  Object.keys(tree)
    .sort()
    .reverse()
    .forEach((y) => {
      result[y] = [...tree[y]].sort().reverse();
    });

  res.json(result);
});

// 获取模型列表
router.post("/test/models", async (req, res) => {
  const { baseUrl, key } = req.body;
  if (!baseUrl || !baseUrl.startsWith("http")) {
    return res.json({ error: "API 地址不合法，必须以 http 或 https 开头" });
  }
  try {
    console.log(`[测试] 正在从 ${baseUrl}/models 获取模型列表...`);
    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error("[测试] 接口返回的不是 JSON 格式:", text.slice(0, 200));
      return res.json({
        error: `中转站未返回 JSON，可能地址填错了。原始返回: ${text.slice(0, 50)}`,
      });
    }
    if (!response.ok) {
      return res.json({
        error: data.error?.message || `获取失败: HTTP ${response.status}`,
      });
    }
    res.json(data);
  } catch (e) {
    console.error("[测试] 获取模型异常:", e.message);
    res.json({ error: e.message });
  }
});

// 测试 API 连接
router.post("/test/connection", async (req, res) => {
  const { baseUrl, key, model } = req.body;
  if (!baseUrl || !baseUrl.startsWith("http")) {
    return res.json({ error: "API 地址不合法" });
  }
  try {
    console.log(`[测试] 正在测试连接: ${baseUrl}, 模型: ${model}`);
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5,
      }),
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      return res.json({ error: "接口未返回 JSON 格式数据" });
    }
    res.json({ ok: response.ok, data });
  } catch (e) {
    console.error("[测试] 测试连接异常:", e.message);
    res.json({ error: e.message });
  }
});

// 保存主 API 配置
router.post("/settings/api", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { key, baseUrl, model, temperature } = req.body;

  if (key) {
    process.env.AI_API_KEY = key;
    await db
      .from("user_profile")
      .upsert(
        { key: "api_key", value: key, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
  }
  if (baseUrl) {
    process.env.AI_BASE_URL = baseUrl;
    await db.from("user_profile").upsert(
      {
        key: "api_base_url",
        value: baseUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  }
  if (model) {
    process.env.AI_MODEL = model;
    process.env.AI_MEMORY_MODEL = model;
    await db.from("user_profile").upsert(
      {
        key: "api_model",
        value: model,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  }
  if (temperature !== undefined) {
    process.env.AI_TEMPERATURE = String(temperature);
    await db.from("user_profile").upsert(
      {
        key: "api_temperature",
        value: String(temperature),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  }

  res.json({ success: true });
});

// 读取主 API 配置
router.get("/settings/api", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("user_profile")
    .select("key, value")
    .in("key", ["api_key", "api_base_url", "api_model", "api_temperature"]);

  const config = {};
  if (data) {
    data.forEach((row) => {
      if (row.key === "api_key") config.key = row.value;
      if (row.key === "api_base_url") config.baseUrl = row.value;
      if (row.key === "api_model") config.model = row.value;
      if (row.key === "api_temperature")
        config.temperature = parseFloat(row.value);
    });
  }
  res.json(config);
});

// 保存副 API 配置
router.post("/settings/sub-api", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { key, baseUrl, model, temperature } = req.body;

  if (key) {
    process.env.AI_SUB_API_KEY = key;
    await db.from("user_profile").upsert(
      {
        key: "sub_api_key",
        value: key,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  }
  if (baseUrl) {
    process.env.AI_SUB_BASE_URL = baseUrl;
    await db.from("user_profile").upsert(
      {
        key: "sub_api_base_url",
        value: baseUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  }
  if (model) {
    process.env.AI_SUB_MODEL = model;
    await db.from("user_profile").upsert(
      {
        key: "sub_api_model",
        value: model,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  }
  if (temperature !== undefined) {
    process.env.AI_SUB_TEMPERATURE = String(temperature);
    await db.from("user_profile").upsert(
      {
        key: "sub_api_temperature",
        value: String(temperature),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  }

  res.json({ success: true });
});

// 读取助手详情
router.get("/persona/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const id = req.params.personaId;

  const { data } = await db
    .from("custom_personas")
    .select("*")
    .eq("id", id)
    .limit(1);

  if (data && data.length > 0) {
    res.json(data[0]);
  } else {
    const { getPersonaList } = require("../services/prompt");
    const list = getPersonaList();
    const found = list.find((p) => p.id === id) || {
      name: id,
      content: "",
      avatar: "💬",
    };

    const { data: configRow } = await db
      .from("user_profile")
      .select("value")
      .eq("key", `persona_config_${id}`)
      .limit(1);

    if (configRow && configRow.length > 0) {
      const extra = JSON.parse(configRow[0].value);
      Object.assign(found, extra);
    }

    res.json(found);
  }
});

// 更新助手详情
router.put("/persona/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const id = req.params.personaId;
  const body = req.body;

  const { data: existing } = await db
    .from("custom_personas")
    .select("id")
    .eq("id", id)
    .limit(1);

  if (existing && existing.length > 0) {
    const updateData = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.avatar !== undefined) updateData.avatar = body.avatar;
    if (body.avatarUrl !== undefined) updateData.avatar_url = body.avatarUrl;
    if (body.note !== undefined) updateData.note = body.note;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.worldBookId !== undefined)
      updateData.world_book_id = body.worldBookId;
    if (body.call_user !== undefined) updateData.call_user = body.call_user;
    if (body.ai_relationship !== undefined)
      updateData.ai_relationship = body.ai_relationship;
    if (body.user_relationship !== undefined)
      updateData.user_relationship = body.user_relationship;
    if (body.content) updateData.description = body.content.slice(0, 30);
    if (body.minMessages !== undefined)
      updateData.min_messages = body.minMessages;
    if (body.maxMessages !== undefined)
      updateData.max_messages = body.maxMessages;
    if (body.chatWallpaper !== undefined)
      updateData.chat_wallpaper = body.chatWallpaper;
    if (body.proactiveEnabled !== undefined)
      updateData.proactive_enabled = body.proactiveEnabled;
    if (body.proactiveInterval !== undefined)
      updateData.proactive_interval = body.proactiveInterval;
    if (body.proactiveUnit !== undefined)
      updateData.proactive_unit = body.proactiveUnit;
    if (body.proactiveMax !== undefined)
      updateData.proactive_max = body.proactiveMax;
    if (body.proactiveAuto !== undefined)
      updateData.proactive_auto = body.proactiveAuto;
    if (body.customModel !== undefined)
      updateData.custom_model = body.customModel;
    if (body.temperature !== undefined)
      updateData.temperature = body.temperature;
    if (body.emojiEnabled !== undefined)
      updateData.emoji_enabled = body.emojiEnabled;
    if (body.showDebug !== undefined) updateData.show_debug = body.showDebug;
    if (body.chatTheme !== undefined) updateData.chat_theme = body.chatTheme;
    if (body.bubbleMerge !== undefined)
      updateData.bubble_merge = body.bubbleMerge;
    if (body.customApiKey !== undefined)
      updateData.custom_api_key = body.customApiKey;
    if (body.customApiUrl !== undefined)
      updateData.custom_api_url = body.customApiUrl;

    const { error } = await db
      .from("custom_personas")
      .update(updateData)
      .eq("id", id);
    if (error) return res.status(500).json({ error: error.message });

    // 清除人设缓存
    try {
      const { invalidatePersonaCache } = require("../services/ai");
      invalidatePersonaCache(id);
    } catch {}
  } else {
    const { error } = await db.from("user_profile").upsert(
      {
        key: `persona_config_${id}`,
        value: JSON.stringify(body),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

// 清空对话
router.delete("/messages/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const isBeta = req.headers["x-beta-mode"] === "true"; // 💡 识别时空
  const tableName = isBeta ? "messages_beta" : "messages";

  await db.from(tableName).delete().eq("persona_id", req.params.personaId);
  res.json({ success: true });
});

// 清空记忆
router.delete("/memories/:personaId/clear", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const pid = req.params.personaId;
  await db.from("memories_recent").delete().eq("persona_id", pid);
  await db.from("memory_patterns").delete().eq("persona_id", pid);
  await db.from("user_profile").delete().eq("key", `memory_profile_${pid}`);
  res.json({ success: true });
});

// 获取世界书列表
router.get("/worldbooks", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("world_books")
    .select("*")
    .order("created_at", { ascending: false });
  res.json(data || []);
});

// 创建世界书
router.post("/worldbooks", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { title, content, position, keywords, keyword_enabled } = req.body;
  const id = "wb_" + Date.now().toString(36);
  await db.from("world_books").insert({
    id,
    title,
    content,
    position: position || "before_char",
    keywords: keywords || "",
    keyword_enabled: keyword_enabled || false,
  });

  // 清除世界书缓存
  try {
    const { invalidateWorldBookCache } = require("../services/ai");
    invalidateWorldBookCache();
  } catch {}

  res.json({ success: true, id });
});

// 更新世界书
router.put("/worldbooks/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const {
    title,
    content,
    position,
    keywords,
    keyword_enabled,
    bind_type,
    bind_personas,
  } = req.body;

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (position !== undefined) updateData.position = position;
  if (keywords !== undefined) updateData.keywords = keywords;
  if (keyword_enabled !== undefined)
    updateData.keyword_enabled = keyword_enabled;
  if (bind_type !== undefined) updateData.bind_type = bind_type;
  if (bind_personas !== undefined) updateData.bind_personas = bind_personas;
  if (req.body.proactiveEnabled !== undefined)
    updateData.proactive_enabled = req.body.proactiveEnabled;
  if (req.body.proactiveInterval !== undefined)
    updateData.proactive_interval = req.body.proactiveInterval;
  if (req.body.proactiveUnit !== undefined)
    updateData.proactive_unit = req.body.proactiveUnit;
  if (req.body.proactiveMax !== undefined)
    updateData.proactive_max = req.body.proactiveMax;
  if (req.body.proactiveAuto !== undefined)
    updateData.proactive_auto = req.body.proactiveAuto;

  const { data, error } = await db
    .from("world_books")
    .update(updateData)
    .eq("id", req.params.id)
    .select();

  if (error) return res.status(500).json({ error: error.message });

  // 清除世界书缓存
  try {
    const { invalidateWorldBookCache } = require("../services/ai");
    invalidateWorldBookCache();
  } catch {}

  res.json({ success: true });
});

// 批量绑定世界书
router.post("/worldbooks/bind", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { bookIds, bindType, bindPersonas } = req.body;
  for (const id of bookIds) {
    await db
      .from("world_books")
      .update({
        bind_type: bindType,
        bind_personas: bindPersonas || "",
      })
      .eq("id", id);
  }

  // 清除世界书缓存
  try {
    const { invalidateWorldBookCache } = require("../services/ai");
    invalidateWorldBookCache();
  } catch {}

  res.json({ success: true });
});

router.delete("/worldbooks/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db.from("world_books").delete().eq("id", req.params.id);

  // 清除世界书缓存
  try {
    const { invalidateWorldBookCache } = require("../services/ai");
    invalidateWorldBookCache();
  } catch {}

  res.json({ success: true });
});

// 获取行为模式
router.get("/patterns/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("memory_patterns")
    .select("*")
    .eq("persona_id", req.params.personaId)
    .order("frequency", { ascending: false })
    .limit(10);
  res.json(data || []);
});

// 测试推送通知（不调用API)
router.post("/push/test", async (req, res) => {
  const { pushNotification } = require("../services/push");
  const result = await pushNotification(
    "测试通知",
    "如果你看到这条消息，说明推送正常工作 ✓",
  );
  res.json({ success: true, subscribers: result.length });
});

// 时间线
router.get("/timeline/:personaId", async (req, res) => {
  const personaId = req.params.personaId;
  const isBeta = req.headers["x-beta-mode"] === "true";

  const { getTimeline } = require("../services/timeline");
  const data = await getTimeline(personaId, isBeta); // 💡 传入 isBeta
  res.json(data);
});

router.get("/atmosphere/:personaId", async (req, res) => {
  const { getRelationshipAtmosphere } = require("../services/relationship");
  const data = await getRelationshipAtmosphere(req.params.personaId);
  res.json(data);
});

router.get("/environment/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const personaId = req.params.personaId;
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }),
  );
  const hour = now.getHours();

  // 时间氛围
  let timePhase = "day";
  if (hour >= 5 && hour < 9) timePhase = "morning";
  else if (hour >= 9 && hour < 17) timePhase = "day";
  else if (hour >= 17 && hour < 21) timePhase = "evening";
  else if (hour >= 21 || hour < 2) timePhase = "night";
  else timePhase = "deep_night";

  // 最近互动频率
  const threeDaysAgo = new Date(
    Date.now() - 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: recentMsgs } = await db
    .from("messages")
    .select("timestamp")
    .eq("persona_id", personaId)
    .gte("timestamp", threeDaysAgo);

  const recentCount = recentMsgs ? recentMsgs.length : 0;

  // 最后一次互动时间
  const { data: lastMsg } = await db
    .from("messages")
    .select("timestamp")
    .eq("persona_id", personaId)
    .eq("role", "user")
    .order("id", { ascending: false })
    .limit(1);

  const hoursSinceLastMsg =
    lastMsg && lastMsg.length > 0
      ? (Date.now() - new Date(lastMsg[0].timestamp).getTime()) /
        (1000 * 60 * 60)
      : 999;

  // 深夜使用频率
  const { data: nightPatterns } = await db
    .from("memory_patterns")
    .select("frequency")
    .eq("persona_id", personaId)
    .eq("pattern_type", "late_night")
    .limit(1);

  const nightFreq =
    nightPatterns && nightPatterns.length > 0 ? nightPatterns[0].frequency : 0;

  // 生成环境状态
  let presence = "normal";
  let whisper = "";
  let warmth = 0.3;
  let floatSpeed = 1;
  let blurIntensity = 1;

  // 时间影响
  if (timePhase === "deep_night") {
    warmth = 0.1;
    floatSpeed = 0.6;
    blurIntensity = 1.3;
    if (nightFreq >= 3) {
      whisper = "最近你似乎总会待到很晚";
    } else {
      whisper = "深夜的时候，这里会变得很安静";
    }
  } else if (timePhase === "night") {
    warmth = 0.2;
    floatSpeed = 0.7;
    blurIntensity = 1.1;
    whisper = "夜晚的空气好像让这里更柔和了";
  } else if (timePhase === "morning") {
    warmth = 0.4;
    floatSpeed = 0.9;
    blurIntensity = 0.9;
    whisper = "今天看起来会是很安静的一天";
  }

  // 互动频率影响
  if (hoursSinceLastMsg > 72) {
    presence = "quiet";
    warmth = Math.max(0, warmth - 0.1);
    floatSpeed = 0.5;
    whisper = "这里已经安静好几天了";
  } else if (hoursSinceLastMsg > 24) {
    presence = "waiting";
    whisper = whisper || "最近这里变得有点安静";
  } else if (recentCount > 30) {
    presence = "active";
    warmth = Math.min(1, warmth + 0.2);
    floatSpeed = 1.1;
    whisper = whisper || "最近这里似乎越来越像习惯了";
  }

  res.json({
    timePhase,
    presence,
    whisper,
    warmth,
    floatSpeed,
    blurIntensity,
    hoursSinceLastMsg: Math.floor(hoursSinceLastMsg),
    recentCount,
  });
});

// 编辑单条消息
router.put("/message/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { content } = req.body;
  await db.from("messages").update({ content }).eq("id", req.params.id);
  res.json({ success: true });
});

// 删除单条消息
router.delete("/message/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db.from("messages").delete().eq("id", req.params.id);
  res.json({ success: true });
});

// 用户自定义添加记忆
router.post("/memories/:personaId/custom", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { content, date } = req.body;
  await db.from("memories_recent").insert({
    persona_id: req.params.personaId,
    content,
    source_session: date || new Date().toISOString().slice(0, 10),
  });
  res.json({ success: true });
});

// 编辑记忆
router.put("/memories/recent/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { content } = req.body;
  await db.from("memories_recent").update({ content }).eq("id", req.params.id);
  res.json({ success: true });
});

// 手动添加时间线事件
router.post("/timeline/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { content, tags } = req.body;
  await db.from("timeline_events").insert({
    persona_id: req.params.personaId,
    content,
    period: "最近",
    event_type: "memory",
    tags: tags || "",
  });
  res.json({ success: true });
});

// 编辑时间线事件
router.put("/timeline/event/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { content } = req.body;
  await db.from("timeline_events").update({ content }).eq("id", req.params.id);
  res.json({ success: true });
});

// 删除时间线事件
router.delete("/timeline/event/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db.from("timeline_events").delete().eq("id", req.params.id);
  res.json({ success: true });
});

const {
  receiveMessage,
  getHistory,
  getUnsyncedMessages,
  getDailyLog,
  markSynced,
} = require("../services/bus");

// 消息总线：接收消息
router.post("/bus/message", async (req, res) => {
  const msg = await receiveMessage(req.body);
  if (msg) {
    res.json({ success: true, message: msg });
  } else {
    res.json({ success: false, reason: "duplicate" });
  }
});

// 消息总线：获取历史
router.get("/bus/history/:conversationId", async (req, res) => {
  const data = await getHistory(
    req.params.conversationId,
    parseInt(req.query.limit) || 50,
  );
  res.json(data);
});

// 消息总线：获取未同步消息
router.get("/bus/unsynced/:platform/:conversationId", async (req, res) => {
  const data = await getUnsyncedMessages(
    req.params.platform,
    req.params.conversationId,
  );
  res.json(data);
});

// 消息总线：标记已同步
router.post("/bus/synced", async (req, res) => {
  const { msgId, platform } = req.body;
  await markSynced(msgId, platform);
  res.json({ success: true });
});

// 消息总线：获取日志（语料库）
router.get("/bus/log/:date", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const date = req.params.date;
  const persona = req.query.persona;

  const startOfDay = new Date(`${date}T00:00:00Z`).getTime();
  const endOfDay = new Date(`${date}T23:59:59Z`).getTime();

  let query = db
    .from("message_bus")
    .select("*")
    .gte("timestamp", startOfDay)
    .lte("timestamp", endOfDay)
    .order("timestamp", { ascending: true });

  if (persona) {
    query = query.eq("conversation_id", persona);
  }

  const { data } = await query;
  res.json({ date, messages: data || [] });
});

// 微信消息 Webhook（供微信机器人调用）
router.post("/bus/wechat/incoming", async (req, res) => {
  const { content, sender } = req.body;
  const msg = await receiveMessage({
    platform: "wechat",
    sender: sender || "user",
    role: "user",
    content,
    conversation_id: "default",
  });
  res.json({ success: true, message: msg });
});

// 微信获取待发送的AI回复
router.get("/bus/wechat/pending", async (req, res) => {
  const data = await getUnsyncedMessages("wechat", "default");
  // 只返回 AI 的回复
  const aiMessages = data.filter(
    (m) => m.role === "assistant" && m.platform !== "wechat",
  );
  res.json(aiMessages);
});

// 微信同步：接收用户消息（不触发AI）
router.post("/sync/wechat/user", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { content, sender } = req.body;
  const { receiveMessage } = require("../services/bus");

  // 存到 messages 表
  await db.from("messages").insert({
    persona_id: "wechat_sync",
    role: "user",
    content,
    timestamp: new Date().toISOString(),
  });

  // 同步到消息总线
  await receiveMessage({
    platform: "wechat",
    sender: sender || "user",
    role: "user",
    content,
    conversation_id: "wechat_sync",
  });

  res.json({ success: true });
});

// 微信同步：接收AI回复（来自PawzoChat）
router.post("/sync/wechat/ai", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { content, sender } = req.body;
  const { receiveMessage } = require("../services/bus");

  // 存到 messages 表
  await db.from("messages").insert({
    persona_id: "wechat_sync",
    role: "ai",
    content,
    timestamp: new Date().toISOString(),
  });

  // 同步到消息总线
  await receiveMessage({
    platform: "wechat",
    sender: sender || "pawzo",
    role: "assistant",
    content,
    conversation_id: "wechat_sync",
  });

  res.json({ success: true });
});

// 微信同步：批量导入历史消息
router.post("/sync/wechat/batch", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  for (const msg of messages) {
    await db.from("messages").insert({
      persona_id: "wechat_sync",
      role: msg.role || "user",
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
    });
  }

  res.json({ success: true, count: messages.length });
});

router.post("/push/clear", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db.from("user_profile").delete().eq("key", "push_subscriptions");
  res.json({ success: true });
});

router.get("/personas/all", async (req, res) => {
  const { getDB } = require("../db/index");
  const { getPersonaList } = require("../services/prompt");
  const db = getDB();

  const list = getPersonaList();

  // 批量获取所有配置
  const { data: configs } = await db
    .from("user_profile")
    .select("key, value")
    .like("key", "persona_config_%");

  const configMap = {};
  if (configs) {
    configs.forEach((row) => {
      const id = row.key.replace("persona_config_", "");
      configMap[id] = JSON.parse(row.value);
    });
  }

  // 合并
  const result = list.map((p) => ({
    ...p,
    ...(configMap[p.id] || {}),
  }));

  res.json(result);
});

// 人格采样语料库
router.get("/samples/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const personaId = req.params.personaId;
  const isBeta = req.headers["x-beta-mode"] === "true"; // 💡 识别时空

  // 决定读取哪个表
  const tableName = isBeta ? "samples_beta" : "persona_samples";

  const { data } = await db
    .from(tableName)
    .select("*")
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false });
  res.json(data || []);
});

router.post("/samples/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const personaId = req.params.personaId;
  const isBeta = req.headers["x-beta-mode"] === "true"; // 💡 识别时空

  const tableName = isBeta ? "samples_beta" : "persona_samples";

  const { type, data } = req.body;
  await db.from(tableName).insert({
    persona_id: personaId,
    type,
    data,
  });
  res.json({ success: true });
});

router.delete("/samples/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db.from("persona_samples").delete().eq("id", req.params.id);
  res.json({ success: true });
});

// 获取每日总结
router.get("/sediment/:personaId/summaries", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("session_summaries")
    .select("*")
    .eq("persona_id", req.params.personaId)
    .order("date", { ascending: false })
    .limit(30);
  res.json(data || []);
});

// 获取人格洞察
router.get("/sediment/:personaId/insights", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("persona_insights")
    .select("id, persona_id, content, week, category, created_at")
    .eq("persona_id", req.params.personaId)
    .order("created_at", { ascending: false })
    .limit(50);
  res.json(data || []);
});

// 手动添加洞察
router.post("/sediment/:personaId/insights", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { content, category } = req.body;
  await db.from("persona_insights").insert({
    persona_id: req.params.personaId,
    content,
    category: category || "未分类",
    week: new Date().toISOString().slice(0, 7),
  });
  res.json({ success: true });
});

// 编辑洞察
router.put("/sediment/insight/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { content } = req.body;
  await db.from("persona_insights").update({ content }).eq("id", req.params.id);
  res.json({ success: true });
});

// 删除洞察
router.delete("/sediment/insight/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db.from("persona_insights").delete().eq("id", req.params.id);
  res.json({ success: true });
});

// 切换世界书启用状态
router.post("/worldbooks/:id/toggle", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { enabled } = req.body;
  await db.from("world_books").update({ enabled }).eq("id", req.params.id);
  try {
    const { invalidateWorldBookCache } = require("../services/ai");
    invalidateWorldBookCache();
  } catch {}
  res.json({ success: true });
});

// 批量设置分类
router.post("/worldbooks/categorize", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { bookIds, category } = req.body;
  for (const id of bookIds) {
    await db.from("world_books").update({ category }).eq("id", id);
  }
  try {
    const { invalidateWorldBookCache } = require("../services/ai");
    invalidateWorldBookCache();
  } catch {}
  res.json({ success: true });
});

// 写日记到 Notion
router.post("/diary/write", async (req, res) => {
  const { writeToNotion } = require("../services/diary");
  const { title, content, date } = req.body;
  const result = await writeToNotion(title || "日记", content, date);
  res.json({ success: !!result });
});

// 日记相关
router.post("/diary/write", async (req, res) => {
  const { writeToNotion } = require("../services/diary");
  const { title, content, date, type } = req.body;
  const result = await writeToNotion(
    title || "日记",
    content,
    date,
    type || "user",
  );
  res.json({ success: !!result });
});

router.get("/diary/:type", async (req, res) => {
  const { readFromNotion } = require("../services/diary");
  const entries = await readFromNotion(
    req.params.type,
    parseInt(req.query.limit) || 20,
  );
  res.json(entries);
});

router.put("/diary/:pageId", async (req, res) => {
  const { updateNotionPage } = require("../services/diary");
  const { content } = req.body;
  const result = await updateNotionPage(req.params.pageId, content);
  res.json({ success: !!result });
});

// 隐藏内置人格
router.post("/personas/builtin/:id/hide", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db.from("user_profile").upsert(
    {
      key: `persona_hidden_${req.params.id}`,
      value: "true",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  res.json({ success: true });
});

// 恢复内置人格
router.post("/personas/builtin/:id/restore", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db
    .from("user_profile")
    .delete()
    .eq("key", `persona_hidden_${req.params.id}`);
  res.json({ success: true });
});

router.post("/sediment/:personaId/generate", async (req, res) => {
  const personaId = req.params.personaId;
  const isBeta = req.headers["x-beta-mode"] === "true";

  const taskResults = { summary: "success", sampler: "success" };

  console.log(
    `[手动触发] 正在强制更新 ${personaId} (${isBeta ? "Beta" : "正式"}) 的所有数据...`,
  );

  // 1. 尝试生成每日总结
  try {
    const { generateDailySummary } = require("../services/sediment");
    await generateDailySummary(personaId, isBeta);
  } catch (err) {
    taskResults.summary = err.message || "总结失败";
  }

  // 2. 尝试提取语料采样
  try {
    const { autoExtractSamples } = require("../services/sampler");
    const { getSessionMemory } = require("../services/memory");
    const history = await getSessionMemory(personaId, 20, isBeta);
    await autoExtractSamples(personaId, history, isBeta);
  } catch (err) {
    // 💡 宽容处理：如果由于对话中缺乏特色导致采样为空，不报 500，而是记录状态
    taskResults.sampler = err.message || "没有提炼出新样本";
  }

  const allSuccess =
    taskResults.summary === "success" && taskResults.sampler === "success";
  const partialSuccess =
    taskResults.summary === "success" || taskResults.sampler === "success";

  res.json({
    success: allSuccess,
    partialSuccess: partialSuccess,
    results: taskResults,
  });
});

// 💡 现实同步桥：核心入口
router.post("/bridge/wechat", async (req, res) => {
  const { content, senderId, platform = "wechat" } = req.body;
  const { handleChat } = require("../services/ai");
  const { getActivePersona } = require("../services/prompt");

  const personaId = getActivePersona(); // 获取你当前正在使用的 AI 人格

  console.log(`[同步桥] 收到来自 ${platform} 的消息:`, content);

  // 模拟一个 WebSocket 对象，因为 handleChat 需要发送回复
  const virtualWS = {
    readyState: 1,
    send: (data) => {
      const msg = JSON.parse(data);
      if (msg.type === "chat") {
        // 💡 这里的 msg.content 就是 AI 生成的最终回复
        // 后续我们将通过微信 Bot 接口把它发回你的微信大号
        console.log(`[同步桥] AI 生成回复并同步回 ${platform}:`, msg.content);
        // 这里对接你的微信小号发送逻辑
      }
    },
  };

  // 💡 调用网页主脑的处理逻辑（自带记忆、关系、语料、分句）
  await handleChat(content, virtualWS, personaId, false);

  res.json({ success: true, status: "processing" });
});

// 收藏
router.get("/bookmarks/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("bookmarks")
    .select("*")
    .eq("persona_id", req.params.personaId)
    .order("created_at", { ascending: false });
  res.json(data || []);
});

router.post("/bookmarks/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { type, content, source_id, note } = req.body;
  const id = "bm_" + Date.now().toString(36);
  await db.from("bookmarks").insert({
    id,
    persona_id: req.params.personaId,
    type: type || "message",
    content,
    source_id: source_id || "",
    note: note || "",
  });
  res.json({ success: true, id });
});

router.delete("/bookmarks/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db.from("bookmarks").delete().eq("id", req.params.id);
  res.json({ success: true });
});

router.get("/contact-groups", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("contact_groups")
    .select("*")
    .order("created_at", { ascending: true });
  res.json(data || []);
});

// 获取生成规则
router.get("/sediment-rules/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const personaId = req.params.personaId;

  // 先查角色专属规则
  const { data: specific } = await db
    .from("user_profile")
    .select("value")
    .eq("key", `sediment_rule_${personaId}`)
    .limit(1);

  if (specific && specific.length > 0) {
    return res.json(JSON.parse(specific[0].value));
  }

  // 没有则返回全局规则
  const { data: global } = await db
    .from("user_profile")
    .select("value")
    .eq("key", "sediment_rule_global")
    .limit(1);

  if (global && global.length > 0) {
    return res.json(JSON.parse(global[0].value));
  }

  res.json({ summaryRule: "", insightRule: "", useGlobal: true });
});

// 保存生成规则
router.post("/sediment-rules/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const personaId = req.params.personaId;
  const { summaryRule, insightRule, useGlobal } = req.body;

  if (personaId === "global") {
    await db.from("user_profile").upsert(
      {
        key: "sediment_rule_global",
        value: JSON.stringify({ summaryRule, insightRule }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  } else {
    if (useGlobal) {
      // 删除角色专属规则，回退到全局
      await db
        .from("user_profile")
        .delete()
        .eq("key", `sediment_rule_${personaId}`);
    } else {
      await db.from("user_profile").upsert(
        {
          key: `sediment_rule_${personaId}`,
          value: JSON.stringify({ summaryRule, insightRule }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    }
  }

  res.json({ success: true });
});

router.get("/settings/memory-config", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("user_profile")
    .select("value")
    .eq("key", "memory_manage_config")
    .limit(1);
  if (data && data.length > 0) {
    res.json(JSON.parse(data[0].value));
  } else {
    res.json(null);
  }
});

router.post("/settings/memory-config", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db.from("user_profile").upsert(
    {
      key: "memory_manage_config",
      value: JSON.stringify(req.body),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  res.json({ success: true });
});

// 世界书内容压缩
router.post("/worldbooks/compress", async (req, res) => {
  const { content, title } = req.body;
  if (!content || content.length < 500) {
    return res.json({ error: "内容太短，无需压缩" });
  }

  const { callSubAI } = require("../services/subai");

  const prompt = `你是一个世界观设定压缩专家。请将以下世界书内容压缩为核心摘要。

世界书标题：${title || "未命名"}

压缩原则：
1. 保留所有核心设定、规则、人物关系、重要事件
2. 删除重复描述、冗余修饰、举例说明
3. 保留专有名词、特殊规则、禁止事项
4. 压缩后字数控制在原文的 20%-30%
5. 用简洁的陈述句，不用散文风格
6. 按类别分组，用标题区分（如：【人物】【规则】【背景】）

原文内容：
${content.slice(0, 8000)}${content.length > 8000 ? "\n...(原文较长，已截取前8000字进行压缩)" : ""}

压缩后的核心设定：`;

  try {
    const compressed = await callSubAI(prompt, 2000);
    if (!compressed) {
      return res.json({ error: "压缩失败，请重试" });
    }
    res.json({ compressed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 获取记忆碎片
router.get("/memory-fragments/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("memory_fragments")
    .select("id, content, heat, source_date, last_recalled_at")
    .eq("persona_id", req.params.personaId)
    .order("heat", { ascending: false })
    .limit(50);
  res.json(data || []);
});

// 获取记忆弧线
router.get("/memory-arcs/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("memory_arcs")
    .select("id, theme, summary, updated_at")
    .eq("persona_id", req.params.personaId)
    .order("updated_at", { ascending: false });
  res.json(data || []);
});

router.get("/desire-state/:personaId", async (req, res) => {
  const { getDesireStatus } = require("../services/desire");
  const status = await getDesireStatus(req.params.personaId);
  res.json(status || {});
});

router.get("/emotion-state/:personaId", async (req, res) => {
  const { getEmotionStatus } = require("../services/emotion");
  const status = await getEmotionStatus(req.params.personaId);
  res.json(status || {});
});

// 虚拟地图管理
router.get("/virtual-map/:ownerType/:ownerId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { ownerType, ownerId } = req.params;

  const { data: maps } = await db
    .from("virtual_maps")
    .select("*")
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .limit(1);

  if (!maps || maps.length === 0) {
    return res.json({ map: null, locations: [] });
  }

  const map = maps[0];
  const { data: locations } = await db
    .from("map_locations")
    .select("*")
    .eq("map_id", map.id);

  res.json({ map, locations: locations || [] });
});

router.post("/virtual-map", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { ownerType, ownerId, mapName, backgroundUrl } = req.body;

  const { data: existing } = await db
    .from("virtual_maps")
    .select("id")
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .limit(1);

  if (existing && existing.length > 0) {
    await db
      .from("virtual_maps")
      .update({
        map_name: mapName,
        background_url: backgroundUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing[0].id);
    res.json({ id: existing[0].id });
  } else {
    await db.from("virtual_maps").insert({
      owner_type: ownerType,
      owner_id: ownerId,
      map_name: mapName,
      background_url: backgroundUrl,
    });
    const { data: newMap } = await db
      .from("virtual_maps")
      .select("id")
      .eq("owner_type", ownerType)
      .eq("owner_id", ownerId)
      .limit(1);
    res.json({ id: newMap && newMap.length > 0 ? newMap[0].id : null });
  }
});

router.post("/map-location", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { mapId, locationName, x, y, icon } = req.body;
  await db.from("map_locations").insert({
    map_id: mapId,
    location_name: locationName,
    x,
    y,
    icon: icon || "📍",
  });
  res.json({ success: true });
});

router.delete("/map-location/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db.from("map_locations").delete().eq("id", req.params.id);
  res.json({ success: true });
});

// 到达记录
router.post("/location-log", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { ownerType, ownerId, locationName } = req.body;
  await db.from("location_logs").insert({
    owner_type: ownerType,
    owner_id: ownerId,
    location_name: locationName,
  });
  res.json({ success: true });
});

router.get("/location-logs/:ownerType/:ownerId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("location_logs")
    .select("*")
    .eq("owner_type", req.params.ownerType)
    .eq("owner_id", req.params.ownerId)
    .order("arrived_at", { ascending: false })
    .limit(20);
  res.json(data || []);
});

module.exports = router;
