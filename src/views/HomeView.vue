<template>
    <div class="home-screen">
        <div class="dynamic-island"></div>

        <div class="pages-container" ref="pagesContainer" @scroll="handlePageScroll" @mousedown="handleMouseDown"
            @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
            <!-- 第一页 -->
            <div class="page">
                <!-- 1. 小纸条组件（全宽） -->
                <div class="note-card" @click="showCardEditor = true">
                    <p class="note-tag">✦ 今日小纸条</p>
                    <p class="note-content">{{ todayCard }}</p>
                    <div class="note-footer">
                        <span>{{ currentAi.note || currentAi.name || '...' }}今天选了这张 · 🍵</span>
                    </div>
                </div>

                <!-- 2. 中间行：左纪念日 | 右2×2 app -->
                <div class="middle-row">
                    <div class="days-card" @click="showDaysEdit = true">
                        <p class="days-top-label">在一起</p>
                        <div class="days-center">
                            <p class="days-number">{{ togetherDays }}</p>
                            <p class="days-unit-text">天 ✿</p>
                        </div>
                        <p class="days-bottom-label">纪念日</p>
                    </div>

                    <div class="middle-apps">
                        <div class="mini-app" @click="$router.push('/about')">
                            <img v-if="customIcons.about" :src="customIcons.about" class="custom-icon" />
                            <AppIcon v-else icon="heart"
                                gradient="linear-gradient(155deg, rgba(252,244,248,0.95), rgba(245,232,240,0.7))" />
                        </div>
                        <div class="mini-app" @click="$router.push('/memory')">
                            <img v-if="customIcons.brain" :src="customIcons.brain" class="custom-icon" />
                            <AppIcon v-else icon="brain"
                                gradient="linear-gradient(155deg, rgba(246,250,252,0.95), rgba(235,242,248,0.7))" />
                        </div>
                        <div class="mini-app" @click="$router.push('/worldbook')">
                            <img v-if="customIcons.worldbook" :src="customIcons.worldbook" class="custom-icon" />
                            <AppIcon v-else icon="book"
                                gradient="linear-gradient(155deg, rgba(252,250,246,0.95), rgba(245,240,232,0.7))" />
                        </div>
                        <div class="mini-app" @click="$router.push('/customize')">
                            <img v-if="customIcons.customize" :src="customIcons.customize" class="custom-icon" />
                            <AppIcon v-else icon="customize"
                                gradient="linear-gradient(155deg, rgba(250,245,252,0.95), rgba(242,232,248,0.7))" />
                        </div>
                    </div>
                </div>

                <!-- 3. 对话框组件（全宽） -->
                <div class="chat-widget" @click="openChat">
                    <div class="chat-widget-header">
                        <div class="chat-widget-avatar">
                            <img v-if="currentAi.avatarUrl" :src="currentAi.avatarUrl" />
                            <span v-else>{{ currentAi.avatar || '💬' }}</span>
                        </div>
                        <div class="chat-widget-info">
                            <p class="chat-widget-name">{{ currentAi.note || currentAi.name || '...' }}</p>
                            <p class="chat-widget-time">刚刚</p>
                        </div>
                        <button class="chat-widget-edit" @click.stop="showBubbleEdit = true">✎</button>
                    </div>
                    <div class="chat-widget-bubbles">
                        <div class="cw-bubble left">
                            <p>{{ leftBubbleText }}</p>
                        </div>
                        <div class="cw-bubble right">
                            <p>{{ rightBubbleText }}</p>
                        </div>
                    </div>
                </div>

                <!-- 4. 下方4个app图标（一排） -->
                <div class="bottom-apps">
                    <div class="mini-app" @click="$router.push('/settings')">
                        <img v-if="customIcons.settings" :src="customIcons.settings" class="custom-icon-sm" />
                        <AppIcon v-else icon="settings"
                            gradient="linear-gradient(155deg, rgba(250,248,252,0.95), rgba(240,236,245,0.7))" />
                    </div>
                    <div class="mini-app" @click="$router.push('/logs')">
                        <img v-if="customIcons.logs" :src="customIcons.logs" class="custom-icon-sm" />
                        <AppIcon v-else icon="book"
                            gradient="linear-gradient(155deg, rgba(248,245,252,0.95), rgba(238,232,245,0.7))" />
                    </div>
                    <div class="mini-app" @click="$router.push('/presence')">
                        <img v-if="customIcons.presence" :src="customIcons.presence" class="custom-icon-sm" />
                        <AppIcon v-else icon="heart"
                            gradient="linear-gradient(155deg, rgba(245,248,255,0.95), rgba(232,238,250,0.7))" />
                    </div>
                    <div class="mini-app" @click="$router.push('/diary')">
                        <img v-if="customIcons.diary" :src="customIcons.diary" class="custom-icon-sm" />
                        <AppIcon v-else icon="book"
                            gradient="linear-gradient(155deg, rgba(252,248,245,0.95), rgba(245,238,230,0.7))" />
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

        <!-- 5. 底部dock栏 -->
        <div class="dock-bar">
            <div class="dock-item" @click="openChat">
                <div class="dock-icon-wrap">
                    <img v-if="customIcons.chat" :src="customIcons.chat" class="dock-custom-img" />
                    <svg v-else viewBox="0 0 40 40" fill="none" class="dock-svg">
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

        <!-- 弹窗 -->
        <BlurModal :visible="showDaysEdit" @close="showDaysEdit = false">
            <h3>设置纪念日</h3>
            <DreamInput label="开始日期" type="date" v-model="startDate" />
            <div class="modal-actions">
                <SoftButton variant="secondary" @click="showDaysEdit = false">取消</SoftButton>
                <SoftButton variant="primary" @click="saveDaysDate">保存</SoftButton>
            </div>
        </BlurModal>

        <BlurModal :visible="showCardEditor" @close="showCardEditor = false">
            <h3>字卡管理</h3>
            <div class="card-input-row">
                <DreamInput type="textarea" v-model="newCard" :rows="3" placeholder="写字卡...用换行或 ；/ 分隔可批量添加" />
                <SoftButton variant="primary" size="sm" @click="addCard" :disabled="!newCard.trim()">添加</SoftButton>
            </div>
            <div class="card-list">
                <div v-for="(card, idx) in cards" :key="idx" class="card-item">
                    <span class="card-text">{{ card }}</span>
                    <button class="card-delete" @click="removeCard(idx)">×</button>
                </div>
                <p v-if="cards.length === 0" class="empty-text">还没有字卡，添加一些吧</p>
            </div>
        </BlurModal>

        <!-- 对话框编辑弹窗 -->
        <BlurModal :visible="showBubbleEdit" @close="showBubbleEdit = false">
            <h3>自定义对话框</h3>
            <DreamInput label="对方说的话" v-model="editLeftBubble" placeholder="在想你..." />
            <DreamInput label="我说的话" v-model="editRightBubble" placeholder="我也是..." />
            <div class="modal-actions">
                <SoftButton variant="secondary" @click="showBubbleEdit = false">取消</SoftButton>
                <SoftButton variant="primary" @click="saveBubbles">保存</SoftButton>
            </div>
        </BlurModal>

        <p class="version-text">v1.1.1</p>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useTime } from '@/composables/useTime'
