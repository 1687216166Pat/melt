<template>
    <div class="detail-page">
        <div class="settings-blob sb-tl"></div>
        <div class="settings-blob sb-br"></div>

        <div class="detail-nav">
            <button class="detail-back" @click="$router.back()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <span class="detail-title">助手详情</span>
            <button class="detail-save-btn" @click="saveDetail">保存</button>
        </div>

        <div class="detail-content">

            <!-- 身份卡片 -->
            <div class="identity-hero">
                <div class="identity-avatar-wrap">
                    <div class="identity-avatar">
                        <img v-if="detail.avatarUrl" :src="detail.avatarUrl" />
                        <span v-else>{{ detail.avatar || '💬' }}</span>
                    </div>
                    <button class="avatar-edit-btn" @click="showAvatarEdit = !showAvatarEdit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>
                </div>
                <div class="identity-meta">
                    <p class="identity-name">{{ detail.note || detail.name || '未命名' }}</p>
                    <p class="identity-sub" v-if="detail.note && detail.name">{{ detail.name }}</p>
                </div>
            </div>

            <!-- 头像编辑 -->
            <div v-if="showAvatarEdit" class="settings-group" style="margin-bottom:10px;">
                <div class="settings-group-item col-item">
                    <div class="sgi-label">头像 URL</div>
                    <input class="sgi-input-full" v-model="detail.avatarUrl" placeholder="图片URL或图床链接" />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">上传图片</div>
                    <label class="upload-label">
                        选择文件
                        <input type="file" accept="image/*" style="display:none" @change="handleAvatarUpload" />
                    </label>
                </div>
            </div>

            <!-- 基本信息 -->
            <div class="section-label-sm">基本信息</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label">对你的称呼</div>
                    <input class="sgi-input" v-model="detail.call_user" placeholder="例：主人、小然" />
                </div>
                <div class="settings-group-item" style="position:relative;">
                    <div class="sgi-label">性别</div>
                    <div class="sgi-right">
                        <span class="sgi-value">{{ genderLabel }}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                    <select class="sgi-select-hidden" v-model="detail.gender">
                        <option value="">未设置</option>
                        <option value="female">女</option>
                        <option value="male">男</option>
                        <option value="other">其他</option>
                    </select>
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">TA眼中的关系</div>
                    <input class="sgi-input" v-model="detail.ai_relationship" placeholder="例：恋人、朋友" />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">我对TA的关系</div>
                    <input class="sgi-input" v-model="detail.user_relationship" placeholder="例：恋人、家人" />
                </div>
            </div>

            <!-- 名字 -->
            <div class="section-label-sm">名字</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">显示名字</div>
                        <div class="sgi-desc">聊天页面顶部显示</div>
                    </div>
                    <input class="sgi-input" v-model="detail.note" placeholder="备注名" />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">真实名字</div>
                        <div class="sgi-desc">AI 对自己的称呼</div>
                    </div>
                    <input class="sgi-input" v-model="detail.name" placeholder="角色名" />
                </div>
            </div>

            <!-- 人设详情 -->
            <div class="section-label-sm">人设详情</div>
            <div class="settings-group">
                <div class="settings-group-item col-item">
                    <textarea class="sgi-textarea" v-model="detail.content" rows="10"
                        placeholder="角色的性格、说话方式、背景设定..."></textarea>
                </div>
            </div>

            <!-- 专属 API -->
            <div class="section-label-sm">专属 API <span class="section-label-hint">不填则使用全局设置</span></div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label">API Key</div>
                    <input class="sgi-input" type="password" v-model="detail.customApiKey" placeholder="留空使用全局" />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">API 地址</div>
                    <input class="sgi-input" v-model="detail.customApiUrl" placeholder="留空使用全局" />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">模型</div>
                    <input class="sgi-input" v-model="detail.customModel" placeholder="留空使用全局模型" />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">温度</div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <input class="sgi-input" type="number" v-model.number="detail.temperature" min="0" max="2"
                            step="0.1" placeholder="0.7" style="width:60px;text-align:right;" />
                        <span class="sgi-value">0~2</span>
                    </div>
                </div>
            </div>

            <!-- 表情包 -->
            <div class="section-label-sm">表情包</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">启用表情包</div>
                        <div class="sgi-desc">AI 回复时可能附带表情包</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="detail.emojiEnabled" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
            </div>

            <!-- 世界书绑定 -->
            <div class="section-label-sm" @click="showWorldBooks = !showWorldBooks"
                style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;">
                <span>世界书绑定
                    <span v-if="detail.worldBookIds && detail.worldBookIds.length" class="count-badge">
                        {{ detail.worldBookIds.length }}
                    </span>
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    class="sgi-arrow" :style="{ transform: showWorldBooks ? 'rotate(90deg)' : '' }">
                    <path d="M9 18l6-6-6-6" />
                </svg>
            </div>
            <div v-if="showWorldBooks" class="settings-group">
                <div v-for="book in worldBooks" :key="book.id" class="settings-group-item"
                    @click="toggleWorldBook(book.id)" style="cursor:pointer;">
                    <div class="sgi-label">{{ book.title }}</div>
                    <div class="wb-checkbox-sm"
                        :class="{ checked: detail.worldBookIds && detail.worldBookIds.includes(book.id) }">
                        <svg v-if="detail.worldBookIds && detail.worldBookIds.includes(book.id)" viewBox="0 0 24 24"
                            fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                    </div>
                </div>
                <div v-if="worldBooks.length === 0" class="settings-group-item">
                    <span class="sgi-value">暂无世界书</span>
                </div>
            </div>

            <!-- 主动消息 -->
            <div class="section-label-sm">主动消息</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label">启用</div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="detail.proactiveEnabled" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
                <template v-if="detail.proactiveEnabled">
                    <div class="settings-group-item" style="position:relative;">
                        <div class="sgi-label">间隔单位</div>
                        <div class="sgi-right">
                            <span class="sgi-value">{{ detail.proactiveUnit === 'minutes' ? '分钟' : '小时' }}</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" class="sgi-arrow">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </div>
                        <select class="sgi-select-hidden" v-model="detail.proactiveUnit">
                            <option value="minutes">分钟</option>
                            <option value="hours">小时</option>
                        </select>
                    </div>
                    <div class="settings-group-item">
                        <div class="sgi-label">间隔数值</div>
                        <input class="sgi-input" type="number" v-model.number="detail.proactiveInterval" min="1"
                            max="99" style="width:60px;text-align:right;" />
                    </div>
                    <div class="settings-group-item">
                        <div class="sgi-label">每日最多</div>
                        <input class="sgi-input" type="number" v-model.number="detail.proactiveMax" min="1" max="50"
                            style="width:60px;text-align:right;" />
                    </div>
                    <div class="settings-group-item">
                        <div class="sgi-label-wrap">
                            <div class="sgi-label">AI 自主决定</div>
                            <div class="sgi-desc">根据对话氛围自主发起</div>
                        </div>
                        <label class="toggle-sm">
                            <input type="checkbox" v-model="detail.proactiveAuto" />
                            <span class="slider-sm"></span>
                        </label>
                    </div>
                </template>
            </div>

            <!-- 回复分句 -->
            <div class="section-label-sm">回复分句</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label">最少条数</div>
                    <input class="sgi-input" type="number" v-model.number="detail.minMessages" min="1" max="10"
                        style="width:60px;text-align:right;" />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">最多条数</div>
                    <input class="sgi-input" type="number" v-model.number="detail.maxMessages" min="1" max="10"
                        style="width:60px;text-align:right;" />
                </div>
            </div>

            <!-- 聊天控制台 -->
            <div class="section-label-sm">聊天控制台</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">显示控制台</div>
                        <div class="sgi-desc">显示 token 和调试信息</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="detail.showDebug" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
            </div>

            <!-- 聊天壁纸 -->
            <div class="section-label-sm">聊天壁纸</div>
            <div class="settings-group">
                <div v-if="detail.chatWallpaper" class="wallpaper-preview-row">
                    <img :src="detail.chatWallpaper" />
                    <button class="wallpaper-clear-btn" @click="detail.chatWallpaper = ''">清除</button>
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">图片 URL</div>
                    <input class="sgi-input" v-model="detail.chatWallpaper" placeholder="https://..." />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">上传文件</div>
                    <label class="upload-label">
                        选择图片
                        <input type="file" accept="image/*" style="display:none" @change="handleChatWallpaperUpload" />
                    </label>
                </div>
            </div>

            <!-- 聊天主题 -->
            <div class="section-label-sm">聊天主题</div>
            <div class="theme-grid">
                <div v-for="t in chatThemes" :key="t.value" class="theme-item"
                    :class="{ active: detail.chatTheme === t.value }" @click="detail.chatTheme = t.value">
                    <div class="theme-preview" :class="'preview-' + t.value">
                        <div class="preview-bubble preview-ai"></div>
                        <div class="preview-bubble preview-user"></div>
                    </div>
                    <span class="theme-name">{{ t.label }}</span>
                </div>
            </div>
            <div class="settings-group" style="margin-top:10px;">
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">气泡合并</div>
                        <div class="sgi-desc">连续消息压缩间距</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="detail.bubbleMerge" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
            </div>

            <!-- 自定义主题 -->
            <div class="section-label-sm">自定义主题</div>

            <!-- 已保存的自定义方案 -->
            <div v-if="customThemes.length > 0" class="settings-group">
                <div v-for="(t, idx) in customThemes" :key="t.id" class="settings-group-item"
                    :class="{ active: detail.chatTheme === t.id }" @click="detail.chatTheme = t.id">
                    <div class="sgi-label">{{ t.name }}</div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div v-if="detail.chatTheme === t.id" class="active-dot"></div>
                        <button class="inline-del-btn" @click.stop="deleteCustomTheme(idx)">×</button>
                    </div>
                </div>
            </div>

            <!-- CSS 编辑器 -->
            <div class="settings-group">
                <div class="settings-group-item col-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">自定义 CSS</div>
                        <div class="sgi-desc">针对该角色的聊天界面样式</div>
                    </div>
                    <textarea class="sgi-textarea code-textarea" v-model="customThemeCSS" rows="6" placeholder=".bubble-wrapper.ai .bubble {
  background: rgba(200,180,220,0.2);
}
.bubble-wrapper.user .bubble {
  background: linear-gradient(135deg,#c8a0d0,#b080c0);
}"></textarea>
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">方案名称</div>
                    <input class="sgi-input" v-model="customThemeName" placeholder="给这个方案起个名字..." />
                </div>
            </div>
            <div class="btn-row">
                <button class="action-btn primary" @click="saveCustomTheme">保存方案</button>
                <button class="action-btn ghost" @click="previewCustomTheme">预览</button>
            </div>

            <!-- 进入对话 -->
            <div class="action-row">
                <button class="action-btn primary" @click="$router.push(`/chat/${personaId}`)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    进入对话
                </button>
            </div>

            <!-- 危险操作 -->
            <div class="section-label-sm" style="margin-top:28px;">操作</div>
            <div class="settings-group">
                <div class="settings-group-item danger-item" @click="clearMessages">
                    <div class="sgi-label" style="color:#C07070;">清空对话框</div>
                    <span class="sgi-value">保留记忆</span>
                </div>
                <div class="settings-group-item danger-item" @click="clearMemory">
                    <div class="sgi-label" style="color:#C07070;">清空记忆</div>
                </div>
                <div class="settings-group-item danger-item" @click="deletePersona">
                    <div class="sgi-label" style="color:#C07070;">删除对话记录</div>
                </div>
                <div class="settings-group-item danger-item" @click="deleteAi">
                    <div class="sgi-label" style="color:#C07070;">删除这个 AI</div>
                </div>
            </div>

        </div>

        <Transition name="toast-fade">
            <div v-if="saveMsg" class="save-toast-float">{{ saveMsg }}</div>
        </Transition>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/utils/api'

const route = useRoute()
const router = useRouter()
const personaId = route.params.personaId
const saveMsg = ref('')
const worldBooks = ref([])
const showAvatarEdit = ref(false)
const showWorldBooks = ref(false)
const customThemes = ref([])
const customThemeCSS = ref('')
const customThemeName = ref('')

function loadCustomThemes() {
    const saved = localStorage.getItem(`chat_custom_themes_${personaId}`)
    if (saved) customThemes.value = JSON.parse(saved)
}

function saveCustomTheme() {
    if (!customThemeCSS.value.trim()) return
    const id = 'custom_' + Date.now().toString(36)
    const name = customThemeName.value.trim() || `方案 ${customThemes.value.length + 1}`
    customThemes.value.push({ id, name, css: customThemeCSS.value })
    localStorage.setItem(`chat_custom_themes_${personaId}`, JSON.stringify(customThemes.value))
    detail.chatTheme = id
    customThemeName.value = ''
    saveMsg.value = '方案已保存 ✓'
    setTimeout(() => { saveMsg.value = '' }, 1500)
}

function deleteCustomTheme(idx) {
    const t = customThemes.value[idx]
    if (detail.chatTheme === t.id) detail.chatTheme = 'default'
    customThemes.value.splice(idx, 1)
    localStorage.setItem(`chat_custom_themes_${personaId}`, JSON.stringify(customThemes.value))
}

function previewCustomTheme() {
    const old = document.getElementById('preview-chat-css')
    if (old) old.remove()
    if (customThemeCSS.value.trim()) {
        const style = document.createElement('style')
        style.id = 'preview-chat-css'
        style.textContent = customThemeCSS.value
        document.head.appendChild(style)
        saveMsg.value = '预览已应用，进入聊天查看效果'
        setTimeout(() => { saveMsg.value = '' }, 2000)
    }
}

const chatThemes = [
    { value: 'default', label: '默认' },
    { value: 'minimal', label: '极简' },
    { value: '留白', label: '留白' },
    { value: 'together', label: '同框' },
    { value: 'liquid', label: '液态' },
    { value: 'wechat', label: '微信' },
]

const detail = reactive({
    name: '',
    avatar: '💬',
    avatarUrl: '',
    note: '',
    gender: '',
    content: '',
    worldBookId: '',
    worldBookIds: [],
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
    showDebug: false,
    customModel: '',
    temperature: null,
    emojiEnabled: false,
    chatTheme: 'default',
    bubbleMerge: false,
    customApiKey: '',
    customApiUrl: '',

})

const genderLabel = computed(() => {
    const map = { female: '女', male: '男', other: '其他', '': '未设置' }
    return map[detail.gender] || '未设置'
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
        if (data.show_debug !== undefined) detail.showDebug = data.show_debug
        if (data.custom_model) detail.customModel = data.custom_model
        if (data.temperature !== undefined && data.temperature !== null) detail.temperature = data.temperature
        if (data.emoji_enabled !== undefined) detail.emojiEnabled = data.emoji_enabled
        if (data.chat_theme) detail.chatTheme = data.chat_theme
        if (data.bubble_merge !== undefined) detail.bubbleMerge = data.bubble_merge
        if (data.custom_api_key) detail.customApiKey = data.custom_api_key
        if (data.custom_api_url) detail.customApiUrl = data.custom_api_url

    } catch (e) {
        console.error('加载详情失败:', e)
    }
}

async function loadWorldBooks() {
    try {
        const res = await api('/api/worldbooks')
        worldBooks.value = await res.json()
    } catch { }
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
                showDebug: detail.showDebug,
                customModel: detail.customModel,
                temperature: detail.temperature,
                emojiEnabled: detail.emojiEnabled,
                chatTheme: detail.chatTheme,
                bubbleMerge: detail.bubbleMerge,
                customApiKey: detail.customApiKey,
                customApiUrl: detail.customApiUrl,

            })
        })
        saveMsg.value = '已保存 ✓'
        setTimeout(() => { saveMsg.value = '' }, 2000)
    } catch {
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
            canvas.width = w; canvas.height = h
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
    reader.onload = (e) => { detail.chatWallpaper = e.target.result }
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
        if (detail.custom) {
            await api(`/api/personas/custom/${personaId}`, { method: 'DELETE' })
        } else {
            await api(`/api/personas/builtin/${personaId}/hide`, { method: 'POST' })
        }
        const hidden = JSON.parse(localStorage.getItem('hidden_personas') || '[]')
        if (!hidden.includes(personaId)) {
            hidden.push(personaId)
            localStorage.setItem('hidden_personas', JSON.stringify(hidden))
        }
        router.push('/')
    } catch {
        saveMsg.value = '删除失败'
    }
}

