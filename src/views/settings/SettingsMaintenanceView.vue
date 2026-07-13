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
            <span class="settings-title">维护工具</span>
            <div style="width:36px;"></div>
        </div>

        <div class="sub-content">

            <!-- 同步状态（Personal 版才显示） -->
            <div v-if="showSyncStatus" class="section-label-sm" style="margin-top:12px;">同步状态</div>
            <div v-if="showSyncStatus" class="sync-status-card">
                <div class="sync-card-header">
                    <div class="sync-icon" :class="{ 'sync-spinning': isSyncing }">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <path d="M23 4v6h-6" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                    </div>
                    <div class="sync-card-text">
                        <span class="sync-card-title">{{ syncStatusText }}</span>
                        <span class="sync-card-sub">{{ syncSubText }}</span>
                    </div>
                </div>
                <button v-if="!isSyncing && pendingCount > 0" class="sync-upload-btn" @click="manualSync">
                    立即上传
                </button>
            </div>

            <div class="section-label-sm" style="margin-top:12px;">常规维护</div>
            <div class="settings-group">
                <div class="settings-group-item action-item" @click="forceRefreshPage">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #A8D8EA, #72c2e0);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <path d="M23 4v6h-6" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                    </div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">强制刷新页面</div>
                        <div class="sgi-desc">清除浏览器缓存并重新加载最新版本</div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        class="sgi-arrow">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
                <div class="settings-group-item action-item" @click="resetToCloud">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #B8D4C8, #8cc0a8);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                        </svg>
                    </div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">以云端为准</div>
                        <div class="sgi-desc">清除所有本地缓存，重新从云端加载数据</div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        class="sgi-arrow">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
            </div>

            <!-- 手动离线模式开关 -->
            <div class="settings-group-item">
                <div class="sgi-label-wrap">
                    <div class="sgi-label">手动离线模式</div>
                    <div class="sgi-desc">强制使用本地模式，请求全部入队等待云端恢复</div>
                </div>
                <label class="toggle-sm">
                    <input type="checkbox" v-model="manualOffline" @change="onManualOfflineChange" />
                    <span class="slider-sm"></span>
                </label>
            </div>

            <!-- 应急模式开关（仅在手动离线模式下可操作） -->
            <div class="settings-group-item" v-if="manualOffline">
                <div class="sgi-label-wrap">
                    <div class="sgi-label">应急模式：立即用简化AI回复</div>
                    <div class="sgi-desc">使用本地缓存的人设+记忆生成即时回复，不等待云端</div>
                </div>
                <label class="toggle-sm">
                    <input type="checkbox" v-model="emergencyMode" />
                    <span class="slider-sm"></span>
                </label>
            </div>

            <!-- 在手动离线模式/应急开关那一组下面 -->
            <div class="section-label-sm">应急数据同步</div>
            <div class="settings-group">
                <div class="settings-group-item col-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">上传应急对话</div>
                        <div class="sgi-desc">
                            将应急期间产生的对话同步到云端，用于记忆更新。建议在云端恢复后操作。
                        </div>
                    </div>
                    <button class="emergency-upload-btn" :disabled="uploading" @click="uploadEmergencyMessages">
                        {{ uploading ? '上传中...' : '上传应急对话' }}
                    </button>
                    <div v-if="uploadResult" class="upload-result">{{ uploadResult }}</div>
                </div>
            </div>

            <div class="section-label-sm">危险操作</div>
            <div class="settings-group">
                <div class="settings-group-item action-item danger-item" @click="nukeAllLocalData">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #E8A0A0, #d06060);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                    </div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label danger-label">强制删除所有本地数据</div>
                        <div class="sgi-desc">彻底清空本地存储、缓存，恢复初始状态</div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        class="sgi-arrow">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
            </div>

            <Transition name="toast-fade">
                <div v-if="toastMsg" class="result-bar" :class="toastSuccess ? 'success' : 'error'">
                    {{ toastMsg }}
                </div>
            </Transition>

        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { isCloudDown, pendingSyncCount, getPendingSync, api } from '@/utils/api'
