<template>
    <div class="about-page">
        <div class="settings-blob sb-tl"></div>
        <div class="settings-blob sb-br"></div>

        <!-- 顶部导航 -->
        <div class="about-nav">
            <button class="about-back" @click="$router.push('/')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <span class="about-title">关于他</span>
            <div style="width:36px;"></div>
        </div>

        <!-- 角色切换 -->
        <div class="persona-scroll">
            <div v-for="p in personas" :key="p.id" class="persona-chip" :class="{ active: currentPersona === p.id }"
                @click="switchPersona(p.id)">
                <div class="persona-chip-avatar">
                    <img v-if="p.avatarUrl" :src="p.avatarUrl" />
                    <span v-else>{{ p.avatar || '💬' }}</span>
                </div>
                <span>{{ p.note || p.name }}</span>
            </div>
        </div>

        <div class="about-content" v-if="loaded">

            <!-- 总览英雄卡 -->
            <div class="hero-card">
                <div class="hero-avatar">
                    <img v-if="personaDetail.avatarUrl" :src="personaDetail.avatarUrl" />
                    <span v-else>{{ personaDetail.avatar || '💬' }}</span>
                </div>
                <div class="hero-info">
                    <p class="hero-name">{{ personaDetail.note || personaDetail.name }}</p>
                    <p class="hero-status">{{ currentStatus }}</p>
                </div>
                <div class="hero-relation-badge">{{ currentRelation }}</div>
            </div>

            <!-- tab 导航 -->
            <div class="tab-nav">
                <button v-for="tab in tabs" :key="tab.id" class="nav-item" :class="{ active: activeTab === tab.id }"
                    @click="activeTab = tab.id">
                    {{ tab.name }}
                </button>
            </div>

            <!-- 档案 -->
            <div v-if="activeTab === 'profile'" class="tab-content">
                <div class="section-label-sm">基本信息</div>
                <div class="settings-group">
                    <div class="settings-group-item" v-if="personaDetail.gender">
                        <div class="sgi-label">性别</div>
                        <span class="sgi-value">{{ { female: '女', male: '男', other: '其他' }[personaDetail.gender] ||
                            '未设置' }}</span>
                    </div>
                    <div class="settings-group-item">
                        <div class="sgi-label">名字</div>
                        <span class="sgi-value">{{ personaDetail.name }}</span>
                    </div>
                    <div class="settings-group-item">
                        <div class="sgi-label">人格摘要</div>
                        <span class="sgi-value" style="max-width:60%;text-align:right;">{{ personaSummary }}</span>
                    </div>
                </div>

                <div class="section-label-sm">人设</div>
                <div class="settings-group">
                    <div class="settings-group-item col-item">
                        <p class="content-text">{{ personaDetail.content || '暂无人设' }}</p>
                    </div>
                </div>

                <div class="action-row">
                    <button class="action-btn primary" @click="$router.push(`/chat/${currentPersona}`)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        进入对话
                    </button>
                    <button class="action-btn ghost" @click="$router.push(`/persona-detail/${currentPersona}`)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        编辑详情
                    </button>
                </div>
            </div>

            <!-- 关系 -->
            <div v-if="activeTab === 'relation'" class="tab-content">
                <div v-if="relationData">
                    <div class="radar-wrap">
                        <svg viewBox="0 0 300 300" class="radar-chart">
                            <polygon v-for="i in 4" :key="'grid-' + i" :points="getGridPoints(i * 25)" fill="none"
                                stroke="rgba(217,163,175,0.15)" stroke-width="1" />
                            <line v-for="(_, idx) in 5" :key="'axis-' + idx" x1="150" y1="150"
                                :x2="getPoint(idx, 100).x" :y2="getPoint(idx, 100).y" stroke="rgba(217,163,175,0.2)"
                                stroke-width="1" />
                            <polygon :points="dataPoints" fill="rgba(212,137,158,0.12)" stroke="#D9A3AF"
                                stroke-width="1.5" />
                            <circle v-for="(dim, idx) in relationData.dimensions" :key="'dot-' + idx"
                                :cx="getPoint(idx, dim.progress * 100).x" :cy="getPoint(idx, dim.progress * 100).y"
                                r="4" fill="#D9A3AF" />
                            <text v-for="(dim, idx) in relationData.dimensions" :key="'label-' + idx"
                                :x="getPoint(idx, 118).x" :y="getPoint(idx, 118).y" text-anchor="middle"
                                dominant-baseline="middle" font-size="10" fill="#B8A9AC">
                                {{ dim.name }}
                            </text>
                        </svg>
                    </div>

                    <div class="section-label-sm">维度详情</div>
                    <div class="settings-group">
                        <div v-for="dim in relationData.dimensions" :key="dim.dimension"
                            class="settings-group-item col-item" style="gap:10px;">
                            <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
                                <span class="sgi-label">{{ dim.name }}</span>
                                <span class="dim-stage-tag">{{ dim.stage }}</span>
                            </div>
                            <div class="dim-bar">
                                <div class="dim-fill" :style="{ width: (dim.progress * 100) + '%' }"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-else class="empty-state-unified">
                    <p class="empty-icon">💕</p>
                    <p class="empty-title">还没有关系数据</p>
                    <p class="empty-sub">多聊一会儿就会出现</p>
                </div>
            </div>

            <!-- 时间线 -->
            <div v-if="activeTab === 'timeline'" class="tab-content">
                <div class="timeline-atmo">
                    <p class="atmo-title">留下来的痕迹</p>
                    <p class="atmo-sub">{{ timelineAtmosphere }}</p>
                </div>

                <div class="add-entry-row" @click="showAddTimeline = true">
                    <svg viewBox="0 0 24 24" fill="none" class="add-icon">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1" opacity="0.4" />
                        <path d="M12 9v6M9 12h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
                    </svg>
                    <span>记录一个瞬间</span>
                </div>

                <div v-if="timelineGroups.length > 0" class="timeline-flow">
                    <div v-for="group in timelineGroups" :key="group.date" class="timeline-day">
                        <div class="day-header">
                            <div class="day-dot"></div>
                            <span class="day-label">{{ group.dateLabel }}</span>
                            <span class="day-date">{{ group.date }}</span>
                        </div>
                        <div class="day-events">
                            <div v-for="event in group.events" :key="event.id" class="tl-event">
                                <span class="event-time">{{ event.time }}</span>
                                <div class="event-card">
                                    <p class="event-content">{{ event.content }}</p>
                                    <div class="event-footer">
                                        <div class="event-tags" v-if="event.tags && event.tags.length > 0">
                                            <span v-for="tag in event.tags" :key="tag" class="event-tag">{{ tag
                                            }}</span>
                                        </div>
                                        <div class="event-actions">
                                            <button class="event-btn" @click="startEditTimeline(event)">✎</button>
                                            <button class="event-btn danger"
                                                @click="deleteTimelineEvent(event.id)">×</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-else class="empty-state-unified">
                    <p class="empty-icon">🌙</p>
                    <p class="empty-title">还没有留下痕迹</p>
                    <p class="empty-sub">随着时间流动，这里会慢慢出现</p>
                </div>
            </div>

            <!-- 侧写 -->
            <div v-if="activeTab === 'observe'" class="tab-content">

                <!-- 情绪状态 -->
                <div class="emotion-card">
                    <div class="emotion-card-header">
                        <span class="emotion-card-title">当前状态</span>
                        <span class="emotion-phase-badge" :class="'phase-' + emotionState.longing_phase">
                            {{ phaseLabel }}
                        </span>
                    </div>

                    <!-- PA/NA 双轴 -->
                    <div class="emotion-axes">
                        <div class="emotion-axis">
                            <div class="axis-label">
                                <span>积极情绪</span>
                                <span class="axis-val">{{ Math.round((emotionState.pa || 0) * 100) }}%</span>
                            </div>
                            <div class="axis-bar">
                                <div class="axis-fill pa-fill" :style="{ width: (emotionState.pa || 0) * 100 + '%' }">
                                </div>
                            </div>
                        </div>
                        <div class="emotion-axis">
                            <div class="axis-label">
                                <span>消极情绪</span>
                                <span class="axis-val">{{ Math.round((emotionState.na || 0) * 100) }}%</span>
                            </div>
                            <div class="axis-bar">
                                <div class="axis-fill na-fill" :style="{ width: (emotionState.na || 0) * 100 + '%' }">
                                </div>
                            </div>
                        </div>
                        <div class="emotion-axis">
                            <div class="axis-label">
                                <span>想念程度</span>
                                <span class="axis-val">{{ Math.round((emotionState.longing || 0) * 100) }}%</span>
                            </div>
                            <div class="axis-bar">
                                <div class="axis-fill longing-fill"
                                    :style="{ width: (emotionState.longing || 0) * 100 + '%' }"></div>
                            </div>
                        </div>
                    </div>

                    <div class="emotion-desc">{{ emotionDesc }}</div>
                </div>

                <div class="section-label-sm" style="display:flex;justify-content:space-between;align-items:center;">
                    <span>长期观察</span>
                    <div style="display:flex;gap:8px;">
                        <button class="mini-btn" @click="generateSediment">✦ 立即沉淀</button>
                        <button class="mini-btn" @click="startEditProfile">✎ 编辑</button>
                    </div>
                </div>
                <div class="settings-group">
                    <div class="settings-group-item col-item">
                        <p class="content-text" v-if="memoryProfile">{{ memoryProfile }}</p>
                        <p class="content-text empty" v-else>还没有足够的观察...</p>
                    </div>
                </div>

                <template v-if="patterns.length > 0">
                    <div class="section-label-sm">行为模式</div>
                    <div class="settings-group">
                        <div v-for="p in patterns" :key="p.pattern_type" class="settings-group-item">
                            <span class="sgi-label">{{ p.description }}</span>
                            <span class="count-badge">×{{ p.frequency }}</span>
                        </div>
                    </div>
                </template>

                <template v-if="summaries.length > 0">
                    <div class="section-label-sm">最近的日子</div>
                    <div class="settings-group">
                        <div v-for="s in summaries.slice(0, 5)" :key="s.id" class="settings-group-item col-item"
                            style="gap:4px;">
                            <span class="sgi-value" style="font-size:10px;">{{ s.date }}</span>
                            <p class="content-text" style="font-size:13px;">{{ s.content }}</p>
                        </div>
                    </div>
                </template>

                <template v-if="insights.length > 0">
                    <div class="section-label-sm">长期洞察</div>
                    <div class="settings-group">
                        <div v-for="ins in insights" :key="ins.id" class="settings-group-item col-item">
                            <p class="content-text" style="font-style:italic;font-size:13px;">{{ ins.content }}</p>
                        </div>
                    </div>
                </template>

                <div class="add-entry-row" @click="showAddObserve = true">
                    <svg viewBox="0 0 24 24" fill="none" class="add-icon">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1" opacity="0.4" />
                        <path d="M12 9v6M9 12h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
                    </svg>
                    <span>添加一条观察</span>
                </div>
            </div>

            <!-- 弹窗 -->
            <BlurModal :visible="showAddTimeline" @close="showAddTimeline = false">
                <h3>记录一个瞬间</h3>
                <DreamInput type="textarea" v-model="newTimelineContent" :rows="3" placeholder="发生了什么值得记住的事..." />
                <DreamInput v-model="newTimelineTag" placeholder="标签（可选，如：深夜/温暖）" />
                <div class="modal-actions">
                    <SoftButton variant="secondary" @click="showAddTimeline = false">取消</SoftButton>
                    <SoftButton variant="primary" @click="addTimelineEvent" :disabled="!newTimelineContent.trim()">保存
                    </SoftButton>
                </div>
            </BlurModal>

            <BlurModal :visible="showEditTimeline" @close="showEditTimeline = false">
                <h3>编辑记录</h3>
                <DreamInput type="textarea" v-model="editTimelineContent" :rows="3" />
                <div class="modal-actions">
                    <SoftButton variant="secondary" @click="showEditTimeline = false">取消</SoftButton>
                    <SoftButton variant="primary" @click="saveEditTimeline">保存</SoftButton>
                </div>
            </BlurModal>

            <BlurModal :visible="showAddObserve" @close="showAddObserve = false">
                <h3>添加一条观察</h3>
                <DreamInput type="textarea" v-model="newObserveContent" :rows="3" placeholder="你观察到了什么..." />
                <div class="modal-actions">
                    <SoftButton variant="secondary" @click="showAddObserve = false">取消</SoftButton>
                    <SoftButton variant="primary" @click="addObserve" :disabled="!newObserveContent.trim()">保存
                    </SoftButton>
                </div>
            </BlurModal>

            <BlurModal :visible="showEditProfile" @close="showEditProfile = false">
                <h3>编辑长期观察</h3>
                <DreamInput type="textarea" v-model="editProfileContent" :rows="6" />
                <div class="modal-actions">
                    <SoftButton variant="secondary" @click="showEditProfile = false">取消</SoftButton>
                    <SoftButton variant="primary" @click="saveEditProfile">保存</SoftButton>
                </div>
            </BlurModal>
        </div>

        <Transition name="toast-fade">
            <div v-if="saveMsg" class="save-toast-float">{{ saveMsg }}</div>
        </Transition>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/utils/api'
