<template>
    <div class="about-page">
        <div class="about-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>关于他</h2>
        </div>

        <div class="persona-tabs">
            <button v-for="p in personas" :key="p.id" class="tab-item" :class="{ active: currentPersona === p.id }"
                @click="switchPersona(p.id)">
                {{ p.note || p.name }}
            </button>
        </div>

        <div class="about-content" v-if="loaded">
            <!-- 总览卡片 -->
            <GlassCard size="lg" floating>
                <div class="card-top">
                    <div class="card-avatar">
                        <img v-if="personaDetail.avatarUrl" :src="personaDetail.avatarUrl" />
                        <span v-else>{{ personaDetail.avatar || '💬' }}</span>
                    </div>
                    <div class="card-info">
                        <p class="card-name">{{ personaDetail.note || personaDetail.name }}</p>
                        <p class="card-status">{{ currentStatus }}</p>
                    </div>
                </div>
                <div class="card-meta">
                    <div class="meta-item">
                        <span class="meta-label">当前关系</span>
                        <GlassTag variant="pink" size="sm">{{ currentRelation }}</GlassTag>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">最近时间线</span>
                        <span class="meta-value">{{ recentTimeline }}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">人格摘要</span>
                        <span class="meta-value">{{ personaSummary }}</span>
                    </div>
                </div>
            </GlassCard>

            <!-- 分页导航 -->
            <div class="tab-nav">
                <button v-for="tab in tabs" :key="tab.id" class="nav-item" :class="{ active: activeTab === tab.id }"
                    @click="activeTab = tab.id">
                    {{ tab.icon }} {{ tab.name }}
                </button>
            </div>

            <!-- 档案 -->
            <div v-if="activeTab === 'profile'" class="tab-content">
                <GlassCard size="md">
                    <h4 class="block-title">基本信息</h4>
                    <div class="info-row" v-if="personaDetail.gender">
                        <span>性别</span>
                        <span>{{ { female: '女', male: '男', other: '其他' }[personaDetail.gender] || '未设置' }}</span>
                    </div>
                    <div class="info-row">
                        <span>名字</span>
                        <span>{{ personaDetail.name }}</span>
                    </div>
                </GlassCard>

                <GlassCard size="md">
                    <h4 class="block-title">人设</h4>
                    <p class="content-text">{{ personaDetail.content || '暂无人设' }}</p>
                </GlassCard>

                <SoftButton variant="primary" block @click="$router.push(`/chat/${currentPersona}`)">💬 进入对话
                </SoftButton>
                <SoftButton variant="ghost" block @click="$router.push(`/persona-detail/${currentPersona}`)">编辑详情
                </SoftButton>
            </div>

            <!-- 关系 -->
            <div v-if="activeTab === 'relation'" class="tab-content">
                <div v-if="relationData" class="relation-section">
                    <div class="radar-container">
                        <svg viewBox="0 0 300 300" class="radar-chart">
                            <polygon v-for="i in 4" :key="'grid-' + i" :points="getGridPoints(i * 25)" fill="none"
                                stroke="var(--color-border)" stroke-width="1" />
                            <line v-for="(_, idx) in 5" :key="'axis-' + idx" x1="150" y1="150"
                                :x2="getPoint(idx, 100).x" :y2="getPoint(idx, 100).y" stroke="var(--color-border)"
                                stroke-width="1" />
                            <polygon :points="dataPoints" fill="rgba(212, 137, 158, 0.15)" stroke="var(--color-primary)"
                                stroke-width="2" />
                            <circle v-for="(dim, idx) in relationData.dimensions" :key="'dot-' + idx"
                                :cx="getPoint(idx, dim.progress * 100).x" :cy="getPoint(idx, dim.progress * 100).y"
                                r="4" fill="var(--color-primary)" />
                            <text v-for="(dim, idx) in relationData.dimensions" :key="'label-' + idx"
                                :x="getPoint(idx, 118).x" :y="getPoint(idx, 118).y" text-anchor="middle"
                                dominant-baseline="middle" font-size="10" fill="var(--color-text-light)">
                                {{ dim.name }}
                            </text>
                        </svg>
                    </div>

                    <div class="dim-list">
                        <GlassCard v-for="dim in relationData.dimensions" :key="dim.dimension" size="sm">
                            <div class="dim-header">
                                <span class="dim-name">{{ dim.name }}</span>
                                <GlassTag variant="pink" size="sm">{{ dim.stage }}</GlassTag>
                            </div>
                            <div class="dim-bar">
                                <div class="dim-fill" :style="{ width: (dim.progress * 100) + '%' }"></div>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>

            <!-- 时间线 -->
            <div v-if="activeTab === 'timeline'" class="tab-content timeline-area">
                <div class="timeline-atmosphere">
                    <p class="timeline-title">留下来的痕迹</p>
                    <p class="timeline-subtitle">{{ timelineAtmosphere }}</p>
                </div>

                <div class="add-entry-row" @click="showAddTimeline = true">
                    <svg viewBox="0 0 24 24" fill="none" class="add-entry-icon">
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
                            <div v-for="event in group.events" :key="event.id" class="timeline-event-item">
                                <span class="event-time">{{ event.time }}</span>
                                <GlassCard size="sm" class="event-card">
                                    <p class="event-content">{{ event.content }}</p>
                                    <div class="event-footer">
                                        <div class="event-tags" v-if="event.tags.length > 0">
                                            <GlassTag v-for="tag in event.tags" :key="tag" variant="pink" size="sm">{{
                                                tag }}</GlassTag>
                                        </div>
                                        <div class="event-actions">
                                            <button class="event-action-btn"
                                                @click="startEditTimeline(event)">✎</button>
                                            <button class="event-action-btn danger"
                                                @click="deleteTimelineEvent(event.id)">×</button>
                                        </div>
                                    </div>
                                </GlassCard>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-else class="timeline-empty">
                    <p class="empty-icon">🌙</p>
                    <p class="empty-title">还没有留下痕迹</p>
                    <p class="empty-sub">随着时间流动，这里会慢慢出现</p>
                </div>
            </div>

            <!-- 侧写 -->
            <div v-if="activeTab === 'observe'" class="tab-content">
                <GlassCard size="md">
                    <div class="observe-header">
                        <h4 class="block-title">对你的长期观察</h4>
                        <button class="edit-observe-btn" @click="startEditProfile">✎</button>
                    </div>
                    <p class="content-text" v-if="memoryProfile">{{ memoryProfile }}</p>
                    <p class="content-text empty" v-else>还没有足够的观察...</p>
                </GlassCard>

                <GlassCard v-if="patterns.length > 0" size="md">
                    <h4 class="block-title">行为模式</h4>
                    <div v-for="p in patterns" :key="p.pattern_type" class="pattern-item">
                        <span>{{ p.description }}</span>
                        <GlassTag variant="purple" size="sm">×{{ p.frequency }}</GlassTag>
                    </div>
                </GlassCard>

                <!-- 每日记录 -->
                <GlassCard v-if="summaries.length > 0" size="md">
                    <h4 class="block-title">最近的日子</h4>
                    <div v-for="s in summaries.slice(0, 5)" :key="s.id" class="summary-item">
                        <span class="summary-date">{{ s.date }}</span>
                        <p class="summary-text">{{ s.content }}</p>
                    </div>
                </GlassCard>

                <!-- 人格洞察 -->
                <GlassCard v-if="insights.length > 0" size="md">
                    <h4 class="block-title">长期观察</h4>
                    <div v-for="ins in insights" :key="ins.id" class="insight-item">
                        <p class="insight-text">{{ ins.content }}</p>
                    </div>
                </GlassCard>

                <!-- 手动添加观察 -->
                <div class="add-entry-row" @click="showAddObserve = true">
                    <svg viewBox="0 0 24 24" fill="none" class="add-entry-icon">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1" opacity="0.4" />
                        <path d="M12 9v6M9 12h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
                    </svg>
                    <span>添加一条观察</span>
                </div>
            </div>
            <!-- 添加时间线弹窗 -->
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

            <!-- 编辑时间线弹窗 -->
            <BlurModal :visible="showEditTimeline" @close="showEditTimeline = false">
                <h3>编辑记录</h3>
                <DreamInput type="textarea" v-model="editTimelineContent" :rows="3" />
                <div class="modal-actions">
                    <SoftButton variant="secondary" @click="showEditTimeline = false">取消</SoftButton>
                    <SoftButton variant="primary" @click="saveEditTimeline">保存</SoftButton>
                </div>
            </BlurModal>

            <!-- 添加观察弹窗 -->
            <BlurModal :visible="showAddObserve" @close="showAddObserve = false">
                <h3>添加一条观察</h3>
                <DreamInput type="textarea" v-model="newObserveContent" :rows="3" placeholder="你观察到了什么..." />
                <div class="modal-actions">
                    <SoftButton variant="secondary" @click="showAddObserve = false">取消</SoftButton>
                    <SoftButton variant="primary" @click="addObserve" :disabled="!newObserveContent.trim()">保存
                    </SoftButton>
                </div>
            </BlurModal>

            <!-- 编辑侧写弹窗 -->
            <BlurModal :visible="showEditProfile" @close="showEditProfile = false">
                <h3>编辑长期观察</h3>
                <DreamInput type="textarea" v-model="editProfileContent" :rows="6" />
                <div class="modal-actions">
                    <SoftButton variant="secondary" @click="showEditProfile = false">取消</SoftButton>
                    <SoftButton variant="primary" @click="saveEditProfile">保存</SoftButton>
                </div>
            </BlurModal>

        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/utils/api'
