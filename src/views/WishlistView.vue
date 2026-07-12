<template>
    <div class="memory-graph-page">
        <div class="graph-blob gb-tl"></div>
        <div class="graph-blob gb-br"></div>

        <!-- 顶部导航 -->
        <div class="graph-nav">
            <button class="graph-back" @click="$router.push('/')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <span class="graph-title">记忆星图</span>
            <button class="graph-rebuild" @click="rebuildGraph">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                </svg>
            </button>
        </div>

        <!-- 搜索栏 -->
        <div class="graph-search-wrap">
            <div class="graph-search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </svg>
                <input v-model="searchQuery" placeholder="搜索记忆..." @input="handleSearch" />
                <button v-if="searchQuery" @click="clearSearch">×</button>
            </div>
        </div>

        <!-- 统计栏 -->
        <div class="graph-stats">
            <div class="stat-item">
                <span class="stat-num">{{ nodes.length }}</span>
                <span class="stat-label">记忆节点</span>
            </div>
            <div class="stat-item">
                <span class="stat-num">{{ totalLinks }}</span>
                <span class="stat-label">关联连接</span>
            </div>
            <div class="stat-item">
                <span class="stat-num">{{ avgImportance.toFixed(1) }}</span>
                <span class="stat-label">平均重要性</span>
            </div>
        </div>

        <!-- 内容区 -->
        <div class="graph-content">
            <div v-if="loading" class="graph-loading">
                <div class="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>

            <div v-else-if="displayNodes.length === 0" class="graph-empty">
                <p class="empty-icon">🌌</p>
                <p class="empty-title">{{ searchQuery ? '未找到相关记忆' : '还没有记忆节点' }}</p>
                <p class="empty-sub">{{ searchQuery ? '试试其他关键词' : '点击右上角重建星图' }}</p>
            </div>

            <div v-else class="node-list">
                <div v-for="node in displayNodes" :key="node.id" class="node-card"
                    :class="'importance-' + node.importance" @click="openNodeDetail(node)">
                    <div class="node-header">
                        <div class="node-importance-badge">{{ node.importance }}</div>
                        <div class="node-links-badge">{{ (node.linked_ids || []).length }} 关联</div>
                    </div>
                    <p class="node-content">{{ node.content }}</p>
                    <div class="node-keywords">
                        <span v-for="kw in (node.keywords || []).slice(0, 5)" :key="kw" class="keyword-tag">
                            {{ kw }}
                        </span>
                    </div>
                    <div class="node-time">{{ formatTime(node.created_at) }}</div>
                </div>
            </div>
        </div>

        <!-- 节点详情弹窗 -->
        <Teleport to="body">
            <Transition name="slide-up">
                <div v-if="showDetail && detailNode" class="detail-overlay" @click.self="showDetail = false">
                    <div class="detail-panel">
                        <div class="detail-header">
                            <span class="detail-title">记忆详情</span>
                            <button class="detail-close" @click="showDetail = false">×</button>
                        </div>

                        <div class="detail-body">
                            <div class="detail-importance">
                                <span class="importance-label">重要性</span>
                                <div class="importance-stars">
                                    <span v-for="i in 10" :key="i" class="star"
                                        :class="{ active: i <= detailNode.importance }">★</span>
                                </div>
                            </div>

                            <div class="detail-content-box">
                                <p class="detail-content-text">{{ detailNode.content }}</p>
                            </div>

                            <div class="detail-keywords">
                                <span class="detail-label">关键词</span>
                                <div class="keyword-wrap">
                                    <span v-for="kw in detailNode.keywords" :key="kw" class="keyword-chip">
                                        {{ kw }}
                                    </span>
                                </div>
                            </div>

                            <div v-if="detailNode.neighbors && detailNode.neighbors.length > 0"
                                class="detail-neighbors">
                                <span class="detail-label">关联记忆 ({{ detailNode.neighbors.length }})</span>
                                <div class="neighbor-list">
                                    <div v-for="nb in detailNode.neighbors" :key="nb.id" class="neighbor-card"
                                        @click="openNodeDetail(nb)">
                                        <p class="neighbor-content">{{ nb.content.slice(0, 50) }}...</p>
                                        <span class="neighbor-importance">{{ nb.importance }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- 重建确认 -->
        <Teleport to="body">
            <Transition name="fade">
                <div v-if="showRebuildConfirm" class="modal-mask" @click.self="showRebuildConfirm = false">
                    <div class="modal-box">
                        <div class="modal-title">重建记忆星图？</div>
                        <p class="modal-desc">将从记忆碎片重新生成图谱，原有关联关系会重新计算</p>
                        <div class="modal-actions">
                            <button class="modal-btn cancel" @click="showRebuildConfirm = false">取消</button>
                            <button class="modal-btn confirm" @click="confirmRebuild">确定</button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <Transition name="toast-fade">
            <div v-if="toast" class="toast-float">{{ toast }}</div>
        </Transition>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/utils/api'

const route = useRoute()

const currentPersona = ref('')
const currentPersonaName = ref('')
const allPersonas = ref([])
const showPersonaSwitch = ref(false)

const nodes = ref([])
const loading = ref(true)
const searchQuery = ref('')
const showDetail = ref(false)
const detailNode = ref(null)
const showRebuildConfirm = ref(false)
const toast = ref('')

const displayNodes = computed(() => {
    if (!searchQuery.value.trim()) return nodes.value
    const q = searchQuery.value.toLowerCase()
    return nodes.value.filter(n =>
        n.content.toLowerCase().includes(q) ||
        (n.keywords || []).some(kw => kw.includes(q))
    )
})

const totalLinks = computed(() =>
    nodes.value.reduce((sum, n) => sum + (n.linked_ids || []).length, 0) / 2
)

const avgImportance = computed(() => {
    if (nodes.value.length === 0) return 0
    return nodes.value.reduce((sum, n) => sum + (n.importance || 5), 0) / nodes.value.length
})

function formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diff = (now - d) / 1000 / 60 / 60 / 24
    if (diff < 1) return '今天'
    if (diff < 7) return `${Math.floor(diff)} 天前`
    if (diff < 30) return `${Math.floor(diff / 7)} 周前`
    return `${d.getMonth() + 1}/${d.getDate()}`
}

