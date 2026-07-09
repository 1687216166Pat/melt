<template>
    <div class="chat-page" :class="['theme-' + chatTheme, { 'bubble-merge': bubbleMerge }]">

        <!-- Header -->
        <div class="chat-header">
            <button class="back-btn" @click="goBack">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <div class="header-info" @click="goToDetail">
                <div class="header-avatar">
                    <img v-if="personaAvatarUrl" :src="personaAvatarUrl" />
                    <span v-else>{{ personaAvatar }}</span>
                </div>
                <div class="header-text">
                    <span class="header-name">{{ personaName }}</span>
                    <span class="header-status">
                        <span class="status-dot"></span>
                        在线
                    </span>
                </div>
            </div>
            <div class="header-actions">
                <button v-if="selectMode" class="header-btn danger" @click="cancelSelect">取消</button>
                <button class="header-btn" @click="showPanel = !showPanel">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="19" r="1" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- 浮动面板 -->
        <transition name="panel">
            <div v-if="showPanel" class="float-panel" @click.self="showPanel = false">
                <div class="panel-content">
                    <div class="panel-item" @click="goToDetail">
                        <span class="panel-icon">✧</span>
                        <div>
                            <p class="panel-title">助手详情</p>
                            <p class="panel-sub">进入人格空间</p>
                        </div>
                    </div>
                    <div class="panel-item" @click="clearChat">
                        <span class="panel-icon">◌</span>
                        <div>
                            <p class="panel-title">清理痕迹</p>
                            <p class="panel-sub">清空对话</p>
                        </div>
                    </div>
                    <div class="panel-item" @click="$router.push('/worldbook')">
                        <span class="panel-icon">❋</span>
                        <div>
                            <p class="panel-title">世界书</p>
                            <p class="panel-sub">这个世界的设定</p>
                        </div>
                    </div>
                </div>
            </div>
        </transition>

        <!-- 多选操作栏 -->
        <transition name="slide-down">
            <div v-if="selectMode && selectedIds.length > 0" class="select-bar">
                <span class="select-count">已选 {{ selectedIds.length }} 条</span>
                <div class="select-actions">
                    <button @click="deleteSelected">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                        </svg>
                        删除
                    </button>
                    <button @click="bookmarkSelected">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                        收藏
                    </button>
                    <button @click="screenshotSelected">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                        </svg>
                        截图
                    </button>
                </div>
            </div>
        </transition>

        <!-- 消息列表 -->
        <div class="chat-messages" ref="messagesContainer" @scroll="handleScroll">
            <div v-if="chatStore.hasMore" class="load-more" @click="loadOlder">
                加载更早的消息
            </div>

            <template v-for="(item, idx) in messagesWithTimestamp" :key="item.id || idx">
                <!-- 时间戳分隔 -->
                <div v-if="item.showTime" class="time-divider">
                    <span>{{ item.timeLabel }}</span>
                </div>

                <!-- 消息气泡 -->
                <ChatBubble :msg="item" :theme="chatTheme" :merge="bubbleMerge" :is-merged="item.isMerged"
                    :show-avatar="shouldShowAvatar(item, idx)" :persona-avatar="personaAvatar"
                    :persona-avatar-url="personaAvatarUrl" :user-avatar="userAvatar" :select-mode="selectMode"
                    :selected="selectedIds.includes(item.id)" @edit="handleEdit" @delete="handleDelete"
                    @regenerate="handleRegenerate" @bookmark="handleBookmark" @select="toggleSelect" />
            </template>

            <TypingIndicator :visible="isTyping" />
        </div>

        <DebugPanel v-if="showDebug" :info="debugInfo" />

        <ChatInput @send="handleSend" @send-images="handleSendImages" @send-emoji="handleSendEmoji"
            @send-gift="handleSendGift" @send-transfer="handleSendTransfer" @send-location="handleSendLocation"
            @continue-reply="handleContinueReply" @regenerate="handleRegenerateLatest" @multiselect="enterSelectMode" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChatBubble from '@/components/chat/ChatBubble.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import TypingIndicator from '@/components/chat/TypingIndicator.vue'