import GlassCard from '@/components/ui/GlassCard.vue'
import SoftButton from '@/components/ui/SoftButton.vue'
import GlassTag from '@/components/ui/GlassTag.vue'
import TimelineCard from '@/components/ui/TimelineCard.vue'
import BlurModal from '@/components/ui/BlurModal.vue'
import DreamInput from '@/components/ui/DreamInput.vue'

const personas = ref([])
const currentPersona = ref('')
const personaDetail = ref({})
const relationData = ref(null)
const memoryProfile = ref('')
const patterns = ref([])
const loaded = ref(false)
const activeTab = ref('profile')
const timelineItems = ref([])
const timelineGroups = ref([])
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

const tabs = [
    { id: 'profile', name: '档案', icon: '📋' },
    { id: 'relation', name: '关系', icon: '💕' },
    { id: 'timeline', name: '时间线', icon: '🕐' },
    { id: 'observe', name: '侧写', icon: '👁️' },
]

const currentStatus = computed(() => {
    if (!relationData.value) return '...'
    const dims = relationData.value.dimensions || []
    const emo = dims.find(d => d.dimension === 'emotion_sync')
    if (emo && emo.progress > 0.5) return '最近很在意你的情绪'
    return '安静地陪着你'
})

const currentRelation = computed(() => {
    if (!relationData.value || !relationData.value.dimensions) return '靠近'
    const dims = relationData.value.dimensions
    const avg = dims.reduce((sum, d) => sum + d.progress, 0) / dims.length
    const stages = ["靠近", "停留", "熟悉", "偏爱", "默契", "依恋", "长伴", "归属"]
    const idx = Math.min(Math.floor(avg * 8), 7)
    return stages[idx]
})