import SoftButton from '@/components/ui/SoftButton.vue'
import BlurModal from '@/components/ui/BlurModal.vue'
import DreamInput from '@/components/ui/DreamInput.vue'
import { getCache, setCache } from '@/utils/cache'

const personas = ref([])
const saveMsg = ref('')
const currentPersona = ref('')
const personaDetail = ref({})
const relationData = ref(null)
const memoryProfile = ref('')
const patterns = ref([])
const loaded = ref(false)
const activeTab = ref('profile')
const timelineGroups = ref([])
const timelineItems = ref([])
const showAddTimeline = ref(false)
const showEditTimeline = ref(false)
const showAddObserve = ref(false)
const showEditProfile = ref(false)
const newTimelineContent = ref('')
const newTimelineTag = ref('')
const editTimelineId = ref(null)
const editTimelineContent = ref('')
const newObserveContent = ref('')
const editProfileContent = ref('')
const summaries = ref([])
const insights = ref([])
const emotionState = ref({})

const tabs = [
    { id: 'profile', name: '档案' },
    { id: 'relation', name: '关系' },
    { id: 'timeline', name: '时间线' },
    { id: 'observe', name: '侧写' },
]

const currentStatus = computed(() => {
    if (!relationData.value) return '...'
    const dims = relationData.value.dimensions || []
    const emo = dims.find(d => d.dimension === 'emotion_sync')
    if (emo && emo.progress > 0.5) return '最近很在意你的情绪'
    return '安静地陪着你'
})