import { api } from '@/utils/api'
import GlassCard from '@/components/ui/GlassCard.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BlurModal from '@/components/ui/BlurModal.vue'
import DreamInput from '@/components/ui/DreamInput.vue'
import SoftButton from '@/components/ui/SoftButton.vue'

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
const showCardEditor = ref(false)
const cards = ref([])
const newCard = ref('')
const todayCard = ref('还没有字卡...')
const startDate = ref('')
const showDaysEdit = ref(false)
const customIcons = ref({})
const showBubbleEdit = ref(false)
const editLeftBubble = ref('')
const editRightBubble = ref('')

const pagesContainer = ref(null)
let isDragging = false
let startX = 0
let scrollLeft = 0

function handlePageScroll(e) {
    const container = e.target
    const pageWidth = container.offsetWidth
    currentPage.value = Math.round(container.scrollLeft / pageWidth)
}

function loadCards() {
    const saved = localStorage.getItem('word_cards')
    if (saved) {
        cards.value = JSON.parse(saved)
        pickTodayCard()
    }
}

function pickTodayCard() {
    if (cards.value.length === 0) {
        todayCard.value = '还没有字卡...'
        return
    }
    // 用日期作为种子，每天固定选一张
    const today = new Date().toISOString().slice(0, 10)
    let hash = 0
    for (let i = 0; i < today.length; i++) {
        hash = ((hash << 5) - hash) + today.charCodeAt(i)
        hash |= 0
    }
    const idx = Math.abs(hash) % cards.value.length
    todayCard.value = cards.value[idx]
}

