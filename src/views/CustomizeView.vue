<template>
    <div class="customize-page">
        <div class="customize-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>美化</h2>
        </div>

        <div class="customize-content">
            <!-- 壁纸 -->
            <div class="section-block">
                <h3 class="section-label">✦ 主屏幕壁纸</h3>
                <GlassCard size="md">
                    <div class="wallpaper-preview" v-if="wallpaper">
                        <img :src="wallpaper" />
                    </div>
                    <DreamInput label="图片URL" v-model="wallpaperUrl" placeholder="输入图片链接..." />
                    <div class="file-row">
                        <span class="file-label">或上传文件</span>
                        <input type="file" accept="image/*" @change="handleWallpaperUpload" class="file-input" />
                    </div>
                    <div class="btn-row">
                        <SoftButton variant="primary" size="sm" @click="applyWallpaper">应用</SoftButton>
                        <SoftButton variant="ghost" size="sm" @click="clearWallpaper">清除</SoftButton>
                    </div>
                </GlassCard>
            </div>

            <!-- 字体 -->
            <div class="section-block">
                <h3 class="section-label">❋ 全局字体</h3>
                <GlassCard size="md">
                    <DreamInput label="字体URL（.woff2 / .ttf）" v-model="fontUrl" placeholder="https://..." />
                    <div class="file-row">
                        <span class="file-label">或上传字体文件</span>
                        <input type="file" accept=".woff2,.woff,.ttf,.otf" @change="handleFontUpload"
                            class="file-input" />
                    </div>
                    <DreamInput label="字体名称" v-model="fontName" placeholder="例：My Font" />
                    <div class="btn-row">
                        <SoftButton variant="primary" size="sm" @click="applyFont">应用</SoftButton>
                        <SoftButton variant="ghost" size="sm" @click="clearFont">恢复默认</SoftButton>
                    </div>
                    <p class="preview-text" :style="{ fontFamily: fontName || 'inherit' }">字体预览：你好世界 Hello World</p>
                </GlassCard>
            </div>

            <!-- 聊天入口行为 -->
            <div class="section-block">
                <h3 class="section-label">◐ 聊天入口</h3>
                <p class="section-sub">点击"共语"后的行为</p>
                <GlassCard size="md">
                    <div class="option-row" :class="{ active: chatEntryMode === 'direct' }"
                        @click="setChatEntry('direct')">
                        <div class="option-info">
                            <p class="option-title">直接进入对话</p>
                            <p class="option-desc">打开最近聊天的AI对话</p>
                        </div>
                        <span class="option-check" v-if="chatEntryMode === 'direct'">✓</span>
                    </div>
                    <div class="option-row" :class="{ active: chatEntryMode === 'list' }" @click="setChatEntry('list')">
                        <div class="option-info">
                            <p class="option-title">显示联系人列表</p>
                            <p class="option-desc">先选择要聊天的AI</p>
                        </div>
                        <span class="option-check" v-if="chatEntryMode === 'list'">✓</span>
                    </div>
                </GlassCard>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import GlassCard from '@/components/ui/GlassCard.vue'
import SoftButton from '@/components/ui/SoftButton.vue'
import DreamInput from '@/components/ui/DreamInput.vue'

const wallpaper = ref('')
const wallpaperUrl = ref('')
const fontUrl = ref('')
const fontName = ref('')
const chatEntryMode = ref('direct')

onMounted(() => {
    // 加载已保存的设置
    wallpaper.value = localStorage.getItem('custom_wallpaper') || ''
    wallpaperUrl.value = wallpaper.value
    fontName.value = localStorage.getItem('custom_font_name') || ''
    fontUrl.value = localStorage.getItem('custom_font_url') || ''
    chatEntryMode.value = localStorage.getItem('chat_entry_mode') || 'direct'
})

function handleWallpaperUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
        wallpaperUrl.value = e.target.result
    }
    reader.readAsDataURL(file)
}

