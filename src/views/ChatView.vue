<template>
    <div class="chat-page">
        <div class="chat-header">
            <button class="back-btn" @click="goBack">‹</button>
            <h2>{{ personaName }}</h2>
            <button class="setting-btn" @click="showPanel = !showPanel">✦</button>
        </div>

        <transition name="panel">
            <div v-if="showPanel" class="float-panel" @click.self="showPanel = false">
                <div class="panel-content">
                    <div class="panel-item" @click="goToDetail">
                        <span class="panel-icon">✧</span>
                        <div>
                            <p class="panel-title">关于</p>
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

        <div class="chat-messages" ref="messagesContainer" @scroll="handleScroll">
            <div v-if="chatStore.hasMore" class="load-more" @click="loadOlder">
                <span>加载更早的消息</span>
            </div>
            <ChatBubble v-for="msg in chatStore.messages" :key="msg.id" :msg="msg" @edit="handleEdit"
                @delete="handleDelete" @regenerate="handleRegenerate" />
            <TypingIndicator :visible="isTyping" />
        </div>

        <DebugPanel :info="debugInfo" />
        <ChatInput @send="handleSend" />
    </div>
</template>


<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
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
const { send, onMessage, removeHandler } = useWebSocket()
const messagesContainer = ref(null)
const isTyping = ref(false)
const debugInfo = ref(null)
const showPanel = ref(false)
const maxBubbles = ref(3)
const inputText = ref('')
const inputRef = ref(null)
const personaAvatar = ref('💬')
const personaAvatarUrl = ref('')
const currentTime = ref('')
const todayDate = ref('')

function smartSplit(content) {
    const bubbles = content.split(/\n\s*\n/).map(b => {
        // 单换行的碎片用逗号连接
        return b.split('\n').map(l => l.trim()).filter(Boolean).join('，')
    }).filter(Boolean)
    if (bubbles.length > 1) return bubbles
    return [content.split('\n').map(l => l.trim()).filter(Boolean).join('，')]
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
    if (window.history.length > 1) {
        router.back()
    } else {
        router.push('/')
    }
}

const personaId = computed(() => route.params.personaId)
const personaName = ref('AI 助手')

async function loadPersonaName() {
    try {
        const res = await api(`/api/persona/${personaId.value}`)
        const data = await res.json()
        personaName.value = data.note || data.name || 'AI 助手'
        personaAvatar.value = data.avatar || '💬'
        personaAvatarUrl.value = data.avatarUrl || ''
        if (data.maxMessages || data.max_messages) {
            maxBubbles.value = data.maxMessages || data.max_messages
        }
        if (data.chatWallpaper) {
            const chatPage = document.querySelector('.chat-page')
            if (chatPage) {
                chatPage.style.backgroundImage = `url(${data.chatWallpaper})`
                chatPage.style.backgroundSize = 'cover'
                chatPage.style.backgroundPosition = 'center'
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

function handleSend(text) {
    chatStore.addMessage({ role: 'user', content: text })

    if (personaId.value === 'wechat_sync') {
        return
    }

    send({ type: 'chat', content: text, personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()

    // 更新缓存
    setCache(`messages_${personaId.value}`, chatStore.allMessages.value)
}

function handleIncoming(data) {
    if (data.type === 'bus_message') {
        if (data.message.conversation_id === personaId.value && personaId.value === 'wechat_sync') {
            chatStore.addMessage({
                role: data.message.role === 'assistant' ? 'ai' : 'user',
                content: data.message.content,
                timestamp: new Date(data.message.timestamp).toISOString(),
            })
            scrollToBottom()
        }
        return
    }

    if (data.type === 'chat' || data.type === 'push') {
        isTyping.value = false
        const parts = smartSplit(data.content)

        let final = parts
        if (parts.length > maxBubbles.value) {
            final = []
            const chunkSize = Math.ceil(parts.length / maxBubbles.value)
            for (let i = 0; i < parts.length; i += chunkSize) {
                final.push(parts.slice(i, i + chunkSize).join(''))
            }
        }

        final.forEach((line, idx) => {
            setTimeout(() => {
                chatStore.addMessage({ role: 'ai', content: line, timestamp: data.timestamp })
                scrollToBottom()
                // 最后一条消息添加完后更新缓存
                if (idx === final.length - 1) {
                    setCache(`messages_${personaId.value}`, chatStore.allMessages.value)
                }
            }, idx * 500)
        })

        if (data.debug) {
            debugInfo.value = data.debug
        }
    }
}

// 更新时间
function updateTime() {
    const now = new Date()
    currentTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    todayDate.value = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`
}

function isEmojiOnly(text) {
    const emojiRegex = /^[\p{Emoji}\s]+$/u
    return emojiRegex.test(text) && text.length <= 4
}

function autoResize() {
    const el = inputRef.value
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 100) + 'px'
}

function sendMessage(e) {
    if (e && e.type === 'keydown') e.preventDefault()
    if (!inputText.value.trim()) return
    handleSend(inputText.value.trim())
    inputText.value = ''
    nextTick(() => autoResize())
}

function loadOlder() {
    chatStore.loadMore()
}

function handleScroll() {
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
    const lastUserMsg = [...chatStore.messages].reverse().find(m => m.role === 'user')
    if (lastUserMsg) {
        send({ type: 'chat', content: lastUserMsg.content, personaId: personaId.value })
        isTyping.value = true
    }
}

onMounted(async () => {
    updateTime()
    setInterval(updateTime, 60000)
    document.querySelector('.screen-content').style.overflow = 'hidden'
    removeHandler(handleIncoming)
    onMessage(handleIncoming)
    loadPersonaName()
    await chatStore.loadPersonaMessages(personaId.value)
    scrollToBottom()
})

onUnmounted(() => {
    document.querySelector('.screen-content').style.overflow = 'auto'
    removeHandler(handleIncoming)
})

watch(() => chatStore.messages.length, scrollToBottom)
</script>

<style scoped>
.chat-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    padding-top: env(safe-area-inset-top, 44px);
}

.chat-header {
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
    padding: 0 4px;
    opacity: 0.75;
}

.chat-header h2 {
    flex: 1;
    font-size: 15px;
    font-weight: 500;
    color: var(--color-text);
    letter-spacing: 0.02em;
}

.setting-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--color-text-light);
    cursor: pointer;
    padding: 4px 8px;
    opacity: 0.5;
}

.float-panel {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    display: flex;
    justify-content: flex-end;
    padding-top: calc(env(safe-area-inset-top, 44px) + 50px);
    padding-right: 8px;
}

.panel-content {
    background: var(--color-card);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 20px;
    border: 1px solid var(--color-border);
    padding: 8px;
    width: 200px;
    box-shadow: 0 8px 32px rgba(200, 130, 160, 0.1);
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

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px 0;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
    min-height: 0;
}

.load-more {
    text-align: center;
    padding: 16px;
    color: var(--color-text-light);
    font-size: 12px;
    cursor: pointer;
    opacity: 0.4;
}
</style>
