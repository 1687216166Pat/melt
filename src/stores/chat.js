// src/stores/chat.js

import { defineStore } from "pinia";
import { ref } from "vue";
import { api, isLocalMode } from "@/utils/api";
import { getCache, setCache } from "@/utils/cache";
// 你的 mediaDb.js 已经被新的版本替换，但这里的导入方式可能需要调整
// 旧: import { mediaDb } from "@/utils/mediaDb";
// 新:
import { put as dbPut, get as dbGet, STORES } from "@/utils/mediaDb";
import { isCloudDown } from "@/utils/api";
import { emergencyMode, isEffectivelyOffline } from "@/utils/emergencyMode";
import { generateEmergencyReply } from "@/utils/localApi";
// === 新增/修改 ===
// 1. 导入我们的本地记忆处理器
import { processLocalMemory } from "@/utils/localMemory";
// === 结束 ===

function parseSpecialContent(content) {
  if (!content) return {};
  if (content.startsWith("[转账:") || content.startsWith("[转账: ")) {
    const match = content.match(/\[转账[: ]+¥?([\d.]+)\]/);
    if (match)
      return { type: "transfer", amount: parseFloat(match[1]), note: "" };
  }
  if (content.startsWith("[礼物:") || content.startsWith("[礼物: ")) {
    const match = content.match(/\[礼物[: ]+(.+?)\]/);
    if (match)
      return {
        type: "gift",
        giftName: match[1],
        giftContent: "",
        giftMessage: "",
      };
  }
  if (content.startsWith("[位置") || content.startsWith("[位置:")) {
    const match = content.match(/\[位置[: ]*(.+?)\]/);
    return { type: "location", locationName: match ? match[1] : "位置" };
  }
  if (content.startsWith("[表情包:") || content.startsWith("[表情包: ")) {
    const match = content.match(/\[表情包[: ]+(.+?)\]/);
    if (match) return { type: "emoji", emojiName: match[1] };
  }
  return {};
}

function parseFromMeta(msgType, msgMeta) {
  if (!msgType || msgType === "text") return {};
  let meta = {};
  try {
    meta = msgMeta
      ? typeof msgMeta === "string"
        ? JSON.parse(msgMeta)
        : msgMeta
      : {};
  } catch {}
  if (msgType === "gift") {
    return {
      type: "gift",
      giftName: meta.name || meta.giftName || "礼物",
      giftContent: meta.content || meta.giftContent || "",
      giftMessage: meta.message || meta.giftMessage || "",
    };
  }
  if (msgType === "transfer") {
    return {
      type: "transfer",
      amount: meta.amount || 0,
      note: meta.note || "",
    };
  }
  if (msgType === "location") {
    return {
      type: "location",
      locationName: meta.name || meta.locationName || "位置",
      lat: meta.lat || null,
      lng: meta.lng || null,
    };
  }
  if (msgType === "emoji") {
    return {
      type: "emoji",
      emojiUrl: meta.url || "",
      emojiName: meta.name || "",
    };
  }
  if (msgType === "food") {
    return {
      type: "food",
      deliveryContent: meta.content || "",
      deliveryAddress: meta.address || "",
      deliveryNote: meta.note || "",
      deliveryExpectedAt: meta.expectedAt || null,
    };
  }
  if (msgType === "express") {
    return {
      type: "express",
      deliveryContent: meta.content || "",
      deliveryNote: meta.note || "",
      deliveryExpectedAt: meta.expectedAt || null,
    };
  }
  return {};
}

