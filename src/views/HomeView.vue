<template>
    <div class="home-screen">
        <!-- 灵动岛 -->
        <div class="dynamic-island"></div>

        <!-- 分页容器 -->
        <div class="pages-container" ref="pagesContainer" @scroll="handlePageScroll" @mousedown="handleMouseDown"
            @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
            <!-- 第一页 -->
            <div class="page">
                <!-- 纸条组件 -->
                <div class="folder-note">
                    <div class="folder-back">
                        <p class="note-text">{{ aiNote }}</p>
                    </div>
                    <div class="folder-front">
                        <span class="folder-front-text">{{ currentAi.note || currentAi.name || '...' }}今天想说...</span>
                        <div class="folder-tab-ext"></div>
                    </div>
                </div>

                <!-- 主内容区：左右分栏 -->
                <div class="main-content">
                    <!-- 左侧：纪念日 + 小app -->
                    <div class="left-column">
                        <GlassCard size="md" class="days-card">
                            <div class="days-decor">
                                <span class="decor-heart d1">♡</span>
                                <span class="decor-heart d2">♡</span>
                                <span class="decor-star">✧</span>
                            </div>
                            <p class="days-label">在一起</p>
                            <p class="days-number">{{ togetherDays }}</p>
                            <p class="days-unit">天</p>
                        </GlassCard>

                        <div class="left-app-grid">
                            <div class="mini-app" @click="$router.push('/settings')">
                                <AppIcon icon="settings"
                                    gradient="linear-gradient(155deg, rgba(250,248,252,0.95), rgba(240,236,245,0.7))" />
                            </div>
                            <div class="mini-app placeholder-app">
                                <div class="app-placeholder"></div>
                            </div>
                            <div class="mini-app placeholder-app">
                                <div class="app-placeholder"></div>
                            </div>
                            <div class="mini-app placeholder-app">
                                <div class="app-placeholder"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 右侧：App + 气泡 -->
                    <div class="right-column">
                        <div class="mini-app-grid">
                            <div class="mini-app" @click="$router.push('/about')">
                                <AppIcon icon="heart"
                                    gradient="linear-gradient(155deg, rgba(252,244,248,0.95), rgba(245,232,240,0.7))" />
                            </div>
                            <div class="mini-app" @click="$router.push('/memory')">
                                <AppIcon icon="brain"
                                    gradient="linear-gradient(155deg, rgba(246,250,252,0.95), rgba(235,242,248,0.7))" />
                            </div>
                            <div class="mini-app" @click="$router.push('/worldbook')">
                                <AppIcon icon="book"
                                    gradient="linear-gradient(155deg, rgba(252,250,246,0.95), rgba(245,240,232,0.7))" />
                            </div>
                            <div class="mini-app" @click="$router.push('/customize')">
                                <AppIcon icon="customize"
                                    gradient="linear-gradient(155deg, rgba(250,245,252,0.95), rgba(242,232,248,0.7))" />
                            </div>
                        </div>

                        <div class="bubble-widget">
                            <div class="widget-bubble left">
                                <div class="widget-avatar">
                                    <img v-if="currentAi.avatarUrl" :src="currentAi.avatarUrl" />
                                    <span v-else>{{ currentAi.avatar || '💬' }}</span>
                                </div>
                                <div class="widget-text">{{ leftBubbleText }}</div>
                            </div>
                            <div class="widget-bubble right">
                                <div class="widget-text">{{ rightBubbleText }}</div>
                                <div class="widget-avatar user">
                                    <span>{{ userAvatar }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 第二页 -->
            <div class="page">
                <div class="vinyl-player">
                    <div class="vinyl-disc">
                        <div class="vinyl-groove"></div>
                        <div class="vinyl-groove g2"></div>
                        <div class="vinyl-groove g3"></div>
                        <div class="vinyl-label"></div>
                    </div>
                    <p class="vinyl-title">正在播放...</p>
                    <p class="vinyl-subtitle">暂无音乐</p>
                </div>
            </div>
        </div>

        <!-- 分页指示器 -->
        <div class="page-dots">
            <span class="dot" :class="{ active: currentPage === 0 }"></span>
            <span class="dot" :class="{ active: currentPage === 1 }"></span>
        </div>

        <!-- Dock 栏 -->
        <div class="dock-bar">
            <div class="dock-item" @click="openChat">
                <div class="dock-icon-wrap">
                    <svg viewBox="0 0 40 40" fill="none" class="dock-svg">
                        <rect x="8" y="14" width="20" height="14" rx="7" stroke="rgba(160,120,180,0.7)"
                            stroke-width="1.1" />
                        <path d="M14 28 L12 32 L17 28" stroke="rgba(160,120,180,0.7)" stroke-width="1.1"
                            stroke-linecap="round" stroke-linejoin="round" />
                        <circle cx="14" cy="21" r="1.2" fill="rgba(160,120,180,0.5)" />
                        <circle cx="18" cy="21" r="1.2" fill="rgba(160,120,180,0.4)" />
                        <circle cx="22" cy="21" r="1.2" fill="rgba(160,120,180,0.3)" />
                    </svg>
                </div>
                <span class="dock-label">共语</span>
            </div>

            <div class="dock-item" @click="openCompanionSpace">
                <div class="dock-icon-wrap">
                    <svg viewBox="0 0 40 40" fill="none" class="dock-svg">
                        <circle cx="20" cy="18" r="4" stroke="rgba(200,130,160,0.7)" stroke-width="1"
                            fill="rgba(200,130,160,0.05)" />
                        <path d="M20 26v4M18 30h4" stroke="rgba(200,130,160,0.6)" stroke-width="1"
                            stroke-linecap="round" />
                        <circle cx="20" cy="20" r="11" stroke="rgba(200,130,160,0.3)" stroke-width="0.7"
                            stroke-dasharray="3 2" />
                    </svg>
                </div>
                <span class="dock-label">共栖</span>
            </div>

            <div class="dock-item" @click="openPhone">
                <div class="dock-icon-wrap">
                    <svg viewBox="0 0 40 40" fill="none" class="dock-svg">
                        <path d="M28 12c0-1.1-.9-2-2-2H14c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12z"
                            stroke="rgba(120,140,180,0.7)" stroke-width="1.1" fill="rgba(120,140,180,0.05)" />
                        <circle cx="20" cy="27" r="1.5" stroke="rgba(120,140,180,0.5)" stroke-width="0.8" />
                        <path d="M17 11h6" stroke="rgba(120,140,180,0.4)" stroke-width="0.8" stroke-linecap="round" />
                    </svg>
                </div>
                <span class="dock-label">电话</span>
            </div>
        </div>

        <p class="version-text">v1.2.0</p>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useTime } from '@/composables/useTime'