import DebugPanel from '@/components/chat/DebugPanel.vue'
import { useChatStore } from '@/stores/chat'
import { useWebSocket } from '@/composables/useWebSocket'
import { api } from '@/utils/api'
import { setCache } from '@/utils/cache'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const { send, onMessage, removeHandler, isConnected } = useWebSocket()

const messagesContainer = ref(null)
const isTyping = ref(false)
const debugInfo = ref(null)
const showPanel = ref(false)
const showDebug = ref(false)
const maxBubbles = ref(3)
const personaAvatar = ref('💬')
const personaAvatarUrl = ref('')
const personaName = ref('AI 助手')
const chatTheme = ref('default')
const bubbleMerge = ref(false)
const userAvatar = ref(localStorage.getItem('home_user_avatar') || '')

// 多选
const selectMode = ref(false)
const selectedIds = ref([])

const personaId = computed(() => route.params.personaId)

// 带时间戳分组和合并标记的消息列表
const messagesWithTimestamp = computed(() => {
    const msgs = chatStore.messages
    const result = []
    let lastTime = null
    let lastRole = null

    msgs.forEach((msg, idx) => {
        const ts = msg.timestamp ? new Date(msg.timestamp) : null
        let showTime = false
        let timeLabel = ''

        if (ts) {
            if (!lastTime || (ts - lastTime) > 5 * 60 * 1000) {
                showTime = true
                timeLabel = formatTimeLabel(ts)
                lastTime = ts
            }
        }

        // 是否合并（同角色连续消息）
        const isMerged = bubbleMerge.value && idx > 0
            && msgs[idx - 1].role === msg.role
            && !showTime
            && !msg.type // 特殊消息类型不合并

        result.push({ ...msg, showTime, timeLabel, isMerged })
        lastRole = msg.role
    })

    return result
})

function formatTimeLabel(date) {
    const now = new Date()
    const diff = now - date
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days === 0) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    } else if (days === 1) {
        return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    } else {
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
}

// 是否显示头像（只在需要显示头像的主题下，且是该角色连续消息的最后一条）
function shouldShowAvatar(item, idx) {
    if (chatTheme.value === 'default' || chatTheme.value === 'minimal' || chatTheme.value === 'liquid') {
        return false
    }
    const msgs = messagesWithTimestamp.value
    const next = msgs[idx + 1]
    // 最后一条或下一条是不同角色
    if (!next || next.role !== item.role) return true
    return false
}

async function loadPersonaName() {
    try {
        const res = await api(`/api/persona/${personaId.value}`)
        const data = await res.json()
        personaName.value = data.note || data.name || 'AI 助手'
        personaAvatar.value = data.avatar || '💬'
        personaAvatarUrl.value = data.avatarUrl || ''
        showDebug.value = data.show_debug || false
        chatTheme.value = data.chat_theme || 'default'
        bubbleMerge.value = data.bubble_merge || false

        if (data.max_messages || data.maxMessages) {
            maxBubbles.value = data.max_messages || data.maxMessages
        }

        // 壁纸
        if (data.chat_wallpaper) {
            const chatPage = document.querySelector('.chat-page')
            if (chatPage) {
                chatPage.style.backgroundImage = `url(${data.chat_wallpaper})`
                chatPage.style.backgroundSize = 'cover'
                chatPage.style.backgroundPosition = 'center'
            }
        }

        // 自定义主题 CSS
        if (data.chat_theme && data.chat_theme.startsWith('custom_')) {
            const saved = localStorage.getItem(`chat_custom_themes_${personaId.value}`)
            if (saved) {
                const themes = JSON.parse(saved)
                const found = themes.find(t => t.id === data.chat_theme)
                if (found) {
                    const old = document.getElementById('custom-chat-theme')
                    if (old) old.remove()
                    const style = document.createElement('style')
                    style.id = 'custom-chat-theme'
                    style.textContent = found.css
                    document.head.appendChild(style)
                }
            }
        }
    } catch (e) { }
}

function scrollToBottom() {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
    })
}

function handleSend(text, opts = {}) {
    if (!text || !personaId.value) return
    chatStore.addMessage({ role: 'user', content: text })
    if (personaId.value === 'wechat_sync') return

    // autoReply 默认 true，除非明确传 false
    if (opts.autoReply !== false) {
        send({ type: 'chat', content: text, personaId: personaId.value })
        isTyping.value = true
    }
    scrollToBottom()
    if (chatStore.allMessages) {
        setCache(`messages_${personaId.value}`, chatStore.allMessages)
    }
}