async function deleteAi() {
    if (!confirm('确定删除这个 AI？此操作不可恢复。')) return
    try {
        await api(`/api/messages/${personaId}`, { method: 'DELETE' })
        await api(`/api/memories/${personaId}/clear`, { method: 'DELETE' })
        await api(`/api/personas/custom/${personaId}`, { method: 'DELETE' })
        router.push('/')
    } catch {
        saveMsg.value = '删除失败'
    }
}

onMounted(() => {
    loadDetail()
    loadWorldBooks()
    loadCustomThemes()
})
</script>

<style scoped>
.detail-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
    background: linear-gradient(180deg, #FFFBFA 0%, #FFF0F2 60%, #FFE9ED 100%);
    box-sizing: border-box;
}

.settings-blob {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    filter: blur(60px);
}

.sb-tl {
    top: -40px;
    left: -50px;
    width: 220px;
    height: 220px;
    background: #F1DADD;
    opacity: 0.45;
}

.sb-br {
    bottom: 40px;
    right: -60px;
    width: 200px;
    height: 200px;
    background: #98CBEA;
    opacity: 0.2;
}

.detail-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(env(safe-area-inset-top, 44px) + 8px) 16px 4px;
    flex-shrink: 0;
    position: relative;
    z-index: 2;
}

.detail-back {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: saturate(180%) blur(12px);
    -webkit-backdrop-filter: saturate(180%) blur(12px);
    border: 1px solid rgba(255, 240, 242, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(217, 163, 175, 0.08);
}

.detail-back svg {
    width: 16px;
    height: 16px;
    stroke: #D9A3AF;
}

.detail-title {
    font-size: 17px;
    font-weight: 800;
    color: #4A3F41;
}

.detail-save-btn {
    background: none;
    border: none;
    font-size: 15px;
    color: #D9A3AF;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    padding: 4px 0;
}

.detail-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 16px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 32px);
    position: relative;
    z-index: 1;
}

