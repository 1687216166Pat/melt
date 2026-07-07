<template>
    <div class="cz-page">
        <div class="cz-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <div class="cz-header-title">
                <span class="cz-title">美化</span>
                <span class="cz-subtitle">Customize</span>
            </div>
        </div>

        <div class="cz-content">

            <!-- 主屏幕壁纸 -->
            <div class="section-label-sm">主屏幕壁纸</div>
            <div class="cz-card">
                <div class="wallpaper-preview" v-if="wallpaper">
                    <img :src="wallpaper" />
                </div>
                <div class="cz-row col">
                    <span class="cz-label">图片 URL</span>
                    <input class="cz-input" v-model="wallpaperUrl" placeholder="https://..." />
                </div>
                <div class="cz-row">
                    <span class="cz-label">或上传文件</span>
                    <label class="upload-btn">
                        选择图片
                        <input type="file" accept="image/*" style="display:none" @change="handleWallpaperUpload" />
                    </label>
                </div>
                <div class="cz-row" style="position:relative;">
                    <span class="cz-label">壁纸范围</span>
                    <div class="cz-right">
                        <span class="cz-value">{{ wallpaperScope === 'home' ? '仅主屏幕' : '全局生效' }}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="cz-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                    <select class="cz-select-hidden" v-model="wallpaperScope" @change="saveWallpaperScope">
                        <option value="home">仅主屏幕</option>
                        <option value="global">全局生效</option>
                    </select>
                </div>
                <div class="btn-row">
                    <button class="action-btn primary" @click="applyWallpaper">应用</button>
                    <button class="action-btn ghost" @click="clearWallpaper">清除</button>
                </div>
            </div>

            <!-- App 图标 -->
            <div class="section-label-sm">App 图标</div>
            <div class="cz-card">
                <div class="icon-grid">
                    <div v-for="app in appIcons" :key="app.id" class="icon-item">
                        <div class="icon-preview">
                            <img v-if="app.customIcon" :src="app.customIcon" />
                            <span v-else>{{ app.emoji }}</span>
                        </div>
                        <span class="icon-name">{{ app.name }}</span>
                        <input type="file" accept="image/*" style="display:none"
                            :ref="el => { if (el) fileInputs[app.id] = el }"
                            @change="(e) => handleIconUpload(e, app.id)" />
                        <button class="icon-change-btn" @click="fileInputs[app.id]?.click()">换</button>
                    </div>
                </div>
                <button v-if="hasCustomIcons" class="action-btn ghost" style="width:100%;margin-top:16px;"
                    @click="clearAllIcons">
                    恢复默认图标
                </button>
            </div>

            <!-- 全局字体 -->
            <div class="section-label-sm">全局字体</div>
            <div class="cz-card">
                <div class="cz-row col">
                    <span class="cz-label">字体 URL（.woff2 / .ttf）</span>
                    <input class="cz-input" v-model="fontUrl" placeholder="https://..." />
                </div>
                <div class="cz-row">
                    <span class="cz-label">或上传字体文件</span>
                    <label class="upload-btn">
                        选择文件
                        <input type="file" accept=".woff2,.woff,.ttf,.otf" style="display:none"
                            @change="handleFontUpload" />
                    </label>
                </div>
                <div class="cz-row col">
                    <span class="cz-label">字体名称</span>
                    <input class="cz-input" v-model="fontName" placeholder="例：My Font" />
                </div>
                <p class="font-preview" :style="{ fontFamily: fontName || 'inherit' }">
                    字体预览：你好世界 Hello World
                </p>
                <div class="btn-row">
                    <button class="action-btn primary" @click="applyFont">应用</button>
                    <button class="action-btn ghost" @click="clearFont">恢复默认</button>
                </div>
            </div>

            <!-- 聊天入口 -->
            <div class="section-label-sm">聊天入口行为</div>
            <div class="cz-card">
                <div class="option-row" :class="{ active: chatEntryMode === 'direct' }" @click="setChatEntry('direct')">
                    <div class="option-info">
                        <p class="option-title">直接进入对话</p>
                        <p class="option-desc">打开最近聊天的 AI 对话</p>
                    </div>
                    <svg v-if="chatEntryMode === 'direct'" viewBox="0 0 24 24" fill="none" stroke="#D9A3AF"
                        stroke-width="2.5" stroke-linecap="round" class="option-check-svg">
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                </div>
                <div class="option-row" :class="{ active: chatEntryMode === 'list' }" @click="setChatEntry('list')">
                    <div class="option-info">
                        <p class="option-title">显示联系人列表</p>
                        <p class="option-desc">先选择要聊天的 AI</p>
                    </div>
                    <svg v-if="chatEntryMode === 'list'" viewBox="0 0 24 24" fill="none" stroke="#D9A3AF"
                        stroke-width="2.5" stroke-linecap="round" class="option-check-svg">
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                </div>
            </div>

            <!-- 我的方案 -->
            <div class="section-label-sm">我的方案</div>
            <div class="cz-card">
                <div v-if="schemes.length > 0" class="scheme-list">
                    <div v-for="(scheme, idx) in schemes" :key="idx" class="scheme-item"
                        :class="{ active: currentScheme === idx }" @click="applyScheme(idx)">
                        <span class="scheme-name">{{ scheme.name }}</span>
                        <button class="scheme-del" @click.stop="deleteScheme(idx)">×</button>
                    </div>
                </div>
                <div class="cz-row" style="margin-top:10px;gap:8px;">
                    <input class="cz-input" v-model="newSchemeName" placeholder="保存当前设置为方案" style="flex:1;" />
                    <button class="action-btn primary" style="width:80px;height:38px;flex:none;"
                        @click="saveCurrentAsScheme">保存</button>
                </div>
            </div>

            <!-- 自定义样式 -->
            <div class="section-label-sm">自定义样式</div>
            <div class="cz-card">
                <p class="cz-hint">直接写 CSS 代码，可美化气泡、卡片、全局配色等</p>
                <textarea class="cz-textarea" v-model="customCSS" rows="10" placeholder="/* 例如 */
