<template>
    <div class="chatlist-page">
        <div class="chatlist-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>共语</h2>
        </div>

        <div class="chatlist-content">
            <GlassCard v-for="persona in personas" :key="persona.id" size="md" class="chat-item"
                @click="$router.push(`/chat/${persona.id}`)">
                <div class="chat-item-row">
                    <div class="chat-avatar">
                        <img v-if="persona.avatarUrl" :src="persona.avatarUrl" />
                        <span v-else>{{ persona.avatar || '💬' }}</span>
                    </div>
                    <div class="chat-item-info">
                        <p class="chat-item-name">{{ persona.note || persona.name }}</p>
                        <p class="chat-item-last">{{ persona.lastMessage || '还没有对话...' }}</p>
                    </div>
                </div>
            </GlassCard>

            <div v-if="personas.length === 0" class="empty-state">
                <p>还没有可以聊天的对象</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api'
import GlassCard from '@/components/ui/GlassCard.vue'

const personas = ref([])

async function loadPersonas() {
    try {
        const res = await api('/api/prompts/personas')
        const data = await res.json()

        // 获取每个人格的详情和最新消息
        const detailed = await Promise.all(
            data.personas.map(async (p) => {
                let note = ''
                let avatarUrl = ''
                let avatar = p.avatar || '💬'
                let lastMessage = ''

                try {
                    const detailRes = await api(`/api/persona/${p.id}`)
                    const detail = await detailRes.json()
                    note = detail.note || ''
                    avatarUrl = detail.avatarUrl || ''
                    avatar = detail.avatar || avatar
                } catch { }

                try {
                    const msgRes = await api(`/api/messages/${p.id}`)
                    const msgs = await msgRes.json()
                    if (msgs.length > 0) {
                        const last = msgs[msgs.length - 1]
                        const prefix = last.role === 'ai' ? '' : '我: '
                        const content = last.content.split('\n')[0]
                        lastMessage = prefix + (content.length > 25 ? content.slice(0, 25) + '...' : content)
                    }
                } catch { }

                return { ...p, note, avatarUrl, avatar, lastMessage }
            })
        )

        personas.value = detailed
    } catch (e) {
        console.error('加载失败:', e)
    }
}

onMounted(loadPersonas)
</script>

<style scoped>
.chatlist-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
}

.chatlist-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
}

.back-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: var(--color-primary);
    cursor: pointer;
    opacity: 0.75;
}

.chatlist-header h2 {
    font-size: 15px;
    font-weight: 500;
    color: var(--color-text);
}

.chatlist-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 0;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
}

.chat-item {
    margin-bottom: 10px;
    cursor: pointer;
}

.chat-item-row {
    display: flex;
    align-items: center;
    gap: 14px;
}

.chat-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--color-bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    overflow: hidden;
    flex-shrink: 0;
}

.chat-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.chat-item-info {
    flex: 1;
    min-width: 0;
}

.chat-item-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 3px;
}

.chat-item-last {
    font-size: 12px;
    color: var(--color-text-light);
    opacity: 0.6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.empty-state {
    text-align: center;
    padding: 48px;
    color: var(--color-text-light);
    font-size: 13px;
    opacity: 0.5;
}
</style>
