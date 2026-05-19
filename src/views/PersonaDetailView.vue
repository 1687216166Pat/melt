<template>
    <div class="detail-page">
        <div class="detail-header">
            <button class="back-btn" @click="$router.back()">‹</button>
            <h2>助手详情</h2>
            <button class="save-btn-top" @click="saveDetail">保存</button>
        </div>

        <div class="detail-content">
            <!-- 合并的身份卡片 -->
            <GlassCard size="lg" class="identity-card">
                <div class="identity-top">
                    <div class="avatar-area">
                        <div class="avatar-preview">
                            <img v-if="detail.avatarUrl" :src="detail.avatarUrl" />
                            <span v-else>{{ detail.avatar || '💬' }}</span>
                        </div>
                        <button class="avatar-edit" @click="showAvatarEdit = !showAvatarEdit">✎</button>
                    </div>
                    <div class="identity-info">
                        <p class="display-name">{{ detail.note || detail.name || '未命名' }}</p>
                        <p class="real-name" v-if="detail.note && detail.name">{{ detail.name }}</p>
                    </div>
                </div>

                <!-- 头像编辑（展开） -->
                <div v-if="showAvatarEdit" class="avatar-edit-area">
                    <DreamInput v-model="detail.avatarUrl" placeholder="图片URL或图床链接" />
                    <input type="file" accept="image/*" @change="handleAvatarUpload" class="file-input" />
                </div>

                <!-- 基本信息行 -->
                <div class="identity-details">
                    <div class="detail-row">
                        <span class="detail-label">对你的称呼</span>
                        <input class="detail-value-input" v-model="detail.call_user" placeholder="例：主人、小然" />
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">性别</span>
                        <select v-model="detail.gender" class="detail-select">
                            <option value="">未设置</option>
                            <option value="female">女</option>
                            <option value="male">男</option>
                            <option value="other">其他</option>
                        </select>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">TA眼中的关系</span>
                        <input class="detail-value-input" v-model="detail.ai_relationship" placeholder="例：恋人、朋友" />
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">我对TA的关系</span>
                        <input class="detail-value-input" v-model="detail.user_relationship" placeholder="例：恋人、家人" />
                    </div>
                </div>
            </GlassCard>

            <!-- 名字编辑 -->
            <div class="section-block">
                <h3 class="section-label">名字设置</h3>
                <GlassCard size="md">
                    <DreamInput label="显示名字（备注）" v-model="detail.note" placeholder="聊天页面顶部显示的名字" />
                    <DreamInput label="真实名字" v-model="detail.name" placeholder="AI对自己的称呼" />
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
                <h3 class="section-label" @click="showWorldBooks = !showWorldBooks" style="cursor:pointer">
                    世界书绑定 {{ showWorldBooks ? '▾' : '▸' }}
                    <span class="wb-count" v-if="detail.worldBookIds && detail.worldBookIds.length">{{
                        detail.worldBookIds.length }}本</span>
                </h3>
                <GlassCard v-if="showWorldBooks" size="md" class="wb-card">
                    <div class="wb-scroll">
                        <div v-for="book in worldBooks" :key="book.id" class="wb-check-row"
                            @click="toggleWorldBook(book.id)">
                            <div class="wb-checkbox"
                                :class="{ checked: detail.worldBookIds && detail.worldBookIds.includes(book.id) }">
                                <span v-if="detail.worldBookIds && detail.worldBookIds.includes(book.id)">✓</span>
                            </div>
                            <span class="wb-name">{{ book.title }}</span>
                        </div>
                        <p v-if="worldBooks.length === 0" class="empty-text">暂无世界书</p>
                    </div>
                </GlassCard>
            </div>

            <!-- 独立主动消息 -->
            <div class="section-block">
                <h3 class="section-label">主动消息（独立设置）</h3>
                <GlassCard size="md">
                    <div class="detail-row">
                        <span class="detail-label">启用</span>
                        <label class="toggle">
                            <input type="checkbox" v-model="detail.proactiveEnabled" />
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div v-if="detail.proactiveEnabled" class="proactive-settings">
                        <div class="detail-row">
                            <span class="detail-label">间隔</span>
                            <div class="interval-input">
                                <input type="number" v-model.number="detail.proactiveInterval" min="1" max="99"
                                    class="interval-number" />
                                <select v-model="detail.proactiveUnit">
                                    <option value="minutes">分钟</option>
                                    <option value="hours">小时</option>
                                </select>
                            </div>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">每日最多</span>
                            <input type="number" v-model.number="detail.proactiveMax" min="1" max="50"
                                class="interval-number" />
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">AI自主决定</span>
                            <label class="toggle">
                                <input type="checkbox" v-model="detail.proactiveAuto" />
                                <span class="slider"></span>
                            </label>
                        </div>
                        <p class="setting-hint" v-if="detail.proactiveAuto">AI 会根据对话氛围自主决定何时主动发消息</p>
                    </div>
                </GlassCard>
            </div>

            <!-- 回复条数 -->
            <div class="section-block">
                <h3 class="section-label">回复分句</h3>
                <GlassCard size="md">
                    <div class="detail-row">
                        <span class="detail-label">最少条数</span>
                        <input class="detail-value-input" type="number" v-model.number="detail.minMessages" min="1"
                            max="10" />
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">最多条数</span>
                        <input class="detail-value-input" type="number" v-model.number="detail.maxMessages" min="1"
                            max="10" />
                    </div>
                </GlassCard>
            </div>

            <!-- 聊天壁纸 -->
            <div class="section-block">
                <h3 class="section-label">聊天壁纸</h3>
                <GlassCard size="md">
                    <div class="wallpaper-preview" v-if="detail.chatWallpaper">
                        <img :src="detail.chatWallpaper" />
                    </div>
                    <DreamInput label="图片URL" v-model="detail.chatWallpaper" placeholder="输入图片链接..." />
                    <div class="file-row">
                        <span class="file-label">或上传文件</span>
                        <input type="file" accept="image/*" @change="handleChatWallpaperUpload" class="file-input" />
                    </div>
                    <SoftButton v-if="detail.chatWallpaper" variant="ghost" size="sm"
                        @click="detail.chatWallpaper = ''">清除</SoftButton>
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
                <SoftButton variant="danger" block @click="deleteAi">删除这个AI</SoftButton>
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
const showAvatarEdit = ref(false)
const showWorldBooks = ref(false)

