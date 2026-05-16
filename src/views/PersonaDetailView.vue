<template>
    <div class="detail-page">
        <div class="detail-header">
            <button class="back-btn" @click="$router.back()">‹</button>
            <h2>助手详情</h2>
            <button class="save-btn-top" @click="saveDetail">保存</button>
        </div>

        <div class="detail-content">
            <!-- 头像 -->
            <div class="section-block">
                <h3 class="section-label">头像</h3>
                <GlassCard size="md">
                    <div class="avatar-row">
                        <div class="avatar-preview">
                            <img v-if="detail.avatarUrl" :src="detail.avatarUrl" />
                            <span v-else>{{ detail.avatar || '💬' }}</span>
                        </div>
                        <div class="avatar-actions">
                            <DreamInput v-model="detail.avatarUrl" placeholder="图片URL或图床链接" />
                            <input type="file" accept="image/*" @change="handleAvatarUpload" class="file-input" />
                        </div>
                    </div>
                </GlassCard>
            </div>

            <!-- 基本信息 -->
            <div class="section-block">
                <h3 class="section-label">基本信息</h3>
                <GlassCard size="md">
                    <DreamInput label="助手名字" v-model="detail.name" placeholder="AI对自己的称呼" />
                    <DreamInput label="备注" v-model="detail.note" placeholder="你给AI的备注" />
                    <div class="select-group">
                        <label class="select-label">性别</label>
                        <select v-model="detail.gender" class="select-field">
                            <option value="">未设置</option>
                            <option value="female">女</option>
                            <option value="male">男</option>
                            <option value="other">其他</option>
                        </select>
                    </div>
                </GlassCard>
            </div>

            <!-- 人设详情 -->
            <div class="section-block">
                <h3 class="section-label">人设详情</h3>
                <GlassCard size="md">
                    <DreamInput type="textarea" v-model="detail.content" :rows="10" placeholder="角色的性格、说话方式、背景设定..." />
                </GlassCard>
            </div>

            <!-- 世界书绑定 -->
            <div class="section-block">
                <h3 class="section-label">世界书绑定</h3>
                <GlassCard size="md">
                    <select v-model="detail.worldBookId" class="select-field full">
                        <option value="">不绑定</option>
                        <option v-for="book in worldBooks" :key="book.id" :value="book.id">{{ book.title }}</option>
                    </select>
                </GlassCard>
            </div>

            <!-- 进入对话 -->
            <div class="section-block">
                <SoftButton variant="primary" block @click="$router.push(`/chat/${personaId}`)">💬 进入对话</SoftButton>
            </div>

            <!-- 危险操作 -->
            <div class="section-block danger-area">
                <h3 class="section-label">⚠️ 操作</h3>
                <SoftButton variant="secondary" block @click="clearMessages">清空对话框（保留记忆）</SoftButton>
                <SoftButton variant="secondary" block @click="clearMemory">清空记忆</SoftButton>
                <SoftButton variant="danger" block @click="deletePersona">删除对话</SoftButton>
            </div>
        </div>

        <p v-if="saveMsg" class="save-msg">{{ saveMsg }}</p>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/utils/api'
import GlassCard from '@/components/ui/GlassCard.vue'
import SoftButton from '@/components/ui/SoftButton.vue'
import DreamInput from '@/components/ui/DreamInput.vue'

const route = useRoute()
const router = useRouter()
const personaId = route.params.personaId
const saveMsg = ref('')
const worldBooks = ref([])

const detail = reactive({
    name: '',
    avatar: '💬',
    avatarUrl: '',
    note: '',
    gender: '',
    content: '',
    worldBookId: '',
})

async function loadDetail() {
    try {
        const res = await api(`/api/persona/${personaId}`)
        const data = await res.json()
        Object.assign(detail, data)
    } catch (e) {
        console.error('加载详情失败:', e)
    }
}

async function loadWorldBooks() {
    try {
        const res = await api('/api/worldbooks')
        worldBooks.value = await res.json()
    } catch (e) {
        console.error('加载世界书失败:', e)
    }
}

async function saveDetail() {
    try {
        await api(`/api/persona/${personaId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(detail)
        })
        saveMsg.value = '已保存 ✓'
        setTimeout(() => { saveMsg.value = '' }, 2000)
    } catch (e) {
        saveMsg.value = '保存失败'
    }
}

function handleAvatarUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
        detail.avatarUrl = e.target.result
    }
    reader.readAsDataURL(file)
}

async function clearMessages() {
    if (!confirm('确定清空对话框？记忆会保留。')) return
    await api(`/api/messages/${personaId}`, { method: 'DELETE' })
    saveMsg.value = '对话已清空'
    setTimeout(() => { saveMsg.value = '' }, 2000)
}

async function clearMemory() {
    if (!confirm('确定清空所有记忆？此操作不可恢复。')) return
    await api(`/api/memories/${personaId}/clear`, { method: 'DELETE' })
    saveMsg.value = '记忆已清空'
    setTimeout(() => { saveMsg.value = '' }, 2000)
}

async function deletePersona() {
    if (!confirm('确定删除这个对话？AI本身不会被删除。')) return
    await api(`/api/messages/${personaId}`, { method: 'DELETE' })
    router.push('/about')
}

onMounted(() => {
    loadDetail()
    loadWorldBooks()
})
</script>

<style scoped>
.detail-page * {
    max-width: 100%;
    overflow-wrap: break-word;
}

.detail-header {
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

.detail-header h2 {
    flex: 1;
    font-size: 15px;
    font-weight: 500;
    color: var(--color-text);
}

.save-btn-top {
    background: none;
    border: none;
    font-size: 13px;
    color: var(--color-primary);
    font-weight: 500;
    cursor: pointer;
    letter-spacing: 0.03em;
}

.detail-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 20px 0;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 28px);
}

.section-block {
    margin-bottom: 22px;
    animation: fadeIn 0.4s var(--ease-soft) backwards;
}

.section-block:nth-child(2) {
    animation-delay: 0.05s;
}

.section-block:nth-child(3) {
    animation-delay: 0.1s;
}

.section-block:nth-child(4) {
    animation-delay: 0.15s;
}

.section-block:nth-child(5) {
    animation-delay: 0.2s;
}

.section-label {
    font-size: 12px;
    color: var(--color-text-light);
    margin-bottom: 10px;
    font-weight: 400;
    letter-spacing: 0.5px;
}

.avatar-row {
    display: flex;
    gap: 14px;
    align-items: flex-start;
}

.avatar-preview {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--color-bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 2px 10px rgba(200, 130, 160, 0.1);
}

.avatar-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-actions {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.file-input {
    font-size: 11px;
    color: var(--color-text-light);
}

.select-group {
    margin-bottom: 14px;
}

.select-label {
    display: block;
    font-size: 11px;
    color: var(--color-text-light);
    margin-bottom: 6px;
    letter-spacing: 0.4px;
}

.select-field {
    width: auto;
    height: 40px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 0 14px;
    font-size: 14px;
    background: var(--color-card);
    outline: none;
    color: var(--color-text);
    -webkit-appearance: none;
    appearance: none;
}

.select-field.full {
    width: 100%;
}

.danger-area {
    border-top: 1px solid var(--color-border);
    padding-top: 18px;
}

.danger-area>* {
    margin-bottom: 8px;
}

.save-msg {
    text-align: center;
    color: var(--color-primary);
    font-size: 12px;
    padding: 10px;
    opacity: 0.8;
}

.dream-input, .dream-textarea {
    word-break: break-all;
    overflow-wrap: break-word;
}

</style>