async function loadCurrentPersona() {
    try {
        if (route.query.persona) {
            currentPersona.value = route.query.persona
        } else {
            const res = await api('/api/messages/latest-persona')
            const data = await res.json()
            currentPersona.value = data.personaId || 'xiaorou'
        }
        const pRes = await api('/api/personas/all')
        allPersonas.value = await pRes.json()
        const found = allPersonas.value.find(p => p.id === currentPersona.value)
        if (found) currentPersonaName.value = found.note || found.name
    } catch { }
}

async function switchPersona(p) {
    currentPersona.value = p.id
    currentPersonaName.value = p.note || p.name
    showPersonaSwitch.value = false
    await loadGraph()
}

async function loadGraph() {
    if (!currentPersona.value) return
    loading.value = true
    try {
        const res = await api(`/api/memory-graph/${currentPersona.value}`)
        nodes.value = await res.json()
    } catch (e) {
        console.error('加载失败:', e)
    } finally {
        loading.value = false
    }
}

async function openNodeDetail(node) {
    try {
        const res = await api(`/api/memory-graph/node/${node.id}`)
        detailNode.value = await res.json()
        showDetail.value = true
    } catch (e) {
        console.error('加载节点失败:', e)
    }
}

function clearSearch() {
    searchQuery.value = ''
}

function rebuildGraph() {
    showRebuildConfirm.value = true
}

async function confirmRebuild() {
    showRebuildConfirm.value = false
    loading.value = true
    try {
        await api(`/api/memory-graph/${currentPersona.value}/build`, { method: 'POST' })
        await loadGraph()
        showToast('星图重建完成 ✓')
    } catch (e) {
        showToast('重建失败')
    } finally {
        loading.value = false
    }
}

function showToast(msg) {
    toast.value = msg
    setTimeout(() => { toast.value = '' }, 2000)
}

onMounted(async () => {
    await loadCurrentPersona()
    await loadGraph()
})
</script>

<style scoped>
.memory-graph-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background: linear-gradient(180deg, #FFFBFA 0%, #FFF0F2 60%, #FFE9ED 100%);
    box-sizing: border-box;
}

.graph-blob {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    filter: blur(60px);
}

