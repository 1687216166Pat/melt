<!-- src/views/HomeView.vue -->
<template>
    <div class="home-screen">
        <div class="greeting">
            <p class="date">{{ dateStr }}</p>
            <h1 class="title">Hello</h1>
        </div>
        <div class="app-grid">
            <div class="app-icon" @click="$router.push('/chat')">
                <div class="icon-bg">💬</div>
                <span class="icon-label">AI 聊天</span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'

const now = new Date()
const options = { month: 'long', day: 'numeric', weekday: 'long' }
const dateStr = ref(now.toLocaleDateString('zh-CN', options))
</script>

<style scoped>
.home-screen {
    padding-top: 60px;
}

.greeting .date {
    font-size: 14px;
    color: var(--color-text-light);
    margin-bottom: 8px;
}

.greeting .title {
    font-size: 34px;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 40px;
}

.app-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
}

.app-icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
}

.icon-bg {
    width: 60px;
    height: 60px;
    border-radius: 14px;
    background: var(--color-white);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.icon-label {
    margin-top: 6px;
    font-size: 11px;
    color: var(--color-text);
}
</style>
