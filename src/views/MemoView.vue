```vue
<template>
    <div class="memo-page">
        <div class="memo-blob mb-tl"></div>
        <div class="memo-blob mb-br"></div>

        <!-- 顶部导航 -->
        <div class="memo-nav">
            <button class="memo-back" @click="goBack">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <div class="memo-header-title">
                <span class="memo-title">备忘录</span>
                <span class="memo-subtitle">Memo</span>
            </div>
            <div class="memo-nav-actions">
                <button class="memo-icon-btn" @click="toggleViewMode">
                    <svg v-if="viewMode === 'grid'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" stroke-width="3" />
                        <line x1="3" y1="12" x2="3.01" y2="12" stroke-width="3" />
                        <line x1="3" y1="18" x2="3.01" y2="18" stroke-width="3" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                    </svg>
                </button>
                <button class="memo-add-btn" @click="openNew">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- tab 切换 -->
        <div class="memo-tabs">
            <button class="memo-tab" :class="{ active: currentTab === 'user' }" @click="currentTab = 'user'">
                <div class="tab-avatar">
                    <img v-if="userAvatar && (userAvatar.startsWith('http') || userAvatar.startsWith('data'))"
                        :src="userAvatar" />
                    <span v-else>{{ userAvatar || '🌙' }}</span>
                </div>
                {{ userName || '我的' }}
            </button>
            <button class="memo-tab" :class="{ active: currentTab === 'ai' }" @click="currentTab = 'ai'">
                <div class="tab-avatar">
                    <img v-if="aiAvatarUrl" :src="aiAvatarUrl" />
                    <span v-else>{{ aiAvatar || '💬' }}</span>
                </div>
                {{ aiName || 'TA的' }}
            </button>
        </div>

        <!-- 搜索栏 + 分组切换 -->
        <div class="memo-search-wrap">
            <div class="memo-search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </svg>
                <input v-model="searchQuery" placeholder="搜索备忘录..." />
                <button v-if="searchQuery" @click="searchQuery = ''">×</button>
            </div>
            <div v-if="currentTab === 'user'" class="inline-group-btns">
                <button class="inline-group-btn" :class="{ active: groupBy === 'none' }"
                    @click="groupBy = 'none'">全部</button>
                <button class="inline-group-btn" :class="{ active: groupBy === 'date' }"
                    @click="groupBy = 'date'">日期</button>
                <button class="inline-group-btn" :class="{ active: groupBy === 'tag' }"
                    @click="groupBy = 'tag'">标签</button>
            </div>
        </div>

        <!-- 标签过滤栏 -->
        <div v-if="allTags.length > 0" class="tag-filter-bar">
            <button class="tag-filter-chip" :class="{ active: !activeTagFilter }"
                @click="activeTagFilter = ''">全部</button>
            <button v-for="tag in allTags" :key="tag" class="tag-filter-chip"
                :class="{ active: activeTagFilter === tag }"
                @click="activeTagFilter = activeTagFilter === tag ? '' : tag">
                #{{ tag }}
            </button>
        </div>

        <!-- 分组/列表内容 -->
        <div class="memo-content">

            <!-- user tab -->
            <template v-if="currentTab === 'user'">
                <div v-if="filteredUserMemos.length === 0" class="memo-empty">
                    <p class="empty-icon">📝</p>
                    <p class="empty-title">还没有备忘录</p>
                    <p class="empty-sub">点击右上角 + 新建一条</p>
                </div>

                <template v-else>
                    <!-- 分组视图 -->
                    <template v-if="groupBy !== 'none'">
                        <div v-for="group in groupedUserMemos" :key="group.key" class="memo-group">
                            <div class="memo-group-header" @click="toggleGroup(group.key)">
                                <span class="group-label">{{ group.label }}</span>
                                <span class="group-count">{{ group.items.length }}</span>
                                <svg class="group-chevron" :class="{ open: !collapsedGroups.has(group.key) }"
                                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                    stroke-linecap="round">
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </div>
                            <div v-if="!collapsedGroups.has(group.key)"
                                :class="viewMode === 'grid' ? 'memo-grid' : 'memo-list'">
                                <MemoCard v-for="memo in group.items" :key="memo.id" :memo="memo" :view-mode="viewMode"
                                    @click="openEdit(memo)" @delete="deleteMemo(memo.id)" />
                            </div>
                        </div>
                    </template>

                    <!-- 普通视图 -->
                    <div v-else :class="viewMode === 'grid' ? 'memo-grid' : 'memo-list'">
                        <MemoCard v-for="memo in filteredUserMemos" :key="memo.id" :memo="memo" :view-mode="viewMode"
                            @click="openEdit(memo)" @delete="deleteMemo(memo.id)" />
                    </div>
                </template>
            </template>

            <!-- ai tab -->
            <template v-if="currentTab === 'ai'">
                <div class="ai-memo-hint">
                    <span>{{ aiName }} 会不定期在这里留下一些碎片</span>
                    <button class="generate-ai-memo-btn" @click="generateAiMemo" :disabled="generating">
                        {{ generating ? '生成中...' : '✦ 让他写一条' }}
                    </button>
                </div>
                <div v-if="filteredAiMemos.length === 0" class="memo-empty">
                    <p class="empty-icon">💭</p>
                    <p class="empty-title">还没有留下任何东西</p>
                    <p class="empty-sub">点击上方让他写一条</p>
                </div>
                <div v-else :class="viewMode === 'grid' ? 'memo-grid' : 'memo-list'">
                    <MemoCard v-for="memo in filteredAiMemos" :key="memo.id" :memo="memo" :view-mode="viewMode"
                        :is-ai="true" @click="openAiMemo(memo)" @delete="deleteAiMemo(memo.id)" />
                </div>
            </template>

        </div>

        <!-- 新建/编辑弹窗 -->
        <Teleport to="body">
            <Transition name="memo-slide">
                <div v-if="showEditor" class="memo-editor-overlay">
                    <div class="memo-editor" :style="{ background: editingMemo.color || '#FFFBFA' }">
                        <div class="editor-nav">
                            <button class="editor-back" @click="closeEditor">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                    stroke-linecap="round">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span class="editor-date">{{ formatDate(editingMemo.updatedAt || new Date().toISOString())
                            }}</span>
                            <div class="editor-nav-right">
                                <button class="editor-delete-btn" v-if="editingMemo.id"
                                    @click="deleteMemo(editingMemo.id); showEditor = false">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6l-1 14H6L5 6" />
                                    </svg>
                                </button>
                                <button class="editor-save" @click="saveMemo">完成</button>
                            </div>
                        </div>

                        <!-- 颜色选择 -->
                        <div class="color-picker-row">
                            <div v-for="c in memoColors" :key="c" class="color-dot" :style="{ background: c }"
                                :class="{ active: editingMemo.color === c }" @click="editingMemo.color = c"></div>
                        </div>

                        <!-- 标题 -->
                        <input class="editor-title-input" v-model="editingMemo.title" placeholder="标题（可选）" />

                        <!-- 内容 -->
                        <textarea class="editor-content-input" v-model="editingMemo.content" placeholder="写点什么..."
                            autofocus></textarea>

                        <!-- 标签 -->
                        <div class="editor-tags-row">
                            <div class="tags-list">
                                <span v-for="(tag, idx) in editingMemo.tags" :key="idx" class="memo-tag editable-tag">
                                    #{{ tag }}
                                    <button @click="removeTag(idx)">×</button>
                                </span>
                            </div>
                            <div class="tag-input-wrap">
                                <input v-model="newTag" class="tag-input" placeholder="添加标签..." @keyup.enter="addTag" />
                                <button class="tag-add-btn" @click="addTag">+</button>
                            </div>
                            <!-- 已有标签快速添加 -->
                            <div v-if="existingTags.length > 0" class="existing-tags">
                                <button v-for="tag in existingTags" :key="tag" class="existing-tag-chip"
                                    :class="{ used: editingMemo.tags.includes(tag) }" @click="toggleExistingTag(tag)">
                                    #{{ tag }}
                                </button>
                            </div>
                        </div>

                        <!-- 图片 -->
                        <div class="editor-images">
                            <div v-for="(img, idx) in editingMemo.images" :key="idx" class="editor-img-item">
                                <img :src="img" @click="previewImg = img" />
                                <button class="img-remove" @click="removeImage(idx)">×</button>
                            </div>
                            <label class="img-add-btn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                    stroke-linecap="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <path d="M21 15l-5-5L5 21" />
                                </svg>
                                <input type="file" accept="image/*" multiple style="display:none"
                                    @change="handleImageUpload" />
                            </label>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- AI 备忘录查看弹窗 -->
        <Teleport to="body">
            <Transition name="modal-pop">
                <div v-if="showAiMemoModal" class="sp-overlay" @click.self="showAiMemoModal = false">
                    <div class="ai-memo-modal">
                        <div class="ai-memo-modal-header">
                            <div class="ai-memo-avatar">
                                <img v-if="aiAvatarUrl" :src="aiAvatarUrl" />
                                <span v-else>{{ aiAvatar || '💬' }}</span>
                            </div>
                            <div class="ai-memo-meta">
                                <span class="ai-memo-name">{{ aiName }}</span>
                                <span class="ai-memo-date">{{ formatDate(viewingAiMemo?.createdAt) }}</span>
                            </div>
                        </div>
                        <p v-if="viewingAiMemo?.title" class="ai-memo-modal-title">{{ viewingAiMemo.title }}</p>
                        <p class="ai-memo-modal-content">{{ viewingAiMemo?.content }}</p>
                        <div v-if="viewingAiMemo?.tags?.length > 0" class="memo-card-tags">
                            <span v-for="tag in viewingAiMemo.tags" :key="tag" class="memo-tag">#{{ tag }}</span>
                        </div>
                        <button class="ai-memo-close-btn" @click="showAiMemoModal = false">收起</button>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- 图片预览 -->
        <Teleport to="body">
            <div v-if="previewImg" class="img-preview-overlay" @click="previewImg = null">
                <img :src="previewImg" />
            </div>
        </Teleport>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/utils/api'

// 内联 MemoCard 组件
const MemoCard = {
    props: {
        memo: Object,
        viewMode: { type: String, default: 'grid' },
        isAi: { type: Boolean, default: false },
    },
    emits: ['click', 'delete'],
    template: `
        <div class="memo-card" :class="[{ 'memo-list-item': viewMode === 'list', 'ai-memo-card': isAi }]"
            :style="{ background: memo.color || 'rgba(255,255,255,0.55)' }"
            @click="$emit('click')">
            <div class="memo-card-header">
                <span class="memo-card-date">{{ formatDate(memo.updatedAt || memo.createdAt) }}</span>
                <button class="memo-card-delete" @click.stop="$emit('delete')">×</button>
            </div>
            <p v-if="memo.title" class="memo-card-title">{{ memo.title }}</p>
            <p class="memo-card-body">{{ memo.content }}</p>
            <div v-if="memo.images && memo.images.length > 0" class="memo-card-imgs">
                <img v-for="(img, idx) in memo.images.slice(0, viewMode === 'list' ? 4 : 3)" :key="idx" :src="img" />
                <div v-if="memo.images.length > (viewMode === 'list' ? 4 : 3)" class="memo-img-more">
                    +{{ memo.images.length - (viewMode === 'list' ? 4 : 3) }}
                </div>
            </div>
            <div v-if="memo.tags && memo.tags.length > 0" class="memo-card-tags">
                <span v-for="tag in memo.tags" :key="tag" class="memo-tag">#{{ tag }}</span>
            </div>
        </div>
    `,
    methods: {
        formatDate(ts) {
            if (!ts) return ''
            const d = new Date(ts)
            const now = new Date()
            const diff = now - d
            const days = Math.floor(diff / 86400000)
            if (days === 0) return `今天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
            if (days === 1) return '昨天'
            if (days < 7) return `${days}天前`
            return `${d.getMonth() + 1}月${d.getDate()}日`
        }
    }
}

