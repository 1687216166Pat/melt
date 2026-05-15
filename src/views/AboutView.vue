<template>
    <div class="about-page">
        <div class="about-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>关于他</h2>
        </div>

        <!-- 顶部切换 AI -->
        <div class="persona-tabs">
            <button v-for="p in personas" :key="p.id" class="tab-btn" :class="{ active: currentPersona === p.id }"
                @click="switchPersona(p.id)">
                {{ p.note || p.name }}
            </button>
        </div>

        <div class="about-content" v-if="loaded">
            <!-- 总览卡片 -->
            <div class="profile-card">
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
                        <span class="meta-value">{{ currentRelation }}</span>
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
            </div>

            <!-- 分页 -->
            <div class="tab-nav">
                <button v-for="tab in tabs" :key="tab.id" class="nav-btn" :class="{ active: activeTab === tab.id }"
                    @click="activeTab = tab.id">
                    {{ tab.icon }} {{ tab.name }}
                </button>
            </div>

            <!-- 档案 -->
            <div v-if="activeTab === 'profile'" class="tab-content">
                <div class="info-block">
                    <h4>基本信息</h4>
                    <div class="info-row" v-if="personaDetail.gender">
                        <span>性别</span>
                        <span>{{ { female: '女', male: '男', other: '其他' }[personaDetail.gender] || '未设置' }}</span>
                    </div>
                    <div class="info-row">
                        <span>名字</span>
                        <span>{{ personaDetail.name }}</span>
                    </div>
                </div>
                <div class="info-block">
                    <h4>人设</h4>
                    <p class="content-text">{{ personaDetail.content || '暂无人设' }}</p>
                </div>
                <button class="edit-btn" @click="$router.push(`/persona-detail/${currentPersona}`)">编辑详情</button>
            </div>

            <!-- 关系 -->
            <div v-if="activeTab === 'relation'" class="tab-content">
                <div v-if="relationData" class="relation-section">
                    <!-- 雷达图 -->
                    <div class="radar-container">
                        <svg viewBox="0 0 300 300" class="radar-chart">
                            <polygon v-for="i in 4" :key="'grid-' + i" :points="getGridPoints(i * 25)" fill="none"
                                stroke="var(--color-bg-secondary)" stroke-width="1" />
                            <line v-for="(_, idx) in 5" :key="'axis-' + idx" x1="150" y1="150"
                                :x2="getPoint(idx, 100).x" :y2="getPoint(idx, 100).y" stroke="var(--color-bg-secondary)"
                                stroke-width="1" />
                            <polygon :points="dataPoints" fill="rgba(232, 160, 191, 0.2)" stroke="var(--color-primary)"
                                stroke-width="2" />
                            <circle v-for="(dim, idx) in relationData.dimensions" :key="'dot-' + idx"
                                :cx="getPoint(idx, dim.progress * 100).x" :cy="getPoint(idx, dim.progress * 100).y"
                                r="4" fill="var(--color-primary)" />
                            <text v-for="(dim, idx) in relationData.dimensions" :key="'label-' + idx"
                                :x="getPoint(idx, 118).x" :y="getPoint(idx, 118).y" text-anchor="middle"
                                dominant-baseline="middle" font-size="11" fill="var(--color-text)">
                                {{ dim.name }}
                            </text>
                        </svg>
                    </div>
                    <!-- 维度列表 -->
                    <div v-for="dim in relationData.dimensions" :key="dim.dimension" class="dim-item">
                        <div class="dim-header">
                            <span>{{ dim.name }}</span>
                            <span class="dim-stage">{{ dim.stage }}</span>
                        </div>
                        <div class="dim-bar">
                            <div class="dim-fill" :style="{ width: (dim.progress * 100) + '%' }"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 时间线 -->
            <div v-if="activeTab === 'timeline'" class="tab-content">
                <div class="placeholder">
                    <p>🕐 时间线</p>
                    <p class="placeholder-sub">记录你们共同的时间沉淀</p>
                    <p class="placeholder-sub">即将开放...</p>
                </div>
            </div>

            <!-- 侧写 -->
            <div v-if="activeTab === 'observe'" class="tab-content">
                <div class="info-block">
                    <h4>AI 对你的长期观察</h4>
                    <p class="content-text" v-if="memoryProfile">{{ memoryProfile }}</p>
                    <p class="content-text empty" v-else>还没有足够的观察...</p>
                </div>
                <div class="info-block" v-if="patterns.length > 0">
                    <h4>行为模式</h4>
                    <div v-for="p in patterns" :key="p.pattern_type" class="pattern-item">
                        <span>{{ p.description }}</span>
                        <span class="pattern-freq">×{{ p.frequency }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/utils/api'

const personas = ref([])
const currentPersona = ref('')
const personaDetail = ref({})
const relationData = ref(null)
const memoryProfile = ref('')
const patterns = ref([])
const loaded = ref(false)
const activeTab = ref('profile')

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
    const res = await api('/api/prompts/personas')
    const data = await res.json()
    personas.value = data.personas

    // 逐个获取备注
    for (let i = 0; i < personas.value.length; i++) {
        try {
            const detailRes = await api(`/api/persona/${personas.value[i].id}`)
            const detail = await detailRes.json()
            personas.value[i].note = detail.note || ''
        } catch { }
    }

    currentPersona.value = data.active || (personas.value[0] && personas.value[0].id) || 'xiaorou'
    await loadAll()
}

