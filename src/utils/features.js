const MODE = import.meta.env.VITE_APP_MODE || "personal";

export const features = {
  // Personal 独有
  betaMode: MODE === "personal", // 飞行模式（beta切换）
  agent: MODE === "personal", // Agent 代码助手

  // Personal + Local 有，Lite 没有
  htmlCard: MODE !== "lite", // HTML 小卡片

  // 后续可继续加
  // someFeature: MODE === 'personal' || MODE === 'local',
};

export const MODE_NAME = MODE;
