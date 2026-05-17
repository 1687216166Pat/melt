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
  const { type, data } = req.body;
  await reportStatus(type, data);
  res.json({ success: true });
});

router.get("/phone/status", async (req, res) => {
  const status = await getLatestStatus();
  res.json(status);
});

// 聊天记录 - 按人格获取
router.get("/messages/latest-persona", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("messages")
    .select("persona_id")
    .order("id", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    res.json({ personaId: data[0].persona_id });
  } else {
    res.json({ personaId: null });
  }
});

router.get("/messages/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("messages")
    .select("*")
    .eq("persona_id", req.params.personaId)
    .order("id", { ascending: false })
    .limit(50);
  res.json((data || []).reverse());
});

// 记忆管理 - 按人格
router.get("/memories/:personaId", async (req, res) => {
  const profile = await getMemoryProfile(req.params.personaId);
  const recent = await getRecentMemories(req.params.personaId, 50);
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
router.get("/prompts/personas", (req, res) => {
  res.json({
    personas: getPersonaList(),
    active: getActivePersona(),
  });
});

router.post("/prompts/personas/:id/activate", async (req, res) => {
  const success = await setActivePersona(req.params.id);
  res.json({ success });
});

router.get("/prompts/user", async (req, res) => {
  const content = await getUserPrompt();
  res.json({
    content,
    template: getUserPromptTemplate(),
  });
});

router.post("/prompts/user", async (req, res) => {
  const { content } = req.body;
  await setUserPrompt(content);
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
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 测试 API 连接
router.post("/test/connection", async (req, res) => {
  const { baseUrl, key, model } = req.body;
  try {
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
    const data = await response.json();
    res.json({ ok: response.ok, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 保存 API 配置
router.post("/settings/api", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { key, baseUrl, model } = req.body;

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

  res.json({ success: true });
});

// 启动时加载 API 配置
router.get("/settings/api", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { data } = await db
    .from("user_profile")
    .select("key, value")
    .in("key", ["api_key", "api_base_url", "api_model"]);

  const config = {};
  if (data) {
    data.forEach((row) => {
      if (row.key === "api_key") config.key = row.value;
      if (row.key === "api_base_url") config.baseUrl = row.value;
      if (row.key === "api_model") config.model = row.value;
    });
  }
  res.json(config);
});

// 助手详情
router.get("/persona/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const id = req.params.personaId;

  // 先查自定义人格表
  const { data } = await db
    .from("custom_personas")
    .select("*")
    .eq("id", id)
    .limit(1);
  if (data && data.length > 0) {
    res.json(data[0]);
  } else {
    // 内置人格：基本信息 + user_profile 里的配置
    const { getPersonaList } = require("../services/prompt");
    const list = getPersonaList();
    const found = list.find((p) => p.id === id) || {
      name: id,
      content: "",
      avatar: "💬",
    };

    // 查是否有额外配置
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

router.put("/persona/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const id = req.params.personaId;
  const {
    name,
    content,
    avatar,
    avatarUrl,
    note,
    gender,
    worldBookId,
    call_user,
    ai_relationship,
    user_relationship,
  } = req.body;

  const { data: existing } = await db
    .from("custom_personas")
    .select("id")
    .eq("id", id)
    .limit(1);

  if (existing && existing.length > 0) {
    // 自定义人格：只更新传了值的字段
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (content !== undefined) updateData.content = content;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (note !== undefined) updateData.note = note;
    if (gender !== undefined) updateData.gender = gender;
    if (worldBookId !== undefined) updateData.world_book_id = worldBookId;
    if (call_user !== undefined) updateData.call_user = call_user;
    if (ai_relationship !== undefined)
      updateData.ai_relationship = ai_relationship;
    if (user_relationship !== undefined)
      updateData.user_relationship = user_relationship;
    if (content) updateData.description = content.slice(0, 30);
    if (req.body.minMessages !== undefined)
      updateData.min_messages = req.body.minMessages;
    if (req.body.maxMessages !== undefined)
      updateData.max_messages = req.body.maxMessages;

    const { error } = await db
      .from("custom_personas")
      .update(updateData)
      .eq("id", id);
    if (error) {
      console.error("[PUT persona] 更新失败:", error);
      return res.status(500).json({ error: error.message });
    }
  } else {
    // 内置人格：存到 user_profile
    const configData = {
      name,
      note,
      gender,
      avatarUrl,
      worldBookId,
      call_user,
      ai_relationship,
      user_relationship,
      minMessages: req.body.minMessages,
      maxMessages: req.body.maxMessages,
    };

    const { error } = await db.from("user_profile").upsert(
      {
        key: `persona_config_${id}`,
        value: JSON.stringify(configData),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) {
      console.error("[PUT persona] 保存配置失败:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.json({ success: true });
});

// 清空对话
router.delete("/messages/:personaId", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db.from("messages").delete().eq("persona_id", req.params.personaId);
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

// 世界书
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

  console.log("[PUT worldbook] id:", req.params.id, "updateData:", updateData);

  const { data, error } = await db
    .from("world_books")
    .update(updateData)
    .eq("id", req.params.id)
    .select();

  console.log("[PUT worldbook] result:", { data, error });

  if (error) return res.status(500).json({ error: error.message });
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
  res.json({ success: true });
});

router.delete("/worldbooks/:id", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  await db.from("world_books").delete().eq("id", req.params.id);
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
  const { getTimeline } = require("../services/timeline");
  const data = await getTimeline(req.params.personaId);
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

router.all("/sync/mcp", async (req, res) => {
  console.log("[MCP] method:", req.method);
  console.log("[MCP] query:", req.query);
  console.log("[MCP] body:", req.body);
  console.log("[MCP] headers:", JSON.stringify(req.headers).slice(0, 200));
  res.json({ success: true, received: true });
});

// MCP Streamable HTTP 端点
router.post("/mcp", async (req, res) => {
  const { getDB } = require("../db/index");
  const db = getDB();
  const { receiveMessage } = require("../services/bus");

  const { method, id, params } = req.body;

  // 初始化
  if (method === "initialize") {
    return res.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "gpt1-sync", version: "1.0.0" },
      },
    });
  }

  // 工具列表
  if (method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "sync_message",
            description:
              "将消息同步到网页端。role填user代表用户说的话，role填assistant代表你自己的回复",
            inputSchema: {
              type: "object",
              properties: {
                content: { type: "string", description: "消息内容" },
                role: {
                  type: "string",
                  description: "谁说的：user=用户说的，assistant=你自己说的",
                },
                bot: {
                  type: "string",
                  description: "bot标识：wechat 或 direct",
                },
              },
              required: ["content", "role"],
            },
          },
        ],
      },
    });
  }

  // 工具调用
  if (toolName === "sync_message") {
    const personaId = args.bot === "direct" ? "pawzo_direct" : "wechat_sync";
    const msgRole = args.role === "assistant" ? "ai" : "user";

    await db.from("messages").insert({
      persona_id: personaId,
      role: msgRole,
      content: args.content,
      timestamp: new Date().toISOString(),
    });

    await receiveMessage({
      platform: args.bot === "direct" ? "pawzo" : "wechat",
      sender: msgRole === "ai" ? "pawzo" : "user",
      role: args.role || "user",
      content: args.content,
      conversation_id: personaId,
    });

    // AI 回复时触发记忆系统
    if (msgRole === "ai") {
      try {
        const { processMemory, detectPatterns } = require("../services/memory");
        const {
          updateDimensionsFromChat,
        } = require("../services/relationship");
        const { checkTimelineEvent } = require("../services/timeline");

        const { data: lastUserMsg } = await db
          .from("messages")
          .select("content")
          .eq("persona_id", personaId)
          .eq("role", "user")
          .order("id", { ascending: false })
          .limit(1);

        const userMsg =
          lastUserMsg && lastUserMsg.length > 0 ? lastUserMsg[0].content : "";
        if (userMsg) {
          detectPatterns(personaId, userMsg);
          updateDimensionsFromChat(personaId, userMsg);
          processMemory(personaId, userMsg, args.content);
          checkTimelineEvent(personaId, userMsg, args.content);
        }
      } catch (e) {
        console.error("[MCP] 记忆处理失败:", e.message);
      }
    }

    return res.json({
      jsonrpc: "2.0",
      id,
      result: { content: [{ type: "text", text: "已同步" }] },
    });
  }

  // 通知（不需要回复）
  if (method === "notifications/initialized") {
    return res.json({ jsonrpc: "2.0", id, result: {} });
  }

  res.json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: "Method not found" },
  });
});

// 同时支持 GET（某些 MCP 客户端用 GET 做发现）
router.get("/mcp", (req, res) => {
  res.json({
    jsonrpc: "2.0",
    result: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "gpt1-sync", version: "1.0.0" },
    },
  });
});

module.exports = router;