.detail-content::-webkit-scrollbar {
    display: none;
}

/* 身份英雄区 */
.identity-hero {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 4px 24px;
}

.identity-avatar-wrap {
    position: relative;
    flex-shrink: 0;
}

.identity-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(255, 233, 237, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(217, 163, 175, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.8);
}

.identity-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-edit-btn {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(217, 163, 175, 0.3);
}

.avatar-edit-btn svg {
    width: 12px;
    height: 12px;
    stroke: white;
}

.identity-meta {
    flex: 1;
}

.identity-name {
    font-size: 22px;
    font-weight: 700;
    color: #4A3F41;
    letter-spacing: 0.3px;
}

.identity-sub {
    font-size: 13px;
    color: #B8A9AC;
    margin-top: 3px;
}

/* section 标签 */
.section-label-sm {
    font-size: 11px;
    font-weight: 700;
    color: #B8A9AC;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    padding: 0 4px 8px;
    margin-top: 20px;
    display: block;
}

.section-label-hint {
    font-size: 10px;
    color: #B8A9AC;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
    margin-left: 4px;
}

.count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(217, 163, 175, 0.2);
    color: #D9A3AF;
    font-size: 10px;
    font-weight: 700;
    border-radius: 10px;
    padding: 1px 6px;
    margin-left: 6px;
}

