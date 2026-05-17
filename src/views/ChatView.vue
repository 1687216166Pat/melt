<template>
    <div class="chat-page">
        <div class="chat-header">
            <button class="back-btn" @click="goBack">‹</button>
            <h2>{{ personaName }}</h2>
            <button class="setting-btn" @click="showPanel = !showPanel">✦</button>
        </div>

        <!-- 漂浮面板 -->
        <transition name="panel">
            <div v-if="showPanel" class="float-panel" @click.self="showPanel = false">
                <div class="panel-content">
                    <div class="panel-item" @click="goToDetail">
                        <span class="panel-icon">✧</span>
                        <div>
                            <p class="panel-title">关于他</p>
                            <p class="panel-sub">进入人格空间</p>
                        </div>
                    </div>
                    <div class="panel-item" @click="clearChat">
                        <span class="panel-icon">◌</span>
                        <div>
                            <p class="panel-title">清理痕迹</p>
                            <p class="panel-sub">清空这段时间的对话</p>
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
        <ChatInput v-if="personaId !== 'wechat_sync'" @send="handleSend" />
        <div v-else class="sync-notice">
            <p>此对话来自微信同步，仅供查看</p>
        </div>

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

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const { send, onMessage, removeHandler } = useWebSocket()
const messagesContainer = ref(null)
const isTyping = ref(false)
const debugInfo = ref(null)
const showPanel = ref(false)
const maxBubbles = ref(3)

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
        if (data.maxMessages) maxBubbles.value = data.maxMessages
        if (data.max_messages) maxBubbles.value = data.max_messages
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
        // 微信同步人格不允许发消息（只读）
        return
    }

    // 所有其他人格都用正常 AI 回复
    send({ type: 'chat', content: text, personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()
}


function handleIncoming(data) {
    // 处理总线消息（微信同步）
    if (data.type === 'bus_message' && data.message.conversation_id === personaId.value) {
        chatStore.addMessage({
            role: data.message.role === 'assistant' ? 'ai' : 'user',
            content: data.message.content,
            timestamp: new Date(data.message.timestamp).toISOString(),
        })
        scrollToBottom()
        return
    }
    if (data.type === 'chat' || data.type === 'push') {
        isTyping.value = false

        const lines = data.content.split('\n').map(l => l.trim()).filter(Boolean)

        // 强制合并：短于15字的行和下一行合并
        const merged = []
        let buffer = ''
        for (let i = 0; i < lines.length; i++) {
            buffer += (buffer ? '' : '') + lines[i]
            if (buffer.length >= 15 || i === lines.length - 1) {
                merged.push(buffer)
                buffer = ''
            }
        }

        // 限制最大气泡数
        let final = merged
        if (merged.length > maxBubbles.value) {
            final = []
            const chunkSize = Math.ceil(merged.length / maxBubbles.value)
            for (let i = 0; i < merged.length; i += chunkSize) {
                final.push(merged.slice(i, i + chunkSize).join(''))
            }
        }

        if (final.length > 1) {
            final.forEach((line, idx) => {
                setTimeout(() => {
                    chatStore.addMessage({ role: 'ai', content: line, timestamp: data.timestamp })
                    scrollToBottom()
                }, idx * 500)
            })
        } else {
            chatStore.addMessage({ role: 'ai', content: data.content.replace(/\n/g, ''), timestamp: data.timestamp })
            scrollToBottom()
        }

        if (data.debug) {
            debugInfo.value = data.debug
        }
    }
}


function loadOlder() {
    chatStore.loadMore()
}

function handleScroll() {
    // 可以在这里做滚动到顶部自动加载
}

async function handleEdit(msgId, newContent) {
    // 更新前端
    const msg = chatStore.messages.find(m => m.id === msgId)
    if (msg) msg.content = newContent
    // 更新后端
    await api(`/api/message/${msgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
    })
}

async function handleDelete(msgId) {
    // 从前端移除
    chatStore.messages = chatStore.messages.filter(m => m.id !== msgId)
    // 从后端删除
    await api(`/api/message/${msgId}`, { method: 'DELETE' })
}

async function handleRegenerate(msgId) {
    // 删除这条AI回复
    chatStore.messages = chatStore.messages.filter(m => m.id !== msgId)
    await api(`/api/message/${msgId}`, { method: 'DELETE' })
    // 获取最后一条用户消息重新发送
    const lastUserMsg = [...chatStore.messages].reverse().find(m => m.role === 'user')
    if (lastUserMsg) {
        send({ type: 'chat', content: lastUserMsg.content, personaId: personaId.value })
        isTyping.value = true
    }
}


onMounted(async () => {
    document.querySelector('.screen-content').style.overflow = 'hidden'

    // 先移除再注册，防止重复
    removeHandler(handleIncoming)
    onMessage(handleIncoming)

    loadPersonaName()
    await chatStore.loadPersonaMessages(personaId.value)
    scrollToBottom()
})

onUnmounted(() => {
    // 恢复父容器滚动
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
    letter-spacing: 0.03em;
}

.setting-btn {
    background: none;
    border: none;
    font-size: 15px;
    color: var(--color-text-light);
    cursor: pointer;
    padding: 4px;
    opacity: 0.5;
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 22px 0;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
    min-height: 0;
}

.load-more {
    text-align: center;
    padding: 18px;
    color: var(--color-text-light);
    font-size: 11px;
    cursor: pointer;
    opacity: 0.4;
    transition: opacity var(--duration-normal);
    letter-spacing: 0.5px;
}

.load-more:active {
    opacity: 0.7;
}

.setting-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--color-text-light);
    cursor: pointer;
    padding: 4px 8px;
    opacity: 0.5;
    transition: opacity var(--duration-normal);
}

.setting-btn:active {
    opacity: 0.8;
}

/* 漂浮面板 */
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
    transition: background var(--duration-normal) var(--ease-soft);
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
    font-weight: 400;
}

.panel-sub {
    font-size: 10px;
    color: var(--color-text-light);
    opacity: 0.6;
    margin-top: 1px;
}

/* 面板动画 */
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

.sync-notice {
    padding: 16px;
    text-align: center;
    color: var(--color-text-light);
    font-size: 12px;
    opacity: 0.5;
    flex-shrink: 0;
}

</style>
