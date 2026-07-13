```vue
<template>
    <div class="chat-input-wrapper">

        <!-- 图片预览区 -->
        <div v-if="pendingImages.length > 0" class="image-preview-bar">
            <div class="image-preview-list" :class="{ collapsed: imagesCollapsed && pendingImages.length > 2 }">
                <div v-for="(img, idx) in displayedImages" :key="idx" class="image-preview-item">
                    <img :src="img.url" />
                    <button class="image-remove-btn" @click="removeImage(idx)">×</button>
                </div>
            </div>
            <button v-if="pendingImages.length > 2" class="image-collapse-btn"
                @click="imagesCollapsed = !imagesCollapsed">
                {{ imagesCollapsed ? `查看全部 ${pendingImages.length} 张` : '收起' }}
            </button>
        </div>

        <!-- 引用预览 -->
        <Transition name="fade-up">
            <div v-if="quoteMsg" class="quote-bar">
                <div class="quote-bar-line"></div>
                <div class="quote-bar-content">
                    <span class="quote-bar-role">{{ quoteMsg.role === 'ai' ? 'TA' : '我' }}</span>
                    <span class="quote-bar-text">{{ quoteMsg.content.slice(0, 40) }}{{ quoteMsg.content.length > 40 ?
                        '...' : '' }}</span>
                </div>
                <button class="quote-bar-close" @click="clearQuote">×</button>
            </div>
        </Transition>

        <!-- 功能栏 -->
        <Transition name="toolbar-slide">
            <div v-if="showToolbar" class="chat-toolbar">

                <!-- 表情包面板 -->
                <div v-if="activePanel === 'emoji'" class="toolbar-panel">
                    <div v-if="emojiList.length === 0" class="panel-empty">
                        还没有表情包，去控制中心添加吧
                    </div>
                    <div v-else class="emoji-panel-grid">
                        <img v-for="(emoji, idx) in emojiList" :key="idx" :src="emoji.url" :alt="emoji.name"
                            :title="emoji.name" @click="sendEmoji(emoji)" />
                    </div>
                </div>

                <!-- 礼物面板 -->
                <div v-if="activePanel === 'gift'" class="toolbar-panel">
                    <div class="gift-input-area">
                        <input v-model="giftName" placeholder="礼物名称，例：玫瑰花束" class="gift-input" />
                        <textarea v-model="giftContent" placeholder="礼物内容（可选）：花束里有钻戒和小纸条..." class="gift-textarea"
                            rows="2"></textarea>
                        <input v-model="giftMessage" placeholder="附言（可选）" class="gift-input" />
                        <div class="gift-method-row">
                            <span class="gift-method-label">送出方式</span>
                            <div class="gift-method-opts">
                                <button v-for="m in giftMethods" :key="m.value" class="gift-method-btn"
                                    :class="{ active: giftMethod === m.value }" @click="giftMethod = m.value">
                                    {{ m.icon }} {{ m.label }}
                                </button>
                            </div>
                        </div>
                        <button class="send-gift-btn" @click="sendGift" :disabled="!giftName.trim()">
                            送出礼物 🎁
                        </button>
                    </div>
                </div>

                <!-- 卡片面板 -->
                <div v-if="activePanel === 'card'" class="toolbar-panel">
                    <div class="gift-input-area">
                        <textarea v-model="cardHtml" placeholder="输入 HTML 内容..." class="gift-textarea" rows="5"
                            style="font-family: monospace; font-size: 12px;"></textarea>
                        <button class="send-gift-btn" @click="sendCard" :disabled="!cardHtml.trim()">
                            发送卡片 ✦
                        </button>
                    </div>
                </div>

                <!-- 外卖/快递面板 -->
                <div v-if="activePanel === 'delivery'" class="toolbar-panel">
                    <div class="gift-input-area">
                        <div class="delivery-type-row">
                            <button class="gift-method-btn" :class="{ active: deliveryType === 'food' }"
                                @click="deliveryType = 'food'">🛵 外卖</button>
                            <button class="gift-method-btn" :class="{ active: deliveryType === 'express' }"
                                @click="deliveryType = 'express'">📦 快递</button>
                        </div>
                        <input v-model="deliveryContent"
                            :placeholder="deliveryType === 'food' ? '想吃什么，例：麻辣烫、奶茶...' : '寄什么东西，例：生日礼物...'"
                            class="gift-input" />
                        <input v-if="deliveryType === 'food'" v-model="deliveryAddress" placeholder="送到哪里（可选）"
                            class="gift-input" />
                        <input v-model="deliveryNote" placeholder="备注（可选）" class="gift-input" />
                        <div class="delivery-time-row">
                            <span class="gift-method-label">{{ deliveryType === 'food' ? '预计送达' : '预计到达' }}</span>
                            <input v-model="deliveryExpected" type="datetime-local"
                                class="gift-input delivery-time-input" />
                        </div>
                        <button class="send-gift-btn" @click="sendDelivery" :disabled="!deliveryContent.trim()">
                            {{ deliveryType === 'food' ? '点外卖 🛵' : '寄快递 📦' }}
                        </button>
                    </div>
                </div>

                <!-- 转账面板 -->
                <div v-if="activePanel === 'transfer'" class="toolbar-panel">
                    <div class="transfer-input-area">
                        <div class="transfer-amount-row">
                            <span class="currency-symbol">¥</span>
                            <input v-model="transferAmount" type="number" min="0.01" step="0.01" placeholder="0.00"
                                class="transfer-amount-input" />
                        </div>
                        <input v-model="transferNote" placeholder="备注（可选）" class="gift-input" />
                        <button class="send-gift-btn" @click="sendTransfer"
                            :disabled="!transferAmount || parseFloat(transferAmount) <= 0">
                            转账 💸
                        </button>
                    </div>
                </div>

                <!-- 功能按钮行 -->
                <div class="toolbar-btns">
                    <button class="toolbar-btn" @click="emit('continue-reply')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round">
                            <polyline points="13 17 18 12 13 7" />
                            <polyline points="6 17 11 12 6 7" />
                        </svg>
                        <span>继续</span>
                    </button>
                    <button class="toolbar-btn" @click="emit('regenerate')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                        <span>重新生成</span>
                    </button>
                    <button class="toolbar-btn" :class="{ active: activePanel === 'emoji' }"
                        @click="togglePanel('emoji')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 13s1.5 2 4 2 4-2 4-2" />
                            <line x1="9" y1="9" x2="9.01" y2="9" stroke-width="3" />
                            <line x1="15" y1="9" x2="15.01" y2="9" stroke-width="3" />
                        </svg>
                        <span>表情</span>
                    </button>
                    <button class="toolbar-btn" @click="triggerImageUpload">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <span>图片</span>
                    </button>
                    <button class="toolbar-btn" :class="{ active: activePanel === 'gift' }"
                        @click="togglePanel('gift')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round">
                            <polyline points="20 12 20 22 4 22 4 12" />
                            <rect x="2" y="7" width="20" height="5" />
                            <line x1="12" y1="22" x2="12" y2="7" />
                            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                        </svg>
                        <span>礼物</span>
                    </button>
                    <button class="toolbar-btn" :class="{ active: activePanel === 'transfer' }"
                        @click="togglePanel('transfer')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        <span>转账</span>
                    </button>
                    <button class="toolbar-btn" @click="sendLocation">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>位置</span>
                    </button>
                    <button v-if="features.htmlCard" class="toolbar-btn" :class="{ active: activePanel === 'card' }"
                        @click="togglePanel('card')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="M8 10h8M8 14h4" />
                        </svg>
                        <span>卡片</span>
                    </button>
                    <button class="toolbar-btn" :class="{ active: activePanel === 'delivery' }"
                        @click="togglePanel('delivery')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round">
                            <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
                            <rect x="9" y="11" width="14" height="10" rx="2" />
                            <circle cx="12" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                        </svg>
                        <span>外卖</span>
                    </button>
                    <button class="toolbar-btn" :class="{ active: narrMode }" @click="toggleNarrMode">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                        <span>旁白</span>
                    </button>
                    <button class="toolbar-btn" @click="emit('multiselect')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round">
                            <polyline points="9 11 12 14 22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        <span>多选</span>
                    </button>
                    <button v-if="isEffectivelyOffline" class="toolbar-btn" :class="{ active: emergencyMode }"
                        @click="toggleEmergencyMode">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            stroke-linecap="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        <span>应急</span>
                    </button>
                </div>
            </div>
        </Transition>

        <!-- 旁白模式提示 -->
        <div v-if="narrMode" class="narr-indicator">
            <span>✦ 旁白模式</span>
            <button @click="narrMode = false">×</button>
        </div>

        <!-- 输入行 -->
        <div class="chat-input-area">
            <button class="more-btn" :class="{ active: showToolbar }" @click="showToolbar = !showToolbar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                </svg>
            </button>
            <textarea ref="inputRef" v-model="text" :placeholder="narrMode ? '描述场景或动作...' : '输入消息...'"
                :class="{ narr: narrMode }" @keydown.enter.exact="sendMessage" @input="autoResize" rows="1"></textarea>
            <button class="send-btn" @click="sendMessage" :disabled="!canSend">
                <span>↑</span>
            </button>
        </div>

        <!-- 隐藏文件输入 -->
        <input ref="imageInput" type="file" accept="image/*" multiple style="display:none"
            @change="handleImageUpload" />
    </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { features } from '@/utils/features'
import { emergencyMode, isEffectivelyOffline } from '@/utils/emergencyMode'

const props = defineProps({
    quoteMsg: { type: Object, default: null }
})

const emit = defineEmits([
    'send', 'send-images', 'send-emoji', 'send-gift',
    'send-transfer', 'send-location', 'continue-reply',
    'regenerate', 'multiselect', 'send-card', 'send-delivery',
    'clear-quote'
])

const text = ref('')
const inputRef = ref(null)
const imageInput = ref(null)
const showToolbar = ref(false)
const activePanel = ref('')
const narrMode = ref(false)
const pendingImages = ref([])
const imagesCollapsed = ref(true)
const emojiList = ref([])
const cardHtml = ref('')
const deliveryType = ref('food')
const deliveryContent = ref('')
const deliveryAddress = ref('')
const deliveryNote = ref('')
const deliveryExpected = ref('')

function clearQuote() {
    emit('clear-quote')
}

function toggleEmergencyMode() {
    emergencyMode.value = !emergencyMode.value
}

function sendDelivery() {
    if (!deliveryContent.value.trim()) return
    emit('send-delivery', {
        type: deliveryType.value,
        content: deliveryContent.value.trim(),
        address: deliveryAddress.value.trim(),
        note: deliveryNote.value.trim(),
        expectedAt: deliveryExpected.value || null,
    })
    deliveryContent.value = ''
    deliveryAddress.value = ''
    deliveryNote.value = ''
    deliveryExpected.value = ''
    activePanel.value = ''
    showToolbar.value = false
}

function sendCard() {
    if (!cardHtml.value.trim()) return
    emit('send-card', { html: cardHtml.value.trim() })
    cardHtml.value = ''
    activePanel.value = null
}

const giftName = ref('')
const giftContent = ref('')
const giftMessage = ref('')
const giftMethod = ref('in_person')
const giftMethods = [
    { value: 'in_person', icon: '🤝', label: '当面' },
    { value: 'delivery', icon: '📦', label: '快递' },
    { value: 'takeout', icon: '🛵', label: '外卖' },
]

const transferAmount = ref('')
const transferNote = ref('')

const autoReply = computed(() => {
    const prefs = localStorage.getItem('output_prefs')
    if (!prefs) return true
    return JSON.parse(prefs).autoReply !== false
})

const canSend = computed(() => text.value.trim() || pendingImages.value.length > 0)

const displayedImages = computed(() => {
    if (!imagesCollapsed.value || pendingImages.value.length <= 2) return pendingImages.value
    return pendingImages.value.slice(0, 2)
})

function loadEmojiList() {
    const saved = localStorage.getItem('user_emoji_list')
    if (saved) emojiList.value = JSON.parse(saved)
}

let sending = false

function sendMessage(e) {
    if (e && e.type === 'keydown') e.preventDefault()
    if (pendingImages.value.length > 0) {
        emit('send-images', { images: pendingImages.value, text: text.value.trim(), narr: narrMode.value })
        pendingImages.value = []
        text.value = ''
        nextTick(() => autoResize())
        return
    }
    if (!text.value.trim()) return
    if (sending) return
    sending = true
    const content = narrMode.value ? `[旁白] ${text.value.trim()}` : text.value.trim()
    emit('send', content, {
        narr: narrMode.value,
        autoReply: autoReply.value,
        quote: props.quoteMsg || null
    })
    emit('clear-quote')
    text.value = ''
    nextTick(() => { autoResize(); sending = false })
}

function togglePanel(name) {
    if (activePanel.value === name) activePanel.value = ''
    else { activePanel.value = name; showToolbar.value = true }
}

function toggleNarrMode() {
    narrMode.value = !narrMode.value
    if (narrMode.value) showToolbar.value = false
}

function triggerImageUpload() { imageInput.value?.click() }

function handleImageUpload(event) {
    const files = Array.from(event.target.files)
    files.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => { pendingImages.value.push({ url: e.target.result, name: file.name, type: file.type }) }
        reader.readAsDataURL(file)
    })
    event.target.value = ''
    showToolbar.value = false
}

function removeImage(idx) { pendingImages.value.splice(idx, 1) }

function sendEmoji(emoji) { emit('send-emoji', emoji); activePanel.value = '' }

function sendGift() {
    if (!giftName.value.trim()) return
    const methodMap = { in_person: '当面送出', delivery: '通过快递寄出', takeout: '通过外卖送达' }
    const methodDesc = methodMap[giftMethod.value] || '送出'
    emit('send-gift', { name: giftName.value.trim(), content: giftContent.value.trim(), message: giftMessage.value.trim(), method: giftMethod.value, methodDesc })
    giftName.value = ''; giftContent.value = ''; giftMessage.value = ''; giftMethod.value = 'in_person'
    activePanel.value = null
}

function sendTransfer() {
    const amount = parseFloat(transferAmount.value)
    if (!amount || amount <= 0) return
    emit('send-transfer', { amount, note: transferNote.value.trim() })
    transferAmount.value = ''; transferNote.value = ''; activePanel.value = ''; showToolbar.value = false
}

function sendLocation() {
    if (!navigator.geolocation) { alert('您的设备不支持定位'); return }
    navigator.geolocation.getCurrentPosition(
        (pos) => { emit('send-location', { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }); showToolbar.value = false },
        () => { alert('定位失败，请检查位置权限') }
    )
}

function autoResize() {
    const el = inputRef.value
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

onMounted(() => { loadEmojiList() })
</script>

<style scoped>
.chat-input-wrapper {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-top: 1px solid rgba(217, 163, 175, 0.1);
}

.image-preview-bar {
    padding: 8px 16px 0;
}

.image-preview-list {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding-bottom: 8px;
}

.image-preview-list.collapsed {
    flex-wrap: nowrap;
    overflow: hidden;
}

.image-preview-item {
    position: relative;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
}

.image-preview-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 10px;
}

.image-remove-btn {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: none;
    background: rgba(74, 63, 65, 0.7);
    color: white;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

.image-collapse-btn {
    background: none;
    border: none;
    font-size: 11px;
    color: #D9A3AF;
    cursor: pointer;
    padding: 2px 0 6px;
    opacity: 0.7;
}

/* 引用预览 */
.quote-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px 0;
}

.quote-bar-line {
    width: 3px;
    height: 32px;
    border-radius: 2px;
    background: rgba(217, 163, 175, 0.5);
    flex-shrink: 0;
}

.quote-bar-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.quote-bar-role {
    font-size: 10px;
    color: #D9A3AF;
    font-weight: 600;
}

.quote-bar-text {
    font-size: 12px;
    color: #8A7880;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.quote-bar-close {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(217, 163, 175, 0.15);
    border: none;
    font-size: 14px;
    color: #B8A9AC;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.chat-toolbar {
    border-top: 1px solid rgba(217, 163, 175, 0.1);
}

.toolbar-slide-enter-active {
    transition: all 0.25s var(--ease-soft);
}

.toolbar-slide-leave-active {
    transition: all 0.2s var(--ease-soft);
}

.toolbar-slide-enter-from,
.toolbar-slide-leave-to {
    opacity: 0;
    transform: translateY(8px);
}

.toolbar-panel {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
    max-height: 200px;
    overflow-y: auto;
}

.panel-empty {
    text-align: center;
    font-size: 12px;
    color: #B8A9AC;
    padding: 16px;
}

.emoji-panel-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
}

.emoji-panel-grid img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: contain;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.15s;
}

.emoji-panel-grid img:active {
    transform: scale(0.9);
}

.gift-input-area,
.transfer-input-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.gift-input {
    border: 1px solid rgba(217, 163, 175, 0.2);
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 13px;
    background: rgba(255, 255, 255, 0.6);
    color: #4A3F41;
    outline: none;
    font-family: inherit;
}

.gift-textarea {
    border: 1px solid rgba(217, 163, 175, 0.2);
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 13px;
    background: rgba(255, 255, 255, 0.6);
    color: #4A3F41;
    outline: none;
    font-family: inherit;
    resize: none;
    line-height: 1.5;
}

.gift-input::placeholder,
.gift-textarea::placeholder {
    color: #D4C8CA;
}

.transfer-amount-row {
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    border-radius: 10px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.6);
}

.currency-symbol {
    font-size: 16px;
    color: #D9A3AF;
    font-weight: 600;
}

.transfer-amount-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 20px;
    font-weight: 600;
    color: #4A3F41;
    outline: none;
    font-family: inherit;
}

.send-gift-btn {
    height: 36px;
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
}

.send-gift-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.toolbar-btns {
    display: flex;
    gap: 0;
    padding: 6px 4px;
    overflow-x: auto;
}

.toolbar-btns::-webkit-scrollbar {
    display: none;
}

.toolbar-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    background: none;
    border: none;
    cursor: pointer;
    color: #B8A9AC;
    border-radius: 10px;
    transition: all 0.2s;
    flex-shrink: 0;
    min-width: 52px;
    font-family: inherit;
}

.toolbar-btn svg {
    width: 20px;
    height: 20px;
}

.toolbar-btn span {
    font-size: 10px;
    white-space: nowrap;
}

.toolbar-btn.active {
    color: #D9A3AF;
    background: rgba(217, 163, 175, 0.1);
}

.toolbar-btn:active {
    transform: scale(0.93);
}

.narr-indicator {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 16px;
    background: rgba(216, 205, 234, 0.2);
    font-size: 11px;
    color: #9B89B4;
    border-top: 1px solid rgba(216, 205, 234, 0.3);
}

.narr-indicator button {
    background: none;
    border: none;
    font-size: 14px;
    color: #9B89B4;
    cursor: pointer;
    width: auto;
    height: auto;
    border-radius: 0;
    box-shadow: none;
    padding: 0;
}

.chat-input-area {
    display: flex;
    gap: 8px;
    padding: 10px 16px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
    align-items: flex-end;
}

.more-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.5);
    color: #B8A9AC;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
    box-shadow: none;
}

.more-btn svg {
    width: 16px;
    height: 16px;
}

.more-btn.active {
    background: rgba(217, 163, 175, 0.12);
    border-color: rgba(217, 163, 175, 0.3);
    color: #D9A3AF;
}

textarea {
    flex: 1;
    min-height: 36px;
    max-height: 120px;
    border-radius: 20px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    padding: 8px 16px;
    font-size: 14px;
    font-family: inherit;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    outline: none;
    resize: none;
    line-height: 1.45;
    overflow-y: auto;
    color: #4A3F41;
    transition: border-color 0.2s, box-shadow 0.2s;
}

textarea.narr {
    border-color: rgba(176, 144, 210, 0.4);
    background: rgba(216, 205, 234, 0.1);
    font-style: italic;
}

textarea:focus {
    border-color: rgba(217, 163, 175, 0.4);
    box-shadow: 0 0 0 3px rgba(217, 163, 175, 0.08);
}

textarea::placeholder {
    color: #D4C8CA;
}

.send-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(135deg, #e8a8be, #d4899e);
    color: white;
    font-size: 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 3px 10px rgba(212, 137, 158, 0.25);
}

.send-btn:disabled {
    opacity: 0.25;
    cursor: not-allowed;
    box-shadow: none;
}

.gift-method-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.gift-method-label {
    font-size: 11px;
    color: #B8A9AC;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.gift-method-opts {
    display: flex;
    gap: 8px;
}

.gift-method-btn {
    flex: 1;
    padding: 8px 6px;
    border-radius: 12px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    color: #B8A9AC;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    white-space: nowrap;
}

.gift-method-btn.active {
    background: rgba(217, 163, 175, 0.15);
    color: #D9A3AF;
    border-color: rgba(217, 163, 175, 0.4);
}

.delivery-type-row {
    display: flex;
    gap: 8px;
}

.delivery-time-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.delivery-time-input {
    width: 100%;
    box-sizing: border-box;
}

.fade-up-enter-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-up-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-up-enter-from {
    opacity: 0;
    transform: translateY(8px);
}

.fade-up-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