import { api } from '@/utils/api'
import GlassCard from '@/components/ui/GlassCard.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const router = useRouter()
const { dateStr } = useTime()

const currentAi = ref({
    name: '',
    note: '',
    avatar: '💬',
    avatarUrl: '',
    personaId: '',
})

const togetherDays = ref(1)
const aiNote = ref('今天也要好好的哦')
const leftBubbleText = ref('在想你')
const rightBubbleText = ref('我也是')
const userAvatar = ref('🌙')

const currentPage = ref(0)

const pagesContainer = ref(null)
let isDragging = false
let startX = 0
let scrollLeft = 0

function handlePageScroll(e) {
    const container = e.target
    const pageWidth = container.offsetWidth
    currentPage.value = Math.round(container.scrollLeft / pageWidth)
}

function handleMouseDown(e) {
    isDragging = true
    startX = e.pageX - pagesContainer.value.offsetLeft
    scrollLeft = pagesContainer.value.scrollLeft
    pagesContainer.value.style.scrollBehavior = 'auto'
}

function handleMouseMove(e) {
    if (!isDragging) return
    e.preventDefault()
    const x = e.pageX - pagesContainer.value.offsetLeft
    const walk = (x - startX) * 1.5
    pagesContainer.value.scrollLeft = scrollLeft - walk
}

function handleMouseUp() {
    isDragging = false
    pagesContainer.value.style.scrollBehavior = 'smooth'
}