async function switchPersona(id) {
    currentPersona.value = id
    await loadAll()
}

async function loadAll() {
    loaded.value = false
    await Promise.all([
        loadDetail(),
        loadRelation(),
        loadObserve(),
    ])
    loaded.value = true
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
    } catch { }

    try {
        const { getDB } = await import('@/utils/api')
    } catch { }

    // 获取行为模式（通过记忆接口暂时没有，用关系接口的数据）
    // 需要后端加一个接口
    try {
        const res = await api(`/api/patterns/${currentPersona.value}`)
        patterns.value = await res.json()
    } catch {
        patterns.value = []
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

.about-header h2 {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
}

.persona-tabs {
    display: flex;
    gap: 8px;
    padding: 12px 0;
    overflow-x: auto;
    flex-shrink: 0;
}

.tab-btn {
    padding: 6px 14px;
    border-radius: 20px;
    border: 1px solid var(--color-bg-secondary);
    background: var(--color-white);
    font-size: 13px;
    color: var(--color-text);
    cursor: pointer;
    white-space: nowrap;
}

.tab-btn.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
}

.about-content {
    flex: 1;
    overflow-y: auto;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
}

/* 总览卡片 */
.profile-card {
    background: var(--color-white);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.card-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
}

.card-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: var(--color-bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    overflow: hidden;
    flex-shrink: 0;
}

.card-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.card-info {
    flex: 1;
}

.card-name {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
}

.card-status {
    font-size: 12px;
    color: var(--color-text-light);
    margin-top: 2px;
    font-style: italic;
}

.card-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.meta-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.meta-label {
    font-size: 12px;
    color: var(--color-text-light);
}

.meta-value {
    font-size: 13px;
    color: var(--color-text);
    font-weight: 500;
}

/* 分页导航 */
.tab-nav {
    display: flex;
    gap: 6px;
    margin-bottom: 14px;
}

.nav-btn {
    flex: 1;
    padding: 8px 4px;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 10px;
    background: var(--color-white);
    font-size: 12px;
    color: var(--color-text);
    cursor: pointer;
    text-align: center;
}

.nav-btn.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
}

/* 分页内容 */
.tab-content {
    min-height: 200px;
}

.info-block {
    background: var(--color-white);
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 12px;
}

.info-block h4 {
    font-size: 13px;
    color: var(--color-text-light);
    margin-bottom: 8px;
}

.info-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 14px;
    color: var(--color-text);
    border-bottom: 1px solid var(--color-bg-secondary);
}

.info-row:last-child {
    border-bottom: none;
}

.content-text {
    font-size: 14px;
    color: var(--color-text);
    line-height: 1.6;
    white-space: pre-line;
}

.content-text.empty {
    color: var(--color-text-light);
    font-style: italic;
}

.edit-btn {
    width: 100%;
    padding: 12px;
    border: 1px dashed var(--color-primary);
    background: none;
    color: var(--color-primary);
    border-radius: 10px;
    font-size: 14px;
    cursor: pointer;
}

/* 关系 */
.radar-container {
    display: flex;
    justify-content: center;
    padding: 10px 0;
}

.radar-chart {
    width: 200px;
    height: 200px;
}

.dim-item {
    padding: 10px 0;
    border-bottom: 1px solid var(--color-bg-secondary);
}

.dim-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 13px;
}

.dim-stage {
    color: var(--color-primary);
    font-weight: 500;
}

.dim-bar {
    height: 4px;
    background: var(--color-bg-secondary);
    border-radius: 2px;
}

.dim-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
    border-radius: 2px;
}

/* 侧写 */
.pattern-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 14px;
    color: var(--color-text);
    border-bottom: 1px solid var(--color-bg-secondary);
}

.pattern-freq {
    color: var(--color-primary);
    font-size: 12px;
}

/* 占位符 */
.placeholder {
    text-align: center;
    padding: 40px 0;
    color: var(--color-text-light);
}

.placeholder p:first-child {
    font-size: 24px;
    margin-bottom: 8px;
}

.placeholder-sub {
    font-size: 13px;
    margin-top: 4px;
}
</style>