const timelineAtmosphere = computed(() => {
    if (timelineGroups.value.length === 0) return '时间还在慢慢流动...'
    const count = timelineGroups.value.reduce((sum, g) => sum + g.events.length, 0)
    if (count < 3) return '刚开始留下一些痕迹...'
    if (count < 10) return '不知不觉，已经有了一些共同的记忆'
    return '原来已经一起走了这么久了'
})

const recentTimeline = computed(() => {
    if (patterns.value.length === 0) return '还在了解彼此...'
    const late = patterns.value.find(p => p.pattern_type === 'late_night')
    if (late && late.frequency >= 3) return '你们最近似乎总是一起熬夜'
    return '日常陪伴中'
})

const personaSummary = computed(() => {
    if (!personaDetail.value.content) return '...'
    return personaDetail.value.content.slice(0, 30) + '...'
})

const dataPoints = computed(() => {
    if (!relationData.value || !relationData.value.dimensions) return ""
    return relationData.value.dimensions
        .map((dim, idx) => {
            const p = getPoint(idx, dim.progress * 100)
            return `${p.x},${p.y}`
        })
        .join(" ")
})

function getPoint(index, radius) {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2
    return {
        x: 150 + radius * Math.cos(angle),
        y: 150 + radius * Math.sin(angle),
    }
}

function getGridPoints(radius) {
    return Array.from({ length: 5 }, (_, i) => {
        const p = getPoint(i, radius)
        return `${p.x},${p.y}`
    }).join(" ")
}