.gb-tl {
    top: -40px;
    left: -50px;
    width: 220px;
    height: 220px;
    background: #D8CDEA;
    opacity: 0.4;
}

.gb-br {
    bottom: 40px;
    right: -60px;
    width: 200px;
    height: 200px;
    background: #98CBEA;
    opacity: 0.25;
}

.graph-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(env(safe-area-inset-top, 44px) + 8px) 16px 4px;
    flex-shrink: 0;
    position: relative;
    z-index: 2;
}

.graph-back,
.graph-rebuild {
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

.graph-back svg,
.graph-rebuild svg {
    width: 16px;
    height: 16px;
    stroke: #D9A3AF;
}

.graph-title {
    font-size: 17px;
    font-weight: 800;
    color: #4A3F41;
}

.graph-search-wrap {
    padding: 8px 16px 4px;
    position: relative;
    z-index: 1;
}

.graph-search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(217, 163, 175, 0.2);
    border-radius: 16px;
    padding: 0 14px;
    height: 40px;
}

.graph-search-box svg {
    width: 16px;
    height: 16px;
    stroke: #B8A9AC;
    flex-shrink: 0;
}

.graph-search-box input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 13px;
    color: #4A3F41;
    outline: none;
    font-family: inherit;
}

.graph-search-box input::placeholder {
    color: #D4C8CA;
}

.graph-search-box button {
    background: none;
    border: none;
    font-size: 16px;
    color: #B8A9AC;
    cursor: pointer;
}

.graph-stats {
    display: flex;
    gap: 10px;
    padding: 10px 16px;
    position: relative;
    z-index: 1;
}

.stat-item {
    flex: 1;
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 16px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.stat-num {
    font-size: 18px;
    font-weight: 700;
    color: #4A3F41;
}

.stat-label {
    font-size: 10px;
    color: #B8A9AC;
}

.graph-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
    position: relative;
    z-index: 1;
}

.graph-content::-webkit-scrollbar {
    display: none;
}

.graph-loading {
    display: flex;
    justify-content: center;
    padding: 48px 0;
}

.loading-dots {
    display: flex;
    gap: 6px;
}

.loading-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #D8CDEA;
    animation: dot-bounce 1.2s ease-in-out infinite;
}

.loading-dots span:nth-child(2) {
    animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes dot-bounce {

    0%,
    80%,
    100% {
        transform: scale(0.8);
        opacity: 0.5;
    }

    40% {
        transform: scale(1);
        opacity: 1;
    }
}

.graph-empty {
    text-align: center;
    padding: 48px 24px;
}

.empty-icon {
    font-size: 48px;
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

.node-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.node-card {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 22px;
    padding: 14px 16px;
    border: 1px solid rgba(255, 240, 242, 0.4);
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.08);
    cursor: pointer;
    transition: transform 0.15s;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.node-card:active {
    transform: scale(0.98);
}

.node-card.importance-9,
.node-card.importance-10 {
    border-color: rgba(216, 205, 234, 0.5);
    box-shadow: 0 8px 24px rgba(216, 205, 234, 0.15);
}

.node-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.node-importance-badge {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #D8CDEA, #b8a8d8);
    color: white;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
}

.node-links-badge {
    font-size: 10px;
    color: #B8A9AC;
    background: rgba(217, 163, 175, 0.1);
    padding: 3px 8px;
    border-radius: 10px;
}

.node-content {
    font-size: 13px;
    color: #4A3F41;
    line-height: 1.6;
    margin: 0;
}

.node-keywords {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.keyword-tag {
    font-size: 10px;
    color: #8A7880;
    background: rgba(217, 163, 175, 0.12);
    padding: 3px 8px;
    border-radius: 8px;
}

.node-time {
    font-size: 10px;
    color: #D4C8CA;
    text-align: right;
}

/* 详情弹窗 */
.detail-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(74, 63, 65, 0.3);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-end;
}

.detail-panel {
    background: #FFFBFA;
    border-radius: 28px 28px 0 0;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 -10px 40px rgba(217, 163, 175, 0.15);
}

.detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 20px 16px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.1);
    flex-shrink: 0;
}

.detail-title {
    font-size: 16px;
    font-weight: 700;
    color: #4A3F41;
}