const router = useRouter()

const currentTab = ref('user')
const searchQuery = ref('')
const activeTagFilter = ref('')
const viewMode = ref(localStorage.getItem('memo_view_mode') || 'grid')
const groupBy = ref('none')
const collapsedGroups = ref(new Set())
const showEditor = ref(false)
const showAiMemoModal = ref(false)
const viewingAiMemo = ref(null)
const generating = ref(false)
const previewImg = ref(null)
const newTag = ref('')

const userName = ref(localStorage.getItem('user_name') || '我')
const userAvatar = ref(localStorage.getItem('home_user_avatar') || '')
const aiName = ref('TA')
const aiAvatar = ref('💬')
const aiAvatarUrl = ref('')
const personaId = ref('')

const userMemos = ref([])
const aiMemos = ref([])

const memoColors = [
    'rgba(255,255,255,0.85)',
    'rgba(255,233,237,0.9)',
    'rgba(216,205,234,0.85)',
    'rgba(152,203,234,0.7)',
    'rgba(184,212,200,0.8)',
    'rgba(245,234,208,0.9)',
    'rgba(232,192,201,0.75)',
    'rgba(200,200,232,0.8)',
]

const editingMemo = ref({
    id: null,
    title: '',
    content: '',
    color: 'rgba(255,255,255,0.85)',
    tags: [],
    images: [],
    createdAt: '',
    updatedAt: '',
})