const detail = reactive({
    name: '',
    avatar: '💬',
    avatarUrl: '',
    note: '',
    gender: '',
    content: '',
    worldBookId: '',
    call_user: '',
    ai_relationship: '',
    user_relationship: '',
    minMessages: 1,
    maxMessages: 3,
    chatWallpaper: '',
    proactiveEnabled: false,
    proactiveInterval: 4,
    proactiveUnit: 'hours',
    proactiveMax: 3,
    proactiveAuto: false,

})

async function loadDetail() {
    try {
        const res = await api(`/api/persona/${personaId}`)
        const data = await res.json()
        Object.assign(detail, data)
        if (data.min_messages) detail.minMessages = data.min_messages
        if (data.max_messages) detail.maxMessages = data.max_messages
        if (data.world_book_id) detail.worldBookId = data.world_book_id
        if (data.chat_wallpaper) detail.chatWallpaper = data.chat_wallpaper
        if (data.proactive_enabled !== undefined) detail.proactiveEnabled = data.proactive_enabled
        if (data.proactive_interval) detail.proactiveInterval = data.proactive_interval
        if (data.proactive_unit) detail.proactiveUnit = data.proactive_unit
        if (data.proactive_max) detail.proactiveMax = data.proactive_max
        if (data.proactive_auto !== undefined) detail.proactiveAuto = data.proactive_auto
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
            body: JSON.stringify({
                name: detail.name,
                avatar: detail.avatar,
                avatarUrl: detail.avatarUrl,
                note: detail.note,
                gender: detail.gender,
                content: detail.content,
                worldBookId: detail.worldBookId,
                call_user: detail.call_user,
                ai_relationship: detail.ai_relationship,
                user_relationship: detail.user_relationship,
                minMessages: detail.minMessages,
                maxMessages: detail.maxMessages,
                chatWallpaper: detail.chatWallpaper,
                proactiveEnabled: detail.proactiveEnabled,
                proactiveInterval: detail.proactiveInterval,
                proactiveUnit: detail.proactiveUnit,
                proactiveMax: detail.proactiveMax,
                proactiveAuto: detail.proactiveAuto,
            })
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
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => {
        img.onload = () => {
            const canvas = document.createElement('canvas')
            const maxSize = 200
            let w = img.width, h = img.height
            if (w > maxSize || h > maxSize) {
                if (w > h) { h = h * maxSize / w; w = maxSize }
                else { w = w * maxSize / h; h = maxSize }
            }
            canvas.width = w
            canvas.height = h
            canvas.getContext('2d').drawImage(img, 0, 0, w, h)
            detail.avatarUrl = canvas.toDataURL('image/jpeg', 0.8)
        }
        img.src = e.target.result
    }
    reader.readAsDataURL(file)
}

function toggleWorldBook(id) {
    if (!detail.worldBookIds) detail.worldBookIds = []
    const idx = detail.worldBookIds.indexOf(id)
    if (idx > -1) detail.worldBookIds.splice(idx, 1)
    else detail.worldBookIds.push(id)
}

function handleChatWallpaperUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
        detail.chatWallpaper = e.target.result
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
    if (!confirm('确定删除？所有对话和记忆都会被清除。')) return
    try {
        await api(`/api/messages/${personaId}`, { method: 'DELETE' })
        await api(`/api/memories/${personaId}/clear`, { method: 'DELETE' })

        // 判断是自定义还是内置
        if (detail.custom) {
            await api(`/api/personas/custom/${personaId}`, { method: 'DELETE' })
        } else {
            // 内置人格：隐藏
            await api(`/api/personas/builtin/${personaId}/hide`, { method: 'POST' })
        }

        const hidden = JSON.parse(localStorage.getItem('hidden_personas') || '[]')
        if (!hidden.includes(personaId)) {
            hidden.push(personaId)
            localStorage.setItem('hidden_personas', JSON.stringify(hidden))
        }

        router.push('/')
    } catch (e) {
        saveMsg.value = '删除失败'
    }
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

.detail-page {
    padding-top: calc(env(safe-area-inset-top, 44px) + 16px);
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

.dream-input,
.dream-textarea {
    word-break: break-all;
    overflow-wrap: break-word;
}

/* 身份卡片 */
.identity-card {
    margin-bottom: 20px;
}

.identity-top {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
}

.avatar-area {
    position: relative;
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
    box-shadow: 0 2px 10px rgba(200, 130, 160, 0.1);
}

.avatar-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-edit {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    border: none;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.identity-info {
    flex: 1;
}

.display-name {
    font-size: 18px;
    font-weight: 500;
    color: var(--color-text);
}

.real-name {
    font-size: 12px;
    color: var(--color-text-light);
    margin-top: 2px;
    opacity: 0.6;
}

.avatar-edit-area {
    padding: 12px 0;
    border-top: 1px solid var(--color-border);
    margin-bottom: 12px;
}

.file-input {
    font-size: 11px;
    color: var(--color-text-light);
    margin-top: 8px;
}

.identity-details {
    border-top: 1px solid var(--color-border);
    padding-top: 14px;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid var(--color-border);
}

.detail-row:last-child {
    border-bottom: none;
}

.detail-label {
    font-size: 13px;
    color: var(--color-text-light);
    flex-shrink: 0;
}

.detail-value-input {
    text-align: right;
    border: none;
    background: none;
    font-size: 13px;
    color: var(--color-text);
    outline: none;
    width: 50%;
    font-family: inherit;
}

.detail-value-input::placeholder {
    color: var(--color-text-light);
    opacity: 0.4;
}

.detail-select {
    border: none;
    background: none;
    font-size: 13px;
    color: var(--color-text);
    outline: none;
    text-align: right;
    appearance: none;
    -webkit-appearance: none;
}

.wb-check-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    cursor: pointer;
    border-bottom: 1px solid var(--color-border);
}

.wb-check-row:last-child {
    border-bottom: none;
}

.wb-checkbox {
    width: 20px;
    height: 20px;
    border-radius: 5px;
    border: 1.5px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: white;
    transition: all 0.2s;
}

.wb-checkbox.checked {
    background: var(--color-primary);
    border-color: var(--color-primary);
}

.wb-name {
    font-size: 13px;
    color: var(--color-text);
}

.wb-card {
    max-height: 160px;
    overflow: hidden;
}

.wb-scroll {
    max-height: 140px;
    overflow-y: auto;
}

.wb-count {
    font-size: 10px;
    color: var(--color-primary);
    margin-left: 6px;
    opacity: 0.7;
}

.wallpaper-preview {
    width: 100%;
    height: 100px;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 10px;
}

.wallpaper-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.proactive-settings {
    margin-top: 8px;
}

.interval-input {
    display: flex;
    align-items: center;
    gap: 6px;
}

.interval-number {
    width: 50px;
    height: 32px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 0 8px;
    font-size: 13px;
    background: var(--color-bg);
    color: var(--color-text);
    outline: none;
    text-align: center;
}

.setting-hint {
    font-size: 11px;
    color: var(--color-text-light);
    opacity: 0.5;
    margin-top: 8px;
    font-style: italic;
}
</style>
