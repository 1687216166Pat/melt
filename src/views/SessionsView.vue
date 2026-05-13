<template>
    <div class="sessions-page">
        <div class="sessions-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>对话列表</h2>
            <button class="new-btn" @click="createNew">+</button>
        </div>
        <div class="sessions-list">
            <div v-for="session in sessions" :key="session.id" class="session-item" @click="openSession(session.id)">
                <div class="session-info">
                    <p class="session-title">{{ session.title }}</p>
                    <p class="session-time">{{ formatTime(session.updated_at) }}</p>
                </div>
                <button class="delete-btn" @click.stop="deleteSession(session.id)">×</button>
            </div>
            <p v-if="sessions.length === 0" class="empty-tip">还没有对话，点右上角 + 开始</p>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/utils/api'

const router = useRouter()
const sessions = ref([])

async function loadSessions() {
    try {
        const res = await api('/api/sessions')
        sessions.value = await res.json()
    } catch (e) {
        console.error('加载会话失败:', e)
    }
}

async function createNew() {
    try {
        const res = await api('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: '新对话' })
        })
        const data = await res.json()
        router.push(`/chat/${data.id}`)
    } catch (e) {
        console.error('创建会话失败:', e)
    }
}

function openSession(id) {
    router.push(`/chat/${id}`)
}

async function deleteSession(id) {
    try {
        await api(`/api/sessions/${id}`, { method: 'DELETE' })
        sessions.value = sessions.value.filter(s => s.id !== id)
    } catch (e) {
        console.error('删除会话失败:', e)
    }
}

function formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

onMounted(loadSessions)
</script>

<style scoped>
.sessions-page {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.sessions-header {
    display: flex;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--color-bg-secondary);
}

.back-btn {
    background: none;
    border: none;
    font-size: 28px;
    color: var(--color-primary);
    cursor: pointer;
    padding: 0 4px;
}

.sessions-header h2 {
    flex: 1;
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
}

.new-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: var(--color-primary);
    cursor: pointer;
    padding: 0 4px;
}

.sessions-list {
    flex: 1;
    overflow-y: auto;
}

.session-item {
    display: flex;
    align-items: center;
    padding: 14px 4px;
    border-bottom: 1px solid var(--color-bg-secondary);
    cursor: pointer;
    transition: background 0.15s;
}

.session-item:active {
    background: var(--color-bg-secondary);
}

.session-info {
    flex: 1;
}

.session-title {
    font-size: 15px;
    color: var(--color-text);
    font-weight: 500;
}

.session-time {
    font-size: 12px;
    color: var(--color-text-light);
    margin-top: 2px;
}

.delete-btn {
    background: none;
    border: none;
    font-size: 20px;
    color: var(--color-text-light);
    cursor: pointer;
    padding: 4px 8px;
}

.empty-tip {
    text-align: center;
    color: var(--color-text-light);
    font-size: 14px;
    margin-top: 40px;
}
</style>