function addCard() {
    if (!newCard.value.trim()) return
    // 用换行、；、/、、分隔
    const items = newCard.value
        .split(/[\n;；/、]/)
        .map(s => s.trim())
        .filter(Boolean)
    items.forEach(item => {
        if (!cards.value.includes(item)) {
            cards.value.push(item)
        }
    })
    localStorage.setItem('word_cards', JSON.stringify(cards.value))
    newCard.value = ''
    pickTodayCard()
}

function removeCard(idx) {
    cards.value.splice(idx, 1)
    localStorage.setItem('word_cards', JSON.stringify(cards.value))
    pickTodayCard()
}

function saveDaysDate() {
    if (!startDate.value) return
    localStorage.setItem('together_start_date', startDate.value)
    calculateDays()
    showDaysEdit.value = false
}

function saveBubbles() {
    if (editLeftBubble.value.trim()) {
        leftBubbleText.value = editLeftBubble.value.trim()
        localStorage.setItem('home_bubble_left', leftBubbleText.value)
    }
    if (editRightBubble.value.trim()) {
        rightBubbleText.value = editRightBubble.value.trim()
        localStorage.setItem('home_bubble_right', rightBubbleText.value)
    }
    showBubbleEdit.value = false
}


function calculateDays() {
    const saved = localStorage.getItem('together_start_date')
    if (saved) {
        const start = new Date(saved)
        const now = new Date()
        togetherDays.value = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)))
    }
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

        // 只在没有自定义日期时才请求消息算天数
        const savedDate = localStorage.getItem('together_start_date')
        if (!savedDate) {
            // 不请求全部消息了，用一个轻量接口
            togetherDays.value = 1
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
    // 主屏幕壁纸
    const savedWallpaper = localStorage.getItem('custom_wallpaper')
    const scope = localStorage.getItem('wallpaper_scope') || 'home'
    if (savedWallpaper && scope === 'home') {
        const page = document.querySelector('.home-screen')
        if (page) {
            page.style.backgroundImage = `url(${savedWallpaper})`
            page.style.backgroundSize = 'cover'
            page.style.backgroundPosition = 'center'
        }
    }

    // 加载自定义图标
    const savedIcons = localStorage.getItem('custom_app_icons')
    if (savedIcons) customIcons.value = JSON.parse(savedIcons)

    editLeftBubble.value = leftBubbleText.value
    editRightBubble.value = rightBubbleText.value

    loadCards()
    calculateDays()
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

.dynamic-island {
    width: 100px;
    height: 28px;
    background: #1a1418;
    border-radius: 20px;
    margin: 0 auto 14px;
    opacity: 0.85;
}

/* 小纸条 */
.note-card {
    position: relative;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(249, 200, 212, 0.3);
    border-radius: 22px;
    padding: 18px 22px 14px;
    margin-bottom: 14px;
    box-shadow: 0 2px 12px rgba(249, 200, 212, 0.06);
    overflow: hidden;
    cursor: pointer;
    animation: fadeUp 0.5s var(--ease-soft) backwards;
}

.note-card::before {
    content: '';
    position: absolute;
    top: -20px;
    right: -20px;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(249, 200, 212, 0.25) 0%, transparent 70%);
    pointer-events: none;
}

.note-tag {
    font-size: 10px;
    color: #e8a0b4;
    letter-spacing: 1.5px;
    opacity: 0.8;
    margin-bottom: 10px;
}

.note-content {
    font-family: 'Shippori Mincho', serif;
    font-size: 16px;
    color: #5c3d4a;
    line-height: 1.6;
    letter-spacing: 1px;
    margin-bottom: 12px;
}

