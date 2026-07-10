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

        // 处理 AI 主动发送的特殊消息
        if (data.specialPayload) {
            const sp = data.specialPayload;
            if (sp.type === 'gift') {
                setTimeout(() => {
                    chatStore.addMessage({
                        role: 'ai',
                        type: 'gift',
                        giftName: sp.data.name,
                        giftContent: sp.data.content,
                        giftMessage: sp.data.message,
                        content: `[礼物: ${sp.data.name}]`,
                        timestamp: data.timestamp,
                    })
                    scrollToBottom()
                }, (final.length) * 600 + 200)
            } else if (sp.type === 'transfer') {
                setTimeout(() => {
                    chatStore.addMessage({
                        role: 'ai',
                        type: 'transfer',
                        amount: sp.data.amount,
                        note: sp.data.note,
                        content: `[转账: ¥${sp.data.amount}]`,
                        timestamp: data.timestamp,
                    })
                    scrollToBottom()
                }, (final.length) * 600 + 200)
            } else if (sp.type === 'location') {
                setTimeout(() => {
                    chatStore.addMessage({
                        role: 'ai',
                        type: 'location',
                        lat: null,
                        lng: null,
                        locationName: sp.data.name,
                        content: `[位置: ${sp.data.name}]`,
                        timestamp: data.timestamp,
                    })
                    scrollToBottom()
                }, (final.length) * 600 + 200)
            }
        }

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
    if (selectedIds.value.length === 0) return
    
    try {
        const html2canvas = (await import('html2canvas')).default
        
        // 找到选中消息的 DOM 元素
        const container = messagesContainer.value
        if (!container) return
        
        // 临时创建一个截图容器
        const screenshotDiv = document.createElement('div')
        screenshotDiv.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: ${container.offsetWidth}px;
            background: var(--color-bg, #fdf6f8);
            padding: 20px 16px;
            font-family: inherit;
        `
        
        // 把选中的消息 clone 进去
        const allBubbles = container.querySelectorAll('.bubble-wrapper')
        let clonedCount = 0
        allBubbles.forEach(bubble => {
            const msgId = bubble.dataset.msgId
            if (selectedIds.value.some(id => String(id) === String(msgId))) {
                const clone = bubble.cloneNode(true)
                // 去掉多选状态的样式
                clone.classList.remove('selected', 'select-mode')
                clone.style.marginBottom = '12px'
                screenshotDiv.appendChild(clone)
                clonedCount++
            }
        })
        
        if (clonedCount === 0) {
            // 如果没找到 data-msg-id，直接截整个消息列表
            document.body.appendChild(screenshotDiv)
            screenshotDiv.remove()
            cancelSelect()
            return
        }
        
        document.body.appendChild(screenshotDiv)
        
        const canvas = await html2canvas(screenshotDiv, {
            backgroundColor: '#fdf6f8',
            scale: 2,
            useCORS: true,
            logging: false,
        })
        
        document.body.removeChild(screenshotDiv)
        
        // 下载图片
        const link = document.createElement('a')
        link.download = `聊天记录_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        
        cancelSelect()
    } catch (e) {
        console.error('截图失败:', e)
        cancelSelect()
    }
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

<style>
/* ===== 基础结构（默认主题）===== */
.chat-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
    background: linear-gradient(180deg, #FFF5F7 0%, #FFEEF2 50%, #FFE6EC 100%);
}

/* ===== 默认 Header（居中名字，无头像）===== */
.chat-header {
    display: flex;
    align-items: center;
    padding: calc(env(safe-area-inset-top, 44px) + 8px) 16px 12px;
    flex-shrink: 0;
    background: rgba(255, 248, 252, 0.85);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-bottom: 1px solid rgba(217, 163, 175, 0.12);
    position: relative;
}

.back-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: #D9A3AF;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    z-index: 1;
}

.back-btn svg {
    width: 20px;
    height: 20px;
}

.header-info {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: pointer;
}

.header-avatar {
    display: none;
}

.header-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
}

.header-name {
    font-size: 16px;
    font-weight: 700;
    color: #4A3F41;
    letter-spacing: 0.3px;
}

.header-status {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #B8A9AC;
}

.status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #4caf50;
}

.header-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    margin-left: auto;
    z-index: 1;
}

.header-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    color: #B8A9AC;
    border-radius: 10px;
    display: flex;
    align-items: center;
}

.header-btn svg {
    width: 18px;
    height: 18px;
}

.header-btn:active {
    background: rgba(217, 163, 175, 0.1);
}

.header-btn.danger {
    color: #c07070;
}

/* 多选栏 */
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
    color: #D9A3AF;
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
    color: #B8A9AC;
    font-family: inherit;
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

