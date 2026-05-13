// src/composables/useTime.js
import { ref, computed, onMounted, onUnmounted } from "vue";

const currentTime = ref(new Date());
let timer = null;

export function useTime() {
  function startClock() {
    if (timer) return;
    currentTime.value = new Date();
    timer = setInterval(() => {
      currentTime.value = new Date();
    }, 1000);
  }

  function stopClock() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  const hour = computed(() => currentTime.value.getHours());
  const minute = computed(() => currentTime.value.getMinutes());

  const timeStr = computed(() => {
    return `${hour.value.toString().padStart(2, "0")}:${minute.value.toString().padStart(2, "0")}`;
  });

  const dateStr = computed(() => {
    return currentTime.value.toLocaleDateString("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  });

  // 时间段
  const period = computed(() => {
    const h = hour.value;
    if (h >= 5 && h < 9) return "morning";
    if (h >= 9 && h < 12) return "forenoon";
    if (h >= 12 && h < 14) return "noon";
    if (h >= 14 && h < 17) return "afternoon";
    if (h >= 17 && h < 19) return "evening";
    if (h >= 19 && h < 22) return "night";
    return "midnight";
  });

  // 问候语
  const greeting = computed(() => {
    const h = hour.value;
    if (h >= 5 && h < 9) return "早上好";
    if (h >= 9 && h < 12) return "上午好";
    if (h >= 12 && h < 14) return "中午好";
    if (h >= 14 && h < 17) return "下午好";
    if (h >= 17 && h < 19) return "傍晚好";
    if (h >= 19 && h < 22) return "晚上好";
    return "夜深了";
  });

  // 是否是夜间模式
  const isNight = computed(() => {
    const h = hour.value;
    return h >= 20 || h < 6;
  });

  return {
    currentTime,
    hour,
    minute,
    timeStr,
    dateStr,
    period,
    greeting,
    isNight,
    startClock,
    stopClock,
  };
}