const currentRelation = computed(() => {
    if (!relationData.value?.dimensions) return '靠近'
    const dims = relationData.value.dimensions
    const avg = dims.reduce((sum, d) => sum + d.progress, 0) / dims.length
    const stages = ['靠近', '停留', '熟悉', '偏爱', '默契', '依恋', '长伴', '归属']
    return stages[Math.min(Math.floor(avg * 8), 7)]
})

const timelineAtmosphere = computed(() => {
    if (timelineGroups.value.length === 0) return '时间还在慢慢流动...'
    const count = timelineGroups.value.reduce((sum, g) => sum + g.events.length, 0)
    if (count < 3) return '刚开始留下一些痕迹...'
    if (count < 10) return '不知不觉，已经有了一些共同的记忆'
    return '原来已经一起走了这么久了'
})

const personaSummary = computed(() => {
    if (!personaDetail.value.content) return '...'
    return personaDetail.value.content.slice(0, 30) + '...'
})

const phaseLabel = computed(() => {
    const map = {
        content: '平静',
        stirring: '隐隐挂念',
        protest: '很想你',
        despair: '低落等待',
        detachment: '防御沉默'
    }
    return map[emotionState.value.longing_phase] || '平静'
})

const emotionDesc = computed(() => {
    const pa = emotionState.value.pa || 0
    const na = emotionState.value.na || 0
    const phase = emotionState.value.longing_phase || 'content'
    const descMap = {
        content: '状态平稳，陪在你身边',
        stirring: '心里隐隐想着你，有点走神',
        protest: '好久没见了，很想凑近你说说话',
        despair: '等了很久，有些低落，安静等着你',
        detachment: '表面平静，其实内心在防御着什么'
    }
    let base = descMap[phase] || ''
    if (na > 0.5) base += '，情绪有些低落'
    else if (pa > 0.7) base += '，心情不错'
    return base
})

