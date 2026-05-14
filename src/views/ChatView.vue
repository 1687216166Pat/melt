<template>
    <div class="chat-page">
        <div class="chat-header">
            <button class="back-btn" @click="goBack">‹</button>
            <h2>{{ personaName }}</h2>
        </div>
        <div class="chat-messages" ref="messagesContainer">
            <ChatBubble v-for="msg in chatStore.messages" :key="msg.id" :msg="msg" />
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

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const { send, onMessage, removeHandler } = useWebSocket()
const messagesContainer = ref(null)
const isTyping = ref(false)
const debugInfo = ref(null)

function goBack() {
    if (window.history.length > 1) {
        router.back()
    } else {
        router.push('/')
    }
}

const personaId = computed(() => route.params.personaId)

const nameMap = {
    xiaorou: '小柔',
    cool: '阿冷',
    assistant: '助手'
}

const personaName = computed(() => nameMap[personaId.value] || 'AI 助手')

function scrollToBottom() {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
    })
}

function handleSend(text) {
    chatStore.addMessage({ role: 'user', content: text })
    send({ type: 'chat', content: text, personaId: personaId.value })
    isTyping.value = true
    scrollToBottom()
}

function handleIncoming(data) {
    if (data.type === 'chat' || data.type === 'push') {
        isTyping.value = false
        chatStore.addMessage({ role: 'ai', content: data.content, timestamp: data.timestamp })
        if (data.debug) {
            debugInfo.value = data.debug
        }
        scrollToBottom()
    }
}

onMounted(() => {
    onMessage(handleIncoming)
    chatStore.loadPersonaMessages(personaId.value)
})

onUnmounted(() => {
    removeHandler(handleIncoming)
})

watch(() => chatStore.messages.length, scrollToBottom)
</script>

<style scoped>
.chat-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
}

.chat-header {
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
    padding: 0 4px;
}

.chat-header h2 {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px 0;
    -webkit-overflow-scrolling: touch;
}
</style>