// 所有标签（用于过滤栏）
const allTags = computed(() => {
    const memos = currentTab.value === 'user' ? userMemos.value : aiMemos.value
    const tags = new Set()
    memos.forEach(m => (m.tags || []).forEach(t => tags.add(t)))
    return [...tags]
})

// 现有标签（编辑时快速添加）
const existingTags = computed(() => {
    const tags = new Set()
    userMemos.value.forEach(m => (m.tags || []).forEach(t => tags.add(t)))
    return [...tags].filter(t => !editingMemo.value.tags.includes(t))
})

function toggleViewMode() {
    viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
    localStorage.setItem('memo_view_mode', viewMode.value)
}

function toggleGroup(key) {
    if (collapsedGroups.value.has(key)) {
        collapsedGroups.value.delete(key)
    } else {
        collapsedGroups.value.add(key)
    }
}

const filteredUserMemos = computed(() => {
    let result = userMemos.value
    if (activeTagFilter.value) {
        result = result.filter(m => (m.tags || []).includes(activeTagFilter.value))
    }
    if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(m =>
            (m.title || '').toLowerCase().includes(q) ||
            (m.content || '').toLowerCase().includes(q) ||
            (m.tags || []).some(t => t.toLowerCase().includes(q))
        )
    }
    return result
})