import { manualOffline, setManualOffline, emergencyMode } from '@/utils/emergencyMode'
import { useChatStore } from '@/stores/chat'
import { useRoute } from 'vue-router'

const chatStore = useChatStore()
const route = useRoute()

const toastMsg = ref('')
const toastSuccess = ref(true)

function showToast(msg, success = true) {
    toastMsg.value = msg
    toastSuccess.value = success
    setTimeout(() => { toastMsg.value = '' }, 2500)
}

const isSyncing = ref(false)

const showSyncStatus = computed(() => {
    const mode = import.meta.env.VITE_APP_MODE || 'personal'
    return mode === 'personal' && (isCloudDown.value || pendingSyncCount.value > 0)
})

const pendingCount = computed(() => pendingSyncCount.value)

const syncStatusText = computed(() => {
    if (isSyncing.value) return '正在同步'
    if (isCloudDown.value) return '离线模式'
    if (pendingCount.value > 0) return `待同步 ${pendingCount.value} 条`
    return '同步正常'
})

const syncSubText = computed(() => {
    if (isSyncing.value) return '正在上传数据到云端...'
    if (isCloudDown.value && pendingCount.value > 0) return '云端不可用，数据已保存在本地'
    if (isCloudDown.value) return '云端暂时不可用'
    if (pendingCount.value > 0) return '点击按钮上传到云端'
    return '所有数据已同步'
})

function onManualOfflineChange() {
    setManualOffline(manualOffline.value);
}

async function manualSync() {
    if (isSyncing.value) return
    isSyncing.value = true
    try {
        const BASE = import.meta.env.VITE_API_URL || ''
        const pending = getPendingSync()
        let success = 0
        for (const item of pending) {
            try {
                const res = await fetch(`${BASE}${item.path}`, {
                    method: item.method || 'POST',
                    headers: { 'Content-Type': 'application/json', ...item.headers },
                    body: JSON.stringify(item.body)
                })
                if (res.ok) success++
                else break
            } catch { break }
        }
        if (success === pending.length) {
            localStorage.removeItem('melt_pending_sync')
            pendingSyncCount.value = 0
            showToast('全部同步完成 ✓')
        } else {
            const remaining = pending.slice(success)
            localStorage.setItem('melt_pending_sync', JSON.stringify(remaining))
            pendingSyncCount.value = remaining.length
            showToast(`已同步 ${success}/${pending.length} 条`)
        }
    } finally {
        isSyncing.value = false
    }
}

// ===== 新增：应急对话上传逻辑 =====
const uploading = ref(false)
const uploadResult = ref('')