.detail-close {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(217, 163, 175, 0.1);
    border: none;
    font-size: 20px;
    color: #B8A9AC;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.detail-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px calc(env(safe-area-inset-bottom, 0px) + 20px);
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.detail-body::-webkit-scrollbar {
    display: none;
}

.detail-importance {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.importance-label {
    font-size: 12px;
    color: #B8A9AC;
}

.importance-stars {
    display: flex;
    gap: 2px;
}

.star {
    font-size: 14px;
    color: #E0D4E8;
}

.star.active {
    color: #D8CDEA;
}

.detail-content-box {
    background: rgba(255, 255, 255, 0.5);
    border-radius: 16px;
    padding: 14px;
    border: 1px solid rgba(255, 240, 242, 0.5);
}

.detail-content-text {
    font-size: 14px;
    color: #4A3F41;
    line-height: 1.7;
    margin: 0;
}

.detail-keywords,
.detail-neighbors {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.detail-label {
    font-size: 11px;
    font-weight: 600;
    color: #B8A9AC;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.keyword-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.keyword-chip {
    font-size: 11px;
    color: #8A7880;
    background: rgba(216, 205, 234, 0.15);
    padding: 4px 10px;
    border-radius: 10px;
}

.neighbor-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.neighbor-card {
    background: rgba(255, 255, 255, 0.6);
    border-radius: 14px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border: 1px solid rgba(255, 240, 242, 0.4);
    cursor: pointer;
    transition: background 0.15s;
}

.neighbor-card:active {
    background: rgba(217, 163, 175, 0.08);
}

.neighbor-content {
    flex: 1;
    font-size: 12px;
    color: #6B5E;
    margin: 0;
}

.neighbor-importance {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(216, 205, 234, 0.3);
    color: #8A7880;
    font-size: 10px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

/* 模态框 */
.modal-mask {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-box {
    background: #fffbfa;
    border-radius: 22px;
    padding: 24px 20px;
    width: calc(100% - 48px);
    max-width: 320px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.modal-title {
    font-size: 16px;
    font-weight: 700;
    color: #4A3F41;
}

.modal-desc {
    font-size: 13px;
    color: #8A7880;
    line-height: 1.5;
    margin: 0;
}

.modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.modal-btn {
    padding: 8px 18px;
    border-radius: 12px;
    border: none;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
}

.modal-btn.cancel {
    background: rgba(217, 163, 175, 0.15);
    color: #B8A9AC;
}

.modal-btn.confirm {
    background: linear-gradient(135deg, #D8CDEA, #b8a8d8);
    color: white;
}

.toast-float {
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
    z-index: 1001;
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

.slide-up-enter-active {
    transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.slide-up-leave-active {
    transition: transform 0.25s ease;
}

.slide-up-enter-from {
    transform: translateY(100%);
}

.slide-up-leave-to {
    transform: translateY(100%);
}

.fade-enter-active {
    transition: opacity 0.2s;
}

.fade-leave-active {
    transition: opacity 0.15s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.graph-nav-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    cursor: pointer;
}

.graph-persona-name {
    font-size: 10px;
    color: #B8A9AC;
}

.persona-switch-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.persona-switch-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(217, 163, 175, 0.12);
    cursor: pointer;
    transition: background 0.15s;
}

.persona-switch-item.active {
    background: rgba(217, 163, 175, 0.1);
    border-color: rgba(217, 163, 175, 0.3);
}

.ps-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 233, 237, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    overflow: hidden;
    flex-shrink: 0;
}

.ps-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.ps-name {
    flex: 1;
    font-size: 14px;
    color: #4A3F41;
}

.ps-check {
    font-size: 14px;
    color: #D9A3AF;
    font-weight: 700;
}

.import-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(74, 63, 65, 0.2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-end;
    padding: 0 16px calc(env(safe-area-inset-bottom, 0px) + 16px);
}

.import-panel {
    background: rgba(255, 252, 252, 0.97);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 28px;
    width: 100%;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 20px 60px rgba(217, 163, 175, 0.15);
    border: 1px solid rgba(255, 240, 242, 0.5);
    animation: slideUp 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.import-panel-title {
    font-size: 16px;
    font-weight: 700;
    color: #4A3F41;
    text-align: center;
}
</style>
