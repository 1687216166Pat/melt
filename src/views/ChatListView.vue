<template>
    <div class="chatlist-page">
        <div class="chatlist-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>共语</h2>
            <button class="add-btn" @click="showAddModal = true">+</button>
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

        <!-- 添加新AI弹窗 -->
        <BlurModal :visible="showAddModal" @close="showAddModal = false">
            <h3>添加新的AI</h3>
            <DreamInput label="名字" v-model="newPersona.name" placeholder="角色名称" />
            <DreamInput label="头像 (emoji 或留空)" v-model="newPersona.avatar" placeholder="💬" />
            <DreamInput label="头像图片URL" v-model="newPersona.avatarUrl" placeholder="https://..." />
            <div class="file-row">
                <span class="file-label">或上传图片</span>
                <input type="file" accept="image/*" @change="handleAvatarUpload" class="file-input" />
            </div>
            <DreamInput label="设定" type="textarea" v-model="newPersona.content" :rows="6" placeholder="描述性格、说话方式..." />
            <div class="modal-actions">
                <SoftButton variant="secondary" @click="showAddModal = false">取消</SoftButton>
                <SoftButton variant="primary" @click="createPersona"
                    :disabled="!newPersona.name || !newPersona.content">创建</SoftButton>
            </div>
        </BlurModal>

    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { api } from '@/utils/api'
import GlassCard from '@/components/ui/GlassCard.vue'
import BlurModal from '@/components/ui/BlurModal.vue'
import DreamInput from '@/components/ui/DreamInput.vue'
import SoftButton from '@/components/ui/SoftButton.vue'

const personas = ref([])
const showAddModal = ref(false)
const newPersona = reactive({
    name: '',
    avatar: '💬',
    avatarUrl: '',
    content: ''
})

function handleAvatarUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
        newPersona.avatarUrl = e.target.result
    }
    reader.readAsDataURL(file)
}

async function createPersona() {
    if (!newPersona.name || !newPersona.content) return
    try {
        await api('/api/personas/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newPersona.name,
                avatar: newPersona.avatar,
                avatarUrl: newPersona.avatarUrl,
                content: newPersona.content
            })
        })
        showAddModal.value = false
        newPersona.name = ''
        newPersona.avatar = '💬'
        newPersona.avatarUrl = ''
        newPersona.content = ''
        await loadPersonas()
    } catch (e) {
        console.error('创建失败:', e)
    }
}


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

.add-btn {
    background: none;
    border: none;
    font-size: 22px;
    color: var(--color-primary);
    cursor: pointer;
    opacity: 0.75;
}

.chatlist-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
}

.chatlist-header h2 {
    flex: 1;
    font-size: 15px;
    font-weight: 500;
    color: var(--color-text);
}

.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
}
</style>
