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
                    <span class="header-status" :class="{ 'status-busy': isBusyStatus }">
                        <span class="status-dot" :class="{ 'dot-busy': isBusyStatus }"></span>
                        {{ isBusyStatus ? (personaStatus.reason || '忙碌中') : '在线' }}
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
                <div v-if="item.showTime" class="time-divider">
                    <span>{{ item.timeLabel }}</span>
                </div>
                <ChatBubble :msg="item" :theme="chatTheme" :merge="bubbleMerge" :is-merged="item.isMerged"
                    :show-avatar="shouldShowAvatar(item, idx)" :persona-avatar="personaAvatar"
                    :persona-avatar-url="personaAvatarUrl" :user-avatar="userAvatar" :select-mode="selectMode"
                    :selected="selectedIds.includes(item.id)" @edit="handleEdit" @delete="handleDelete"
                    @regenerate="handleRegenerate" @bookmark="handleBookmark" @select="toggleSelect"
                    @quote="handleQuote" />
            </template>

            <TypingIndicator :visible="isTyping" />
        </div>

        <DebugPanel v-if="showDebug" :info="debugInfo" />

        <ChatInput @send="handleSend" @send-images="handleSendImages" @send-emoji="handleSendEmoji"
            @send-gift="handleSendGift" @send-transfer="handleSendTransfer" @send-location="handleSendLocation"
            @continue-reply="handleContinueReply" @regenerate="handleRegenerateLatest" @multiselect="enterSelectMode"
            @send-card="handleSendCard" @send-delivery="handleSendDelivery" :quote-msg="quotingMsg"
            @clear-quote="quotingMsg = null" />
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
const { send, onMessage, removeHandler, clearHandlers } = useWebSocket()

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
const lastHandledContent = ref('')
const lastHandledTime = ref(0)
const personaStatus = ref({ status: 'available', reason: '' })
const quotingMsg = ref(null)

const isBusyStatus = computed(() => personaStatus.value.status !== 'available')
const selectMode = ref(false)
const selectedIds = ref([])
const personaId = computed(() => route.params.personaId)

const messagesWithTimestamp = computed(() => {
    const msgs = chatStore.messages
    const result = []
    let lastTime = null
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
        const isMerged = bubbleMerge.value && idx > 0
            && msgs[idx - 1].role === msg.role
            && !showTime
            && !msg.type
        result.push({ ...msg, showTime, timeLabel, isMerged })
    })
    return result
})

function formatTimeLabel(date) {
    const now = new Date()
    const days = Math.floor((now - date) / 86400000)
    if (days === 0) return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    if (days === 1) return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

function shouldShowAvatar(item, idx) {
    if (chatTheme.value === 'default' || chatTheme.value === 'minimal' || chatTheme.value === 'liquid') return false
    const msgs = messagesWithTimestamp.value
    const next = msgs[idx + 1]
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
        if (data.max_messages || data.maxMessages) maxBubbles.value = data.max_messages || data.maxMessages
        if (data.chat_wallpaper) {
            const chatPage = document.querySelector('.chat-page')
            if (chatPage) {
                chatPage.style.backgroundImage = `url(${data.chat_wallpaper})`
                chatPage.style.backgroundSize = 'cover'
                chatPage.style.backgroundPosition = 'center'
            }
        }
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
    } catch { }
    try {
        const sRes = await api(`/api/persona-status/${personaId.value}`)
        personaStatus.value = await sRes.json()
    } catch { }
}

function scrollToBottom() {
    nextTick(() => {
        if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    })
}

function handleQuote(quoteData) {
    quotingMsg.value = quoteData
}

function handleSend(text, opts = {}) {
    console.log('[Chat] handleSend called, text:', text?.slice(0, 20), 'opts:', JSON.stringify(opts))
    if (!text || !personaId.value) return
    console.log('[Chat] personaId:', personaId.value)
    chatStore.addMessage({ role: 'user', content: text, timestamp: new Date().toISOString() })
    scrollToBottom()
    if (personaId.value === 'wechat_sync') return
    if (opts.autoReply !== false) {
        console.log('[Chat] calling send()')
        send({ type: 'chat', content: text, personaId: personaId.value })
        isTyping.value = true  // 加这一行
    }
}

