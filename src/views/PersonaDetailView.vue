<template>
    <div class="detail-page">
        <div class="detail-header">
            <button class="back-btn" @click="$router.back()">‹</button>
            <h2>助手详情</h2>
            <button class="save-btn-top" @click="saveDetail">保存</button>
        </div>

        <div class="detail-content">
            <!-- 头像 -->
            <div class="section">
                <h3>头像</h3>
                <div class="avatar-row">
                    <div class="avatar-preview">
                        <img v-if="detail.avatarUrl" :src="detail.avatarUrl" />
                        <span v-else>{{ detail.avatar || '💬' }}</span>
                    </div>
                    <div class="avatar-actions">
                        <input type="text" v-model="detail.avatarUrl" placeholder="图片URL或图床链接" />
                        <input type="file" accept="image/*" @change="handleAvatarUpload" />
                    </div>
                </div>
            </div>

            <!-- 基本信息 -->
            <div class="section">
                <h3>基本信息</h3>
                <div class="input-group">
                    <label>助手名字</label>
                    <input v-model="detail.name" placeholder="AI对自己的称呼" />
                </div>
                <div class="input-group">
                    <label>备注</label>
                    <input v-model="detail.note" placeholder="你给AI的备注" />
                </div>
                <div class="input-group">
                    <label>性别</label>
                    <select v-model="detail.gender">
                        <option value="">未设置</option>
                        <option value="female">女</option>
                        <option value="male">男</option>
                        <option value="other">其他</option>
                    </select>
                </div>
            </div>

            <!-- 人设详情 -->
            <div class="section">
                <h3>人设详情</h3>
                <textarea v-model="detail.content" rows="10" placeholder="角色的性格、说话方式、背景设定..."></textarea>
            </div>

            <!-- 世界书绑定 -->
            <div class="section">
                <h3>世界书绑定</h3>
                <select v-model="detail.worldBookId">
                    <option value="">不绑定</option>
                    <option v-for="book in worldBooks" :key="book.id" :value="book.id">{{ book.title }}</option>
                </select>
            </div>

            <!-- 进入对话 -->
            <div class="section">
                <button class="chat-btn" @click="$router.push(`/chat/${personaId}`)">💬 进入对话</button>
            </div>

            <!-- 危险操作 -->
            <div class="section danger-section">
                <h3>⚠️ 操作</h3>
                <button class="danger-btn" @click="clearMessages">清空对话框（保留记忆）</button>
                <button class="danger-btn" @click="clearMemory">清空记忆</button>
                <button class="danger-btn delete" @click="deletePersona">删除对话</button>
            </div>
        </div>

        <p v-if="saveMsg" class="save-msg">{{ saveMsg }}</p>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/utils/api'

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
    router.push('/contacts')
}

onMounted(() => {
    loadDetail()
    loadWorldBooks()
})
</script>

<style scoped>
.detail-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
}

.detail-header {
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
}

.detail-header h2 {
    flex: 1;
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
}

.save-btn-top {
    background: none;
    border: none;
    font-size: 14px;
    color: var(--color-primary);
    font-weight: 600;
    cursor: pointer;
}

.detail-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 0;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
}

.section {
    margin-bottom: 24px;
}

.section h3 {
    font-size: 13px;
    color: var(--color-text-light);
    margin-bottom: 10px;
}

.avatar-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
}

.avatar-preview {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--color-bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    overflow: hidden;
    flex-shrink: 0;
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

.avatar-actions input[type="text"] {
    width: 100%;
    height: 34px;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 8px;
    padding: 0 10px;
    font-size: 13px;
    background: var(--color-white);
    outline: none;
}

.avatar-actions input[type="file"] {
    font-size: 12px;
    color: var(--color-text-light);
}

.input-group {
    margin-bottom: 10px;
}

.input-group label {
    display: block;
    font-size: 12px;
    color: var(--color-text-light);
    margin-bottom: 4px;
}

.input-group input,
.input-group select {
    width: 100%;
    height: 38px;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 10px;
    padding: 0 12px;
    font-size: 14px;
    background: var(--color-white);
    outline: none;
}

textarea {
    width: 100%;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 12px;
    padding: 12px;
    font-size: 14px;
    font-family: inherit;
    background: var(--color-white);
    outline: none;
    resize: none;
    line-height: 1.5;
}

.danger-section {
    border-top: 1px solid var(--color-bg-secondary);
    padding-top: 16px;
}

.danger-btn {
    width: 100%;
    padding: 12px;
    margin-bottom: 8px;
    border: 1px solid var(--color-bg-secondary);
    background: var(--color-white);
    border-radius: 10px;
    font-size: 14px;
    color: var(--color-text);
    cursor: pointer;
}

.danger-btn.delete {
    color: #f44336;
    border-color: #f44336;
}

.save-msg {
    text-align: center;
    color: var(--color-primary);
    font-size: 13px;
    padding: 8px;
}

.chat-btn {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 12px;
    background: var(--color-primary);
    color: white;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
}
</style>