async function uploadEmergencyMessages() {
    if (isCloudDown.value) {
        uploadResult.value = '云端仍不可用，请稍后再试。'
        return
    }

    const personaId = route.params.personaId
    if (!personaId) {
        uploadResult.value = '请先进入某个角色的聊天页面，再回来操作。'
        return
    }

    uploading.value = true
    uploadResult.value = ''
    try {
        const allMsgs = chatStore.allMessages || []
        // 过滤出应急期间的消息
        const emergencyMsgs = allMsgs.filter(m => m.source === 'emergency')
        if (emergencyMsgs.length === 0) {
            uploadResult.value = '没有应急消息需要上传。'
            uploading.value = false
            return
        }

        let uploaded = 0
        for (const msg of emergencyMsgs) {
            // 使用 api 函数发送消息，但加上 skip_ai_reply 标记以避免触发新回复
            // 如果你的后端不支持 skip_ai_reply，可以忽略这个字段，但可能会收到新回复
            await api(`/api/messages/${personaId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp,
                    skip_ai_reply: true,   // 如果你的后端不支持，可移除或忽略
                    source: 'emergency_sync'
                })
            })
            uploaded++
        }

        // 标记已上传（避免重复上传）
        emergencyMsgs.forEach(m => { m.source = 'emergency_synced' })
        // 更新本地缓存
        const { setCache } = await import('@/utils/cache')
        setCache(`messages_${personaId}`, allMsgs)

        uploadResult.value = `成功上传 ${uploaded} 条应急消息！记忆系统将在后台处理。`
    } catch (e) {
        console.error('上传应急消息失败:', e)
        uploadResult.value = '上传失败，请检查网络或稍后再试。'
    } finally {
        uploading.value = false
    }
}

// ===== 原有工具方法 =====
async function forceRefreshPage() {
    showToast('正在清除缓存...')
    try {
        if ('caches' in window) {
            const cacheNames = await caches.keys()
            await Promise.all(cacheNames.map(name => caches.delete(name)))
        }
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations()
            await Promise.all(registrations.map(r => r.unregister()))
        }
        setTimeout(() => { location.reload() }, 500)
    } catch (e) {
        location.reload()
    }
}

async function resetToCloud() {
    if (!confirm('此操作将清除所有本地存储数据，仅保留登录凭证，然后从云端重新加载。确定继续？')) return
    showToast('正在清除本地数据...')
    try {
        const preserveKeys = ['auth_token', 'user_id', 'login_token', 'token', 'userId']
        const preserved = {}
        preserveKeys.forEach(k => {
            const val = localStorage.getItem(k)
            if (val) preserved[k] = val
        })

        localStorage.clear()
        sessionStorage.clear()

        Object.entries(preserved).forEach(([k, v]) => {
            localStorage.setItem(k, v)
        })

        if ('caches' in window) {
            const cacheNames = await caches.keys()
            await Promise.all(cacheNames.map(name => caches.delete(name)))
        }

        showToast('本地数据已清除，正在从云端重新加载...')
        setTimeout(() => { location.reload() }, 1200)
    } catch (e) {
        showToast('操作失败: ' + e.message, false)
    }
}

async function nukeAllLocalData() {
    if (!confirm('⚠️ 危险操作：将彻底删除所有本地数据（包括登录状态），你需要重新登录。确定继续？')) return
    if (!confirm('再次确认：这将清空所有本地存储、缓存，不可恢复。确定？')) return

    try {
        localStorage.clear()
        sessionStorage.clear()

        if ('caches' in window) {
            const cacheNames = await caches.keys()
            await Promise.all(cacheNames.map(name => caches.delete(name)))
        }

        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations()
            await Promise.all(registrations.map(r => r.unregister()))
        }

        if ('indexedDB' in window) {
            const dbs = await indexedDB.databases?.() || []
            dbs.forEach(db => { if (db.name) indexedDB.deleteDatabase(db.name) })
        }

        alert('所有本地数据已清除，页面将重新加载。')
        location.reload()
    } catch (e) {
        alert('清除过程出错: ' + e.message + '，将强制刷新。')
        location.reload()
    }
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

.danger-item:active {
    background: rgba(208, 96, 0.06);
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

.sgi-icon-wrap svg {
    width: 16px;
    height: 16px;
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

.danger-label {
    color: #C06060;
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
}

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

.result-bar.error {
    color: #C07070;
    background: rgba(192, 112, 112, 0.1);
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

.sync-status-card {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 22px;
    padding: 16px;
    margin-bottom: 10px;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.sync-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.sync-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #F5EAD0, #e8d5a8);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.sync-icon {
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #F5EAD0, #e8d5a8);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
}

.sync-icon.sync-spinning svg {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

.sync-card-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.sync-card-title {
    font-size: 14px;
    font-weight: 600;
    color: #4A3F41;
}

.sync-card-sub {
    font-size: 11px;
    color: #B8A9AC;
}

.sync-upload-btn {
    width: 100%;
    padding: 10px;
    border-radius: 12px;
    border: none;
    background: linear-gradient(135deg, #7ed6a0, #5bc280);
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

.sync-upload-btn:active {
    transform: scale(0.98);
}

.emergency-upload-btn {
    margin-top: 10px;
    padding: 8px 20px;
    border: none;
    border-radius: 20px;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
}

.emergency-upload-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.upload-result {
    margin-top: 8px;
    font-size: 13px;
    color: #B8A9AC;
}
</style>