function handleSendImages({ images, text, narr }) {
    chatStore.addMessage({
        role: 'user',
        type: 'images',
        images,
        content: text,
        timestamp: new Date().toISOString()
    })
    const desc = text
        ? `[用户发送了 ${images.length} 张图片] ${text}`
        : `[用户发送了 ${images.length} 张图片]`
    send({ type: 'chat', content: desc, personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()
}

function handleSendEmoji(emoji) {
    chatStore.addMessage({
        role: 'user',
        type: 'emoji',
        emojiUrl: emoji.url,
        emojiName: emoji.name,
        content: `[表情包: ${emoji.name || ''}]`,
        timestamp: new Date().toISOString()
    })
    send({ type: 'chat', content: `[用户发了一个表情包: ${emoji.name || ''}]`, personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()
}

function handleSendGift({ name, content, message }) {
    chatStore.addMessage({
        role: 'user',
        type: 'gift',
        giftName: name,
        giftContent: content,
        giftMessage: message,
        content: `[礼物: ${name}]`,
        timestamp: new Date().toISOString()
    })
    const desc = `[用户送了一份礼物: ${name}${content ? `，里面有：${content}` : ''}${message ? `，附言：${message}` : ''}]`
    send({ type: 'chat', content: desc, personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()
}

function handleSendTransfer({ amount, note }) {
    chatStore.addMessage({
        role: 'user',
        type: 'transfer',
        amount,
        note,
        content: `[转账: ¥${amount.toFixed(2)}]`,
        timestamp: new Date().toISOString()
    })
    send({ type: 'chat', content: `[用户转账了 ¥${amount.toFixed(2)}${note ? `，备注：${note}` : ''}]`, personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()
}

function handleSendLocation({ lat, lng, manual }) {
    chatStore.addMessage({
        role: 'user',
        type: 'location',
        lat, lng,
        locationName: manual ? '我的位置' : '当前位置',
        content: `[位置]`,
        timestamp: new Date().toISOString()
    })
    const desc = lat ? `[用户分享了位置: ${lat.toFixed(4)}, ${lng.toFixed(4)}]` : `[用户分享了当前位置]`
    send({ type: 'chat', content: desc, personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()
}

function handleContinueReply() {
    send({ type: 'chat', content: '[继续]', personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()
}

function handleRegenerateLatest() {
    const lastAi = [...chatStore.messages].reverse().find(m => m.role === 'ai')
    if (!lastAi) return
    chatStore.messages = chatStore.messages.filter(m => m.id !== lastAi.id)
    api(`/api/message/${lastAi.id}`, { method: 'DELETE' })
    const lastUser = [...chatStore.messages].reverse().find(m => m.role === 'user')
    if (lastUser) {
        send({ type: 'chat', content: lastUser.content, personaId: personaId.value })
        isTyping.value = true
    }
}

function handleIncoming(data) {
    if (data.type === 'chat' || data.type === 'push') {
        isTyping.value = false

        let cleanContent = data.content
            .replace(/$$思考$$[\s\S]*?$$思考$$/g, '')
            .replace(/[\s\S]*?<\/think>/g, '')
            .trim()

        const bubbles = cleanContent.split('|||').map(s => s.replace(/\n/g, ' ').trim()).filter(Boolean)
        let final = bubbles
        const limit = maxBubbles.value || 3
        if (bubbles.length > limit) {
            final = []
            const chunkSize = Math.ceil(bubbles.length / limit)
            for (let i = 0; i < bubbles.length; i += chunkSize) {
                final.push(bubbles.slice(i, i + chunkSize).join(' '))
            }
        }

        final.forEach((line, idx) => {
            setTimeout(() => {
                chatStore.addMessage({ role: 'ai', content: line, timestamp: data.timestamp })
                scrollToBottom()
                if (idx === final.length - 1 && chatStore.allMessages) {
                    setCache(`messages_${personaId.value}`, chatStore.allMessages)
                }
            }, idx * 600)
        })

        if (data.debug) debugInfo.value = data.debug
    }
}

// 多选
function enterSelectMode() {
    selectMode.value = true
    selectedIds.value = []
}

function cancelSelect() {
    selectMode.value = false
    selectedIds.value = []
}

function toggleSelect(msgId) {
    const idx = selectedIds.value.indexOf(msgId)
    if (idx > -1) selectedIds.value.splice(idx, 1)
    else selectedIds.value.push(msgId)
}

async function deleteSelected() {
    if (!confirm(`确定删除选中的 ${selectedIds.value.length} 条消息？`)) return
    for (const id of selectedIds.value) {
        await api(`/api/message/${id}`, { method: 'DELETE' })
        chatStore.messages = chatStore.messages.filter(m => m.id !== id)
    }
    cancelSelect()
}

async function bookmarkSelected() {
    for (const id of selectedIds.value) {
        const msg = chatStore.messages.find(m => m.id === id)
        if (msg) await handleBookmark(msg)
    }
    cancelSelect()
}

async function screenshotSelected() {
    // html2canvas 长截图，后续实现
    cancelSelect()
}

async function handleBookmark(msg) {
    try {
        await api(`/api/bookmarks/${personaId.value}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: msg.type || 'message',
                content: msg.content,
                source_id: msg.id
            })
        })
    } catch { }
}

async function handleEdit(msgId, newContent) {
    const msg = chatStore.messages.find(m => m.id === msgId)
    if (msg) msg.content = newContent
    await api(`/api/message/${msgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
    })
}

async function handleDelete(msgId) {
    chatStore.messages = chatStore.messages.filter(m => m.id !== msgId)
    await api(`/api/message/${msgId}`, { method: 'DELETE' })
}

async function handleRegenerate(msgId) {
    chatStore.messages = chatStore.messages.filter(m => m.id !== msgId)
    await api(`/api/message/${msgId}`, { method: 'DELETE' })
    const lastUser = [...chatStore.messages].reverse().find(m => m.role === 'user')
    if (lastUser) {
        send({ type: 'chat', content: lastUser.content, personaId: personaId.value })
        isTyping.value = true
    }
}

function goToDetail() {
    showPanel.value = false
    router.push(`/persona-detail/${personaId.value}`)
}

async function clearChat() {
    if (!confirm('清理这段时间的对话痕迹？')) return
    await api(`/api/messages/${personaId.value}`, { method: 'DELETE' })
    chatStore.clearMessages()
    showPanel.value = false
}

function goBack() {
    const from = route.query.from
    if (from === 'echoes') {
        sessionStorage.setItem('home_return_page', '2')
        router.push('/')
    } else if (window.history.length > 1) {
        router.back()
    } else {
        router.push('/')
    }
}

function loadOlder() { chatStore.loadMore() }
function handleScroll() { }
function updateTime() { }

onMounted(async () => {
    document.querySelector('.screen-content').style.overflow = 'hidden'
    removeHandler(handleIncoming)
    onMessage(handleIncoming)
    loadPersonaName()
    chatStore.clearMessages()
    await chatStore.loadPersonaMessages(personaId.value)
    scrollToBottom()

    let mounted = false
    const unwatch = watch(isConnected, async (val, oldVal) => {
        if (!mounted) { mounted = true; return }
        if (val && !oldVal) {
            chatStore.clearMessages()
            await chatStore.loadPersonaMessages(personaId.value)
            scrollToBottom()
        }
    })

    onUnmounted(() => {
        unwatch()
        const customStyle = document.getElementById('custom-chat-theme')
        if (customStyle) customStyle.remove()
    })
})

watch(() => chatStore.messages.length, scrollToBottom)
</script>

<style scoped>
.chat-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
}

/* ===== Header ===== */
.chat-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: calc(env(safe-area-inset-top, 44px) + 8px) 16px 12px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
}

.back-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: var(--color-primary);
    display: flex;
    align-items: center;
    flex-shrink: 0;
}

.back-btn svg {
    width: 20px;
    height: 20px;
}

.header-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    min-width: 0;
}

.header-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--color-bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    overflow: hidden;
    flex-shrink: 0;
    border: 1.5px solid rgba(217, 163, 175, 0.2);
}

.header-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.header-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.header-status {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--color-text-light);
    opacity: 0.6;
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4caf50;
}

.header-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
}

.header-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    color: var(--color-text-light);
    border-radius: 10px;
    display: flex;
    align-items: center;
    transition: background 0.2s;
}

.header-btn svg {
    width: 18px;
    height: 18px;
}

.header-btn:active {
    background: rgba(212, 137, 158, 0.08);
}

.header-btn.danger {
    color: #c07070;
}

/* ===== 多选栏 ===== */
.select-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: rgba(217, 163, 175, 0.08);
    border-bottom: 1px solid rgba(217, 163, 175, 0.15);
    flex-shrink: 0;
}

.select-count {
    font-size: 13px;
    color: var(--color-primary);
    font-weight: 500;
}

.select-actions {
    display: flex;
    gap: 16px;
}

.select-actions button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 10px;
    color: var(--color-text-light);
}

.select-actions button svg {
    width: 18px;
    height: 18px;
}

.slide-down-enter-active {
    transition: all 0.25s ease;
}

.slide-down-leave-active {
    transition: all 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* ===== 消息列表 ===== */
.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    -webkit-overflow-scrolling: touch;
    min-height: 0;
}

.load-more {
    text-align: center;
    padding: 12px;
    color: var(--color-text-light);
    font-size: 12px;
    cursor: pointer;
    opacity: 0.4;
}

/* ===== 时间戳分隔 ===== */
.time-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 12px 0;
}

.time-divider span {
    font-size: 11px;
    color: var(--color-text-light);
    opacity: 0.5;
    background: rgba(255, 255, 255, 0.4);
    padding: 3px 10px;
    border-radius: 10px;
}

/* ===== 浮动面板 ===== */
.float-panel {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    display: flex;
    justify-content: flex-end;
    padding-top: calc(env(safe-area-inset-top, 44px) + 60px);
    padding-right: 12px;
}

.panel-content {
    background: var(--color-card);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 20px;
    border: 1px solid var(--color-border);
    padding: 8px;
    width: 200px;
    box-shadow: 0 8px 32px rgba(200, 130, 160, 0.12);
    align-self: flex-start;
}

.panel-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    cursor: pointer;
}

.panel-item:active {
    background: rgba(212, 137, 158, 0.06);
}

.panel-icon {
    font-size: 14px;
    opacity: 0.6;
    width: 20px;
    text-align: center;
}

.panel-title {
    font-size: 13px;
    color: var(--color-text);
}

.panel-sub {
    font-size: 10px;
    color: var(--color-text-light);
    opacity: 0.6;
    margin-top: 1px;
}

.panel-enter-active {
    transition: opacity 0.3s var(--ease-soft);
}

.panel-enter-active .panel-content {
    transition: transform 0.35s var(--ease-soft), opacity 0.3s var(--ease-soft);
}

.panel-leave-active {
    transition: opacity 0.2s var(--ease-soft);
}

.panel-leave-active .panel-content {
    transition: transform 0.2s var(--ease-soft), opacity 0.2s;
}

.panel-enter-from {
    opacity: 0;
}

.panel-enter-from .panel-content {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
}

.panel-leave-to {
    opacity: 0;
}

.panel-leave-to .panel-content {
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
}

/* ===== 五种主题 ===== */

/* 默认主题：现有风格不变 */
.theme-default .chat-messages {
    padding: 12px 16px;
}

/* 极简主题：iMessage 风格，无头像，气泡更圆 */
.theme-minimal .chat-messages {
    padding: 8px 16px;
}

/* 留白主题：AI 有头像，Instagram DM */
.theme-留白 .chat-messages {
    padding: 12px 16px;
}

/* 同框主题：双头像，Twitter DM */
.theme-together .chat-messages {
    padding: 12px 16px;
}

/* 液态主题：大圆角毛玻璃 */
.theme-liquid .chat-messages {
    padding: 12px 16px;
}

/* 微信主题 */
.theme-wechat {
    background: #EDEDED;
}

.theme-wechat .chat-header {
    background: #F7F7F7;
    border-bottom: 1px solid #D9D9D9;
}

.theme-wechat .chat-header .header-name {
    color: #191919;
}

.theme-wechat .chat-header .back-btn {
    color: #576B95;
}

.theme-wechat .time-divider span {
    background: rgba(0, 0, 0, 0.08);
    color: #888;
}
</style>
