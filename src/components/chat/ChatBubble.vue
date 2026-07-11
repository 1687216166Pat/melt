<template>
    <div class="bubble-wrapper" :data-msg-id="msg.id" :class="[
        msg.role,
        msg.type,
        theme,
        {
            'is-merged': isMerged,
            'show-avatar': showAvatar,
            'selected': selected,
            'select-mode': selectMode
        }
    ]" v-if="msg.content || msg.type" @touchstart="handleTouchStart" @touchend="handleTouchEnd"
        @touchmove="handleTouchEnd" @click="selectMode ? emit('select', msg.id) : null">

        <div v-if="selectMode" class="select-checkbox" :class="{ checked: selected }">
            <svg v-if="selected" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"
                stroke-linecap="round">
                <path d="M20 6L9 17l-5-5" />
            </svg>
        </div>

        <div v-if="showAvatar && msg.role === 'ai'" class="msg-avatar">
            <img v-if="personaAvatarUrl" :src="personaAvatarUrl" />
            <span v-else>{{ personaAvatar }}</span>
        </div>
        <div v-else-if="showAvatar && msg.role === 'ai'" class="avatar-placeholder"></div>

        <div class="bubble-content">

            <div v-if="msg.type === 'narr'" class="narr-bubble">
                <p>{{ msg.content }}</p>
            </div>

            <div v-else-if="msg.type === 'images'" class="bubble images-bubble">
                <div class="images-grid" :class="{ single: msg.images.length === 1 }">
                    <img v-for="(img, idx) in displayImages(msg)" :key="idx" :src="img.url"
                        @click.stop="openImage(img.url)" />
                </div>
                <button v-if="msg.images.length > 4" class="images-more-btn"
                    @click.stop="msg._expanded = !msg._expanded">
                    {{ msg._expanded ? '收起' : `查看全部 ${msg.images.length} 张` }}
                </button>
                <p v-if="msg.content" class="image-caption">{{ msg.content }}</p>
            </div>

            <div v-else-if="msg.type === 'emoji'" class="emoji-bubble">
                <img :src="msg.emojiUrl" :alt="msg.emojiName" class="emoji-img" />
            </div>

            <!-- 礼物气泡 -->
            <div v-else-if="msg.type === 'gift'" class="postcard-bubble gift-postcard"
                @click.stop="showGiftModal = true">
                <div class="postcard-left">
                    <span class="postcard-emoji">🎁</span>
                </div>
                <div class="postcard-right">
                    <span class="postcard-title">{{ msg.giftName || '礼物' }}</span>
                    <span v-if="msg.giftContent" class="postcard-sub">内含：{{ msg.giftContent }}</span>
                    <span v-else-if="msg.giftMessage" class="postcard-sub">「{{ msg.giftMessage }}」</span>
                    <span v-else class="postcard-sub">{{ msg.role === 'ai' ? '他送给你的' : '你送出的' }}</span>
                </div>
                <svg class="postcard-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round">
                    <path d="M9 18l6-6-6" />
                </svg>
            </div>

            <!-- 转账气泡 -->
            <div v-else-if="msg.type === 'transfer'" class="postcard-bubble transfer-postcard"
                @click.stop="showTransferModal = true">
                <div class="postcard-left">
                    <span class="postcard-emoji">💸</span>
                </div>
                <div class="postcard-right">
                    <span class="postcard-title">¥{{ Number(msg.amount || 0).toFixed(2) }}</span>
                    <span v-if="msg.note" class="postcard-sub">{{ msg.note }}</span>
                    <span v-else class="postcard-sub">{{ msg.role === 'ai' ? '他转给你的' : '你转出的' }}</span>
                </div>
                <svg class="postcard-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round">
                    <path d="M9 18l6-6-6-6" />
                </svg>
            </div>

            <!-- 位置气泡 -->
            <div v-else-if="msg.type === 'location'" class="postcard-bubble location-postcard"
                @click.stop="showLocationModal = true">
                <div class="postcard-left">
                    <span class="postcard-emoji">📍</span>
                </div>
                <div class="postcard-right">
                    <span class="postcard-title">{{ msg.locationName || '我的位置' }}</span>
                    <span class="postcard-sub">{{ msg.role === 'ai' ? '他分享了位置' : '你分享了位置' }}</span>
                </div>
                <svg class="postcard-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round">
                    <path d="M9 18l6-6-6-6" />
                </svg>
            </div>

            <div v-else class="bubble">
                <p>{{ msg.content }}</p>
            </div>

        </div>

        <div v-if="showAvatar && msg.role === 'user'" class="msg-avatar user-avatar">
            <img v-if="userAvatar && (userAvatar.startsWith('http') || userAvatar.startsWith('data'))"
                :src="userAvatar" />
            <span v-else>{{ userAvatar || '🌙' }}</span>
        </div>
        <div v-else-if="showAvatar && msg.role === 'user'" class="avatar-placeholder"></div>

        <transition name="panel">
            <div v-if="showActions && !selectMode" class="bubble-actions" @click.self="showActions = false">
                <div class="action-menu">
                    <button v-if="!msg.type || msg.type === 'narr'" @click="editMsg">编辑</button>
                    <button v-if="msg.role === 'ai'" @click="regenerate">重新生成</button>
                    <button @click="bookmarkMsg">收藏</button>
                    <button @click="deleteMsg" class="danger">删除</button>
                    <button @click="showActions = false">取消</button>
                </div>
            </div>
        </transition>

        <Teleport to="body">
            <div v-if="previewImage" class="image-preview-overlay" @click="previewImage = null">
                <img :src="previewImage" />
            </div>
        </Teleport>

        <!-- 礼物弹窗 -->
        <Teleport to="body">
            <Transition name="modal-pop">
                <div v-if="showGiftModal" class="sp-overlay" @click.self="showGiftModal = false">
                    <div class="receipt-card">
                        <div class="receipt-top gift-receipt-top">
                            <div class="receipt-emoji">🎁</div>
                            <div class="receipt-type">礼物</div>
                            <div class="receipt-from">{{ msg.role === 'ai' ? '他送给你的' : '你送出的' }}</div>
                        </div>
                        <div class="receipt-zigzag gift-zigzag"></div>
                        <div class="receipt-body">
                            <div class="receipt-title">{{ msg.giftName || '礼物' }}</div>
                            <div v-if="msg.giftContent" class="receipt-row">
                                <span class="receipt-label">里面有</span>
                                <span class="receipt-value">{{ msg.giftContent }}</span>
                            </div>
                            <div v-if="msg.giftMessage" class="receipt-row">
                                <span class="receipt-label">附言</span>
                                <span class="receipt-value receipt-italic">「{{ msg.giftMessage }}」</span>
                            </div>
                            <div class="receipt-divider"></div>
                            <div class="receipt-row receipt-row-small">
                                <span class="receipt-label">时间</span>
                                <span class="receipt-value">{{ new Date(msg.timestamp).toLocaleString('zh-CN', {
                                    month:
                                        'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
                            </div>
                        </div>
                        <div class="receipt-zigzag receipt-zigzag-bottom gift-zigzag"></div>
                        <div class="receipt-footer">
                            <button class="receipt-btn gift-btn"
                                @click="() => { if (msg.role === 'ai' && !giftAccepted) { acceptMsg(msg.id); giftAccepted = true } showGiftModal = false }">
                                {{ msg.role === 'user' || giftAccepted ? '收起卡片' : '收下礼物 ✿' }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- 转账弹窗 -->
        <Teleport to="body">
            <Transition name="modal-pop">
                <div v-if="showTransferModal" class="sp-overlay" @click.self="showTransferModal = false">
                    <div class="receipt-card">
                        <div class="receipt-top transfer-receipt-top">
                            <div class="receipt-emoji">💸</div>
                            <div class="receipt-type">转账</div>
                            <div class="receipt-from">{{ msg.role === 'ai' ? '他转给你的' : '你转出的' }}</div>
                        </div>
                        <div class="receipt-zigzag transfer-zigzag"></div>
                        <div class="receipt-body">
                            <div class="receipt-amount">¥{{ Number(msg.amount || 0).toFixed(2) }}</div>
                            <div v-if="msg.note" class="receipt-row">
                                <span class="receipt-label">备注</span>
                                <span class="receipt-value">{{ msg.note }}</span>
                            </div>
                            <div v-else class="receipt-row">
                                <span class="receipt-label">备注</span>
                                <span class="receipt-value receipt-empty">无</span>
                            </div>
                            <div class="receipt-divider"></div>
                            <div class="receipt-row receipt-row-small">
                                <span class="receipt-label">时间</span>
                                <span class="receipt-value">{{ new Date(msg.timestamp).toLocaleString('zh-CN', {
                                    month:
                                        'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
                            </div>
                        </div>
                        <div class="receipt-zigzag receipt-zigzag-bottom transfer-zigzag"></div>
                        <div class="receipt-footer">
                            <button class="receipt-btn transfer-btn"
                                @click="() => { if (msg.role === 'ai' && !transferAccepted) { acceptMsg(msg.id); transferAccepted = true } showTransferModal = false }">
                                {{ msg.role === 'user' || transferAccepted ? '收起卡片' : '收下转账' }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- 位置弹窗 -->
        <Teleport to="body">
            <Transition name="modal-pop">
                <div v-if="showLocationModal" class="sp-overlay" @click.self="showLocationModal = false">
                    <div class="receipt-card">
                        <div class="receipt-top location-receipt-top">
                            <div class="receipt-emoji">📍</div>
                            <div class="receipt-type">位置</div>
                            <div class="receipt-from">{{ msg.role === 'ai' ? '他分享的位置' : '你分享的位置' }}</div>
                        </div>
                        <div class="receipt-zigzag location-zigzag"></div>
                        <div class="receipt-body">
                            <div class="receipt-title">{{ msg.locationName || '我的位置' }}</div>
                            <div v-if="msg.lat" class="receipt-row">
                                <span class="receipt-label">坐标</span>
                                <span class="receipt-value">{{ msg.lat.toFixed(4) }}, {{ msg.lng.toFixed(4) }}</span>
                            </div>
                            <div v-else class="receipt-row">
                                <span class="receipt-label">说明</span>
                                <span class="receipt-value">位置已分享</span>
                            </div>
                            <div class="receipt-divider"></div>
                            <div class="receipt-row receipt-row-small">
                                <span class="receipt-label">时间</span>
                                <span class="receipt-value">{{ new Date(msg.timestamp).toLocaleString('zh-CN', {
                                    month:
                                        'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
                            </div>
                        </div>
                        <div class="receipt-zigzag receipt-zigzag-bottom location-zigzag"></div>
                        <div class="receipt-footer">
                            <button class="receipt-btn location-btn" @click="showLocationModal = false">
                                收起卡片
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

    </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
    msg: Object,
    theme: { type: String, default: 'default' },
    merge: { type: Boolean, default: false },
    isMerged: { type: Boolean, default: false },
    showAvatar: { type: Boolean, default: false },
    personaAvatar: { type: String, default: '💬' },
    personaAvatarUrl: { type: String, default: '' },
    userAvatar: { type: String, default: '' },
    selectMode: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
})

const emit = defineEmits(['edit', 'delete', 'regenerate', 'bookmark', 'select'])

const showActions = ref(false)
const previewImage = ref(null)
const showGiftModal = ref(false)
const showTransferModal = ref(false)
const showLocationModal = ref(false)

const giftAccepted = ref(isAccepted(props.msg.id))
const transferAccepted = ref(isAccepted(props.msg.id))

let longPressTimer = null

function handleTouchStart(e) {
    if (props.selectMode) return
    longPressTimer = setTimeout(() => { showActions.value = true }, 500)
}

function handleTouchEnd() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
}

function displayImages(msg) {
    if (msg._expanded || msg.images.length <= 4) return msg.images
    return msg.images.slice(0, 4)
}

function openImage(url) { previewImage.value = url }

function editMsg() {
    showActions.value = false
    const newContent = prompt('编辑消息:', props.msg.content)
    if (newContent !== null && newContent.trim()) {
        emit('edit', props.msg.id, newContent.trim())
    }
}

function deleteMsg() {
    showActions.value = false
    if (confirm('删除这条消息？')) emit('delete', props.msg.id)
}

function regenerate() {
    showActions.value = false
    emit('regenerate', props.msg.id)
}

function bookmarkMsg() {
    showActions.value = false
    emit('bookmark', props.msg)
}

// 收下状态，用消息 id 存
function isAccepted(msgId) {
    const accepted = JSON.parse(localStorage.getItem('accepted_msgs') || '{}')
    return !!accepted[msgId]
}

function acceptMsg(msgId) {
    const accepted = JSON.parse(localStorage.getItem('accepted_msgs') || '{}')
    accepted[msgId] = true
    localStorage.setItem('accepted_msgs', JSON.stringify(accepted))
}

</script>

<style scoped>
.bubble-wrapper {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-bottom: 12px;
    position: relative;
}

.bubble-wrapper.user {
    justify-content: flex-end;
}

.bubble-wrapper.ai {
    justify-content: flex-start;
}

.bubble-wrapper.narr {
    justify-content: center;
}

.bubble-wrapper.is-merged {
    margin-bottom: 3px;
}

.bubble-wrapper.select-mode {
    padding-left: 36px;
    cursor: pointer;
}

.bubble-wrapper.selected {
    background: rgba(217, 163, 175, 0.08);
    border-radius: 12px;
}

.select-checkbox {
    position: absolute;
    left: 4px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1.5px solid rgba(217, 163, 175, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    flex-shrink: 0;
}

.select-checkbox.checked {
    background: #D9A3AF;
    border-color: #D9A3AF;
}

.select-checkbox svg {
    width: 13px;
    height: 13px;
}

.msg-avatar {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(255, 233, 237, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(217, 163, 175, 0.2);
}

.msg-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-placeholder {
    width: 40px;
    flex-shrink: 0;
}

.bubble-content {
    max-width: 68%;
    display: flex;
    flex-direction: column;
}

.user .bubble-content {
    align-items: flex-end;
}

.ai .bubble-content {
    align-items: flex-start;
}

.narr-bubble {
    max-width: 88%;
    padding: 8px 16px;
    text-align: center;
    font-style: italic;
    font-size: 13px;
    color: var(--color-text-light);
    background: rgba(216, 205, 234, 0.15);
    border-radius: 20px;
    border: 1px solid rgba(216, 205, 234, 0.3);
}

.bubble {
    padding: 10px 14px;
    border-radius: 18px;
    font-size: 14px;
    line-height: 1.6;
    color: #4A3F41;
    word-break: break-word;
}

.user .bubble {
    background: linear-gradient(135deg, #F4B8CC, #E8A0B8);
    color: white;
    border-radius: 18px 18px 6px 18px;
    box-shadow: 0 2px 10px rgba(232, 160, 184, 0.3);
}

.ai .bubble {
    background: rgba(255, 255, 255, 0.75);
    border-radius: 18px 18px 18px 6px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.9);
}

.is-merged.user .bubble {
    border-radius: 18px 6px 6px 18px;
}

.is-merged.ai .bubble {
    border-radius: 6px 18px 18px 6px;
}

/* ===== 明信片气泡（礼物/转账/位置）===== */
.postcard-bubble {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 18px;
    min-width: 200px;
    max-width: 240px;
    cursor: pointer;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    transition: transform 0.15s ease;
    position: relative;
    overflow: hidden;
}

.postcard-bubble::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.7);
}

.postcard-bubble:active {
    transform: scale(0.97);
}

.ai .postcard-bubble {
    border-radius: 18px 18px 18px 6px;
}

.user .postcard-bubble {
    border-radius: 18px 18px 6px 18px;
}

.gift-postcard {
    background: rgba(255, 233, 240, 0.65);
    border: 1px solid rgba(232, 192, 201, 0.35);
    box-shadow: 0 4px 16px rgba(217, 163, 175, 0.12);
}

.transfer-postcard {
    background: rgba(224, 238, 255, 0.65);
    border: 1px solid rgba(160, 200, 240, 0.35);
    box-shadow: 0 4px 16px rgba(140, 180, 220, 0.12);
}

.location-postcard {
    background: rgba(224, 245, 232, 0.65);
    border: 1px solid rgba(160, 210, 175, 0.35);
    box-shadow: 0 4px 16px rgba(130, 190, 150, 0.12);
}

.postcard-left {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
}

.postcard-emoji {
    font-size: 20px;
    line-height: 1;
}

.postcard-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}

.postcard-title {
    font-size: 14px;
    font-weight: 600;
    color: #4A3F41;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.postcard-sub {
    font-size: 11px;
    color: #B8A9AC;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.postcard-chevron {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    color: #C8B8BC;
    opacity: 0.7;
}

/* ===== 弹窗遮罩 ===== */
.sp-overlay {
    position: fixed;
    inset: 0;
    z-index: 800;
    background: rgba(74, 63, 65, 0.25);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

/* ===== 小票卡片 ===== */
.receipt-card {
    width: 100%;
    max-width: 280px;
    background: #FFFBFD;
    border-radius: 4px;
    box-shadow: 0 8px 40px rgba(180, 100, 130, 0.18), 0 2px 8px rgba(0, 0, 0, 0.06);
    overflow: visible;
}

.receipt-top {
    padding: 24px 20px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    border-radius: 4px 4px 0 0;
}

.gift-receipt-top {
    background: linear-gradient(160deg, #fce8ef, #f5d4e0);
}

.transfer-receipt-top {
    background: linear-gradient(160deg, #e4eeff, #d0e4f8);
}

.location-receipt-top {
    background: linear-gradient(160deg, #e4f4ea, #d0ead8);
}

.receipt-emoji {
    font-size: 44px;
    line-height: 1;
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.08));
}

.receipt-type {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #A09098;
    margin-top: 2px;
}

.receipt-from {
    font-size: 12px;
    color: #B8A9AC;
    background: rgba(255, 255, 255, 0.6);
    padding: 3px 12px;
    border-radius: 20px;
    backdrop-filter: blur(4px);
}

/* 锯齿边 */
.receipt-zigzag {
    height: 12px;
    position: relative;
}

.receipt-zigzag::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 12px;
    background-size: 16px 12px;
    background-repeat: repeat-x;
}

.gift-zigzag::after {
    background-image: radial-gradient(circle at 8px 0, #fce8ef 8px, #FFFBFD 8px);
    top: 0;
    background-position: 0 0;
}

.receipt-zigzag-bottom.gift-zigzag::after {
    background-image: radial-gradient(circle at 8px 12px, #FFFBFD 8px, #fce8ef 8px);
    top: auto;
    bottom: 0;
}

.transfer-zigzag::after {
    background-image: radial-gradient(circle at 8px 0, #e4eeff 8px, #FFFBFD 8px);
    top: 0;
    background-position: 0 0;
}

.receipt-zigzag-bottom.transfer-zigzag::after {
    background-image: radial-gradient(circle at 8px 12px, #FFFBFD 8px, #e4eeff 8px);
    top: auto;
    bottom: 0;
}

.location-zigzag::after {
    background-image: radial-gradient(circle at 8px 0, #e4f4ea 8px, #FFFBFD 8px);
    top: 0;
    background-position: 0 0;
}

.receipt-zigzag-bottom.location-zigzag::after {
    background-image: radial-gradient(circle at 8px 12px, #FFFBFD 8px, #e4f4ea 8px);
    top: auto;
    bottom: 0;
}

.receipt-body {
    padding: 12px 20px 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #FFFBFD;
}

.receipt-title {
    font-size: 18px;
    font-weight: 700;
    color: #4A3F41;
    text-align: center;
    letter-spacing: 0.02em;
}

.receipt-amount {
    font-size: 32px;
    font-weight: 800;
    color: #4A3F41;
    text-align: center;
    letter-spacing: -1px;
}

.receipt-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
}

.receipt-row-small {
    opacity: 0.55;
}

.receipt-label {
    font-size: 11px;
    color: #C8B8BC;
    font-weight: 600;
    letter-spacing: 0.5px;
    flex-shrink: 0;
    padding-top: 1px;
}

.receipt-value {
    font-size: 13px;
    color: #4A3F41;
    text-align: right;
    line-height: 1.5;
    flex: 1;
}

.receipt-italic {
    font-style: italic;
    color: #8A7880;
}

.receipt-empty {
    color: #C8BCBE;
    font-style: italic;
}

.receipt-divider {
    border-top: 1px dashed rgba(200, 150, 170, 0.2);
    margin: 2px 0;
}

.receipt-footer {
    padding: 8px 20px 20px;
    background: #FFFBFD;
    border-radius: 0 0 4px 4px;
}

.receipt-btn {
    width: 100%;
    height: 44px;
    border-radius: 14px;
    border: none;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: transform 0.15s, opacity 0.15s;
}

.receipt-btn:active {
    opacity: 0.8;
    transform: scale(0.98);
}

.gift-btn {
    background: linear-gradient(135deg, #F4C0CC, #E8A3B5);
    color: white;
    box-shadow: 0 4px 14px rgba(232, 163, 181, 0.3);
}

.transfer-btn {
    background: linear-gradient(135deg, #A8C8F0, #88B0E0);
    color: white;
    box-shadow: 0 4px 14px rgba(136, 176, 224, 0.3);
}

.location-btn {
    background: linear-gradient(135deg, #A0D4B0, #80C090);
    color: white;
    box-shadow: 0 4px 14px rgba(128, 192, 144, 0.3);
}

/* 弹窗动画 */
.modal-pop-enter-active {
    transition: opacity 0.25s ease;
}

.modal-pop-leave-active {
    transition: opacity 0.2s ease;
}

.modal-pop-enter-from,
.modal-pop-leave-to {
    opacity: 0;
}

.modal-pop-enter-active .receipt-card {
    transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.modal-pop-enter-from .receipt-card {
    transform: scale(0.93) translateY(14px);
}

/* ===== 主题变体 ===== */
.bubble-wrapper.minimal .msg-avatar {
    border-radius: 50%;
}

.bubble-wrapper.minimal .bubble {
    border-radius: 18px;
    font-size: 16px;
    line-height: 1.4;
    backdrop-filter: none;
    border: none;
}

.bubble-wrapper.minimal.user .bubble {
    background: #007AFF;
    color: white;
    border-bottom-right-radius: 4px;
    box-shadow: none;
}

.bubble-wrapper.minimal.ai .bubble {
    background: #FFFFFF;
    color: #1c1c1e;
    border-bottom-left-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.bubble-wrapper.minimal.is-merged.user .bubble {
    border-bottom-right-radius: 18px;
    border-top-right-radius: 4px;
}

.bubble-wrapper.minimal.is-merged.ai .bubble {
    border-bottom-left-radius: 18px;
    border-top-left-radius: 4px;
}

.bubble-wrapper.minimal .msg-avatar {
    display: none;
}

.bubble-wrapper.minimal .avatar-placeholder {
    display: none;
}

.bubble-wrapper.minimal .bubble-content {
    max-width: 75%;
}

.bubble-wrapper.留白 .msg-avatar {
    display: none;
}

.bubble-wrapper.留白 .avatar-placeholder {
    display: none;
}

.bubble-wrapper.留白 .bubble-content {
    max-width: 80%;
}

.bubble-wrapper.留白 .bubble {
    border-radius: 14px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    font-size: 15px;
    line-height: 1.55;
}

.bubble-wrapper.留白.user .bubble {
    background: rgba(196, 168, 130, 0.25);
    color: #E8D5C4;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.2);
}

.bubble-wrapper.留白.ai .bubble {
    background: rgba(255, 255, 255, 0.08);
    color: #E8D5C4;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.15);
}

.bubble-wrapper.together .msg-avatar {
    border-radius: 50%;
}

.bubble-wrapper.together .bubble-content {
    max-width: 75%;
}

.bubble-wrapper.together .bubble {
    border-radius: 4px 16px 16px 4px;
    backdrop-filter: none;
    border: none;
    font-size: 15px;
    line-height: 1.5;
}

.bubble-wrapper.together.user .bubble {
    background: #5865F2;
    color: white;
    border-radius: 16px 4px 4px 16px;
    box-shadow: none;
}

.bubble-wrapper.together.ai .bubble {
    background: #2B2D31;
    color: #DBDEE1;
    box-shadow: none;
}

.bubble-wrapper.together.is-merged.user .bubble {
    border-radius: 16px 4px 4px 16px;
}

.bubble-wrapper.together.is-merged.ai .bubble {
    border-radius: 4px 16px 16px 4px;
}

.bubble-wrapper.liquid .msg-avatar {
    display: none;
}

.bubble-wrapper.liquid .avatar-placeholder {
    display: none;
}

.bubble-wrapper.liquid .bubble-content {
    max-width: 75%;
}

.bubble-wrapper.liquid .bubble {
    border-radius: 28px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.4);
}

.bubble-wrapper.liquid.user .bubble {
    background: linear-gradient(135deg, rgba(232, 168, 190, 0.85), rgba(212, 137, 158, 0.85));
    color: white;
    box-shadow: 0 4px 20px rgba(212, 137, 158, 0.25);
}

.bubble-wrapper.liquid.ai .bubble {
    background: rgba(255, 255, 255, 0.6);
    color: #4A3F41;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.bubble-wrapper.liquid.is-merged .bubble {
    border-radius: 22px;
}

.bubble-wrapper.wechat {
    margin-bottom: 8px;
    align-items: flex-start;
    gap: 10px;
}

.bubble-wrapper.wechat .msg-avatar {
    border-radius: 6px;
    width: 42px;
    height: 42px;
    font-size: 20px;
}

.bubble-wrapper.wechat .bubble-content {
    max-width: 68%;
}

.bubble-wrapper.wechat .bubble {
    border-radius: 4px;
    position: relative;
    font-size: 15px;
    backdrop-filter: none;
    border: none;
    line-height: 1.5;
}

.bubble-wrapper.wechat.user .bubble {
    background: #95EC69;
    color: #191919;
    box-shadow: none;
    border-radius: 8px 2px 8px 8px;
}

.bubble-wrapper.wechat.ai .bubble {
    background: #FFFFFF;
    color: #191919;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border-radius: 2px 8px 8px 8px;
}

.bubble-wrapper.wechat.user .bubble::after {
    content: '';
    position: absolute;
    right: -6px;
    top: 8px;
    border: 6px solid transparent;
    border-left-color: #95EC69;
    border-right: none;
}

.bubble-wrapper.wechat.ai .bubble::after {
    content: '';
    position: absolute;
    left: -6px;
    top: 8px;
    border: 6px solid transparent;
    border-right-color: #FFFFFF;
    border-left: none;
}

.bubble-wrapper.wechat .select-checkbox.checked {
    background: #07C160;
    border-color: #07C160;
}

/* 图片气泡 */
.images-bubble {
    padding: 6px;
}

.images-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 3px;
    border-radius: 14px;
    overflow: hidden;
    max-width: 220px;
}

.images-grid.single {
    grid-template-columns: 1fr;
    max-width: 180px;
}

.images-grid img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    cursor: pointer;
}

.images-more-btn {
    width: 100%;
    background: none;
    border: none;
    font-size: 11px;
    color: var(--color-primary);
    cursor: pointer;
    padding: 4px 0;
    text-align: center;
}

.image-caption {
    font-size: 13px;
    margin-top: 4px;
    padding: 0 4px;
    color: var(--color-text);
}

/* 表情包 */
.emoji-bubble {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0;
    backdrop-filter: none !important;
}

.emoji-img {
    width: 90px;
    height: 90px;
    object-fit: contain;
    border-radius: 8px;
}

/* 操作菜单 */
.bubble-actions {
    position: fixed;
    inset: 0;
    background: rgba(50, 30, 40, 0.2);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
}

.action-menu {
    background: var(--color-bg);
    border-radius: 20px;
    padding: 8px;
    min-width: 160px;
    box-shadow: 0 8px 32px rgba(200, 130, 160, 0.12);
}

.action-menu button {
    display: block;
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: none;
    font-size: 14px;
    color: var(--color-text);
    text-align: center;
    cursor: pointer;
    border-radius: 12px;
    font-family: inherit;
}

.action-menu button:active {
    background: rgba(212, 137, 158, 0.06);
}

.action-menu button.danger {
    color: #c07070;
}

/* 图片全屏预览 */
.image-preview-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.88);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.image-preview-overlay img {
    max-width: 95%;
    max-height: 95%;
    object-fit: contain;
    border-radius: 8px;
}

.panel-enter-active {
    transition: opacity 0.25s ease;
}

.panel-leave-active {
    transition: opacity 0.2s ease;
}

.panel-enter-from,
.panel-leave-to {
    opacity: 0;
}
</style>