async function loadHomeData() {
    try {
        const latestRes = await api('/api/messages/latest-persona')
        const latestData = await latestRes.json()
        const personaId = latestData.personaId || 'xiaorou'
        currentAi.value.personaId = personaId

        const detailRes = await api(`/api/persona/${personaId}`)
        const detail = await detailRes.json()
        currentAi.value.name = detail.name || ''
        currentAi.value.note = detail.note || ''
        currentAi.value.avatar = detail.avatar || '💬'
        currentAi.value.avatarUrl = detail.avatarUrl || ''

        const msgRes = await api(`/api/messages/${personaId}`)
        const msgs = await msgRes.json()
        if (msgs.length > 0) {
            const firstMsg = new Date(msgs[0].timestamp)
            const now = new Date()
            togetherDays.value = Math.max(1, Math.floor((now - firstMsg) / (1000 * 60 * 60 * 24)))
        }

        const savedLeft = localStorage.getItem('home_bubble_left')
        const savedRight = localStorage.getItem('home_bubble_right')
        const savedUserAvatar = localStorage.getItem('home_user_avatar')
        if (savedLeft) leftBubbleText.value = savedLeft
        if (savedRight) rightBubbleText.value = savedRight
        if (savedUserAvatar) userAvatar.value = savedUserAvatar
    } catch { }
}

async function openChat() {
    const mode = localStorage.getItem('chat_entry_mode') || 'direct'
    if (mode === 'list') {
        router.push('/chat-list')
        return
    }
    if (currentAi.value.personaId) {
        router.push(`/chat/${currentAi.value.personaId}`)
    } else {
        router.push('/chat/xiaorou')
    }
}

function openCompanionSpace() {
    router.push('/about')
}

function openPhone() { }

onMounted(() => {
    loadHomeData()
})
</script>

<style scoped>
.home-screen {
    padding-top: calc(env(safe-area-inset-top, 44px) + 8px);
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    position: relative;
}

/* ========== 灵动岛 ========== */
.dynamic-island {
    width: 100px;
    height: 28px;
    background: #1a1418;
    border-radius: 20px;
    margin: 0 auto 20px;
    opacity: 0.85;
}

/* ========== 纸条组件 ========== */
.folder-note {
    position: relative;
    height: 150px;
    margin-bottom: 18px;
    animation: fadeIn 0.6s var(--ease-soft);
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--color-border);
}

.folder-back {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(248, 245, 252, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px 20px 55px;
}

.note-text {
    font-size: 14px;
    color: var(--color-text);
    text-align: center;
    line-height: 1.7;
    font-weight: 400;
}

.folder-front {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 42px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    padding: 0 16px;
}

.folder-front-text {
    font-size: 11px;
    color: var(--color-text-light);
    opacity: 0.6;
}

.folder-tab-ext {
    position: absolute;
    right: 0;
    bottom: 42px;
    width: 33%;
    height: 50px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-left: 1px solid rgba(255, 255, 255, 0.6);
    border-top: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 12px 0 0 0;
}

/* 右侧凸起标签页 */
.folder-tab-ext {
    position: absolute;
    right: 0px;
    top: -20px;
    width: 30%;
    height: 20px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--color-border);
    border-bottom: none;
    border-radius: 20px 20px 0 0;
}

/* ========== 主内容区 ========== */
.main-content {
    display: flex;
    gap: 14px;
    flex: 1;
    margin-bottom: 12px;
    animation: fadeIn 0.6s var(--ease-soft) 0.1s backwards;
}

.days-card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: space-between;
    min-height: 120px;
    background: var(--color-card);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(200, 130, 160, 0.04);
    padding: 14px 16px;
    position: relative;
    overflow: hidden;
}


.days-decor {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
}

.decor-heart {
    position: absolute;
    color: var(--color-primary);
    opacity: 0.15;
    font-size: 14px;
}

.decor-heart.d1 {
    top: 10px;
    right: 12px;
    animation: softFloat 6s ease-in-out infinite;
}

.decor-heart.d2 {
    bottom: 14px;
    left: 10px;
    font-size: 10px;
    opacity: 0.1;
    animation: softFloat 8s ease-in-out infinite 1s;
}

.decor-star {
    position: absolute;
    top: 28px;
    right: 32px;
    color: var(--color-primary);
    opacity: 0.12;
    font-size: 8px;
    animation: twinkle 3s ease-in-out infinite;
}

@keyframes twinkle {

    0%,
    100% {
        opacity: 0.08;
        transform: scale(0.9);
    }

    50% {
        opacity: 0.2;
        transform: scale(1.1);
    }
}