.bubble-wrapper.ai .bubble {
    background: rgba(255,200,200,0.2);
    border-radius: 20px;
}"></textarea>
                <div class="btn-row">
                    <button class="action-btn primary" @click="applyCustomCSS">应用</button>
                    <button class="action-btn ghost" @click="clearCustomCSS">清除</button>
                </div>
            </div>

        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const wallpaper = ref('')
const wallpaperUrl = ref('')
const fontUrl = ref('')
const fontName = ref('')
const chatEntryMode = ref('direct')
const wallpaperScope = ref('home')
const fileInputs = ref({})
const schemes = ref([])
const currentScheme = ref(-1)
const newSchemeName = ref('')
const customCSS = ref('')

const appIcons = ref([
    { id: 'about', name: '关于他', emoji: '💕', customIcon: '' },
    { id: 'brain', name: '记忆库', emoji: '🧠', customIcon: '' },
    { id: 'logs', name: '语料库', emoji: '📋', customIcon: '' },
    { id: 'customize', name: '美化', emoji: '🎨', customIcon: '' },
    { id: 'worldbook', name: '世界书', emoji: '📖', customIcon: '' },
    { id: 'diary', name: '日记', emoji: '📝', customIcon: '' },
    { id: 'presence', name: '相遇', emoji: '📍', customIcon: '' },
    { id: 'settings', name: '设置', emoji: '⚙️', customIcon: '' },
    { id: 'pomodoro', name: '番茄钟', emoji: '🍅', customIcon: '' },
    { id: 'wishes', name: '心愿单', emoji: '💝', customIcon: '' },
    { id: 'dock_habitat', name: 'Dock·共栖', emoji: '🏡', customIcon: '' },
    { id: 'dock_home', name: 'Dock·小窝', emoji: '🏠', customIcon: '' },
    { id: 'dock_echoes', name: 'Dock·共语', emoji: '💬', customIcon: '' },
])

