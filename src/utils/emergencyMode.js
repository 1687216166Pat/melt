// src/utils/emergencyMode.js
import { ref } from 'vue';

// 手动离线模式开关（维护页一级开关）
export const manualOffline = ref(false);

// 应急模式开关（二级开关：立即用本地 AI 回复）
export const emergencyMode = ref(false);

// 当前是否应该使用离线/应急逻辑（结合自动检测和手动开关）
export function isEffectivelyOffline() {
  const { isCloudDown } = require('./api'); // 运行时引用，避免循环
  return manualOffline.value || isCloudDown.value;
}

// 手动离线模式下，同时关闭应急模式
export function setManualOffline(val) {
  manualOffline.value = val;
  if (!val) {
    // 关闭手动离线时也关闭应急，恢复正常
    emergencyMode.value = false;
  }
}