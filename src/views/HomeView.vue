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
                <div class="icon-bg chat-icon">💬</div>
                <span class="icon-label">AI 聊天</span>
            </div>
            <div class="app-icon" @click="$router.push('/about')">
                <div class="icon-bg about-icon">💕</div>
                <span class="icon-label">关于他</span>
            </div>
            <div class="app-icon" @click="$router.push('/memory')">
                <div class="icon-bg status-icon">🧠</div>
                <span class="icon-label">记忆库</span>
            </div>
            <div class="app-icon" @click="$router.push('/worldbook')">
                <div class="icon-bg worldbook-icon">📖</div>
                <span class="icon-label">世界书</span>
            </div>
            <div class="app-icon" @click="$router.push('/settings')">
                <div class="icon-bg settings-icon">⚙️</div>
                <span class="icon-label">设置</span>
            </div>
            <!-- 档案 -->
            <div v-if="activeTab === 'profile'" class="tab-content">
                <div class="info-block">
                    <h4>基本信息</h4>
                    ...
                </div>
                <div class="info-block">
                    <h4>人设</h4>
                    ...
                </div>
                <button class="chat-enter-btn" @click="$router.push(`/chat/${currentPersona}`)">💬 进入对话</button>
                <button class="edit-btn" @click="$router.push(`/persona-detail/${currentPersona}`)">编辑详情</button>
            </div>

        </div>
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useTime } from '@/composables/useTime'
import { api } from '@/utils/api'

const router = useRouter()
const { timeStr, dateStr, greeting } = useTime()

async function openChat() {
    try {
        // 先查最近一条消息是哪个人格的
        const res = await api('/api/messages/latest-persona')
        const data = await res.json()
        if (data.personaId) {
            router.push(`/chat/${data.personaId}`)
        } else {
            // 没有聊天记录，用当前激活的人格
            const pRes = await api('/api/prompts/personas')
            const pData = await pRes.json()
            router.push(`/chat/${pData.active}`)
        }
    } catch (e) {
        router.push('/chat/xiaorou')
    }
}

</script>

<style scoped>
.home-screen {
    padding-top: calc(env(safe-area-inset-top, 44px) + 20px);
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
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
    margin-bottom: 6px;
}

.greeting-text {
    font-size: 14px;
    color: var(--color-primary);
    font-weight: 500;
}

.version-text {
    font-size: 11px;
    color: #999;
    margin-top: 4px;
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

.contacts-icon {
    background: linear-gradient(135deg, #f0d9a8, #e8c088);
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

.relationship-icon {
    background: linear-gradient(135deg, #f8b4d9, #e8a0bf);
}

.worldbook-icon {
    background: linear-gradient(135deg, #b8d4e3, #8fb8d4);
}

.about-icon {
    background: linear-gradient(135deg, #f8b4d9, #e8a0bf);
}

.chat-enter-btn {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 12px;
    background: var(--color-primary);
    color: white;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    margin-bottom: 8px;
}
</style>