const filteredAiMemos = computed(() => {
    let result = aiMemos.value
    if (activeTagFilter.value) {
        result = result.filter(m => (m.tags || []).includes(activeTagFilter.value))
    }
    if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(m =>
            (m.title || '').toLowerCase().includes(q) ||
            (m.content || '').toLowerCase().includes(q) ||
            (m.tags || []).some(t => t.toLowerCase().includes(q))
        )
    }
    return result
})

const groupedUserMemos = computed(() => {
    const memos = filteredUserMemos.value
    if (groupBy.value === 'date') {
        const groups = {}
        memos.forEach(m => {
            const d = new Date(m.updatedAt || m.createdAt)
            const now = new Date()
            const diff = Math.floor((now - d) / 86400000)
            let key, label
            if (diff === 0) { key = 'today'; label = '今天' }
            else if (diff === 1) { key = 'yesterday'; label = '昨天' }
            else if (diff < 7) { key = 'week'; label = '本周' }
            else if (diff < 30) { key = 'month'; label = '本月' }
            else { key = 'older'; label = '更早' }
            if (!groups[key]) groups[key] = { key, label, items: [] }
            groups[key].items.push(m)
        })
        return Object.values(groups)
    }
    if (groupBy.value === 'tag') {
        const groups = {}
        const untagged = []
        memos.forEach(m => {
            if (!m.tags || m.tags.length === 0) {
                untagged.push(m)
            } else {
                m.tags.forEach(tag => {
                    if (!groups[tag]) groups[tag] = { key: tag, label: `#${tag}`, items: [] }
                    groups[tag].items.push(m)
                })
            }
        })
        const result = Object.values(groups)
        if (untagged.length > 0) result.push({ key: 'untagged', label: '未分类', items: untagged })
        return result
    }
    return [{ key: 'all', label: '全部', items: memos }]
})