async function loadPersonas() {
    try {
        const res = await api('/api/personas/all')
        personas.value = await res.json()

        // 置顶排序
        const pinnedList = JSON.parse(localStorage.getItem('pinned_personas') || '[]')
        personas.value.sort((a, b) => {
            if (pinnedList.includes(a.id) && !pinnedList.includes(b.id)) return -1
            if (!pinnedList.includes(a.id) && pinnedList.includes(b.id)) return 1
            return 0
        })

        // 选择默认人格
        try {
            const latestRes = await api('/api/messages/latest-persona')
            const latestData = await latestRes.json()
            currentPersona.value = latestData.personaId || personas.value[0]?.id || 'xiaorou'
        } catch {
            currentPersona.value = personas.value[0]?.id || 'xiaorou'
        }

        await loadAll()
    } catch (e) {
        console.error('加载失败:', e)
    }
}


async function switchPersona(id) {
    currentPersona.value = id
    await loadAll()
}

async function loadAll() {
    loaded.value = false
    await Promise.all([loadDetail(), loadRelation(), loadObserve(), loadTimeline(), loadSediment()])
    loaded.value = true
}

async function loadSediment() {
    try {
        const sRes = await api(`/api/sediment/${currentPersona.value}/summaries`)
        summaries.value = await sRes.json()
        const iRes = await api(`/api/sediment/${currentPersona.value}/insights`)
        insights.value = await iRes.json()
    } catch { }
}

async function loadTimeline() {
    try {
        const res = await api(`/api/timeline/${currentPersona.value}`)
        timelineGroups.value = await res.json()
    } catch {
        timelineGroups.value = []
    }
}

async function loadDetail() {
    try {
        const res = await api(`/api/persona/${currentPersona.value}`)
        personaDetail.value = await res.json()
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

        // 用近期记忆生成时间线
        if (data.recent && data.recent.length > 0) {
            timelineItems.value = data.recent.slice(0, 8).map(m => ({
                id: m.id,
                time: m.source_session,
                text: m.content.split('\n')[0]
            }))
        }
    } catch { }

    try {
        const res = await api(`/api/patterns/${currentPersona.value}`)
        patterns.value = await res.json()
    } catch {
        patterns.value = []
    }
}

