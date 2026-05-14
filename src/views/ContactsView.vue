<template>
    <div class="contacts-page">
        <div class="contacts-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>联系人</h2>
        </div>
        <div class="contacts-list">
            <div v-for="persona in personas" :key="persona.id" class="contact-item"
                @click="$router.push(`/chat/${persona.id}`)">
                <div class="contact-avatar">{{ persona.avatar }}</div>
                <div class="contact-info">
                    <p class="contact-name">{{ persona.name }}</p>
                    <p class="contact-desc">{{ persona.description }}</p>
                </div>
                <span class="active-badge" v-if="persona.id === activePersona">当前</span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api'

const personas = ref([])
const activePersona = ref('')

const avatarMap = {
    xiaorou: '🌸',
    cool: '❄️',
    assistant: '🤖'
}

async function loadPersonas() {
    try {
        const res = await api('/api/prompts/personas')
        const data = await res.json()
        personas.value = data.personas.map(p => ({
            ...p,
            avatar: avatarMap[p.id] || '💬'
        }))
        activePersona.value = data.active
    } catch (e) {
        console.error('加载联系人失败:', e)
    }
}

onMounted(loadPersonas)
</script>

<style scoped>
.contacts-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
}

.contacts-header {
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

.contacts-header h2 {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
}

.contacts-list {
    flex: 1;
    overflow-y: auto;
}

.contact-item {
    display: flex;
    align-items: center;
    padding: 16px 4px;
    border-bottom: 1px solid var(--color-bg-secondary);
    cursor: pointer;
    transition: background 0.15s;
}

.contact-item:active {
    background: var(--color-bg-secondary);
}

.contact-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--color-bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-right: 12px;
    flex-shrink: 0;
}

.contact-info {
    flex: 1;
}

.contact-name {
    font-size: 16px;
    color: var(--color-text);
    font-weight: 500;
}

.contact-desc {
    font-size: 13px;
    color: var(--color-text-light);
    margin-top: 2px;
}

.active-badge {
    font-size: 11px;
    color: var(--color-primary);
    background: rgba(232, 160, 191, 0.15);
    padding: 2px 8px;
    border-radius: 10px;
}
</style>
