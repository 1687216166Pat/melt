// src/utils/snapshotCache.js
import { storage } from "./storage";

const SNAPSHOT_PREFIX = "melt_snapshot_";

// 缓存角色快照：人设 + 记忆 + 世界书
export async function cacheSnapshot(personaId) {
  try {
    const { api } = await import("./api"); // 避免循环依赖，动态导入

    // 并行拉取三项数据
    const [personaRes, memoriesRes, worldbooksRes] = await Promise.all([
      api(`/api/persona/${personaId}`),
      api(`/api/memories/${personaId}`),
      api("/api/worldbooks"),
    ]);

    const persona = personaRes.ok ? await personaRes.json() : {};
    const memories = memoriesRes.ok ? await memoriesRes.json() : [];
    const worldbooks = worldbooksRes.ok ? await worldbooksRes.json() : [];

    const snapshot = {
      persona: persona.content || persona.note || "",
      personaFull: persona,
      memories: Array.isArray(memories) ? memories : memories.memories || [],
      worldbooks: Array.isArray(worldbooks) ? worldbooks : [],
      updatedAt: Date.now(),
    };

    localStorage.setItem(SNAPSHOT_PREFIX + personaId, JSON.stringify(snapshot));
    console.log("[SnapshotCache] 快照已更新");
    return snapshot;
  } catch (e) {
    console.warn("[SnapshotCache] 更新快照失败", e);
  }
}

// 获取快照
export function getSnapshot(personaId) {
  const raw = localStorage.getItem(SNAPSHOT_PREFIX + personaId);
  return raw ? JSON.parse(raw) : null;
}

// 基于快照构建 system prompt（用于本地 AI 兜底）
export function buildFallbackSystemPrompt(snapshot) {
  const { persona, memories, worldbooks } = snapshot;
  let prompt = `${persona}\n\n`;

  if (worldbooks.length > 0) {
    prompt += `[世界设定]\n`;
    worldbooks.forEach((wb) => {
      prompt += `- ${wb.keys?.join(", ") || wb.name}: ${wb.content}\n`;
    });
    prompt += "\n";
  }

  if (memories.length > 0) {
    prompt += `[近期记忆]\n`;
    memories.slice(-5).forEach((m) => {
      prompt += `${m.role || "记忆"}: ${m.content}\n`;
    });
    prompt += "\n";
  }

  prompt += `[指令] 请基于以上设定与记忆，用角色身份回复用户。`;
  return prompt;
}
