import { defineStore } from "pinia";
import { ref } from "vue";
import { api, isLocalMode } from "@/utils/api";
import { getCache, setCache } from "@/utils/cache";
import { mediaDb } from "@/utils/mediaDb"; // 统一使用 mediaDb

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

  // 关键修改 1：改为 async 函数，处理图片持久化
  async function addMessage(msg) {
    console.log(
      "[Store] addMessage called:",
      msg.role,
      msg.content?.slice(0, 20),
    );
    const messageId = msg.id || `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    const newMsg = {
      id: messageId,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
    };

    // --- 媒体持久化逻辑 ---
    if (msg.images && msg.images.length > 0) {
        newMsg.type = 'images';
        newMsg.images = msg.images;
        // 如果是发送图片，将其保存到本地 IndexedDB
        await mediaDb.save(messageId, msg.images).catch(e => console.error('Save image failed', e));
    } else if (msg.type === 'images' || msg.content?.includes('[图片]')) {
        newMsg.type = 'images';
        // 如果是从后端拉取的消息，尝试从本地库恢复图片显示
        const cachedImages = await mediaDb.get(String(messageId)).catch(() => null);
        if (cachedImages) newMsg.images = cachedImages;
    }

    // 复制其他字段
    const fields = ['type','giftName','giftContent','giftMessage','amount','note','locationName','lat','lng','emojiUrl','emojiName','cardHtml','deliveryContent','deliveryAddress','deliveryNote','deliveryExpectedAt','quoteContent','quoteRole'];
    fields.forEach(f => { if(msg[f] !== undefined) newMsg[f] = msg[f]; });

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
  }

  async function loadPersonaMessages(personaId) {
    if (!personaId) return;
    if (isLoading) {
      console.log("[Chat] loadPersonaMessages 正在加载中，跳过重复调用");
      return;
    }
    isLoading = true;

    if (allMessages.value.length > 0 && currentLoadedPersona === personaId) {
      if (allMessages.value.length > pageSize) {
        messages.value = allMessages.value.slice(-pageSize);
        hasMore.value = true;
      } else {
        messages.value = allMessages.value;
        hasMore.value = false;
      }
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

      // 关键修改 2：使用 for...of 替代 forEach，配合 await addMessage
      for (const m of data) {
        if (m.role === "ai") {
          const bubbles = m.content
            .split("|||")
            .map((s) => s.replace(/\n/g, " ").trim())
            .filter(Boolean);

          if (bubbles.length > 0) {
            for (let partIdx = 0; partIdx < bubbles.length; partIdx++) {
              const line = bubbles[partIdx];
              const special = partIdx === 0
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
            const special = m.msg_type && m.msg_type !== "text" ? parseFromMeta(m.msg_type, m.msg_meta) : {};
            await addMessage({
              id: m.id,
              role: m.role,
              content: m.content.replace(/\|\|\|/g, "").replace(/\n/g, " "),
              timestamp: m.timestamp,
              ...special,
            });
          }
        } else {
          const special = m.msg_type && m.msg_type !== "text" ? parseFromMeta(m.msg_type, m.msg_meta) : parseSpecialContent(m.content);
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
    messages.value = [];
    allMessages.value = [];
    hasMore.value = false;
    currentLoadedPersona = null;
    isLoading = false;
  }

  return {
    messages,
    allMessages,
    hasMore,
    addMessage,
    loadPersonaMessages,
    loadMore,
    clearMessages,
  };
});
