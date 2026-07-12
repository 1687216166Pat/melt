import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "@/utils/api";
import { getCache, setCache } from "@/utils/cache";

// 解析消息内容里的特殊类型

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

  function addMessage(msg) {
    console.log(
      "[Store] addMessage called:",
      msg.role,
      msg.content?.slice(0, 20),
    );
    const newMsg = {
      id:
        msg.id ||
        `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
    };

    // 保留特殊消息字段
    if (msg.type) newMsg.type = msg.type;
    if (msg.giftName !== undefined) newMsg.giftName = msg.giftName;
    if (msg.giftContent !== undefined) newMsg.giftContent = msg.giftContent;
    if (msg.giftMessage !== undefined) newMsg.giftMessage = msg.giftMessage;
    if (msg.amount !== undefined) newMsg.amount = msg.amount;
    if (msg.note !== undefined) newMsg.note = msg.note;
    if (msg.locationName !== undefined) newMsg.locationName = msg.locationName;
    if (msg.lat !== undefined) newMsg.lat = msg.lat;
    if (msg.lng !== undefined) newMsg.lng = msg.lng;
    if (msg.emojiUrl !== undefined) newMsg.emojiUrl = msg.emojiUrl;
    if (msg.emojiName !== undefined) newMsg.emojiName = msg.emojiName;
    if (msg.images !== undefined) newMsg.images = msg.images;
    if (msg.cardHtml !== undefined) newMsg.cardHtml = msg.cardHtml;
    if (msg.deliveryContent !== undefined)
      newMsg.deliveryContent = msg.deliveryContent;
    if (msg.deliveryAddress !== undefined)
      newMsg.deliveryAddress = msg.deliveryAddress;
    if (msg.deliveryNote !== undefined) newMsg.deliveryNote = msg.deliveryNote;
    if (msg.deliveryExpectedAt !== undefined)
      newMsg.deliveryExpectedAt = msg.deliveryExpectedAt;

    // 去重：检查最近 5 条，防止同样内容在短时间内重复添加
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

    // 同一个 persona 本次 session 已加载过，走缓存
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
      const res = await api(`/api/messages/${personaId}`);
      const data = await res.json();

      const processed = [];

      data.forEach((m) => {
        if (m.role === "ai") {
          const bubbles = m.content
            .split("|||")
            .map((s) => s.replace(/\n/g, " ").trim())
            .filter(Boolean);

          if (bubbles.length > 0) {
            bubbles.forEach((line, partIdx) => {
              const special =
                partIdx === 0
                  ? m.msg_type && m.msg_type !== "text"
                    ? parseFromMeta(m.msg_type, m.msg_meta)
                    : parseSpecialContent(line)
                  : {};
              processed.push({
                id: `${m.id}_${partIdx}`,
                role: m.role,
                content: line,
                timestamp: m.timestamp,
                ...special,
              });
            });
          } else {
            const special =
              m.msg_type && m.msg_type !== "text"
                ? parseFromMeta(m.msg_type, m.msg_meta)
                : {};
            processed.push({
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
          processed.push({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            ...special,
          });
        }
      });

      currentLoadedPersona = personaId;
      allMessages.value = processed;

      if (processed.length > pageSize) {
        messages.value = processed.slice(-pageSize);
        hasMore.value = true;
      } else {
        messages.value = processed;
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
