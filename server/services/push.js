const webPush = require("web-push");
const { getDB } = require("../db/index");

webPush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:test@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

// 内存缓存
let subscriptions = [];

// 启动时从数据库加载
async function loadSubscriptions() {
  try {
    const db = getDB();
    const { data } = await db
      .from("user_profile")
      .select("value")
      .eq("key", "push_subscriptions")
      .limit(1);
    if (data && data.length > 0) {
      subscriptions = JSON.parse(data[0].value);
    }
  } catch (e) {
    console.error("加载推送订阅失败:", e);
  }
}

// 保存到数据库
async function saveSubscriptions() {
  try {
    const db = getDB();
    const { data: existing } = await db
      .from("user_profile")
      .select("id")
      .eq("key", "push_subscriptions")
      .limit(1);
    if (existing && existing.length > 0) {
      await db
        .from("user_profile")
        .update({
          value: JSON.stringify(subscriptions),
          updated_at: new Date().toISOString(),
        })
        .eq("key", "push_subscriptions");
    } else {
      await db.from("user_profile").insert({
        key: "push_subscriptions",
        value: JSON.stringify(subscriptions),
      });
    }
  } catch (e) {
    console.error("保存推送订阅失败:", e);
  }
}

function addSubscription(sub) {
  const exists = subscriptions.find((s) => s.endpoint === sub.endpoint);
  if (!exists) {
    subscriptions.push(sub);
    saveSubscriptions();
    console.log("[Push] 新订阅已注册, 当前订阅数:", subscriptions.length);
  }
}

function removeSubscription(endpoint) {
  subscriptions = subscriptions.filter((s) => s.endpoint !== endpoint);
  saveSubscriptions();
}

async function pushNotification(title, body, options = {}) {
  if (subscriptions.length === 0) return [];

  const payload = JSON.stringify({
    title,
    body,
    url: options.personaId ? `/chat/${options.personaId}` : "/",
    personaId: options.personaId || "",
    icon: options.icon || "/app-icon.png",
    badge: "/app-icon.png",
    tag: options.personaId || "melt-notification",
    renotify: true,
  });

  const toRemove = [];

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(sub, payload);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          toRemove.push(sub.endpoint);
        }
        console.error("[Push] 推送失败:", err.statusCode || err.message);
      }
    }),
  );

  // 批量清理失效订阅
  if (toRemove.length > 0) {
    subscriptions = subscriptions.filter((s) => !toRemove.includes(s.endpoint));
    await saveSubscriptions();
    console.log(`[Push] 清理了 ${toRemove.length} 个失效订阅`);
  }

  return results;
}

// 延迟加载订阅
setTimeout(loadSubscriptions, 3000);

function clearSubscriptions() {
  subscriptions = [];
}

module.exports = {
  addSubscription,
  removeSubscription,
  pushNotification,
  clearSubscriptions,
};