function formatDate(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diff = now - d
    const days = Math.floor(diff / 86400000)
    if (days === 0) return `今天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return `${d.getMonth() + 1}月${d.getDate()}日`
}

function loadMemos() {
    const saved = localStorage.getItem('user_memos')
    userMemos.value = saved ? JSON.parse(saved) : []
    const aiSaved = localStorage.getItem(`ai_memos_${personaId.value}`)
    aiMemos.value = aiSaved ? JSON.parse(aiSaved) : []
}

function saveMemos() {
    localStorage.setItem('user_memos', JSON.stringify(userMemos.value))
}

function saveAiMemos() {
    localStorage.setItem(`ai_memos_${personaId.value}`, JSON.stringify(aiMemos.value))
}

function openNew() {
    editingMemo.value = {
        id: null,
        title: '',
        content: '',
        color: 'rgba(255,255,255,0.85)',
        tags: [],
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
    showEditor.value = true
}

function openEdit(memo) {
    editingMemo.value = { ...memo, tags: [...(memo.tags || [])], images: [...(memo.images || [])] }
    showEditor.value = true
}

function openAiMemo(memo) {
    viewingAiMemo.value = memo
    showAiMemoModal.value = true
}

function closeEditor() {
    showEditor.value = false
}

function saveMemo() {
    if (!editingMemo.value.content.trim() && !editingMemo.value.title.trim()) {
        showEditor.value = false
        return
    }
    const now = new Date().toISOString()
    if (editingMemo.value.id) {
        const idx = userMemos.value.findIndex(m => m.id === editingMemo.value.id)
        if (idx > -1) {
            userMemos.value[idx] = { ...editingMemo.value, updatedAt: now }
        }
    } else {
        userMemos.value.unshift({
            ...editingMemo.value,
            id: `memo_${Date.now()}`,
            createdAt: now,
            updatedAt: now,
        })
    }
    saveMemos()
    showEditor.value = false
}

function deleteMemo(id) {
    if (!confirm('删除这条备忘录？')) return
    userMemos.value = userMemos.value.filter(m => m.id !== id)
    saveMemos()
}

function deleteAiMemo(id) {
    if (!confirm('删除这条备忘录？')) return
    aiMemos.value = aiMemos.value.filter(m => m.id !== id)
    saveAiMemos()
}

function addTag() {
    const tag = newTag.value.trim().replace(/^#/, '')
    if (!tag) return
    if (!editingMemo.value.tags.includes(tag)) {
        editingMemo.value.tags.push(tag)
    }
    newTag.value = ''
}

function removeTag(idx) {
    editingMemo.value.tags.splice(idx, 1)
}

function toggleExistingTag(tag) {
    const idx = editingMemo.value.tags.indexOf(tag)
    if (idx > -1) editingMemo.value.tags.splice(idx, 1)
    else editingMemo.value.tags.push(tag)
}

function handleImageUpload(event) {
    const files = Array.from(event.target.files)
    files.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => { editingMemo.value.images.push(e.target.result) }
        reader.readAsDataURL(file)
    })
    event.target.value = ''
}

function removeImage(idx) {
    editingMemo.value.images.splice(idx, 1)
}

async function generateAiMemo() {
    generating.value = true
    try {
        const res = await api(`/api/memo/ai-generate/${personaId.value}`, { method: 'POST' })
        const data = await res.json()
        if (data.memo) {
            aiMemos.value.unshift({
                id: `ai_memo_${Date.now()}`,
                title: data.memo.title || '',
                content: data.memo.content,
                tags: data.memo.tags || [],
                color: data.memo.color || 'rgba(255,255,255,0.45)',
                createdAt: new Date().toISOString(),
            })
            saveAiMemos()
        }
    } catch (e) {
        console.error('生成失败:', e)
    } finally {
        generating.value = false
    }
}

async function loadAiInfo() {
    try {
        const latestRes = await api('/api/messages/latest-persona')
        const latestData = await latestRes.json()
        personaId.value = latestData.personaId || 'xiaorou'
        const detailRes = await api(`/api/persona/${personaId.value}`)
        const detail = await detailRes.json()
        aiName.value = detail.note || detail.name || 'TA'
        aiAvatar.value = detail.avatar || '💬'
        aiAvatarUrl.value = detail.avatarUrl || ''
    } catch { }
}

function goBack() {
    router.push('/')
}

onMounted(async () => {
    await loadAiInfo()
    loadMemos()
})
</script>

<style scoped>
.memo-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
    background: linear-gradient(180deg, #FFFBFA 0%, #FFF0F2 60%, #FFE9ED 100%);
    box-sizing: border-box;
}

.memo-blob {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    filter: blur(60px);
}

.mb-tl {
    top: -40px;
    left: -50px;
    width: 220px;
    height: 220px;
    background: #F1DADD;
    opacity: 0.45;
}

.mb-br {
    bottom: 40px;
    right: -60px;
    width: 200px;
    height: 200px;
    background: #98CBEA;
    opacity: 0.2;
}

.memo-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(env(safe-area-inset-top, 44px) + 8px) 16px 4px;
    flex-shrink: 0;
    position: relative;
    z-index: 2;
}

.memo-header-title {
    flex: 1;
    display: flex;
    align-items: baseline;
    gap: 8px;
    justify-content: center;
}

.memo-title {
    font-size: 22px;
    font-weight: 800;
    color: #4A3F41;
}

.memo-subtitle {
    font-size: 11px;
    color: #B8A9AC;
    letter-spacing: 1.5px;
}

.memo-nav-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.memo-back,
.memo-add-btn,
.memo-icon-btn {
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
}

.memo-back svg,
.memo-add-btn svg,
.memo-icon-btn svg {
    width: 18px;
    height: 18px;
    stroke: #D9A3AF;
}

.memo-tabs {
    display: flex;
    gap: 8px;
    padding: 10px 16px;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}

.memo-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 18px;
    border: 1px solid rgba(255, 240, 242, 0.4);
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(16px);
    -webkit-backdrop-filter: saturate(180%) blur(16px);
    cursor: pointer;
    font-size: 13px;
    color: #B8A9AC;
    font-family: inherit;
    transition: all 0.2s;
}

.memo-tab.active {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    border-color: transparent;
}

.tab-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    background: rgba(255, 233, 237, 0.6);
    flex-shrink: 0;
}

.tab-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.memo-search-wrap {
    padding: 4px 16px 6px;
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.memo-search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(217, 163, 175, 0.2);
    border-radius: 14px;
    padding: 8px 14px;
    height: 40px;
}

.memo-search-box svg {
    width: 16px;
    height: 16px;
    stroke: #B8A9AC;
    flex-shrink: 0;
}

.memo-search-box input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 13px;
    color: #4A3F41;
    outline: none;
    font-family: inherit;
}

.memo-search-box input::placeholder {
    color: #D4C8CA;
}

.memo-search-box button {
    background: none;
    border: none;
    font-size: 16px;
    color: #B8A9AC;
    cursor: pointer;
}

/* 标签过滤栏 */
.tag-filter-bar {
    display: flex;
    gap: 6px;
    padding: 4px 16px 8px;
    overflow-x: auto;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}

.tag-filter-bar::-webkit-scrollbar {
    display: none;
}

.tag-filter-chip {
    padding: 4px 12px;
    border-radius: 12px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.45);
    font-size: 11px;
    color: #B8A9AC;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all 0.15s;
}

.tag-filter-chip.active {
    background: rgba(217, 163, 175, 0.15);
    color: #D9A3AF;
    border-color: rgba(217, 163, 175, 0.4);
}

/* 内容区 */
.memo-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
    position: relative;
    z-index: 1;
}

.memo-content::-webkit-scrollbar {
    display: none;
}

.memo-empty {
    text-align: center;
    padding: 48px 24px;
}

.empty-icon {
    font-size: 28px;
    margin-bottom: 12px;
}

.empty-title {
    font-size: 14px;
    color: #4A3F41;
    margin-bottom: 6px;
}

.empty-sub {
    font-size: 12px;
    color: #B8A9AC;
}

.ai-memo-hint {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 4px 12px;
    font-size: 12px;
    color: #B8A9AC;
}

.generate-ai-memo-btn {
    padding: 6px 14px;
    border-radius: 12px;
    border: 1px solid rgba(217, 163, 175, 0.3);
    background: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    color: #D9A3AF;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
}

.generate-ai-memo-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* 分组 */
.memo-group {
    margin-bottom: 8px;
}

.memo-group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 4px;
    cursor: pointer;
}

.group-label {
    font-size: 11px;
    font-weight: 700;
    color: #B8A9AC;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    flex: 1;
}

.group-count {
    font-size: 11px;
    color: #D4C8CA;
}

.group-chevron {
    width: 14px;
    height: 14px;
    stroke: #D4C8CA;
    transition: transform 0.2s;
}

.group-chevron.open {
    transform: rotate(180deg);
}

/* 网格/列表视图 */
.memo-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding-bottom: 8px;
}

.memo-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 8px;
}

/* 备忘录卡片 */
.memo-card {
    border-radius: 20px;
    padding: 14px;
    cursor: pointer;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 0.6);
    box-shadow: 0 4px 16px rgba(217, 163, 175, 0.08);
    transition: transform 0.15s;
    min-height: 100px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.memo-list-item {
    min-height: auto;
    flex-direction: row;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 8px;
    border-radius: 16px;
}

.memo-list-item .memo-card-header {
    width: 100%;
}

.memo-list-item .memo-card-title {
    width: 100%;
}

.memo-list-item .memo-card-body {
    width: 100%;
    line-clamp: 2;
    -webkit-line-clamp: 2;
}

.memo-card:active {
    transform: scale(0.97);
}

.ai-memo-card {
    border: 1px solid rgba(217, 163, 175, 0.2);
}

.memo-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.memo-card-date {
    font-size: 10px;
    color: #B8A9AC;
}

.memo-card-delete {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(217, 163, 175, 0.15);
    border: none;
    font-size: 14px;
    color: #B8A9AC;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
}

.memo-card:hover .memo-card-delete {
    opacity: 1;
}

.memo-card:active .memo-card-delete {
    opacity: 1;
}

.memo-card-title {
    font-size: 13px;
    font-weight: 700;
    color: #4A3F41;
    line-height: 1.4;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.memo-card-body {
    font-size: 12px;
    color: #6B5B5E;
    line-height: 1.6;
    flex: 1;
    display: -webkit-box;
    line-clamp: 4;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.memo-card-imgs {
    display: flex;
    gap: 4px;
    margin-top: 4px;
}

.memo-card-imgs img {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
}

.memo-img-more {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    background: rgba(217, 163, 175, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: #B8A9AC;
}

.memo-card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 2px;
}

.memo-tag {
    font-size: 10px;
    color: #D9A3AF;
    background: rgba(217, 163, 175, 0.1);
    padding: 2px 7px;
    border-radius: 8px;
}

/* 编辑器 */
.memo-editor-overlay {
    position: fixed;
    inset: 0;
    z-index: 900;
    display: flex;
    flex-direction: column;
}

.memo-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
    transition: background 0.3s;
}

.editor-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    flex-shrink: 0;
}

.editor-back {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 240, 242, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.editor-back svg {
    width: 16px;
    height: 16px;
    stroke: #D9A3AF;
}

.editor-date {
    font-size: 12px;
    color: #B8A9AC;
}

.editor-nav-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

.editor-delete-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(192, 112, 112, 0.1);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.editor-delete-btn svg {
    width: 14px;
    height: 14px;
    stroke: #C070;
}

.editor-save {
    padding: 6px 16px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
}

.color-picker-row {
    display: flex;
    gap: 8px;
    padding: 8px 16px;
    flex-shrink: 0;
}

.color-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.15s;
    flex-shrink: 0;
}

.color-dot.active {
    border-color: #D9A3AF;
    transform: scale(1.15);
}

.editor-title-input {
    width: 100%;
    padding: 8px 16px;
    border: none;
    background: transparent;
    font-size: 20px;
    font-weight: 700;
    color: #4A3F41;
    font-family: inherit;
    outline: none;
    flex-shrink: 0;
    box-sizing: border-box;
}

.editor-title-input::placeholder {
    color: #D4C8CA;
}

.editor-content-input {
    flex: 1;
    width: 100%;
    padding: 8px 16px;
    border: none;
    background: transparent;
    font-size: 15px;
    color: #4A3F41;
    font-family: inherit;
    outline: none;
    resize: none;
    line-height: 1.7;
    box-sizing: border-box;
}

.editor-content-input::placeholder {
    color: #D4C8CA;
}

.editor-tags-row {
    padding: 8px 16px;
    flex-shrink: 0;
    border-top: 1px solid rgba(217, 163, 175, 0.08);
}

.tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
}

.editable-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
}

.editable-tag button {
    background: none;
    border: none;
    font-size: 12px;
    color: #D9A3AF;
    cursor: pointer;
    padding: 0;
    line-height: 1;
}

.tag-input-wrap {
    display: flex;
    gap: 8px;
    align-items: center;
}

.tag-input {
    flex: 1;
    border: 1px solid rgba(217, 163, 175, 0.2);
    border-radius: 10px;
    padding: 6px 12px;
    font-size: 12px;
    color: #4A3F41;
    background: rgba(255, 255, 255, 0.5);
    font-family: inherit;
    outline: none;
}

.tag-input::placeholder {
    color: #D4C8CA;
}

.tag-add-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(217, 163, 175, 0.15);
    border: none;
    font-size: 18px;
    color: #D9A3AF;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.existing-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
}

.existing-tag-chip {
    padding: 3px 10px;
    border-radius: 10px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.4);
    font-size: 11px;
    color: #B8A9AC;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
}

.existing-tag-chip.used {
    background: rgba(217, 163, 175, 0.15);
    color: #D9A3AF;
    border-color: rgba(217, 163, 175, 0.4);
}

.editor-images {
    display: flex;
    gap: 8px;
    padding: 8px 16px calc(env(safe-area-inset-bottom, 0px) + 12px);
    flex-shrink: 0;
    overflow-x: auto;
    border-top: 1px solid rgba(217, 163, 175, 0.08);
}

.editor-images::-webkit-scrollbar {
    display: none;
}

.editor-img-item {
    position: relative;
    flex-shrink: 0;
}

.editor-img-item img {
    width: 72px;
    height: 72px;
    border-radius: 12px;
    object-fit: cover;
    cursor: pointer;
}

.img-remove {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(74, 63, 65, 0.7);
    border: none;
    color: white;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.img-add-btn {
    width: 72px;
    height: 72px;
    border-radius: 12px;
    border: 1.5px dashed rgba(217, 163, 175, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.3);
}

.img-add-btn svg {
    width: 24px;
    height: 24px;
    stroke: #D4C8CA;
}

/* AI 备忘录弹窗 */
.sp-overlay {
    position: fixed;
    inset: 0;
    z-index: 800;
    background: rgba(74, 63, 65, 0.25);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

.ai-memo-modal {
    width: 100%;
    max-width: 320px;
    background: rgba(255, 252, 252, 0.97);
    border-radius: 24px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 20px 60px rgba(217, 163, 175, 0.2);
}

.ai-memo-modal-header {
    display: flex;
    align-items: center;
    gap: 10px;
}

.ai-memo-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba(255, 233, 237, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    overflow: hidden;
    border: 2px solid rgba(255, 255, 255, 0.8);
    flex-shrink: 0;
}

.ai-memo-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.ai-memo-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.ai-memo-name {
    font-size: 13px;
    font-weight: 600;
    color: #4A3F41;
}

.ai-memo-date {
    font-size: 11px;
    color: #B8A9AC;
}

.ai-memo-modal-title {
    font-size: 16px;
    font-weight: 700;
    color: #4A3F41;
}

.ai-memo-modal-content {
    font-size: 14px;
    color: #6B5B5E;
    line-height: 1.7;
    white-space: pre-wrap;
}

.ai-memo-close-btn {
    width: 100%;
    height: 44px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    margin-top: 4px;
}

/* 图片预览 */
.img-preview-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.88);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.img-preview-overlay img {
    max-width: 95%;
    max-height: 95%;
    object-fit: contain;
    border-radius: 8px;
}

/* 过渡动画 */
.memo-slide-enter-active {
    transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.3s;
}

.memo-slide-leave-active {
    transition: transform 0.25s ease, opacity 0.25s;
}

.memo-slide-enter-from {
    transform: translateY(100%);
    opacity: 0;
}

.memo-slide-leave-to {
    transform: translateY(100%);
    opacity: 0;
}

.modal-pop-enter-active {
    transition: opacity 0.25s ease;
}

.modal-pop-leave-active {
    transition: opacity 0.2s ease;
}

.modal-pop-enter-from,
.modal-pop-leave-to {
    opacity: 0;
}

.modal-pop-enter-active .ai-memo-modal {
    transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.modal-pop-enter-from .ai-memo-modal {
    transform: scale(0.93) translateY(14px);
}

.inline-group-btns {
    display: flex;
    gap: 6px;
}

.inline-group-btn {
    padding: 5px 14px;
    border-radius: 12px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.45);
    font-size: 11px;
    color: #B8A9AC;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
}

.inline-group-btn.active {
    background: rgba(217, 163, 175, 0.15);
    color: #D9A3AF;
    border-color: rgba(217, 163, 175, 0.4);
}
</style>