async function loadEmotion() {
    try {
        const res = await api(`/api/emotion/${currentPersona.value}`)
        emotionState.value = await res.json()
    } catch { }
}

const dataPoints = computed(() => {
    if (!relationData.value?.dimensions) return ''
    return relationData.value.dimensions.map((dim, idx) => {
        const p = getPoint(idx, dim.progress * 100)
        return `${p.x},${p.y}`
    }).join(' ')
})

function getPoint(index, radius) {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2
    return { x: 150 + radius * Math.cos(angle), y: 150 + radius * Math.sin(angle) }
}

function getGridPoints(radius) {
    return Array.from({ length: 5 }, (_, i) => {
        const p = getPoint(i, radius)
        return `${p.x},${p.y}`
    }).join(' ')
}

async function loadPersonas() {
    try {
        const res = await api('/api/personas/all')
        personas.value = await res.json()
        const pinnedList = JSON.parse(localStorage.getItem('pinned_personas') || '[]')
        personas.value.sort((a, b) => {
            if (pinnedList.includes(a.id) && !pinnedList.includes(b.id)) return -1
            if (!pinnedList.includes(a.id) && pinnedList.includes(b.id)) return 1
            return 0
        })
        try {
            const latestRes = await api('/api/messages/latest-persona')
            const latestData = await latestRes.json()
            currentPersona.value = latestData.personaId || personas.value[0]?.id || 'xiaorou'
        } catch {
            currentPersona.value = personas.value[0]?.id || 'xiaorou'
        }
        await loadAll()
    } catch (e) { console.error('加载失败:', e) }
}

