<template>
    <div class="sub-page">
        <div class="settings-blob sb-tl"></div>
        <div class="settings-blob sb-br"></div>

        <div class="settings-nav">
            <button class="settings-back" @click="$router.push('/settings')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <span class="settings-title">使用说明</span>
            <div style="width:36px;"></div>
        </div>

        <div class="sub-content">

            <!-- 更新公告 -->
            <div class="section-label-sm" style="margin-top:12px;">最近更新</div>
            <div class="guide-card">
                <div class="update-header">
                    <span class="update-version">v{{ appVersion }}</span>
                    <span class="update-date">{{ updateDate }}</span>
                </div>
                <ul class="update-list">
                    <li v-for="(item, idx) in changelog" :key="idx">{{ item }}</li>
                </ul>
            </div>

            <!-- 使用文档 -->
            <div class="section-label-sm">使用指南</div>
            <div class="settings-group">
                <div v-for="doc in docs" :key="doc.key" class="settings-group-item action-item"
                    @click="expandedDoc = expandedDoc === doc.key ? null : doc.key">
                    <div class="sgi-icon-wrap" :style="{ background: doc.gradient }">
                        <span style="font-size:14px;">{{ doc.emoji }}</span>
                    </div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">{{ doc.title }}</div>
                        <div class="sgi-desc">{{ doc.subtitle }}</div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        class="sgi-arrow" :class="{ 'arrow-expanded': expandedDoc === doc.key }">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
            </div>

            <!-- 展开的文档内容 -->
            <Transition name="expand-fade">
                <div v-if="expandedDoc" class="guide-card doc-content">
                    <div v-html="currentDocContent"></div>
                </div>
            </Transition>

            <!-- 快捷链接 -->
            <div class="section-label-sm">反馈与支持</div>
            <div class="settings-group">
                <div class="settings-group-item action-item" @click="copyContact">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #E8C0C9, #d4899e);">
                        <span style="font-size:14px;">💌</span>
                    </div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">联系开发者</div>
                        <div class="sgi-desc">复制联系方式到剪贴板</div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        class="sgi-arrow">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
                <div class="settings-group-item action-item" @click="reportBug">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #F5EAD0, #e8d5a8);">
                        <span style="font-size:14px;">🐛</span>
                    </div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">报告问题</div>
                        <div class="sgi-desc">发送错误日志与设备信息</div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        class="sgi-arrow">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
            </div>

            <!-- 应用信息 -->
            <div class="app-info-footer">
                <div class="app-info-name">Melt</div>
                <div class="app-info-version">版本 {{ appVersion }} · {{ buildVariant }}</div>
            </div>

            <Transition name="toast-fade">
                <div v-if="toastMsg" class="result-bar success">{{ toastMsg }}</div>
            </Transition>

        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const expandedDoc = ref(null)
const toastMsg = ref('')

// 应用信息
const appVersion = ref('1.2.0')
const updateDate = ref('2025-01-15')
const buildVariant = computed(() => {
    const variant = import.meta.env.VITE_APP_VARIANT || 'personal'
    const map = { personal: 'Personal', local: 'Local', lite: 'Lite' }
    return map[variant] || variant
})

// 更新日志
const changelog = ref([
    '修复 WebSocket 连接问题',
    '新增存储空间维护工具',
    '添加使用说明页面',
    '优化消息发送稳定性',
])

// 文档列表
const docs = ref([
    {
        key: 'quickstart',
        emoji: '🚀',
        title: '快速开始',
        subtitle: '首次使用的基本设置',
        gradient: 'linear-gradient(135deg, #98CBEA, #70b0d8)',
        content: `
            <h4>1. 配置 API</h4>
            <p>进入 设置 → 蓝牙（API配置），填写你的 API Key 和模型名称。支持 OpenAI 兼容格式的任意接口。</p>
            <h4>2. 选择角色</h4>
            <p>在首页点击角色头像可以切换不同人格。系统内置了几个角色，你也可以自定义。</p>
            <h4>3. 开始对话</h4>
            <p>一切准备就绪，直接发消息即可。消息会自动同步到云端。</p>
        `
    },
    {
        key: 'personas',
        emoji: '🎭',
        title: '角色与人格',
        subtitle: '如何创建和管理 AI 角色',
        gradient: 'linear-gradient(135deg, #D8CDEA, #b8a8d8)',
        content: `
            <h4>内置角色</h4>
            <p>系统预设了多个角色，每个角色有独立的性格、记忆和对话风格。</p>
            <h4>自定义角色</h4>
            <p>在首页长按角色列表底部的"+"按钮，可以创建自定义角色。支持设置名称、头像、系统提示词等。</p>
            <h4>世界书</h4>
            <p>世界书可以为角色补充背景设定，当对话触发关键词时自动注入上下文。</p>
        `
    },
    {
        key: 'memory',
        emoji: '🧠',
        title: '记忆系统',
        subtitle: '了解 AI 如何记住你',
        gradient: 'linear-gradient(135deg, #F5EAD0, #e8d5a8)',
        content: `
            <h4>自动记忆</h4>
            <p>对话过程中，系统会自动提取重要信息存入记忆。记忆按情感权重排序，越重要的记忆越容易被想起。</p>
            <h4>记忆整理</h4>
            <p>系统会定期对记忆进行压缩整理，合并相似记忆、淡化过时信息。</p>
            <h4>手动管理</h4>
            <p>你可以在角色详情页查看和编辑记忆，删除不需要的条目。</p>
        `
    },
    {
        key: 'storage',
        emoji: '💾',
        title: '数据与同步',
        subtitle: '本地缓存和云端备份',
        gradient: 'linear-gradient(135deg, #B8D4C8, #8cc0a8)',
        content: `
            <h4>本地缓存</h4>
            <p>为了提升加载速度，应用会在本地缓存部分数据。当云端数据更新时会自动同步。</p>
            <h4>导出/导入</h4>
            <p>在 设置 → 存储空间 可以导出所有数据为 JSON 文件，也可以从备份文件恢复。</p>
            <h4>故障恢复</h4>
            <p>如果遇到数据异常，可以使用"以云端为准"或"强制刷新"来恢复正常状态。</p>
        `
    },
])

