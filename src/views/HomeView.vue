<template>
    <div class="home-screen">
        <div class="lock-info">
            <p class="time-display">{{ timeStr }}</p>
            <p class="date-display">{{ dateStr }}</p>
            <p class="greeting-text">{{ greeting }}</p>
            <p class="version-text">v1.1.1</p>
        </div>
        <div class="app-grid">
            <div class="app-icon" @click="openChat">
                <AppIcon icon="chat"
                    gradient="linear-gradient(155deg, rgba(248,244,250,0.95), rgba(238,230,242,0.7))" />
                <span class="icon-label">共语</span>
            </div>
            <div class="app-icon" @click="openAbout">
                <AppIcon icon="heart"
                    gradient="linear-gradient(155deg, rgba(252,244,248,0.95), rgba(245,232,240,0.7))" />
                <span class="icon-label">关于他</span>
            </div>
            <div class="app-icon" @click="$router.push('/memory')">
                <AppIcon icon="brain"
                    gradient="linear-gradient(155deg, rgba(246,250,252,0.95), rgba(235,242,248,0.7))" />
                <span class="icon-label">记忆库</span>
            </div>
            <div class="app-icon" @click="$router.push('/worldbook')">
                <AppIcon icon="book"
                    gradient="linear-gradient(155deg, rgba(252,250,246,0.95), rgba(245,240,232,0.7))" />
                <span class="icon-label">世界书</span>
            </div>
            <div class="app-icon" @click="$router.push('/settings')">
                <AppIcon icon="settings"
                    gradient="linear-gradient(155deg, rgba(250,248,252,0.95), rgba(240,236,245,0.7))" />
                <span class="icon-label">设置</span>
            </div>
        </div>
        <div class="app-icon" @click="$router.push('/customize')">
            <AppIcon icon="customize"
                gradient="linear-gradient(155deg, rgba(250,245,252,0.95), rgba(242,232,248,0.7))" />
            <span class="icon-label">美化</span>
        </div>

    </div>
</template>

<script setup>
import AppIcon from '@/components/ui/AppIcon.vue'
import { useRouter } from 'vue-router'
import { useTime } from '@/composables/useTime'
import { api } from '@/utils/api'

const router = useRouter()
const { timeStr, dateStr, greeting } = useTime()

async function openChat() {
    const mode = localStorage.getItem('chat_entry_mode') || 'direct'
    if (mode === 'list') {
        router.push('/chat-list')
        return
    }
    try {
        const res = await api('/api/messages/latest-persona')
        const data = await res.json()
        if (data.personaId) {
            router.push(`/chat/${data.personaId}`)
        } else {
            const pRes = await api('/api/prompts/personas')
            const pData = await pRes.json()
            router.push(`/chat/${pData.active}`)
        }
    } catch (e) {
        router.push('/chat/xiaorou')
    }
}

async function openAbout() {
    try {
        const res = await api('/api/prompts/personas')
        const data = await res.json()
        // 跳转到关于他页面，带上当前活跃人格
        router.push('/about')
    } catch {
        router.push('/about')
    }
}

</script>

<style scoped>
.home-screen {
    padding-top: calc(env(safe-area-inset-top, 44px) + 30px);
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}

.lock-info {
    text-align: center;
    margin-bottom: 60px;
    animation: fadeIn 0.6s var(--ease-soft);
}

.time-display {
    font-size: 56px;
    font-weight: 200;
    color: var(--color-text);
    letter-spacing: -2px;
    line-height: 1;
    margin-bottom: 10px;
    animation: breathe 5s ease-in-out infinite;
}

.date-display {
    font-size: 14px;
    color: var(--color-text-light);
    margin-bottom: 8px;
    font-weight: 300;
}

.greeting-text {
    font-size: 13px;
    color: var(--color-primary);
    font-weight: 400;
    opacity: 0.8;
}

.version-text {
    font-size: 10px;
    color: var(--color-text-light);
    margin-top: 6px;
    opacity: 0.4;
}

.app-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 28px 20px;
    padding: 0 16px;
}

.app-icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    animation: fadeIn 0.5s var(--ease-soft) backwards;
}

.app-icon:nth-child(1) {
    animation-delay: 0.05s;
}

.app-icon:nth-child(2) {
    animation-delay: 0.1s;
}

.app-icon:nth-child(3) {
    animation-delay: 0.15s;
}

.app-icon:nth-child(4) {
    animation-delay: 0.2s;
}

.app-icon:nth-child(5) {
    animation-delay: 0.25s;
}

.icon-bg {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: transform var(--duration-slow) var(--ease-soft), box-shadow var(--duration-slow) var(--ease-soft);
}

.app-icon:active .icon-bg {
    transform: scale(0.92);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
}

.chat-icon {
    background: linear-gradient(145deg, #e8c5d5, #d4a0b8);
}

.about-icon {
    background: linear-gradient(145deg, #e8d5c5, #d4b8a0);
}

.status-icon {
    background: linear-gradient(145deg, #c5d5e8, #a0b8d4);
}

.worldbook-icon {
    background: linear-gradient(145deg, #c5e0d8, #a0c8b8);
}

.settings-icon {
    background: linear-gradient(145deg, #e0dcd5, #c8c0b8);
}

.icon-label {
    margin-top: 8px;
    font-size: 11px;
    color: var(--color-text-light);
    font-weight: 400;
}
</style>