function applyWallpaper() {
    wallpaper.value = wallpaperUrl.value
    localStorage.setItem('custom_wallpaper', wallpaperUrl.value)
    // 应用到页面
    document.querySelector('.phone-screen').style.backgroundImage = `url(${wallpaperUrl.value})`
    document.querySelector('.phone-screen').style.backgroundSize = 'cover'
    document.querySelector('.phone-screen').style.backgroundPosition = 'center'
}

function clearWallpaper() {
    wallpaper.value = ''
    wallpaperUrl.value = ''
    localStorage.removeItem('custom_wallpaper')
    document.querySelector('.phone-screen').style.backgroundImage = ''
}

function handleFontUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
        fontUrl.value = e.target.result
        if (!fontName.value) {
            fontName.value = file.name.replace(/\.[^.]+$/, '')
        }
    }
    reader.readAsDataURL(file)
}

function applyFont() {
    if (!fontUrl.value || !fontName.value) return
    localStorage.setItem('custom_font_url', fontUrl.value)
    localStorage.setItem('custom_font_name', fontName.value)

    // 动态加载字体
    const style = document.createElement('style')
    style.textContent = `
        @font-face {
            font-family: '${fontName.value}';
            src: url('${fontUrl.value}');
        }
        html, body, #app, * {
            font-family: '${fontName.value}', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
    `
    document.head.appendChild(style)
}

function clearFont() {
    fontUrl.value = ''
    fontName.value = ''
    localStorage.removeItem('custom_font_url')
    localStorage.removeItem('custom_font_name')
    // 移除自定义字体样式
    document.querySelectorAll('style').forEach(s => {
        if (s.textContent.includes('@font-face')) s.remove()
    })
}

function setChatEntry(mode) {
    chatEntryMode.value = mode
    localStorage.setItem('chat_entry_mode', mode)
}
</script>

<style scoped>
.customize-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
}

.customize-header {
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
    opacity: 0.75;
}

.customize-header h2 {
    font-size: 15px;
    font-weight: 500;
    color: var(--color-text);
}

.customize-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px 0;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
}

.section-block {
    margin-bottom: 24px;
    animation: fadeIn 0.4s var(--ease-soft) backwards;
}

.section-block:nth-child(2) {
    animation-delay: 0.06s;
}

.section-block:nth-child(3) {
    animation-delay: 0.12s;
}

.section-label {
    font-size: 12px;
    color: var(--color-text-light);
    margin-bottom: 10px;
    font-weight: 400;
    letter-spacing: 0.5px;
}

.section-sub {
    font-size: 11px;
    color: var(--color-text-light);
    opacity: 0.5;
    margin-bottom: 12px;
    font-style: italic;
}

.wallpaper-preview {
    width: 100%;
    height: 120px;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 12px;
}

.wallpaper-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.file-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 0;
}

.file-label {
    font-size: 11px;
    color: var(--color-text-light);
    flex-shrink: 0;
}

.file-input {
    font-size: 11px;
    color: var(--color-text-light);
}

.btn-row {
    display: flex;
    gap: 8px;
    margin-top: 12px;
}

.preview-text {
    margin-top: 14px;
    padding: 12px;
    background: var(--color-bg);
    border-radius: 10px;
    font-size: 14px;
    color: var(--color-text);
    text-align: center;
}

/* 选项行 */
.option-row {
    display: flex;
    align-items: center;
    padding: 14px 0;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    transition: background 0.2s;
}

.option-row:last-child {
    border-bottom: none;
}

.option-row:active {
    background: rgba(212, 137, 158, 0.04);
}

.option-row.active {
    opacity: 1;
}

.option-row:not(.active) {
    opacity: 0.5;
}

.option-info {
    flex: 1;
}

.option-title {
    font-size: 14px;
    color: var(--color-text);
    font-weight: 400;
}

.option-desc {
    font-size: 11px;
    color: var(--color-text-light);
    margin-top: 2px;
}

.option-check {
    color: var(--color-primary);
    font-size: 16px;
}
</style>