// 时间线操作
async function addTimelineEvent() {
    if (!newTimelineContent.value.trim()) return
    try {
        await api(`/api/timeline/${currentPersona.value}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: newTimelineContent.value.trim(),
                tags: newTimelineTag.value.trim()
            })
        })
        newTimelineContent.value = ''
        newTimelineTag.value = ''
        showAddTimeline.value = false
        await loadTimeline()
    } catch (e) {
        console.error('添加时间线失败:', e)
    }
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
    } catch (e) {
        console.error('编辑时间线失败:', e)
    }
}

async function deleteTimelineEvent(id) {
    if (!confirm('删除这条记录？')) return
    try {
        await api(`/api/timeline/event/${id}`, { method: 'DELETE' })
        await loadTimeline()
    } catch (e) {
        console.error('删除时间线失败:', e)
    }
}

// 侧写操作
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
    } catch (e) {
        console.error('编辑侧写失败:', e)
    }
}

async function addObserve() {
    if (!newObserveContent.value.trim()) return
    try {
        const today = new Date().toISOString().slice(0, 10)
        await api(`/api/memories/${currentPersona.value}/custom`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: newObserveContent.value.trim(), date: today })
        })
        newObserveContent.value = ''
        showAddObserve.value = false
        await loadObserve()
    } catch (e) {
        console.error('添加观察失败:', e)
    }
}

onMounted(loadPersonas)
</script>

<style scoped>
.about-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
}

.about-header {
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

.about-header h2 {
    font-size: 15px;
    font-weight: 500;
    color: var(--color-text);
}

.persona-tabs {
    display: flex;
    gap: 8px;
    padding: 14px 0;
    overflow-x: auto;
    flex-shrink: 0;
}

.tab-item {
    padding: 7px 16px;
    border-radius: 20px;
    border: 1px solid var(--color-border);
    background: var(--color-card);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    font-size: 12px;
    color: var(--color-text-light);
    cursor: pointer;
    white-space: nowrap;
    transition: all var(--duration-normal) var(--ease-soft);
}

.tab-item.active {
    background: linear-gradient(135deg, #e8a8be, #d4899e);
    color: white;
    border-color: transparent;
    box-shadow: 0 2px 8px rgba(212, 137, 158, 0.2);
}

.about-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0 24px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
}

/* 总览卡片 */
.card-top {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
}

.card-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--color-bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(200, 130, 160, 0.1);
}

.card-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.card-name {
    font-size: 17px;
    font-weight: 500;
    color: var(--color-text);
    letter-spacing: 0.02em;
}

.card-status {
    font-size: 12px;
    color: var(--color-text-light);
    margin-top: 3px;
    font-style: italic;
    opacity: 0.7;
}

.card-meta {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.meta-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.meta-label {
    font-size: 11px;
    color: var(--color-text-light);
    letter-spacing: 0.3px;
}

.meta-value {
    font-size: 12px;
    color: var(--color-text);
    font-weight: 400;
    max-width: 55%;
    text-align: right;
}

/* 分页导航 */
.tab-nav {
    display: flex;
    gap: 4px;
    margin: 16px 0;
    padding: 4px;
    background: rgba(255, 248, 252, 0.3);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.25);
}

.nav-item {
    flex: 1;
    padding: 9px 4px;
    border: none;
    border-radius: 13px;
    background: transparent;
    font-size: 11px;
    color: var(--color-text-light);
    cursor: pointer;
    text-align: center;
    transition: all 0.4s var(--ease-soft);
}

.nav-item.active {
    background: rgba(255, 255, 255, 0.6);
    color: var(--color-text);
    box-shadow: 0 2px 8px rgba(200, 130, 160, 0.06);
}


/* 分页内容 */
.tab-content {
    animation: fadeIn 0.4s var(--ease-soft);
}

.tab-content>* {
    margin-bottom: 12px;
}

.block-title {
    font-size: 11px;
    color: var(--color-text-light);
    margin-bottom: 10px;
    letter-spacing: 0.5px;
    font-weight: 400;
}

.info-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 13px;
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
}

.info-row:last-child {
    border-bottom: none;
}

.content-text {
    font-size: 13px;
    color: var(--color-text);
    line-height: 1.7;
    white-space: pre-line;
}

.content-text.empty {
    color: var(--color-text-light);
    font-style: italic;
    opacity: 0.6;
}

/* 关系 */
.radar-container {
    display: flex;
    justify-content: center;
    padding: 16px 0;
}

.radar-chart {
    width: 200px;
    height: 200px;
}

.dim-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.dim-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.dim-name {
    font-size: 13px;
    color: var(--color-text);
    font-weight: 400;
}

.dim-bar {
    height: 3px;
    background: var(--color-bg-secondary);
    border-radius: 2px;
    overflow: hidden;
}

.dim-fill {
    height: 100%;
    background: linear-gradient(90deg, #e8a8be, #d4899e);
    border-radius: 2px;
    transition: width 0.8s var(--ease-soft);
}

/* 侧写 */
.pattern-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    font-size: 13px;
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
}

.pattern-item:last-child {
    border-bottom: none;
}

/* 占位 */
.placeholder-area {
    text-align: center;
    padding: 52px 20px;
    animation: fadeIn 0.5s var(--ease-soft);
}

.placeholder-icon {
    font-size: 32px;
    margin-bottom: 12px;
    animation: softFloat 6s ease-in-out infinite;
}

.placeholder-title {
    font-size: 15px;
    color: var(--color-text);
    font-weight: 400;
    margin-bottom: 6px;
}

.placeholder-sub {
    font-size: 12px;
    color: var(--color-text-light);
    opacity: 0.6;
    margin-top: 4px;
}

/* 时间线 */
.timeline-area {
    animation: fadeIn 0.5s var(--ease-soft);
}

.timeline-atmosphere {
    text-align: center;
    padding: 10px 0 8px;
}

.timeline-title {
    font-size: 12px;
    font-weight: 400;
    color: var(--color-text);
    margin-bottom: 3px;
}

.timeline-subtitle {
    font-size: 10px;
    color: var(--color-text-light);
    font-style: italic;
    opacity: 0.5;
}

.timeline-group {
    margin-bottom: 18px;
}

.timeline-flow {
    padding-bottom: 20px;
}

.timeline-group:nth-child(2) {
    animation-delay: 0.1s;
}

.timeline-group:nth-child(3) {
    animation-delay: 0.2s;
}

.timeline-group:nth-child(4) {
    animation-delay: 0.3s;
}

.period-label {
    font-size: 11px;
    color: var(--color-text-light);
    letter-spacing: 0.8px;
    margin-bottom: 12px;
    padding-left: 4px;
    opacity: 0.6;
}

.timeline-cards {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.timeline-event {
    animation: fadeIn 0.4s var(--ease-soft) backwards;
}

.event-content {
    font-size: 14px;
    color: var(--color-text);
    line-height: 1.7;
    font-weight: 400;
}

.event-tags {
    display: flex;
    gap: 6px;
    margin-top: 10px;
    flex-wrap: wrap;
}

/* 空状态 */
.timeline-empty {
    text-align: center;
    padding: 56px 20px;
    animation: fadeIn 0.6s var(--ease-soft);
}

.timeline-empty .empty-icon {
    font-size: 36px;
    margin-bottom: 16px;
    animation: softFloat 8s ease-in-out infinite;
}

.timeline-empty .empty-title {
    font-size: 15px;
    color: var(--color-text);
    font-weight: 400;
    margin-bottom: 8px;
}

.timeline-empty .empty-sub {
    font-size: 12px;
    color: var(--color-text-light);
    opacity: 0.5;
    margin-top: 4px;
    line-height: 1.6;
}

/* 添加入口行 */
.add-entry-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    margin-bottom: 14px;
    border-radius: 14px;
    background: var(--color-card);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px dashed var(--color-border);
    cursor: pointer;
    transition: all 0.3s var(--ease-soft);
    color: var(--color-text-light);
    font-size: 12px;
    opacity: 0.6;
}

.add-entry-row:active {
    opacity: 0.9;
    border-color: var(--color-primary);
}

.add-entry-icon {
    width: 18px;
    height: 18px;
    color: var(--color-primary);
}

/* 事件底部 */
.event-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
}

.event-actions {
    display: flex;
    gap: 4px;
}

.event-action-btn {
    background: none;
    border: none;
    font-size: 13px;
    color: var(--color-text-light);
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 6px;
    opacity: 0.4;
    transition: opacity 0.2s;
}

.event-action-btn:active {
    opacity: 0.8;
}

.event-action-btn.danger {
    color: #c07070;
}

/* 侧写头部 */
.observe-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.edit-observe-btn {
    background: none;
    border: none;
    font-size: 14px;
    color: var(--color-primary);
    cursor: pointer;
    opacity: 0.5;
    padding: 4px 8px;
    transition: opacity 0.2s;
}

.edit-observe-btn:active {
    opacity: 0.9;
}

.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
}

/* 时间轴 */
.timeline-flow {
    position: relative;
    padding-left: 16px;
}

.timeline-flow::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--color-border);
}

.timeline-day {
    margin-bottom: 24px;
    position: relative;
}

.day-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    position: relative;
}

.day-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e8a8be, #d4899e);
    position: absolute;
    left: -21px;
    box-shadow: 0 0 6px rgba(212, 137, 158, 0.3);
}

.day-label {
    font-size: 13px;
    color: var(--color-text);
    font-weight: 500;
}

.day-date {
    font-size: 10px;
    color: var(--color-text-light);
    opacity: 0.4;
}

.day-events {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.timeline-event-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

.event-time {
    font-size: 10px;
    color: var(--color-text-light);
    opacity: 0.5;
    min-width: 36px;
    padding-top: 10px;
    flex-shrink: 0;
}

.event-card {
    flex: 1;
}

.event-content {
    font-size: 13px;
    color: var(--color-text);
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

.event-actions {
    display: flex;
    gap: 4px;
}

.event-action-btn {
    background: none;
    border: none;
    font-size: 12px;
    color: var(--color-text-light);
    cursor: pointer;
    padding: 2px 6px;
    opacity: 0.4;
}

.event-action-btn.danger {
    color: #c07070;
}

.summary-item {
    padding: 8px 0;
    border-bottom: 1px solid var(--color-border);
}

.summary-item:last-child {
    border-bottom: none;
}

.summary-date {
    font-size: 10px;
    color: var(--color-text-light);
    opacity: 0.5;
}

.summary-text {
    font-size: 13px;
    color: var(--color-text);
    line-height: 1.6;
    margin-top: 4px;
}

.insight-item {
    padding: 8px 0;
}

.insight-text {
    font-size: 13px;
    color: var(--color-text);
    line-height: 1.6;
    font-style: italic;
}
</style>