.note-footer {
    border-top: 1px dashed rgba(249, 200, 212, 0.3);
    padding-top: 10px;
    font-size: 11px;
    color: #b09aa8;
}

.note-text {
    font-family: 'Shippori Mincho', serif;
    font-size: 14px;
    color: var(--color-text);
    text-align: center;
    line-height: 1.8;
}

/* 2. 中间行 */
.middle-row {
    display: flex;
    gap: 12px;
    margin-bottom: 14px;
    animation: fadeUp 0.5s var(--ease-soft) 0.08s backwards;
}

.decor-heart.d1 {
    top: 10px;
    right: 12px;
    animation: softFloat 6s ease-in-out infinite;
}

.decor-heart.d2 {
    bottom: 12px;
    left: 10px;
    font-size: 10px;
    opacity: 0.12;
    animation: softFloat 8s ease-in-out infinite 1s;
}

/* 纪念日 */
.days-card {
    flex: 1;
    min-height: 160px;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(249, 200, 212, 0.3);
    border-radius: 22px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(249, 200, 212, 0.06);
    animation: fadeUp 0.5s var(--ease-soft) 0.08s backwards;
}

.days-card::after {
    content: '♡';
    position: absolute;
    bottom: 10px;
    right: 14px;
    font-size: 28px;
    color: #f9c8d4;
    opacity: 0.5;
    pointer-events: none;
}

.days-top-label {
    font-size: 10px;
    color: #b09aa8;
    letter-spacing: 1px;
}

.days-center {
    text-align: center;
}

.days-number {
    font-family: 'Shippori Mincho', serif;
    font-size: 48px;
    font-weight: 500;
    color: #e8a0b4;
    line-height: 1;
    letter-spacing: -1px;
}

.days-unit-text {
    font-size: 12px;
    color: #b09aa8;
    margin-top: 4px;
}

.days-bottom-label {
    font-size: 13px;
    font-weight: 500;
    color: #5c3d4a;
}

.middle-apps {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    align-content: center;
}

/* 3. 对话框组件 */
.chat-widget {
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(237, 224, 245, 0.1);
    border-radius: 20px;
    padding: 12px 14px;
    margin-bottom: 14px;
    cursor: pointer;
    animation: fadeUp 0.5s var(--ease-soft) 0.16s backwards;
}

.chat-widget-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.chat-widget-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(249, 200, 212, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    overflow: hidden;
}

.chat-widget-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.chat-widget-info {
    flex: 1;
}

.chat-widget-name {
    font-size: 13px;
    color: var(--color-text);
    font-weight: 500;
}

.chat-widget-time {
    font-size: 10px;
    color: var(--color-text-light);
    opacity: 0.4;
    margin-top: 1px;
}

.chat-widget-bubbles {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

/* 对话框组件 */
.chat-widget {
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(249, 200, 212, 0.3);
    border-radius: 22px;
    padding: 14px 18px;
    margin-bottom: 14px;
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(249, 200, 212, 0.06);
    animation: fadeUp 0.5s var(--ease-soft) 0.16s backwards;
}

.chat-widget-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
}

.chat-widget-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f9c8d4, #ede0f5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    overflow: hidden;
}

.chat-widget-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.chat-widget-info {
    flex: 1;
}

.chat-widget-name {
    font-size: 13px;
    color: #5c3d4a;
    font-weight: 500;
}

.chat-widget-time {
    font-size: 9px;
    color: #b09aa8;
    margin-top: 1px;
}

.chat-widget-edit {
    background: none;
    border: none;
    font-size: 14px;
    color: #b09aa8;
    cursor: pointer;
    opacity: 0.4;
    padding: 4px;
}