function handleSendImages({ images, text }) {
    chatStore.addMessage({ role: 'user', type: 'images', images, content: text, timestamp: new Date().toISOString() })
    const desc = text ? `[用户发送了 ${images.length} 张图片] ${text}` : `[用户发送了 ${images.length} 张图片]`
    send({ type: 'chat', content: desc, personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()
}

function handleSendEmoji(emoji) {
    chatStore.addMessage({ role: 'user', type: 'emoji', emojiUrl: emoji.url, emojiName: emoji.name, content: `[表情包: ${emoji.name || ''}]`, timestamp: new Date().toISOString() })
    send({ type: 'chat', content: `[用户发了一个表情包: ${emoji.name || ''}]`, personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()
}

async function handleSendGift({ name, content, message, method, methodDesc }) {
    chatStore.addMessage({ role: 'user', type: 'gift', giftName: name, giftContent: content, giftMessage: message, giftMethod: method, content: `[礼物: ${name}]`, timestamp: new Date().toISOString() })
    try {
        await api(`/api/gifts/${personaId.value}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direction: 'user_to_ai', giftName: name, giftContent: content || '', giftMessage: message || '' }) })
    } catch { }
    let desc = `[用户${methodDesc}一份礼物: ${name}`
    if (content) desc += `，里面有：${content}`
    if (message) desc += `，附言：${message}`
    desc += `]`
    send({ type: 'chat', content: desc, personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()
    setTimeout(async () => {
        try {
            await api('/api/messages/update-meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personaId: personaId.value, role: 'user', contentPrefix: `[礼物: ${name}]`, msgType: 'gift', msgMeta: JSON.stringify({ name, content, message, method }) }) })
        } catch { }
    }, 1000)
}

function handleSendCard({ html }) {
    chatStore.addMessage({ role: 'user', type: 'card', cardHtml: html, content: '[HTML卡片]', timestamp: new Date().toISOString() })
    send({ type: 'chat', content: '[用户发送了一张 HTML 小卡片]', personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()
}

async function handleSendDelivery({ type, content, address, note, expectedAt }) {
    chatStore.addMessage({
        role: 'user', type: type === 'food' ? 'food' : 'express',
        deliveryContent: content, deliveryAddress: address, deliveryNote: note, deliveryExpectedAt: expectedAt,
        content: type === 'food' ? `[外卖: ${content}]` : `[快递: ${content}]`, timestamp: new Date().toISOString()
    })
    if (chatStore.allMessages) setCache(`messages_${personaId.value}`, chatStore.allMessages)
    try {
        await api('/api/delivery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personaId: personaId.value, direction: 'user_to_ai', sender: 'user', type, content, address, note, expectedAt }) })
    } catch { }
    const desc = type === 'food'
        ? `[用户点了外卖：${content}${address ? `，送到${address}` : ''}${note ? `，备注：${note}` : ''}${expectedAt ? `，预计${new Date(expectedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}到` : ''}]`
        : `[用户寄了快递：${content}${note ? `，备注：${note}` : ''}${expectedAt ? `，预计${new Date(expectedAt).toLocaleDateString('zh-CN')}到达` : ''}]`
    send({ type: 'chat', content: desc, personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()
}

async function handleSendTransfer({ amount, note }) {
    chatStore.addMessage({ role: 'user', type: 'transfer', amount, note, content: `[转账: ¥${amount.toFixed(2)}]`, timestamp: new Date().toISOString() })
    try {
        await api(`/api/transfers/${personaId.value}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direction: 'user_to_ai', amount: parseFloat(amount), note: note || '' }) })
    } catch { }
    send({ type: 'chat', content: `[用户转账了 ¥${amount.toFixed(2)}${note ? `，备注：${note}` : ''}]`, personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()
    setTimeout(async () => {
        try {
            await api('/api/messages/update-meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personaId: personaId.value, role: 'user', contentPrefix: `[转账: ¥${parseFloat(amount).toFixed(2)}]`, msgType: 'transfer', msgMeta: JSON.stringify({ amount: parseFloat(amount), note: note || '' }) }) })
        } catch { }
    }, 1000)
}

function handleSendLocation({ lat, lng, manual }) {
    chatStore.addMessage({ role: 'user', type: 'location', lat, lng, locationName: manual ? '我的位置' : '当前位置', content: `[位置]`, timestamp: new Date().toISOString() })
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

async function handleIncoming(data) {

    if (data.type === 'bus_message') return
    if (data.type === 'chat' || data.type === 'push') {
        const key = (data.content || '') + (data.timestamp || '')
        const now = Date.now()
        if (key === lastHandledContent.value && now - lastHandledTime.value < 5000) return
        lastHandledContent.value = key
        lastHandledTime.value = now
        isTyping.value = false
        api(`/api/persona-status/${personaId.value}`).then(r => r.json()).then(s => { personaStatus.value = s }).catch(() => { })

        let cleanContent = data.content.replace(/\[思考\][\s\S]*?\[思考\]/g, '').replace(/[\s\S]*?<\/think>/g, '').trim()
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
        if (final.length === 0) { isTyping.value = false; return }

        final.forEach((line, idx) => {
            setTimeout(() => {
                if (idx === final.length - 1) isTyping.value = false
                chatStore.addMessage({ role: 'ai', content: line, timestamp: new Date(new Date(data.timestamp).getTime() + idx * 100).toISOString() })
                scrollToBottom()
                if (idx === final.length - 1 && chatStore.allMessages) setCache(`messages_${personaId.value}`, chatStore.allMessages)
            }, idx * 600)
        })

        if (data.specialPayload) {
            const sp = data.specialPayload
            const delay = final.length * 600 + 200
            if (sp.type === 'gift') {
                setTimeout(() => { chatStore.addMessage({ role: 'ai', type: 'gift', giftName: sp.data.name, giftContent: sp.data.content, giftMessage: sp.data.message, content: `[礼物: ${sp.data.name}]`, timestamp: data.timestamp }); scrollToBottom() }, delay)
            } else if (sp.type === 'transfer') {
                setTimeout(() => { chatStore.addMessage({ role: 'ai', type: 'transfer', amount: sp.data.amount, note: sp.data.note, content: `[转账: ¥${sp.data.amount}]`, timestamp: data.timestamp }); scrollToBottom() }, delay)
            } else if (sp.type === 'location') {
                setTimeout(() => { chatStore.addMessage({ role: 'ai', type: 'location', lat: null, lng: null, locationName: sp.data.name, content: `[位置: ${sp.data.name}]`, timestamp: data.timestamp }); scrollToBottom() }, delay)
            } else if (sp.type === 'card') {
                setTimeout(() => { chatStore.addMessage({ role: 'ai', type: 'card', cardHtml: sp.data.html, content: '[HTML卡片]', timestamp: data.timestamp }); scrollToBottom() }, delay)
            } else if (sp.type === 'food') {
                setTimeout(() => {
                    chatStore.addMessage({ role: 'ai', type: 'food', deliveryContent: sp.data.content, deliveryAddress: sp.data.address, deliveryNote: sp.data.note, deliveryExpectedAt: sp.data.expectedMinutes ? new Date(Date.now() + sp.data.expectedMinutes * 60000).toISOString() : null, content: `[外卖: ${sp.data.content}]`, timestamp: data.timestamp })
                    scrollToBottom()
                    if (chatStore.allMessages) setCache(`messages_${personaId.value}`, chatStore.allMessages)
                }, delay)
            } else if (sp.type === 'express') {
                setTimeout(() => {
                    chatStore.addMessage({ role: 'ai', type: 'express', deliveryContent: sp.data.content, deliveryNote: sp.data.note, deliveryExpectedAt: sp.data.expectedDays ? new Date(Date.now() + sp.data.expectedDays * 86400000).toISOString() : null, content: `[快递: ${sp.data.content}]`, timestamp: data.timestamp })
                    scrollToBottom()
                    if (chatStore.allMessages) setCache(`messages_${personaId.value}`, chatStore.allMessages)
                }, delay)
            }
        }

        // Agent 工具调用解析
        if (personaId.value === 'agent' && data.toolCalls) {
            for (const call of data.toolCalls) {
                if (call.type === 'github_read') {
                    try {
                        const res = await api(`/api/github/file?path=${encodeURIComponent(call.path)}&branch=${call.branch || 'main'}`);
                        const fileData = await res.json();
                        chatStore.addMessage({
                            role: 'system',
                            content: `[文件内容]\n路径: ${call.path}\n\n${fileData.content.slice(0, 2000)}${fileData.content.length > 2000 ? '\n...(内容过长已截断)' : ''}`,
                            timestamp: new Date().toISOString()
                        });
                    } catch (e) {
                        chatStore.addMessage({
                            role: 'system',
                            content: `[错误] 读取文件失败: ${e.message}`,
                            timestamp: new Date().toISOString()
                        });
                    }
                } else if (call.type === 'github_write') {
                    // 需要用户确认
                    chatStore.addMessage({
                        role: 'system',
                        type: 'confirm_commit',
                        confirmData: call,
                        content: `[待确认提交]\n文件: ${call.path}\n分支: ${call.branch}\n\n回复"确认"执行提交`,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }

        if (data.debug) debugInfo.value = data.debug
    }
}

function enterSelectMode() { selectMode.value = true; selectedIds.value = [] }
function cancelSelect() { selectMode.value = false; selectedIds.value = [] }

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
        const container = messagesContainer.value
        if (!container) return
        const allBubbles = container.querySelectorAll('.bubble-wrapper')
        const selectedBubbles = []
        allBubbles.forEach(bubble => {
            const msgId = bubble.dataset.msgId
            if (selectedIds.value.some(id => String(id) === String(msgId))) selectedBubbles.push(bubble)
        })
        if (selectedBubbles.length === 0) { cancelSelect(); return }
        const first = selectedBubbles[0].getBoundingClientRect()
        const last = selectedBubbles[selectedBubbles.length - 1].getBoundingClientRect()
        const totalHeight = last.bottom - first.top + 40
        const screenshotDiv = document.createElement('div')
        screenshotDiv.style.cssText = `position:fixed;left:-9999px;top:0;width:${container.offsetWidth}px;min-height:${totalHeight}px;background:linear-gradient(180deg,#FFFBFA 0%,#FFF0F2 60%,#FFE9ED 100%);padding:20px 16px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;`
        selectedBubbles.forEach(bubble => {
            const clone = bubble.cloneNode(true)
            clone.classList.remove('selected', 'select-mode')
            clone.style.marginBottom = '16px'
            clone.style.paddingLeft = '0'
            const checkbox = clone.querySelector('.select-checkbox')
            if (checkbox) checkbox.style.display = 'none'
            const actionBar = clone.querySelector('.inline-action-bar')
            if (actionBar) actionBar.style.display = 'none'
            const bubbleEl = clone.querySelector('.bubble')
            if (bubbleEl) {
                const original = bubble.querySelector('.bubble')
                if (original) {
                    const cs = window.getComputedStyle(original)
                    bubbleEl.style.background = cs.background
                    bubbleEl.style.color = cs.color
                    bubbleEl.style.borderRadius = cs.borderRadius
                    bubbleEl.style.padding = cs.padding
                    bubbleEl.style.fontSize = cs.fontSize
                    bubbleEl.style.lineHeight = cs.lineHeight
                    bubbleEl.style.boxShadow = cs.boxShadow
                }
            }
            screenshotDiv.appendChild(clone)
        })
        document.body.appendChild(screenshotDiv)
        const images = screenshotDiv.querySelectorAll('img')
        await Promise.all([...images].map(img => {
            if (img.complete) return Promise.resolve()
            return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; setTimeout(resolve, 2000) })
        }))
        const canvas = await html2canvas(screenshotDiv, { backgroundColor: null, scale: 2, useCORS: true, allowTaint: true, logging: false, windowWidth: container.offsetWidth + 32 })
        document.body.removeChild(screenshotDiv)
        const link = document.createElement('a')
        link.download = `聊天记录_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}.png`
        link.href = canvas.toDataURL('image/png', 0.95)
        link.click()
        cancelSelect()
    } catch (e) { console.error('截图失败:', e); cancelSelect() }
}

async function handleBookmark(msg) {
    try {
        await api(`/api/bookmarks/${personaId.value}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: msg.type || 'message', content: msg.content, source_id: msg.id }) })
    } catch { }
}

async function handleEdit(msgId, newContent) {
    const msg = chatStore.messages.find(m => m.id === msgId)
    if (msg) msg.content = newContent
    await api(`/api/message/${msgId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newContent }) })
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

function goToDetail() { showPanel.value = false; router.push(`/persona-detail/${personaId.value}`) }

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

onMounted(async () => {
    document.querySelector('.screen-content').style.overflow = 'hidden'
    clearHandlers()
    onMessage(handleIncoming)
    loadPersonaName()
    chatStore.clearMessages()
    await chatStore.loadPersonaMessages(personaId.value)
    scrollToBottom()
})

onUnmounted(() => {
    removeHandler(handleIncoming)
    const customStyle = document.getElementById('custom-chat-theme')
    if (customStyle) customStyle.remove()
})

watch(() => chatStore.messages.length, scrollToBottom)

watch(personaId, async (newId, oldId) => {
    if (!newId || newId === oldId) return
    clearHandlers()
    onMessage(handleIncoming)
    chatStore.clearMessages()
    await chatStore.loadPersonaMessages(newId)
    await loadPersonaName()
    scrollToBottom()
})
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

.header-status.status-busy {
    color: #C4962A;
}

.status-dot.dot-busy {
    background: #F5C24E;
    animation: pulse-busy 2s ease-in-out infinite;
}

@keyframes pulse-busy {

    0%,
    100% {
        opacity: 1;
        transform: scale(1);
    }

    50% {
        opacity: 0.5;
        transform: scale(0.8);
    }
}
</style>