const currentDocContent = computed(() => {
    const doc = docs.value.find(d => d.key === expandedDoc.value)
    return doc ? doc.content : ''
})

function copyContact() {
    navigator.clipboard?.writeText('（开发者联系方式）').then(() => {
        showToast('已复制到剪贴板 ✓')
    }).catch(() => {
        showToast('复制失败，请手动记录')
    })
}

function reportBug() {
    const info = {
        userAgent: navigator.userAgent,
        variant: import.meta.env.VITE_APP_VARIANT || 'unknown',
        version: appVersion.value,
        screen: `${screen.width}x${screen.height}`,
        localStorage_keys: Object.keys(localStorage).length,
        timestamp: new Date().toISOString(),
    }
    navigator.clipboard?.writeText(JSON.stringify(info, null, 2)).then(() => {
        showToast('设备信息已复制，请发送给开发者 ✓')
    }).catch(() => {
        showToast('复制失败')
    })
}

function showToast(msg) {
    toastMsg.value = msg
    setTimeout(() => { toastMsg.value = '' }, 2500)
}
</script>

<style scoped>
.sub-page {
    width: 100%;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background: linear-gradient(180deg, #FFFBFA 0%, #FFF0F2 60%, #FFE9ED 100%);
    box-sizing: border-box;
}

.settings-blob {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    filter: blur(60px);
}

.sb-tl {
    top: -40px;
    left: -50px;
    width: 220px;
    height: 220px;
    background: #F1DADD;
    opacity: 0.45;
}

.sb-br {
    bottom: 40px;
    right: -60px;
    width: 200px;
    height: 200px;
    background: #98CBEA;
    opacity: 0.2;
}

.settings-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px 4px;
    flex-shrink: 0;
    position: relative;
    z-index: 2;
}

.settings-back {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: saturate(180%) blur(12px);
    -webkit-backdrop-filter: saturate(180%) blur(12px);
    border: 1px solid rgba(255, 240, 242, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(217, 163, 175, 0.08);
}

.settings-back svg {
    width: 16px;
    height: 16px;
    stroke: #D9A3AF;
}

.settings-title {
    font-size: 17px;
    font-weight: 800;
    color: #4A3F41;
}

.sub-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 32px);
    position: relative;
    z-index: 1;
}

.sub-content::-webkit-scrollbar {
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

/* 卡片 */
.guide-card {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 22px;
    padding: 18px 16px;
    margin-bottom: 10px;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.update-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.update-version {
    font-size: 14px;
    font-weight: 700;
    color: #4A3F41;
    background: linear-gradient(135deg, #E8C0C9, #D8CDEA);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.update-date {
    font-size: 11px;
    color: #B8A9AC;
}

.update-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.update-list li {
    font-size: 13px;
    color: #6B5B5E;
    padding: 5px 0;
    padding-left: 16px;
    position: relative;
}

.update-list li::before {
    content: '•';
    position: absolute;
    left: 0;
    color: #D9A3AF;
    font-weight: 700;
}

/* 分组 */
.settings-group {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 22px;
    overflow: hidden;
    margin-bottom: 10px;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.settings-group-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
}

.settings-group-item:last-child {
    border-bottom: none;
}

.action-item {
    cursor: pointer;
    transition: background 0.15s;
}

.action-item:active {
    background: rgba(217, 163, 175, 0.06);
}

.sgi-icon-wrap {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.sgi-label-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.sgi-label {
    font-size: 14px;
    color: #4A3F41;
}

.sgi-desc {
    font-size: 11px;
    color: #B8A9AC;
}

.sgi-arrow {
    width: 14px;
    height: 14px;
    stroke: #D4C8CA;
    flex-shrink: 0;
    transition: transform 0.25s ease;
}

.arrow-expanded {
    transform: rotate(90deg);
}

/* 文档展开内容 */
.doc-content {
    font-size: 13px;
    color: #6B5B5E;
    line-height: 1.7;
}

.doc-content :deep(h4) {
    font-size: 13px;
    font-weight: 700;
    color: #4A3F41;
    margin: 14px 0 6px;
}

.doc-content :deep(h4:first-child) {
    margin-top: 0;
}

.doc-content :deep(p) {
    margin: 0 0 8px;
}

/* 底部信息 */
.app-info-footer {
    text-align: center;
    padding: 28px 0 12px;
}

.app-info-name {
    font-size: 16px;
    font-weight: 800;
    background: linear-gradient(135deg, #E8C0C9, #D8CDEA);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.app-info-version {
    font-size: 11px;
    color: #B8A9AC;
    margin-top: 4px;
}

/* Toast */
.result-bar {
    padding: 10px 14px;
    border-radius: 14px;
    font-size: 12px;
    margin-top: 8px;
}

.result-bar.success {
    color: #6BAF7A;
    background: rgba(107, 175, 122, 0.1);
}

.toast-fade-enter-active {
    transition: opacity 0.3s;
}

.toast-fade-leave-active {
    transition: opacity 0.5s;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
    opacity: 0;
}

.expand-fade-enter-active {
    transition: opacity 0.3s ease, max-height 0.3s ease;
}

.expand-fade-leave-active {
    transition: opacity 0.2s ease, max-height 0.2s ease;
}

.expand-fade-enter-from,
.expand-fade-leave-to {
    opacity: 0;
}
</style>
