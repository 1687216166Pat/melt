<template>
    <div class="home-screen">
        <div class="lock-info">
            <p class="time-display">{{ timeStr }}</p>
            <p class="date-display">{{ dateStr }}</p>
        </div>
        <div class="app-grid">
            <div class="app-icon" @click="$router.push('/chat')">
                <div class="icon-bg chat-icon">💬</div>
                <span class="icon-label">AI 聊天</span>
            </div>
            <div class="app-icon">
                <div class="icon-bg status-icon">📱</div>
                <span class="icon-label">手机状态</span>
            </div>
            <div class="app-icon">
                <div class="icon-bg settings-icon">⚙️</div>
                <span class="icon-label">设置</span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const timeStr = ref('')
const dateStr = ref('')
let timer = null

function updateTime() {
    const now = new Date()
    timeStr.value = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    dateStr.value = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
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
.home-screen {
    padding-top: 40px;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.lock-info {
    text-align: center;
    margin-bottom: 50px;
}

.time-display {
    font-size: 64px;
    font-weight: 200;
    color: var(--color-text);
    letter-spacing: -2px;
    line-height: 1;
    margin-bottom: 8px;
}

.date-display {
    font-size: 16px;
    color: var(--color-text-light);
}

.app-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    padding: 0 10px;
}

.app-icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: transform 0.15s;
}

.app-icon:active {
    transform: scale(0.9);
}

.icon-bg {
    width: 60px;
    height: 60px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chat-icon {
    background: linear-gradient(135deg, #e8a0bf, #ba90c6);
}

.status-icon {
    background: linear-gradient(135deg, #c0dbea, #a8d8ea);
}

.settings-icon {
    background: linear-gradient(135deg, #f5ebe3, #e8d5c4);
}

.icon-label {
    margin-top: 6px;
    font-size: 11px;
    color: var(--color-text);
}
</style>