/* 消息列表 */
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
    color: #B8A9AC;
    font-size: 12px;
    cursor: pointer;
    opacity: 0.4;
}

/* 时间戳 */
.time-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 10px 0;
}

.time-divider span {
    font-size: 11px;
    color: #B8A9AC;
    background: rgba(255, 255, 255, 0.6);
    padding: 3px 10px;
    border-radius: 10px;
    backdrop-filter: blur(8px);
}

/* 浮动面板 */
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
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 20px;
    border: 1px solid rgba(255, 240, 242, 0.5);
    padding: 8px;
    width: 200px;
    box-shadow: 0 8px 32px rgba(217, 163, 175, 0.15);
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
    background: rgba(217, 163, 175, 0.06);
}

.panel-icon {
    font-size: 14px;
    opacity: 0.6;
    width: 20px;
    text-align: center;
}

.panel-title {
    font-size: 13px;
    color: #4A3F41;
}

.panel-sub {
    font-size: 10px;
    color: #B8A9AC;
    margin-top: 1px;
}

.panel-enter-active {
    transition: opacity 0.3s;
}

.panel-enter-active .panel-content {
    transition: transform 0.35s, opacity 0.3s;
}

.panel-leave-active {
    transition: opacity 0.2s;
}

.panel-leave-active .panel-content {
    transition: transform 0.2s, opacity 0.2s;
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

/* ===== 极简主题 = iMessage ===== */
.theme-minimal {
    background: #F5F5F7;
}

.theme-minimal .chat-header {
    background: rgba(245, 245, 247, 0.92);
    backdrop-filter: saturate(180%) blur(20px);
    border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
}

.theme-minimal .header-info {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
}

.theme-minimal .back-btn {
    color: #007AFF;
}

.theme-minimal .header-btn {
    color: #007AFF;
}

.theme-minimal .header-name {
    font-size: 14px;
    color: #1c1c1e;
    font-weight: 600;
}

.theme-minimal .header-status {
    color: #8E8E93;
}

.theme-minimal .status-dot {
    background: #34C759;
}

.theme-minimal .time-divider span {
    background: transparent;
    backdrop-filter: none;
    color: #8E8E93;
    font-weight: 500;
}

.theme-minimal .panel-content {
    background: rgba(255, 255, 255, 0.92);
    border-color: rgba(0, 0, 0, 0.06);
    border-radius: 14px;
}

.theme-minimal .panel-title {
    color: #1c1c1e;
}

.theme-minimal .panel-sub {
    color: #8E8E93;
}

.theme-minimal .select-count {
    color: #007AFF;
}

.theme-minimal :deep(.chat-input-wrapper) {
    background: rgba(245, 245, 247, 0.95);
    border-top: 0.5px solid rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(20px);
}

.theme-minimal :deep(textarea) {
    background: #FFFFFF;
    border-color: rgba(0, 0, 0, 0.08);
    color: #1c1c1e;
    border-radius: 20px;
}

.theme-minimal :deep(.send-btn) {
    background: #007AFF;
    box-shadow: none;
}

.theme-minimal :deep(.more-btn) {
    border-color: rgba(0, 0, 0, 0.1);
    color: #007AFF;
}

/* ===== 留白主题 = 小克风毛玻璃 ===== */
.theme-留白 {
    background: linear-gradient(160deg, #2C2830 0%, #1A1620 100%);
}

.theme-留白 .chat-header {
    background: rgba(30, 26, 34, 0.6);
    backdrop-filter: saturate(150%) blur(30px);
    -webkit-backdrop-filter: saturate(150%) blur(30px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.theme-留白 .header-name {
    color: #E8D5C4;
    font-size: 17px;
    font-weight: 600;
}

.theme-留白 .header-status {
    color: rgba(232, 213, 196, 0.5);
}

.theme-留白 .back-btn {
    color: #C4A882;
}

.theme-留白 .header-btn {
    color: rgba(232, 213, 196, 0.6);
}

.theme-留白 .time-divider span {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    color: rgba(232, 213, 196, 0.4);
}

.theme-留白 .panel-content {
    background: rgba(40, 34, 46, 0.9);
    border-color: rgba(255, 255, 255, 0.08);
}

.theme-留白 .panel-title {
    color: #E8D5C4;
}

.theme-留白 .panel-sub {
    color: rgba(232, 213, 196, 0.5);
}

.theme-留白 .select-count {
    color: #C4A882;
}

.theme-留白 :deep(.chat-input-wrapper) {
    background: rgba(26, 22, 30, 0.8);
    backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.theme-留白 :deep(textarea) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.1);
    color: #E8D5C4;
    border-radius: 24px;
}

.theme-留白 :deep(textarea::placeholder) {
    color: rgba(232, 213, 196, 0.3);
}

.theme-留白 :deep(.send-btn) {
    background: #C4A882;
    box-shadow: none;
}

.theme-留白 :deep(.more-btn) {
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(232, 213, 196, 0.6);
    background: rgba(255, 255, 255, 0.06);
}

/* ===== 同框主题 = Discord 深色 ===== */
.theme-together {
    background: #313338;
}

.theme-together .chat-header {
    background: rgba(43, 45, 49, 0.95);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
}

.theme-together .header-name {
    color: #FFFFFF;
    font-size: 16px;
}

.theme-together .header-status {
    color: #B5BAC1;
}

.theme-together .status-dot {
    background: #23A55A;
}

.theme-together .back-btn {
    color: #B5BAC1;
}

.theme-together .header-btn {
    color: #B5BAC1;
}

.theme-together .time-divider span {
    background: transparent;
    backdrop-filter: none;
    color: #949BA4;
    font-size: 12px;
    font-weight: 600;
}

.theme-together .panel-content {
    background: rgba(30, 31, 34, 0.98);
    border-color: rgba(0, 0, 0, 0.4);
    border-radius: 8px;
}

.theme-together .panel-title {
    color: #DBDEE1;
}

.theme-together .panel-sub {
    color: #949BA4;
}

.theme-together .select-bar {
    background: rgba(43, 45, 49, 0.95);
    border-color: rgba(0, 0, 0, 0.3);
}

.theme-together .select-count {
    color: #5865F2;
}

.theme-together .select-actions button {
    color: #B5BAC1;
}

.theme-together :deep(.chat-input-wrapper) {
    background: rgba(43, 45, 49, 0.98);
    border-top: 1px solid rgba(0, 0, 0, 0.3);
}

.theme-together :deep(textarea) {
    background: #404249;
    border-color: transparent;
    color: #DBDEE1;
    border-radius: 8px;
}

.theme-together :deep(textarea::placeholder) {
    color: #949BA4;
}

.theme-together :deep(.send-btn) {
    background: #5865F2;
    box-shadow: none;
}

.theme-together :deep(.more-btn) {
    border-color: rgba(255, 255, 255, 0.1);
    color: #B5BAC1;
    background: #404249;
}

/* ===== 液态主题 ===== */
.theme-liquid {
    background: linear-gradient(160deg, #FFF5F8 0%, #F5EEFF 50%, #EEF4FF 100%);
}

.theme-liquid .chat-header {
    background: rgba(255, 255, 255, 0.3);
    backdrop-filter: saturate(200%) blur(40px);
    -webkit-backdrop-filter: saturate(200%) blur(40px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.5);
}

.theme-liquid .header-name {
    color: #4A3F41;
}

.theme-liquid .back-btn {
    color: #D9A3AF;
}

.theme-liquid .header-btn {
    color: #B8A9AC;
}

.theme-liquid .time-divider span {
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(10px);
}

.theme-liquid :deep(.chat-input-wrapper) {
    background: rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255, 255, 255, 0.4);
}

.theme-liquid :deep(textarea) {
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(10px);
    border-color: rgba(255, 255, 255, 0.4);
}

/* ===== 微信主题 ===== */
.theme-wechat {
    background: #EDEDED;
}

.theme-wechat .chat-header {
    background: #F7F7F7;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-bottom: 1px solid #D9D9D9;
}

.theme-wechat .header-name {
    font-size: 17px;
    font-weight: 600;
    color: #191919;
}

.theme-wechat .header-status {
    display: none;
}

.theme-wechat .back-btn {
    color: #191919;
}

.theme-wechat .header-btn {
    color: #191919;
}

.theme-wechat .time-divider span {
    background: rgba(0, 0, 0, 0.08);
    backdrop-filter: none;
    color: #888;
    font-size: 12px;
    border-radius: 4px;
}

.theme-wechat .panel-content {
    background: #FFFFFF;
    border-color: #E0E0E0;
    border-radius: 8px;
}

.theme-wechat .panel-title {
    color: #191919;
}

.theme-wechat .panel-sub {
    color: #888;
}

.theme-wechat :deep(.chat-input-wrapper) {
    background: #F7F7F7;
    border-top: 0.5px solid #D9D9D9;
    backdrop-filter: none;
}

.theme-wechat :deep(textarea) {
    background: #FFFFFF;
    border-radius: 6px;
    color: #191919;
    border-color: transparent;
}

.theme-wechat :deep(.send-btn) {
    background: #07C160;
    box-shadow: none;
}

.theme-wechat :deep(.more-btn) {
    border-color: rgba(0, 0, 0, 0.1);
    color: #191919;
    background: rgba(255, 255, 255, 0.8);
}
</style>