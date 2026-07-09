<template>
    <div class="bubble-wrapper" :class="[
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

        <!-- 多选勾选框 -->
        <div v-if="selectMode" class="select-checkbox" :class="{ checked: selected }">
            <svg v-if="selected" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"
                stroke-linecap="round">
                <path d="M20 6L9 17l-5-5" />
            </svg>
        </div>

        <!-- 头像（留白/同框主题，AI侧） -->
        <div v-if="showAvatar && msg.role === 'ai'" class="msg-avatar">
            <img v-if="personaAvatarUrl" :src="personaAvatarUrl" />
            <span v-else>{{ personaAvatar }}</span>
        </div>
        <div v-else-if="showAvatar && msg.role === 'ai'" class="avatar-placeholder"></div>

        <!-- 消息内容区 -->
        <div class="bubble-content">

            <!-- 旁白 -->
            <div v-if="msg.type === 'narr'" class="narr-bubble">
                <p>{{ msg.content }}</p>
            </div>

            <!-- 图片消息 -->
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

            <!-- 表情包 -->
            <div v-else-if="msg.type === 'emoji'" class="emoji-bubble">
                <img :src="msg.emojiUrl" :alt="msg.emojiName" class="emoji-img" />
            </div>

            <!-- 礼物 -->
            <div v-else-if="msg.type === 'gift'" class="bubble gift-bubble" @click.stop="msg._open = !msg._open">
                <div class="gift-header">
                    <span class="gift-icon">🎁</span>
                    <div class="gift-info">
                        <span class="gift-name">{{ msg.giftName }}</span>
                        <span class="gift-hint">{{ msg._open ? '点击收起' : '点击查看' }}</span>
                    </div>
                </div>
                <div v-if="msg._open" class="gift-detail">
                    <p v-if="msg.giftContent" class="gift-content">{{ msg.giftContent }}</p>
                    <p v-if="msg.giftMessage" class="gift-message">「{{ msg.giftMessage }}」</p>
                </div>
            </div>

            <!-- 转账 -->
            <div v-else-if="msg.type === 'transfer'" class="bubble transfer-bubble">
                <div class="transfer-card">
                    <div class="transfer-icon">💸</div>
                    <div class="transfer-info">
                        <span class="transfer-amount">¥{{ msg.amount?.toFixed(2) }}</span>
                        <span v-if="msg.note" class="transfer-note">{{ msg.note }}</span>
                    </div>
                    <span class="transfer-label">转账</span>
                </div>
            </div>

            <!-- 位置 -->
            <div v-else-if="msg.type === 'location'" class="bubble location-bubble">
                <div class="location-card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                        stroke-linecap="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    <div class="location-info">
                        <span class="location-name">{{ msg.locationName || '我的位置' }}</span>
                        <span class="location-coords" v-if="msg.lat">
                            {{ msg.lat.toFixed(4) }}, {{ msg.lng.toFixed(4) }}
                        </span>
                        <span class="location-coords" v-else>位置已发送</span>
                    </div>
                </div>
            </div>

            <!-- 普通消息 -->
            <div v-else class="bubble">
                <p>{{ msg.content }}</p>
            </div>

        </div>

        <!-- 头像（同框主题，user侧） -->
        <div v-if="showAvatar && msg.role === 'user'" class="msg-avatar user-avatar">
            <img v-if="userAvatar && (userAvatar.startsWith('http') || userAvatar.startsWith('data'))"
                :src="userAvatar" />
            <span v-else>{{ userAvatar || '🌙' }}</span>
        </div>
        <div v-else-if="showAvatar && msg.role === 'user'" class="avatar-placeholder"></div>

        <!-- 操作菜单 -->
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

        <!-- 图片全屏预览 -->
        <Teleport to="body">
            <div v-if="previewImage" class="image-preview-overlay" @click="previewImage = null">
                <img :src="previewImage" />
            </div>
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
</script>

<style scoped>
.bubble-wrapper {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-bottom: 6px;
    position: relative;
    transition: background 0.2s;
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

/* 合并时减少间距 */
.bubble-wrapper.is-merged {
    margin-bottom: 2px;
}

/* 多选模式 */
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

/* 头像 */
.msg-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    overflow: hidden;
    flex-shrink: 0;
    border: 1px solid rgba(217, 163, 175, 0.15);
}

.msg-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-placeholder {
    width: 32px;
    flex-shrink: 0;
}

/* 消息内容区 */
.bubble-content {
    max-width: 72%;
    display: flex;
    flex-direction: column;
}

.user .bubble-content {
    align-items: flex-end;
}

.ai .bubble-content {
    align-items: flex-start;
}

/* 旁白 */
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

/* 普通气泡 - 默认主题 */
.bubble {
    padding: 11px 15px;
    border-radius: 20px;
    font-size: 14px;
    line-height: 1.55;
    color: var(--color-text);
    word-break: break-word;
}

