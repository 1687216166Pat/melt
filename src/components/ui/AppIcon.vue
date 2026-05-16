<template>
  <div class="app-icon-wrapper" :style="{ background: gradient }">
    <div class="icon-mist"></div>
    <svg viewBox="0 0 40 40" fill="none" class="icon-svg">
      <!-- AI聊天：月亮 + 气泡 -->
      <template v-if="icon === 'chat'">
        <path d="M26 9a4.5 4.5 0 0 1-3.5 4.4A4.5 4.5 0 0 0 26 9z" stroke="rgba(80,60,75,0.55)" stroke-width="0.7"
          fill="none" />
        <rect x="10" y="16" width="16" height="11" rx="5.5" stroke="rgba(80,60,75,0.65)" stroke-width="0.8" />
        <path d="M15 27 L13.5 30.5 L17 27" stroke="rgba(80,60,75,0.6)" stroke-width="0.7" stroke-linecap="round"
          stroke-linejoin="round" />
        <circle cx="15" cy="21.5" r="0.8" fill="rgba(80,60,75,0.5)" />
        <circle cx="18" cy="21.5" r="0.8" fill="rgba(80,60,75,0.4)" />
        <circle cx="21" cy="21.5" r="0.8" fill="rgba(80,60,75,0.3)" />
      </template>

      <!-- 关于他：档案 + 人物 -->
      <template v-else-if="icon === 'heart'">
        <rect x="11" y="8" width="14" height="22" rx="2.5" stroke="rgba(80,60,75,0.6)" stroke-width="0.8" />
        <path d="M11 8h1.5a0.5 0.5 0 0 1 0.5 0.5v21a0.5 0.5 0 0 1-0.5 0.5H11" stroke="rgba(80,60,75,0.35)"
          stroke-width="0.5" />
        <circle cx="18" cy="17" r="2.8" stroke="rgba(80,60,75,0.55)" stroke-width="0.7" />
        <path d="M14.5 26a3.5 3.5 0 0 1 7 0" stroke="rgba(80,60,75,0.45)" stroke-width="0.7" stroke-linecap="round" />
      </template>

      <!-- 记忆库：碎片 + 轨迹 -->
      <template v-else-if="icon === 'brain'">
        <path d="M9 28 Q18 10 31 14" stroke="rgba(80,60,75,0.25)" stroke-width="0.5" fill="none"
          stroke-linecap="round" />
        <rect x="11" y="13" width="7" height="5" rx="1.5" stroke="rgba(80,60,75,0.6)" stroke-width="0.7"
          transform="rotate(-3, 14, 15)" />
        <rect x="20" y="17" width="7" height="5" rx="1.5" stroke="rgba(80,60,75,0.5)" stroke-width="0.7"
          transform="rotate(2, 23, 19)" />
        <rect x="14" y="24" width="7" height="5" rx="1.5" stroke="rgba(80,60,75,0.38)" stroke-width="0.7"
          transform="rotate(-1, 17, 26)" />
      </template>

      <!-- 世界书：打开的书 -->
      <template v-else-if="icon === 'book'">
        <path d="M20 11 L20 30" stroke="rgba(80,60,75,0.3)" stroke-width="0.4" />
        <path d="M20 11 Q15 9.5 10 11 L10 28 Q15 26.5 20 28" stroke="rgba(80,60,75,0.6)" stroke-width="0.8" fill="none"
          stroke-linecap="round" />
        <path d="M20 11 Q25 9.5 30 11 L30 28 Q25 26.5 20 28" stroke="rgba(80,60,75,0.6)" stroke-width="0.8" fill="none"
          stroke-linecap="round" />
        <path d="M13 16h4 M13 19h3" stroke="rgba(80,60,75,0.3)" stroke-width="0.5" stroke-linecap="round" />
        <path d="M23 16h4 M23 19h3" stroke="rgba(80,60,75,0.25)" stroke-width="0.5" stroke-linecap="round" />
      </template>

      <!-- 设置：轨道 + 圆环 -->
      <template v-else-if="icon === 'settings'">
        <circle cx="20" cy="20" r="11" stroke="rgba(80,60,75,0.2)" stroke-width="0.4" stroke-dasharray="2 4" />
        <circle cx="20" cy="20" r="7" stroke="rgba(80,60,75,0.35)" stroke-width="0.5" />
        <circle cx="20" cy="20" r="3" stroke="rgba(80,60,75,0.6)" stroke-width="0.7" />
        <circle cx="20" cy="9" r="1.2" fill="rgba(80,60,75,0.35)" />
        <circle cx="28" cy="24" r="1" fill="rgba(80,60,75,0.28)" />
        <circle cx="12" cy="22" r="0.8" fill="rgba(80,60,75,0.22)" />
      </template>

      <!-- 美化：画笔 + 调色盘 -->
      <template v-else-if="icon === 'customize'">
        <circle cx="20" cy="20" r="10" stroke="rgba(180,140,200,0.7)" stroke-width="0.9"
          fill="rgba(180,140,200,0.05)" />
        <circle cx="16" cy="17" r="1.5" fill="rgba(180,140,200,0.5)" />
        <circle cx="20" cy="14" r="1.5" fill="rgba(180,140,200,0.4)" />
        <circle cx="24" cy="17" r="1.5" fill="rgba(180,140,200,0.3)" />
        <path d="M20 24 L20 28 Q20 30 22 30 L24 30" stroke="rgba(180,140,200,0.6)" stroke-width="0.9" fill="none"
          stroke-linecap="round" />
        <path d="M28 8 L30 10 L18 22 L16 22 L16 20 Z" stroke="rgba(180,140,200,0.7)" stroke-width="0.8"
          fill="rgba(180,140,200,0.1)" stroke-linecap="round" stroke-linejoin="round" />
      </template>

    </svg>
  </div>
</template>


<script setup>
defineProps({
  icon: { type: String, required: true },
  gradient: { type: String, default: 'linear-gradient(155deg, rgba(255,252,254,0.9), rgba(245,238,242,0.7))' }
})
</script>

<style scoped>
.app-icon-wrapper {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(200, 180, 190, 0.12);
  box-shadow: 0 2px 12px rgba(180, 150, 165, 0.06);
  transition: transform var(--duration-slow) var(--ease-soft);
  animation: softFloat 8s ease-in-out infinite;
}

.icon-mist {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at 35% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 60%);
  pointer-events: none;
}

.icon-svg {
  width: 28px;
  height: 28px;
  position: relative;
  z-index: 1;
}

.app-icon-wrapper:active {
  transform: scale(0.93);
}
</style>