.chat-widget-bubbles {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.cw-bubble {
    max-width: 75%;
    padding: 8px 13px;
    border-radius: 16px;
    font-size: 12px;
    line-height: 1.5;
    color: #5c3d4a;
}

.cw-bubble.left {
    align-self: flex-start;
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(249, 200, 212, 0.12);
    border-radius: 16px 16px 16px 4px;
}

.cw-bubble.right {
    align-self: flex-end;
    background: linear-gradient(135deg, rgba(249, 200, 212, 0.2), rgba(237, 224, 245, 0.15));
    border: 1px solid rgba(249, 200, 212, 0.1);
    border-radius: 16px 16px 4px 16px;
}

.widget-bubble.right {
    justify-content: flex-end;
}

.widget-text {
    padding: 7px 12px;
    border-radius: 14px;
    font-size: 11px;
    color: var(--color-text);
    max-width: 75%;
    line-height: 1.4;
}

.widget-bubble.left .widget-text {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(249, 200, 212, 0.06);
}

.widget-bubble.right .widget-text {
    background: rgba(249, 200, 212, 0.1);
    border: 1px solid rgba(249, 200, 212, 0.06);
}

/* 4. 下方4个app */
.bottom-apps {
    display: flex;
    justify-content: space-around;
    padding: 0 8px;
    margin-bottom: 14px;
    animation: fadeUp 0.5s var(--ease-soft) 0.24s backwards;
}

.custom-icon-sm {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    object-fit: cover;
    box-shadow: 0 2px 6px rgba(249, 200, 212, 0.08);
}

/* 5. Dock */
.dock-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 30px;
    padding: 12px 32px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-top: 1px solid rgba(249, 200, 212, 0.06);
    border-radius: 22px 22px 0 0;
    margin: 0 auto;
    width: 78%;
    max-width: 290px;
    flex-shrink: 0;
    animation: fadeUp 0.5s var(--ease-soft) 0.32s backwards;
}

.dock-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
}

.dock-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.55);
    box-shadow: 0 2px 6px rgba(249, 200, 212, 0.06);
    transition: transform 0.3s var(--ease-soft);
}

.dock-item:active .dock-icon-wrap {
    transform: scale(0.92);
}

.dock-svg {
    width: 20px;
    height: 20px;
}

.dock-custom-img {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    object-fit: cover;
}

.dock-label {
    margin-top: 4px;
    font-size: 9px;
    color: var(--color-text-light);
    opacity: 0.45;
}

/* 通用 */
.mini-app {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.custom-icon {
    width: 52px;
    height: 52px;
    border-radius: 15px;
    object-fit: cover;
    box-shadow: 0 2px 6px rgba(249, 200, 212, 0.08);
    display: block;
}

/* 分页 */
.pages-container {
    flex: 1;
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
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
    height: 100%;
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 0 2px;
}

.page-dots {
    display: flex;
    justify-content: center;
    gap: 5px;
    padding: 6px 0;
    flex-shrink: 0;
}

.dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #f9c8d4;
    opacity: 0.2;
    transition: opacity 0.3s, transform 0.3s;
}

.dot.active {
    opacity: 0.65;
    transform: scale(1.3);
}

/* 黑胶 */
.vinyl-player {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 0;
}

.vinyl-disc {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2a2228, #1a1418);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.vinyl-groove {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.03);
}

.vinyl-groove:first-child {
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
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f9c8d4, #ede0f5);
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.12);
}

.vinyl-title {
    margin-top: 18px;
    font-size: 13px;
    color: var(--color-text);
}

.vinyl-subtitle {
    font-size: 11px;
    color: var(--color-text-light);
    opacity: 0.4;
    margin-top: 3px;
}

/* 动画 */
@keyframes fadeUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes twinkle {

    0%,
    100% {
        opacity: 0.1;
        transform: scale(0.9);
    }

    50% {
        opacity: 0.25;
        transform: scale(1.1);
    }
}

/* 弹窗 */
.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
}

.card-input-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    margin-bottom: 14px;
}

.card-list {
    max-height: 200px;
    overflow-y: auto;
}

.card-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--color-border);
}

.card-item:last-child {
    border-bottom: none;
}

.card-text {
    font-size: 13px;
    color: var(--color-text);
    flex: 1;
}

.card-delete {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--color-text-light);
    cursor: pointer;
    opacity: 0.4;
    padding: 4px 8px;
}

.empty-text {
    color: var(--color-text-light);
    font-size: 12px;
    opacity: 0.5;
    text-align: center;
    padding: 12px;
}

.version-text {
    position: absolute;
    top: calc(env(safe-area-inset-top, 44px) + 2px);
    right: 4px;
    font-size: 9px;
    color: var(--color-text-light);
    opacity: 0.12;
}
</style>