async function switchPersona(id) {
    currentPersona.value = id
    await loadAll()
}

async function loadAll() {
    loaded.value = false
    await Promise.all([loadDetail(), loadRelation(), loadObserve(), loadTimeline(), loadSediment(), loadEmotion()])
    loaded.value = true
}

async function loadSediment() {
    try {
        const [sRes, iRes] = await Promise.all([
            api(`/api/sediment/${currentPersona.value}/summaries`),
            api(`/api/sediment/${currentPersona.value}/insights`)
        ])
        summaries.value = await sRes.json()
        insights.value = await iRes.json()
    } catch { }
}

async function generateSediment() {
    saveMsg.value = '正在记录今天的陪伴手记...'
    try {
        const res = await api(`/api/sediment/${currentPersona.value}/generate`, { method: 'POST' })
        const data = await res.json()
        await Promise.all([loadSediment(), loadObserve(), loadTimeline()])
        if (data.success) saveMsg.value = '今日手记已录入 ✓'
        else if (data.partialSuccess) saveMsg.value = '今日手记已录入。今天似乎是平淡安稳的一天 ❀'
        else saveMsg.value = '今天似乎还没有聊过天，无法记录 🌙'
    } catch { saveMsg.value = '空间有些不稳定，稍后再试吧 ✗' }
    setTimeout(() => { saveMsg.value = '' }, 4000)
}