const hasCustomIcons = computed(() => appIcons.value.some(a => a.customIcon))

onMounted(() => {
    wallpaper.value = localStorage.getItem('custom_wallpaper') || ''
    wallpaperUrl.value = wallpaper.value
    fontName.value = localStorage.getItem('custom_font_name') || ''
    fontUrl.value = localStorage.getItem('custom_font_url') || ''
    chatEntryMode.value = localStorage.getItem('chat_entry_mode') || 'direct'
    wallpaperScope.value = localStorage.getItem('wallpaper_scope') || 'home'

    const savedIcons = localStorage.getItem('custom_app_icons')
    if (savedIcons) {
        const icons = JSON.parse(savedIcons)
        appIcons.value.forEach(app => {
            if (icons[app.id]) app.customIcon = icons[app.id]
        })
    }

    const savedSchemes = localStorage.getItem('beauty_schemes')
    if (savedSchemes) schemes.value = JSON.parse(savedSchemes)

    customCSS.value = localStorage.getItem('custom_css') || ''
    if (customCSS.value) applyCustomCSS()
})

function handleWallpaperUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => {
        img.onload = () => {
            const canvas = document.createElement('canvas')
            const maxSize = 800
            let w = img.width, h = img.height
            if (w > maxSize || h > maxSize) {
                if (w > h) { h = h * maxSize / w; w = maxSize }
                else { w = w * maxSize / h; h = maxSize }
            }
            canvas.width = w; canvas.height = h
            canvas.getContext('2d').drawImage(img, 0, 0, w, h)
            wallpaperUrl.value = canvas.toDataURL('image/jpeg', 0.7)
            applyWallpaper()
        }
        img.src = e.target.result
    }
    reader.readAsDataURL(file)
}

function applyWallpaper() {
    wallpaper.value = wallpaperUrl.value
    localStorage.setItem('custom_wallpaper', wallpaperUrl.value)
    localStorage.setItem('wallpaper_scope', wallpaperScope.value)
    setTimeout(() => {
        const screen = document.querySelector('.phone-screen') || document.querySelector('.home-screen')
        if (screen) {
            screen.style.backgroundImage = `url(${wallpaperUrl.value})`
            screen.style.backgroundSize = 'cover'
            screen.style.backgroundPosition = 'center'
        }
    }, 100)
}

function clearWallpaper() {
    wallpaper.value = ''
    wallpaperUrl.value = ''
    localStorage.removeItem('custom_wallpaper')
    const screen = document.querySelector('.phone-screen') || document.querySelector('.home-screen')
    if (screen) screen.style.backgroundImage = ''
}

function saveWallpaperScope() {
    localStorage.setItem('wallpaper_scope', wallpaperScope.value)
}

function handleFontUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
        alert('字体文件过大（超过2MB），请使用 URL 方式加载')
        return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
        fontUrl.value = e.target.result
        if (!fontName.value) fontName.value = file.name.replace(/\.[^.]+$/, '')
    }
    reader.readAsDataURL(file)
}