export const useChatStore = defineStore("chat", () => {
  const messages = ref([]);
  const allMessages = ref([]);
  const hasMore = ref(false);
  const pageSize = 10;
  let currentLoadedPersona = null;
  let isLoading = false;

  // === 新增/修改 ===
  // 2. 新增一个 state 来追踪消息总数
  const totalMessageCount = ref(0);
  // === 结束 ===

  async function addMessage(msg) {
    const messageId =
      msg.id || `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newMsg = {
      id: messageId,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
    };

    if (msg.images && msg.images.length > 0) {
      newMsg.type = "images";
      newMsg.images = msg.images;
      // === 新增/修改 ===
      // 3. 使用新的 mediaDb API
      await dbPut(STORES.message_images, {
        id: String(messageId),
        images: msg.images,
      }).catch((e) => console.error("Save image failed", e));
      // === 结束 ===
    } else if (msg.type === "images" || msg.content?.includes("[图片]")) {
      newMsg.type = "images";
      // === 新增/修改 ===
      // 4. 使用新的 mediaDb API
      const cachedData = await dbGet(
        STORES.message_images,
        String(messageId),
      ).catch(() => null);
      if (cachedData && cachedData.images) newMsg.images = cachedData.images;
      // === 结束 ===
    }

    const fields = [
      "type",
      "giftName",
      "giftContent",
      "giftMessage",
      "amount",
      "note",
      "locationName",
      "lat",
      "lng",
      "emojiUrl",
      "emojiName",
      "cardHtml",
      "deliveryContent",
      "deliveryAddress",
      "deliveryNote",
      "deliveryExpectedAt",
      "quoteContent",
      "quoteRole",
      "source",
    ];
    fields.forEach((f) => {
      if (msg[f] !== undefined) newMsg[f] = msg[f];
    });

    const recent = messages.value.slice(-5);
    const isDuplicate = recent.some(
      (m) =>
        m.role === newMsg.role &&
        m.content === newMsg.content &&
        Math.abs(new Date(m.timestamp) - new Date(newMsg.timestamp)) < 2000,
    );
    if (isDuplicate) {
      console.log("[Chat] 拦截重复消息:", newMsg.content.slice(0, 30));
      return;
    }

    messages.value.push(newMsg);
    allMessages.value.push(newMsg);

    // === 新增/修改 ===
    // 5. 如果是用户消息，增加计数器
    if (msg.role === "user") {
      totalMessageCount.value++;
    }
    // === 结束 ===
  }

  // === 新增/修改 ===
  // 6. 新增一个 action，专门用于触发记忆处理
  function triggerMemoryProcessing(userMessage, aiReply) {
    // 获取最近的对话上下文，例如最近15条，提供更丰富的上下文
    const recentMessages = allMessages.value.slice(-15);

    setTimeout(() => {
      processLocalMemory(
        recentMessages,
        userMessage.content,
        aiReply.content,
        totalMessageCount.value,
      ).catch((error) => {
        console.error("Error during background memory processing:", error);
      });
    }, 0); // 放入宏任务队列，不阻塞UI
  }
  // === 结束 ===

  async function loadPersonaMessages(personaId) {
    if (!personaId) return;
    if (isLoading) return;
    isLoading = true;

    if (allMessages.value.length > 0 && currentLoadedPersona === personaId) {
      // ... (省略未修改的代码)
      isLoading = false;
      return;
    }

    try {
      let data = [];
      if (isLocalMode) {
        const { storage } = await import("@/utils/storage");
        data = storage.getMessages(personaId) || [];
      } else {
        const res = await api(`/api/messages/${personaId}`);
        data = await res.json();
      }
      messages.value = [];
      allMessages.value = [];

      for (const m of data) {
        // ... (省略未修改的循环内部逻辑)
        if (m.role === "ai") {
          const bubbles = m.content
            .split("|||")
            .map((s) => s.replace(/\n/g, " ").trim())
            .filter(Boolean);
          if (bubbles.length > 0) {
            for (let partIdx = 0; partIdx < bubbles.length; partIdx++) {
              const line = bubbles[partIdx];
              const special =
                partIdx === 0
                  ? m.msg_type && m.msg_type !== "text"
                    ? parseFromMeta(m.msg_type, m.msg_meta)
                    : parseSpecialContent(line)
                  : {};
              await addMessage({
                id: partIdx === 0 ? m.id : `${m.id}_${partIdx}`,
                role: m.role,
                content: line,
                timestamp: m.timestamp,
                ...special,
              });
            }
          } else {
            const special =
              m.msg_type && m.msg_type !== "text"
                ? parseFromMeta(m.msg_type, m.msg_meta)
                : {};
            await addMessage({
              id: m.id,
              role: m.role,
              content: m.content.replace(/\|\|\|/g, "").replace(/\n/g, " "),
              timestamp: m.timestamp,
              ...special,
            });
          }
        } else {
          const special =
            m.msg_type && m.msg_type !== "text"
              ? parseFromMeta(m.msg_type, m.msg_meta)
              : parseSpecialContent(m.content);
          await addMessage({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            ...special,
          });
        }
      }

      currentLoadedPersona = personaId;

      // === 新增/修改 ===
      // 7. 在加载完历史消息后，初始化消息总数
      totalMessageCount.value = allMessages.value.filter(
        (m) => m.role === "user",
      ).length;
      console.log(
        `[ChatStore] Initialized message count: ${totalMessageCount.value}`,
      );
      // === 结束 ===

      if (allMessages.value.length > pageSize) {
        messages.value = allMessages.value.slice(-pageSize);
        hasMore.value = true;
      } else {
        messages.value = allMessages.value;
        hasMore.value = false;
      }
    } catch (e) {
      console.error("加载消息失败:", e);
    }
    isLoading = false;
  }

  function loadMore() {
    // ... (未修改)
    if (!hasMore.value) return;
    const currentCount = messages.value.length;
    const totalCount = allMessages.value.length;
    const startIdx = Math.max(0, totalCount - currentCount - pageSize);
    const endIdx = totalCount - currentCount;
    const older = allMessages.value.slice(startIdx, endIdx);
    messages.value = [...older, ...messages.value];
    hasMore.value = startIdx > 0;
  }

  function clearMessages() {
    // ... (未修改)
    messages.value = [];
    allMessages.value = [];
    hasMore.value = false;
    currentLoadedPersona = null;
    isLoading = false;
    // === 新增/修改 ===
    // 8. 清空消息时，也重置计数器
    totalMessageCount.value = 0;
    // === 结束 ===
  }

  async function sendUserMessage(personaId, userContent) {
    // ... (未修改)
    await addMessage({ role: "user", content: userContent });
    if (emergencyMode.value) {
      const history = allMessages.value.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await generateEmergencyReply(
        personaId,
        userContent,
        history,
      );
      await addMessage({
        role: "ai",
        content: reply,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      const res = await api(`/api/messages/${personaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userContent }),
      });
      if (!res.ok) throw new Error("Send failed");
      const data = await res.json();
      if (data.reply) {
        await addMessage({
          role: "ai",
          content: data.reply,
          timestamp: new Date().toISOString(),
        });
      }
      import("@/utils/snapshotCache").then((m) => m.cacheSnapshot(personaId));
    } catch (e) {
      if (isEffectivelyOffline()) {
        console.log("[Chat] 消息已加入待发送队列");
      } else {
      }
    }
  }

  return {
    messages,
    allMessages,
    hasMore,
    addMessage,
    loadPersonaMessages,
    loadMore,
    clearMessages,
    sendUserMessage,
    // === 新增/修改 ===
    // 9. 导出新 state 和 action
    totalMessageCount,
    triggerMemoryProcessing,
    // === 结束 ===
  };
});
