import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "@/utils/api";

export const useChatStore = defineStore("chat", () => {
  const messages = ref([]);

  function addMessage(msg) {
    messages.value.push({
      id: msg.id || Date.now() + Math.random(),
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
    });
  }

  async function loadPersonaMessages(personaId) {
    if (!personaId) return;
    try {
      const res = await api(`/api/messages/${personaId}`);
      const data = await res.json();
      messages.value = [];
      data.forEach((m) => {
        // AI 消息按换行拆分成多个气泡
        if (m.role === "ai") {
          const lines = m.content
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          // 合并过短的行
          const merged = [];
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].length < 4 && i + 1 < lines.length) {
              merged.push(lines[i] + lines[i + 1]);
              i++;
            } else {
              merged.push(lines[i]);
            }
          }
          if (merged.length > 1) {
            merged.forEach((line) => {
              messages.value.push({
                id: m.id + "_" + Math.random(),
                role: m.role,
                content: line,
                timestamp: m.timestamp,
              });
            });
          } else {
            messages.value.push({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
            });
          }
        } else {
          messages.value.push({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          });
        }
      });
    } catch (e) {
      console.error("加载消息失败:", e);
    }
  }

  function clearMessages() {
    messages.value = [];
  }

  return {
    messages,
    addMessage,
    loadPersonaMessages,
    clearMessages,
  };
});