.user .bubble {
    background: linear-gradient(135deg, #e8a8be, #d4899e);
    color: white;
    border-bottom-right-radius: 6px;
    box-shadow: 0 2px 8px rgba(212, 137, 158, 0.2);
}

.ai .bubble {
    background: var(--color-card);
    border-bottom-left-radius: 6px;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.02);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--color-border);
}

/* 合并时的圆角调整 */
.is-merged.user .bubble {
    border-bottom-right-radius: 20px;
    border-top-right-radius: 6px;
}

.is-merged.ai .bubble {
    border-bottom-left-radius: 20px;
    border-top-left-radius: 6px;
}

/* ===== 极简主题 ===== */
.bubble-wrapper.minimal .bubble {
    border-radius: 22px;
}

.bubble-wrapper.minimal.user .bubble {
    border-bottom-right-radius: 6px;
    background: linear-gradient(135deg, #e8a8be, #d4899e);
}

.bubble-wrapper.minimal.ai .bubble {
    border-bottom-left-radius: 6px;
    background: rgba(245, 245, 247, 0.9);
    color: #1c1c1e;
    border: none;
}

.bubble-wrapper.minimal.is-merged.user .bubble {
    border-top-right-radius: 22px;
    border-bottom-right-radius: 22px;
}

.bubble-wrapper.minimal.is-merged.ai .bubble {
    border-top-left-radius: 22px;
    border-bottom-left-radius: 22px;
}

/* ===== 留白主题（仅AI头像）===== */
.bubble-wrapper.留白 .bubble-content {
    max-width: 65%;
}

/* ===== 同框主题（双头像）===== */
.bubble-wrapper.together .bubble-content {
    max-width: 65%;
}

/* ===== 液态主题 ===== */
.bubble-wrapper.liquid .bubble {
    border-radius: 28px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.4);
}

.bubble-wrapper.liquid.user .bubble {
    background: linear-gradient(135deg, rgba(232, 168, 190, 0.85), rgba(212, 137, 158, 0.85));
    box-shadow: 0 4px 20px rgba(212, 137, 158, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.bubble-wrapper.liquid.ai .bubble {
    background: rgba(255, 255, 255, 0.55);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.bubble-wrapper.liquid.is-merged .bubble {
    border-radius: 22px;
}

/* ===== 微信主题 ===== */
.bubble-wrapper.wechat .bubble {
    border-radius: 4px;
    position: relative;
}

.bubble-wrapper.wechat.user .bubble {
    background: #95EC69;
    color: #191919;
    border-radius: 4px 4px 4px 4px;
    box-shadow: none;
}

.bubble-wrapper.wechat.ai .bubble {
    background: white;
    color: #191919;
    border: none;
    box-shadow: none;
}

/* 微信气泡尾角 */
.bubble-wrapper.wechat.user .bubble::after {
    content: '';
    position: absolute;
    right: -6px;
    top: 10px;
    border: 6px solid transparent;
    border-left-color: #95EC69;
    border-right: none;
}

.bubble-wrapper.wechat.ai .bubble::after {
    content: '';
    position: absolute;
    left: -6px;
    top: 10px;
    border: 6px solid transparent;
    border-right-color: white;
    border-left: none;
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
}

.emoji-img {
    width: 90px;
    height: 90px;
    object-fit: contain;
    border-radius: 8px;
}

/* 礼物 */
.gift-bubble {
    cursor: pointer;
    min-width: 160px;
}

.gift-header {
    display: flex;
    align-items: center;
    gap: 10px;
}

.gift-icon {
    font-size: 26px;
}

.gift-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.gift-name {
    font-size: 14px;
    font-weight: 500;
}

.gift-hint {
    font-size: 10px;
    opacity: 0.5;
}

.gift-detail {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.gift-content {
    font-size: 13px;
    line-height: 1.6;
    margin-bottom: 4px;
}

.gift-message {
    font-size: 13px;
    font-style: italic;
    opacity: 0.8;
}

/* 转账 */
.transfer-bubble {
    min-width: 170px;
}

.transfer-card {
    display: flex;
    align-items: center;
    gap: 10px;
}

.transfer-icon {
    font-size: 22px;
}

.transfer-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.transfer-amount {
    font-size: 18px;
    font-weight: 700;
}

.transfer-note {
    font-size: 11px;
    opacity: 0.6;
}

.transfer-label {
    font-size: 11px;
    opacity: 0.4;
}

/* 位置 */
.location-bubble {
    min-width: 170px;
}

.location-card {
    display: flex;
    align-items: center;
    gap: 10px;
}

.location-card svg {
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    color: var(--color-primary);
}

.location-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.location-name {
    font-size: 14px;
    font-weight: 500;
}

.location-coords {
    font-size: 10px;
    opacity: 0.5;
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