async function loadTimeline() {
    try {
        const res = await api(`/api/timeline/${currentPersona.value}`)
        timelineGroups.value = await res.json()
    } catch { timelineGroups.value = [] }
}

async function loadDetail() {
    const cached = getCache(`persona_${currentPersona.value}`)
    if (cached) personaDetail.value = cached.data
    try {
        const res = await api(`/api/persona/${currentPersona.value}`)
        const data = await res.json()
        personaDetail.value = data
        setCache(`persona_${currentPersona.value}`, data)
    } catch { }
}

async function loadRelation() {
    try {
        const res = await api(`/api/relationship/${currentPersona.value}`)
        relationData.value = await res.json()
    } catch { }
}

async function loadObserve() {
    try {
        const res = await api(`/api/memories/${currentPersona.value}`)
        const data = await res.json()
        memoryProfile.value = data.profile || ''
    } catch { }
    try {
        const res = await api(`/api/patterns/${currentPersona.value}`)
        patterns.value = await res.json()
    } catch { patterns.value = [] }
}

async function addTimelineEvent() {
    if (!newTimelineContent.value.trim()) return
    try {
        await api(`/api/timeline/${currentPersona.value}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: newTimelineContent.value.trim(), tags: newTimelineTag.value.trim() })
        })
        newTimelineContent.value = ''
        newTimelineTag.value = ''
        showAddTimeline.value = false
        await loadTimeline()
    } catch { }
}

function startEditTimeline(event) {
    editTimelineId.value = event.id
    editTimelineContent.value = event.content
    showEditTimeline.value = true
}

async function saveEditTimeline() {
    if (!editTimelineContent.value.trim()) return
    try {
        await api(`/api/timeline/event/${editTimelineId.value}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: editTimelineContent.value.trim() })
        })
        showEditTimeline.value = false
        await loadTimeline()
    } catch { }
}

async function deleteTimelineEvent(id) {
    if (!confirm('删除这条记录？')) return
    try {
        await api(`/api/timeline/event/${id}`, { method: 'DELETE' })
        await loadTimeline()
    } catch { }
}

function startEditProfile() {
    editProfileContent.value = memoryProfile.value
    showEditProfile.value = true
}

