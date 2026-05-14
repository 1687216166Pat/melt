<template>
    <div class="memory-page">
        <div class="memory-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>记忆库</h2>
        </div>

        <div class="persona-tabs">
            <button v-for="p in personas" :key="p.id" class="tab-btn" :class="{ active: currentPersona === p.id }"
                @click="switchPersona(p.id)">
                {{ p.name }}
            </button>
        </div>

        <div class="memory-content">
            <div class="section">
                <h3>📋 总档案</h3>
                <div class="profile-box">
                    <p v-if="profile">{{ profile }}</p>
                    <p v-else class="empty">暂无档案</p>
                </div>
            </div>

            <div class="section">
                <h3>📝 近期记忆</h3>
                <div v-for="mem in recentMemories" :key="mem.id" class="memory-item">
                    <div class="memory-date">{{ mem.source_session }}</div>
                    <div class="memory-text">{{ mem.content }}</div>
                    <button class="delete-btn" @click="deleteMemory(mem.id)">×</button>
                </div>
                <p v-if="recentMemories.length === 0" class="empty">暂无记忆</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api'

const personas = ref([
    { id: 'xiaorou', name: '小柔' },
    { id: 'cool', name: '阿冷' },
    { id: 'assistant', name: '助手' }
])

const currentPersona = ref('xiaorou')
const profile = ref('')
const recentMemories = ref([])

async function loadMemories(personaId) {
    try {
        const res = await api(`/api/memories/${personaId}`)
        const data = await res.json()
        profile.value = data.profile || ''
        recentMemories.value = data.recent || []
    } catch (e) {
        console.error('加载记忆失败:', e)
    }
}

function switchPersona(id) {
    currentPersona.value = id
    loadMemories(id)
}

async function deleteMemory(id) {
    await api(`/api/memories/recent/${id}`, { method: 'DELETE' })
    recentMemories.value = recentMemories.value.filter(m => m.id !== id)
}

onMounted(() => loadMemories(currentPersona.value))
</script>

<style scoped>
.memory-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
}

.memory-header {
    display: flex;
    align-items: center;
    gap: 12px;
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

.memory-header h2 {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
}

.persona-tabs {
    display: flex;
    gap: 8px;
    padding: 12px 0;
    border-bottom: 1px solid var(--color-bg-secondary);
}

.tab-btn {
    padding: 6px 16px;
    border-radius: 20px;
    border: 1px solid var(--color-bg-secondary);
    background: var(--color-white);
    font-size: 13px;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
}

.tab-btn.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
}

.memory-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 0;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
}

.section {
    margin-bottom: 24px;
}

.section h3 {
    font-size: 14px;
    color: var(--color-text);
    margin-bottom: 10px;
}

.profile-box {
    background: var(--color-white);
    border-radius: 12px;
    padding: 14px;
    font-size: 14px;
    color: var(--color-text);
    line-height: 1.6;
}

.memory-item {
    background: var(--color-white);
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 8px;
    position: relative;
}

.memory-date {
    font-size: 11px;
    color: var(--color-text-light);
    margin-bottom: 4px;
}

.memory-text {
    font-size: 14px;
    color: var(--color-text);
    line-height: 1.5;
    white-space: pre-line;
}

.delete-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    font-size: 18px;
    color: var(--color-text-light);
    cursor: pointer;
}

.empty {
    color: var(--color-text-light);
    font-size: 13px;
}
</style>
