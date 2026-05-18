import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "@/utils/api";

function smartSplit(content) {
  // 按空行（连续两个换行）分气泡，单个换行视为同一句话
  const bubbles = content
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\n/g, "").trim())
    .filter(Boolean);
  if (bubbles.length > 1) return bubbles;
  // 如果没有空行，就把所有换行去掉当一个气泡
  return [content.replace(/\n/g, "").trim()];
}

export const useChatStore = defineStore("chat", () => {
  const messages = ref([]);
  const allMessages = ref([]);
  const hasMore = ref(false);
  const pageSize = 10;

  function addMessage(msg) {
    const newMsg = {
      id: msg.id || Date.now() + Math.random(),
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
    };
    messages.value.push(newMsg);
    allMessages.value.push(newMsg);
  }

  async function loadPersonaMessages(personaId) {
    if (!personaId) return;
    try {
      const res = await api(`/api/messages/${personaId}`);
      const data = await res.json();

      const processed = [];
      data.forEach((m) => {
        if (m.role === "ai") {
          const parts = smartSplit(m.content);
          parts.forEach((line) => {
            processed.push({
              id: m.id + "_" + Math.random(),
              role: m.role,
              content: line,
              timestamp: m.timestamp,
            });
          });
        } else {
          processed.push({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          });
        }
      });

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
  }

  return {
    messages,
    hasMore,
    addMessage,
    loadPersonaMessages,
    loadMore,
    clearMessages,
  };
});