.days-label {
    font-size: 11px;
    color: var(--color-text);
    text-align: left;
    font-weight: 400;
    position: relative;
    z-index: 1;
}

.days-number {
    font-size: 38px;
    font-weight: 200;
    color: var(--color-primary);
    line-height: 1;
    text-align: center;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 1;
}

.days-unit {
    font-size: 11px;
    color: var(--color-text);
    text-align: right;
    font-weight: 400;
    position: relative;
    z-index: 1;
}

.days-date {
    display: none;
}

.left-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.left-app-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.placeholder-app {
    opacity: 0.3;
}

.app-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: var(--color-bg-secondary);
    border: 1px dashed var(--color-border);
    margin: 0 auto;
}

.right-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.mini-app-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

/* 对话气泡组件 */
.bubble-widget {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.widget-bubble {
    display: flex;
    align-items: center;
    gap: 8px;
}

.widget-bubble.right {
    justify-content: flex-end;
}

.widget-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    overflow: hidden;
    flex-shrink: 0;
}

.widget-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.widget-avatar.user {
    background: rgba(212, 137, 158, 0.15);
}

.widget-text {
    padding: 8px 12px;
    border-radius: 14px;
    font-size: 11px;
    color: var(--color-text);
    background: var(--color-card);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid var(--color-border);
    max-width: 75%;
}

.widget-bubble.right .widget-text {
    background: rgba(212, 137, 158, 0.08);
    border-color: rgba(212, 137, 158, 0.1);
}


/* ========== Dock 栏 ========== */
.dock-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 36px;
    padding: 16px 0;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
    background: var(--color-card);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-top: 1px solid var(--color-border);
    border-radius: 22px 22px 0 0;
    margin: 0 -22px;
    margin-top: auto;
}

.dock-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
}

.dock-icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(155deg, rgba(250, 248, 252, 0.95), rgba(240, 235, 245, 0.7));
    box-shadow: 0 2px 10px rgba(200, 130, 160, 0.08);
    transition: transform var(--duration-slow) var(--ease-soft);
}

.dock-item:active .dock-icon-wrap {
    transform: scale(0.92);
}

.dock-svg {
    width: 24px;
    height: 24px;
}

.dock-label {
    margin-top: 6px;
    font-size: 9px;
    color: var(--color-text-light);
    font-weight: 400;
    opacity: 0.6;
}

/* 分页容器 */
.pages-container {
    flex: 1;
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    scroll-behavior: smooth;
}


.pages-container::-webkit-scrollbar {
    display: none;
}

.page {
    min-width: 100%;
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    padding: 0;
}

/* 分页指示器 */
.page-dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 10px 0;
}

.dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-text-light);
    opacity: 0.2;
    transition: opacity 0.3s, transform 0.3s;
}

.dot.active {
    opacity: 0.6;
    transform: scale(1.3);
}

/* 黑胶播放器 */
.vinyl-player {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 30px 0;
}

.vinyl-disc {
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2a2228, #1a1418);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    animation: vinylSpin 8s linear infinite paused;
}

.vinyl-groove {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.vinyl-groove:nth-child(1) {
    width: 85%;
    height: 85%;
}

.vinyl-groove.g2 {
    width: 65%;
    height: 65%;
}

.vinyl-groove.g3 {
    width: 45%;
    height: 45%;
}

.vinyl-label {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-primary), rgba(212, 137, 158, 0.6));
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.2);
}

.vinyl-arm {
    width: 3px;
    height: 60px;
    background: rgba(200, 160, 180, 0.3);
    border-radius: 2px;
    position: absolute;
    top: 20px;
    right: 60px;
    transform: rotate(25deg);
    transform-origin: top center;
}

.vinyl-title {
    margin-top: 20px;
    font-size: 14px;
    color: var(--color-text);
    font-weight: 400;
}

.vinyl-subtitle {
    font-size: 11px;
    color: var(--color-text-light);
    opacity: 0.5;
    margin-top: 4px;
}

@keyframes vinylSpin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

/* 版本号 */
.version-text {
    position: absolute;
    top: calc(env(safe-area-inset-top, 44px) + 2px);
    right: 4px;
    font-size: 9px;
    color: var(--color-text-light);
    opacity: 0.15;
}
</style>