/* 卡片组 */
.settings-group {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 22px;
    overflow: hidden;
    margin-bottom: 10px;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.settings-group-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
    position: relative;
}

.settings-group-item:last-child {
    border-bottom: none;
}

.col-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
}

.sgi-label {
    font-size: 14px;
    color: #4A3F41;
    flex-shrink: 0;
}

.sgi-label-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.sgi-desc {
    font-size: 11px;
    color: #B8A9AC;
}

.sgi-right {
    display: flex;
    align-items: center;
    gap: 4px;
}

.sgi-value {
    font-size: 13px;
    color: #B8A9AC;
}

.sgi-arrow {
    width: 14px;
    height: 14px;
    stroke: #D4C8CA;
    transition: transform 0.2s;
}

.sgi-input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 14px;
    color: #4A3F41;
    text-align: right;
    font-family: inherit;
}

.sgi-input::placeholder {
    color: #D4C8CA;
}

.sgi-input-full {
    width: 100%;
    border: 1px solid rgba(255, 240, 242, 0.5);
    background: rgba(255, 255, 255, 0.5);
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 13px;
    color: #4A3F41;
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
}

.sgi-input-full::placeholder {
    color: #D4C8CA;
}

.sgi-textarea {
    width: 100%;
    border: 1px solid rgba(255, 240, 242, 0.5);
    background: rgba(255, 255, 255, 0.5);
    border-radius: 14px;
    padding: 12px 14px;
    font-size: 13px;
    color: #4A3F41;
    font-family: inherit;
    resize: none;
    outline: none;
    line-height: 1.6;
    box-sizing: border-box;
}