function applyFont() {
    if (!fontUrl.value || !fontName.value) return
    localStorage.setItem('custom_font_url', fontUrl.value)
    localStorage.setItem('custom_font_name', fontName.value)
    const old = document.getElementById('custom-font-style')
    if (old) old.remove()
    const style = document.createElement('style')
    style.id = 'custom-font-style'
    style.textContent = `
        @font-face {
            font-family: '${fontName.value}';
            src: url('${fontUrl.value}') format('woff2'), url('${fontUrl.value}');
            font-display: swap;
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
    const old = document.getElementById('custom-font-style')
    if (old) old.remove()
}

function setChatEntry(mode) {
    chatEntryMode.value = mode
    localStorage.setItem('chat_entry_mode', mode)
}

function handleIconUpload(event, appId) {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
        const app = appIcons.value.find(a => a.id === appId)
        if (app) app.customIcon = e.target.result
        saveIcons()
    }
    reader.readAsDataURL(file)
}

function saveIcons() {
    const icons = {}
    appIcons.value.forEach(app => { if (app.customIcon) icons[app.id] = app.customIcon })
    localStorage.setItem('custom_app_icons', JSON.stringify(icons))
}

function clearAllIcons() {
    appIcons.value.forEach(app => app.customIcon = '')
    localStorage.removeItem('custom_app_icons')
}

function saveCurrentAsScheme() {
    if (!newSchemeName.value.trim()) return
    schemes.value.push({
        name: newSchemeName.value.trim(),
        wallpaper: wallpaper.value,
        wallpaperScope: wallpaperScope.value,
        fontUrl: fontUrl.value,
        fontName: fontName.value,
        customCSS: customCSS.value,
        icons: JSON.parse(localStorage.getItem('custom_app_icons') || '{}'),
    })
    currentScheme.value = schemes.value.length - 1
    localStorage.setItem('beauty_schemes', JSON.stringify(schemes.value))
    newSchemeName.value = ''
}

function applyScheme(idx) {
    const scheme = schemes.value[idx]
    currentScheme.value = idx
    if (scheme.wallpaper) {
        wallpaper.value = scheme.wallpaper
        wallpaperUrl.value = scheme.wallpaper
        applyWallpaper()
    } else {
        clearWallpaper()
    }
    if (scheme.fontUrl && scheme.fontName) {
        fontUrl.value = scheme.fontUrl
        fontName.value = scheme.fontName
        applyFont()
    } else {
        clearFont()
    }
    if (scheme.icons) localStorage.setItem('custom_app_icons', JSON.stringify(scheme.icons))
    if (scheme.customCSS) {
        customCSS.value = scheme.customCSS
        applyCustomCSS()
    } else {
        clearCustomCSS()
    }
}

function deleteScheme(idx) {
    schemes.value.splice(idx, 1)
    localStorage.setItem('beauty_schemes', JSON.stringify(schemes.value))
    if (currentScheme.value >= schemes.value.length) currentScheme.value = -1
}

function applyCustomCSS() {
    localStorage.setItem('custom_css', customCSS.value)
    const old = document.getElementById('custom-user-css')
    if (old) old.remove()
    if (customCSS.value.trim()) {
        const style = document.createElement('style')
        style.id = 'custom-user-css'
        style.textContent = customCSS.value
        document.head.appendChild(style)
    }
}

function clearCustomCSS() {
    customCSS.value = ''
    localStorage.removeItem('custom_css')
    const old = document.getElementById('custom-user-css')
    if (old) old.remove()
}
</script>

<style scoped>
.cz-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
    overflow-x: hidden;
}

.cz-header {
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

.cz-header-title {
    flex: 1;
    display: flex;
    align-items: baseline;
    gap: 8px;
}

.cz-title {
    font-size: 22px;
    font-weight: 800;
    color: #4A3F41;
    letter-spacing: 0.3px;
}

.cz-subtitle {
    font-size: 11px;
    color: #B8A9AC;
    font-weight: 400;
    letter-spacing: 1.5px;
}

.cz-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
}

.cz-content::-webkit-scrollbar {
    display: none;
}

.section-label-sm {
    font-size: 11px;
    font-weight: 700;
    color: #B8A9AC;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    padding: 0 4px 8px;
    margin-top: 20px;
    display: block;
}

.cz-card {
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 22px;
    padding: 16px;
    margin-bottom: 10px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.cz-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
}

.cz-row:last-child {
    border-bottom: none;
}

.cz-row.col {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
}

.cz-label {
    font-size: 13px;
    color: #4A3F41;
    flex-shrink: 0;
}

.cz-input {
    width: 100%;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.5);
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 13px;
    color: #4A3F41;
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
}

.cz-input::placeholder {
    color: #D4C8CA;
}

.cz-right {
    display: flex;
    align-items: center;
    gap: 4px;
}

.cz-value {
    font-size: 13px;
    color: #B8A9AC;
}

.cz-arrow {
    width: 14px;
    height: 14px;
    stroke: #D4C8CA;
}

.cz-select-hidden {
    position: absolute;
    opacity: 0;
    right: 0;
    width: 120px;
    height: 44px;
    cursor: pointer;
}

.cz-textarea {
    width: 100%;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.5);
    border-radius: 14px;
    padding: 12px 14px;
    font-size: 12px;
    color: #4A3F41;
    font-family: monospace;
    resize: none;
    outline: none;
    line-height: 1.6;
    box-sizing: border-box;
}

.cz-textarea::placeholder {
    color: #D4C8CA;
}

.cz-hint {
    font-size: 11px;
    color: #B8A9AC;
    margin-bottom: 10px;
    line-height: 1.5;
}

.upload-btn {
    padding: 6px 14px;
    border-radius: 10px;
    border: 1px solid rgba(217, 163, 175, 0.3);
    background: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    color: #6B5B5E;
    cursor: pointer;
    white-space: nowrap;
}

.wallpaper-preview {
    width: 100%;
    height: 120px;
    border-radius: 14px;
    overflow: hidden;
    margin-bottom: 12px;
}

.wallpaper-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.font-preview {
    margin-top: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.4);
    border-radius: 10px;
    font-size: 14px;
    color: #4A3F41;
    text-align: center;
}

.btn-row {
    display: flex;
    gap: 8px;
    margin-top: 12px;
}

.action-btn {
    flex: 1;
    height: 40px;
    border-radius: 14px;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.action-btn.primary {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    box-shadow: 0 4px 12px rgba(217, 163, 175, 0.3);
}

.action-btn.ghost {
    background: rgba(255, 255, 255, 0.5);
    color: #6B5B5E;
    border: 1px solid rgba(217, 163, 175, 0.2);
}

.action-btn:active {
    transform: scale(0.97);
}

.icon-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    padding: 4px 0;
}

.icon-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
}

.icon-preview {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: rgba(255, 233, 237, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    overflow: hidden;
    border: 1px solid rgba(217, 163, 175, 0.15);
}

.icon-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 14px;
}

.icon-name {
    font-size: 10px;
    color: #B8A9AC;
    text-align: center;
}

.icon-change-btn {
    background: none;
    border: 1px solid rgba(217, 163, 175, 0.3);
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 10px;
    color: #D9A3AF;
    cursor: pointer;
}

.option-row {
    display: flex;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
    cursor: pointer;
    transition: opacity 0.2s;
}

.option-row:last-child {
    border-bottom: none;
}

.option-row:not(.active) {
    opacity: 0.45;
}

.option-info {
    flex: 1;
}

.option-title {
    font-size: 14px;
    color: #4A3F41;
    font-weight: 500;
}

.option-desc {
    font-size: 11px;
    color: #B8A9AC;
    margin-top: 2px;
}

.option-check-svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
}

.scheme-list {
    margin-bottom: 4px;
}

.scheme-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 12px;
    margin-bottom: 6px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(217, 163, 175, 0.15);
    transition: all 0.2s;
}

.scheme-item.active {
    border-color: rgba(217, 163, 175, 0.5);
    background: rgba(217, 163, 175, 0.08);
}

.scheme-item:active {
    transform: scale(0.98);
}

.scheme-name {
    font-size: 13px;
    color: #4A3F41;
}

.scheme-del {
    background: none;
    border: none;
    font-size: 16px;
    color: #B8A9AC;
    cursor: pointer;
    padding: 0 4px;
    opacity: 0.5;
}
</style>
