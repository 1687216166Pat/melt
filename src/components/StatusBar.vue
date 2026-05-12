<template>
    <div class="status-bar">
        <span class="time">{{ currentTime }}</span>
        <div class="status-icons">
            <span class="signal">●●●●○</span>
            <span class="wifi">WiFi</span>
            <span class="battery">🔋</span>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const currentTime = ref('')
let timer = null

function updateTime() {
    const now = new Date()
    const h = now.getHours().toString().padStart(2, '0')
    const m = now.getMinutes().toString().padStart(2, '0')
    currentTime.value = `${h}:${m}`
}

onMounted(() => {
    updateTime()
    timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
    clearInterval(timer)
})
</script>

<style scoped>
.status-bar {
    height: var(--status-bar-height);
    padding: 14px 24px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
    flex-shrink: 0;
}

.status-icons {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 12px;
}
</style>