.sgi-textarea::placeholder {
    color: #D4C8CA;
}

.sgi-select-hidden {
    position: absolute;
    opacity: 0;
    right: 16px;
    width: 80px;
    height: 44px;
    cursor: pointer;
}

/* 开关 */
.toggle-sm {
    position: relative;
    width: 44px;
    height: 26px;
    flex-shrink: 0;
}

.toggle-sm input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider-sm {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(217, 163, 175, 0.2);
    border-radius: 13px;
    transition: 0.28s ease;
}

.slider-sm:before {
    position: absolute;
    content: "";
    height: 22px;
    width: 22px;
    left: 2px;
    bottom: 2px;
    background: white;
    border-radius: 50%;
    transition: 0.28s ease;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.toggle-sm input:checked+.slider-sm {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
}

.toggle-sm input:checked+.slider-sm:before {
    transform: translateX(18px);
}

/* 世界书勾选 */
.wb-checkbox-sm {
    width: 22px;
    height: 22px;
    border-radius: 7px;
    border: 1.5px solid rgba(217, 163, 175, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
}

.wb-checkbox-sm svg {
    width: 13px;
    height: 13px;
}

.wb-checkbox-sm.checked {
    background: #D9A3AF;
    border-color: #D9A3AF;
}

/* 壁纸预览 */
.wallpaper-preview-row {
    position: relative;
    height: 100px;
    overflow: hidden;
}

.wallpaper-preview-row img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.wallpaper-clear-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(74, 63, 65, 0.6);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
}

/* 上传按钮 */
.upload-label {
    padding: 6px 14px;
    border-radius: 10px;
    border: 1px solid rgba(217, 163, 175, 0.3);
    background: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    color: #6B5B5E;
    cursor: pointer;
    white-space: nowrap;
}

/* 聊天主题网格 */
.theme-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 10px;
}