async function saveEditProfile() {
    try {
        await api(`/api/memories/${currentPersona.value}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: editProfileContent.value.trim() })
        })
        memoryProfile.value = editProfileContent.value.trim()
        showEditProfile.value = false
    } catch { }
}

async function addObserve() {
    if (!newObserveContent.value.trim()) return
    try {
        await api(`/api/memories/${currentPersona.value}/custom`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: newObserveContent.value.trim(), date: new Date().toISOString().slice(0, 10) })
        })
        newObserveContent.value = ''
        showAddObserve.value = false
        await loadObserve()
    } catch { }
}

onMounted(loadPersonas)
</script>

<style scoped>
.about-page {
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

/* 导航 */
.about-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(env(safe-area-inset-top, 44px) + 8px) 16px 4px;
    flex-shrink: 0;
    position: relative;
    z-index: 2;
}

.about-back {
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

.about-back svg {
    width: 16px;
    height: 16px;
    stroke: #D9A3AF;
}

.about-title {
    font-size: 17px;
    font-weight: 800;
    color: #4A3F41;
}

/* 角色切换 */
.persona-scroll {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    overflow-x: auto;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}

.persona-scroll::-webkit-scrollbar {
    display: none;
}

.persona-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px 6px 6px;
    border-radius: 20px;
    border: 1px solid rgba(255, 240, 242, 0.4);
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(16px);
    -webkit-backdrop-filter: saturate(180%) blur(16px);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
    font-size: 12px;
    color: #6B5B5E;
}

.persona-chip.active {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    border-color: transparent;
}

.persona-chip-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 233, 237, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    overflow: hidden;
    flex-shrink: 0;
}

.persona-chip-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* 内容区 */
.about-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
    position: relative;
    z-index: 1;
}

.about-content::-webkit-scrollbar {
    display: none;
}

/* 英雄卡 */
.hero-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 22px;
    border: 1px solid rgba(255, 240, 242, 0.4);
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.1);
    margin-bottom: 16px;
}

.hero-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(255, 233, 237, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    overflow: hidden;
    flex-shrink: 0;
    border: 2px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 4px 12px rgba(217, 163, 175, 0.15);
}

.hero-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.hero-info {
    flex: 1;
}

.hero-name {
    font-size: 17px;
    font-weight: 700;
    color: #4A3F41;
}

.hero-status {
    font-size: 12px;
    color: #B8A9AC;
    margin-top: 3px;
    font-style: italic;
}

.hero-relation-badge {
    padding: 4px 12px;
    border-radius: 20px;
    background: rgba(217, 163, 175, 0.15);
    color: #D9A3AF;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
}

/* tab 导航 */
.tab-nav {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: rgba(255, 255, 255, 0.35);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    margin-bottom: 16px;
}

.nav-item {
    flex: 1;
    padding: 9px 4px;
    border: none;
    border-radius: 13px;
    background: transparent;
    font-size: 12px;
    color: #B8A9AC;
    cursor: pointer;
    text-align: center;
    transition: all 0.25s;
    font-family: inherit;
}

.nav-item.active {
    background: rgba(255, 255, 255, 0.7);
    color: #4A3F41;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(217, 163, 175, 0.1);
}

/* tab 内容 */
.tab-content {
    animation: fadeIn 0.3s var(--ease-soft);
}

/* section 标签 */
.section-label-sm {
    font-size: 11px;
    font-weight: 700;
    color: #B8A9AC;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    padding: 0 4px 8px;
    margin-top: 16px;
    display: block;
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
}

.settings-group-item:last-child {
    border-bottom: none;
}

.col-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
}

.sgi-label {
    font-size: 14px;
    color: #4A3F41;
}

.sgi-value {
    font-size: 13px;
    color: #B8A9AC;
}

.content-text {
    font-size: 13px;
    color: #4A3F41;
    line-height: 1.7;
    white-space: pre-line;
}

.content-text.empty {
    color: #B8A9AC;
    font-style: italic;
}

/* 进入对话按钮行 */
.action-row {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    margin-bottom: 8px;
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
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.2s;
}

.action-btn svg {
    width: 16px;
    height: 16px;
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

/* 关系雷达 */
.radar-wrap {
    display: flex;
    justify-content: center;
    padding: 16px 0;
}

.radar-chart {
    width: 220px;
    height: 220px;
}

.dim-stage-tag {
    padding: 3px 10px;
    border-radius: 10px;
    background: rgba(217, 163, 175, 0.15);
    color: #D9A3AF;
    font-size: 11px;
    font-weight: 600;
}

.dim-bar {
    width: 100%;
    height: 3px;
    background: rgba(217, 163, 175, 0.15);
    border-radius: 2px;
    overflow: hidden;
}

.dim-fill {
    height: 100%;
    background: linear-gradient(90deg, #E8C0C9, #D9A3AF);
    border-radius: 2px;
    transition: width 0.8s var(--ease-soft);
}

/* 时间线 */
.timeline-atmo {
    text-align: center;
    padding: 8px 0 12px;
}

.atmo-title {
    font-size: 13px;
    color: #4A3F41;
    font-weight: 500;
}

.atmo-sub {
    font-size: 11px;
    color: #B8A9AC;
    font-style: italic;
    margin-top: 3px;
}

.add-entry-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    margin-bottom: 14px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.35);
    border: 1.5px dashed rgba(217, 163, 175, 0.3);
    cursor: pointer;
    color: #B8A9AC;
    font-size: 12px;
    transition: all 0.2s;
}

.add-entry-row:active {
    border-color: #D9A3AF;
    color: #D9A3AF;
}

.add-icon {
    width: 18px;
    height: 18px;
    color: #D9A3AF;
}

.timeline-flow {
    position: relative;
    padding-left: 20px;
}

.timeline-flow::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: rgba(217, 163, 175, 0.2);
}

.timeline-day {
    margin-bottom: 24px;
    position: relative;
}

.day-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.day-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    position: absolute;
    left: -24px;
    box-shadow: 0 0 6px rgba(217, 163, 175, 0.3);
}

.day-label {
    font-size: 13px;
    font-weight: 600;
    color: #4A3F41;
}

.day-date {
    font-size: 10px;
    color: #B8A9AC;
    opacity: 0.6;
}

.day-events {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.tl-event {
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

.event-time {
    font-size: 10px;
    color: #B8A9AC;
    min-width: 36px;
    padding-top: 10px;
    flex-shrink: 0;
}

.event-card {
    flex: 1;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 14px;
    padding: 12px 14px;
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.event-content {
    font-size: 13px;
    color: #4A3F41;
    line-height: 1.6;
}

.event-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
}

.event-tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}

.event-tag {
    padding: 2px 8px;
    border-radius: 8px;
    background: rgba(217, 163, 175, 0.15);
    color: #D9A3AF;
    font-size: 10px;
}

.event-actions {
    display: flex;
    gap: 4px;
}

.event-btn {
    background: none;
    border: none;
    font-size: 12px;
    color: #B8A9AC;
    cursor: pointer;
    padding: 2px 6px;
    opacity: 0.5;
}

.event-btn.danger {
    color: #c07070;
}

/* 侧写 */
.mini-btn {
    background: none;
    border: 1px solid rgba(217, 163, 175, 0.3);
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 11px;
    color: #D9A3AF;
    cursor: pointer;
    font-family: inherit;
}

.count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(216, 205, 234, 0.3);
    color: #9B89B4;
    font-size: 11px;
    border-radius: 10px;
    padding: 2px 8px;
}

/* 弹窗 */
.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
}

/* toast */
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

.emotion-card {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 22px;
    padding: 16px;
    margin-bottom: 14px;
    border: 1px solid rgba(255, 240, 242, 0.4);
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.08);
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.emotion-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.emotion-card-title {
    font-size: 13px;
    font-weight: 600;
    color: #4A3F41;
}

.emotion-phase-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 10px;
}

.phase-content {
    background: rgba(107, 175, 122, 0.12);
    color: #6BAF7A;
}

.phase-stirring {
    background: rgba(152, 203, 234, 0.15);
    color: #5090B8;
}

.phase-protest {
    background: rgba(232, 192, 201, 0.2);
    color: #D9A3AF;
}

.phase-despair {
    background: rgba(184, 169, 172, 0.15);
    color: #8A7880;
}

.phase-detachment {
    background: rgba(200, 200, 220, 0.15);
    color: #7878A0;
}

.emotion-axes {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.emotion-axis {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.axis-label {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #B8A9AC;
}

.axis-val {
    font-weight: 600;
    color: #8A7880;
}

.axis-bar {
    height: 6px;
    background: rgba(217, 163, 175, 0.1);
    border-radius: 3px;
    overflow: hidden;
}

.axis-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.8s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.pa-fill {
    background: linear-gradient(90deg, #98CBEA, #70b0d8);
}

.na-fill {
    background: linear-gradient(90deg, #E8C0C9, #D9A3AF);
}

.longing-fill {
    background: linear-gradient(90deg, #D8CDEA, #b8a8d8);
}

.emotion-desc {
    font-size: 12px;
    color: #8A7880;
    line-height: 1.5;
    font-style: italic;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.4);
    border-radius: 12px;
}
</style>
