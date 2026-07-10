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

/* 多选 */
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

/* ===== 默认主题头像（方形）===== */
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

/* 内容区 */
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

/* ===== 默认气泡（第四张参考，粉色圆角）===== */
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

/* ===== 极简主题 = iMessage ===== */
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

/* 极简无头像 */
.bubble-wrapper.minimal .msg-avatar {
    display: none;
}

.bubble-wrapper.minimal .avatar-placeholder {
    display: none;
}

.bubble-wrapper.minimal .bubble-content {
    max-width: 75%;
}

/* ===== 留白主题 = 小克毛玻璃 ===== */
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

/* ===== 同框主题 = Discord ===== */
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

/* ===== 液态主题 ===== */
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

/* ===== 微信主题 ===== */
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

/* ===== 图片气泡 ===== */
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

/* 同框主题操作菜单 */
.bubble-wrapper.together~.bubble-actions .action-menu,
.theme-together .action-menu {
    background: #1E1F22;
    border-radius: 8px;
}

.theme-together .action-menu button {
    color: #DBDEE1;
}

/* 留白主题操作菜单 */
.theme-留白 .action-menu {
    background: rgba(40, 34, 46, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.theme-留白 .action-menu button {
    color: #E8D5C4;
}

/* 微信操作菜单 */
.theme-wechat .action-menu {
    background: #FFFFFF;
    border-radius: 8px;
}

.theme-wechat .action-menu button {
    color: #191919;
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