.theme-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.theme-preview {
    width: 100%;
    aspect-ratio: 1.6;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.45);
    border: 2px solid rgba(255, 240, 242, 0.4);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(217, 163, 175, 0.08);
}

.theme-item.active .theme-preview {
    border-color: #D9A3AF;
    background: rgba(217, 163, 175, 0.1);
    box-shadow: 0 4px 16px rgba(217, 163, 175, 0.2);
}

.preview-bubble {
    height: 10px;
    border-radius: 10px;
}

.preview-ai {
    width: 60%;
    align-self: flex-start;
    background: rgba(217, 163, 175, 0.25);
}

.preview-user {
    width: 50%;
    align-self: flex-end;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    opacity: 0.7;
}

/* 微信主题预览 */
.preview-wechat .preview-ai {
    background: #F0F0F0;
}

.preview-wechat .preview-user {
    background: #95EC69;
    opacity: 1;
}

/* 液态主题预览 */
.preview-liquid .preview-ai {
    background: rgba(216, 205, 234, 0.4);
    border-radius: 20px;
    height: 14px;
}

.preview-liquid .preview-user {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    border-radius: 20px;
    height: 14px;
    opacity: 1;
}

/* 极简预览 */
.preview-minimal .preview-ai {
    background: rgba(200, 200, 200, 0.3);
}

.preview-minimal .preview-user {
    background: rgba(217, 163, 175, 0.6);
}

.theme-name {
    font-size: 11px;
    color: #6B5B5E;
    font-weight: 500;
}

.theme-item.active .theme-name {
    color: #D9A3AF;
    font-weight: 700;
}

/* 进入对话按钮 */
.action-row {
    margin-top: 20px;
    margin-bottom: 4px;
}

.action-btn {
    width: 100%;
    height: 48px;
    border-radius: 16px;
    border: none;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
}

.action-btn svg {
    width: 18px;
    height: 18px;
}

.action-btn.primary {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    box-shadow: 0 6px 20px rgba(217, 163, 175, 0.35);
}

.action-btn.primary:active {
    transform: scale(0.97);
}

/* 危险操作 */
.danger-item {
    cursor: pointer;
}

.danger-item:active {
    background: rgba(192, 112, 112, 0.04);
}

/* 保存提示 */
.save-toast-float {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(74, 63, 65, 0.85);
    color: white;
    padding: 8px 20px;
    border-radius: 20px;
    font-size: 13px;
    backdrop-filter: blur(10px);
    z-index: 100;
    white-space: nowrap;
}

.toast-fade-enter-active {
    transition: opacity 0.3s;
}

.toast-fade-leave-active {
    transition: opacity 0.5s;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
    opacity: 0;
}

.code-textarea {
    font-family: 'Menlo', 'Monaco', monospace;
    font-size: 12px;
    line-height: 1.7;
}

.active-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #D9A3AF;
    flex-shrink: 0;
}

.inline-del-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: #B8A9AC;
    cursor: pointer;
    padding: 0 4px;
    opacity: 0.5;
    line-height: 1;
}

.btn-row {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
}

.action-btn {
    flex: 1;
    height: 44px;
    border-radius: 16px;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.25s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.action-btn.primary {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    box-shadow: 0 6px 16px rgba(217, 163, 175, 0.3);
}

.action-btn.ghost {
    background: rgba(255, 255, 255, 0.5);
    color: #6B5B5E;
    border: 1px solid rgba(255, 240, 242, 0.5);
}

.action-btn:active {
    transform: scale(0.97);
}
</style>
