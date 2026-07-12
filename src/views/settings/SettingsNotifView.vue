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
            <span class="settings-title">通知</span>
            <div style="width:36px;"></div>
        </div>

        <div class="sub-content">

            <!-- 主动消息 -->
            <div class="section-label-sm">主动消息</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">启用主动消息</div>
                        <div class="sgi-desc">让 char 在合适的时机主动发消息</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="proactive.enabled" @change="saveProactive" />
                        <span class="slider-sm"></span>
                    </label>
                </div>

                <template v-if="proactive.enabled">
                    <div class="settings-group-item">
                        <div class="sgi-label">启用角色</div>
                        <div class="sgi-right">
                            <span class="sgi-value">{{ proactive.enabledPersonas.length }} 个</span>
                        </div>
                    </div>
                    <div class="persona-checks-wrap">
                        <div v-for="p in personas" :key="p.id" class="persona-check-item"
                            :class="{ checked: proactive.enabledPersonas.includes(p.id) }" @click="togglePersona(p.id)">
                            <div class="pci-avatar">
                                <img v-if="p.avatarUrl" :src="p.avatarUrl" />
                                <span v-else>{{ p.avatar || '💬' }}</span>
                            </div>
                            <span class="pci-name">{{ p.note || p.name }}</span>
                            <div class="pci-check" :class="{ active: proactive.enabledPersonas.includes(p.id) }">
                                <svg v-if="proactive.enabledPersonas.includes(p.id)" viewBox="0 0 24 24" fill="none"
                                    stroke="white" stroke-width="3" stroke-linecap="round">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="settings-group-item">
                        <div class="sgi-label">发送间隔</div>
                        <div class="interval-row">
                            <input type="number" class="interval-input" v-model.number="proactive.intervalValue" min="1"
                                max="99" @change="saveProactive" />
                            <select class="interval-select" v-model="proactive.intervalUnit" @change="saveProactive">
                                <option value="minutes">分钟</option>
                                <option value="hours">小时</option>
                            </select>
                        </div>
                    </div>

                    <div class="settings-group-item">
                        <div class="sgi-label">每日最多</div>
                        <div class="interval-row">
                            <input type="number" class="interval-input" v-model.number="proactive.maxPerDay" min="1"
                                max="50" @change="saveProactive" />
                            <span class="interval-unit">次</span>
                        </div>
                    </div>

                    <div class="settings-group-item">
                        <div class="sgi-label">未互动提醒</div>
                        <div class="sgi-right">
                            <span class="sgi-value">{{ proactive.idleHours }} 小时</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" class="sgi-arrow">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </div>
                        <select class="sgi-select-hidden" v-model.number="proactive.idleHours" @change="saveProactive">
                            <option :value="1">1 小时</option>
                            <option :value="3">3 小时</option>
                            <option :value="6">6 小时</option>
                            <option :value="12">12 小时</option>
                            <option :value="24">24 小时</option>
                        </select>
                    </div>
                </template>
            </div>

            <!-- 后台保活 -->
            <div class="section-label-sm">后台保活</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">后台保活</div>
                        <div class="sgi-desc">防止 iOS/Android 杀后台，保持消息接收</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" :checked="keepAliveActive" @change="toggleKeepAlive" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">屏幕常亮</div>
                        <div class="sgi-desc">配合保活使用，防止屏幕休眠中断</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" :checked="wakeLockActive" @change="toggleWakeLock" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label" style="color: #B8A9AC; font-size: 12px;">
                        {{ keepAliveActive ? '✓ 保活运行中，可切换到后台' : '未启用，切换后台可能断开连接' }}
                    </div>
                </div>
            </div>

            <!-- 测试工具 -->
            <div class="section-label-sm">测试</div>
            <div class="settings-group">
                <div class="settings-group-item action-item" @click="testProactive">
                    <div class="sgi-label">测试主动消息</div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        class="sgi-arrow">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
                <div class="settings-group-item action-item" @click="testPush">
                    <div class="sgi-label">测试推送通知</div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        class="sgi-arrow">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
                <div class="settings-group-item action-item" @click="reRegisterPush">
                    <div class="sgi-label">重新注册推送</div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        class="sgi-arrow">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
            </div>

            <Transition name="toast-fade">
                <div v-if="resultMsg" class="result-bar" :class="resultSuccess ? 'success' : 'error'">
                    {{ resultMsg }}
                </div>
            </Transition>

        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { api } from '@/utils/api'
import { useWebSocket } from '@/composables/useWebSocket'
import { startKeepAlive, stopKeepAlive, requestWakeLock, isKeepAliveActive } from '@/composables/useBackgroundKeepAlive'

const { registerPushSubscription } = useWebSocket()

const proactive = reactive({
    enabled: true,
    idleHours: 12,
    maxPerDay: 3,
    intervalValue: 4,
    intervalUnit: 'hours',
    enabledPersonas: [],
})

const personas = ref([])
const resultMsg = ref('')
const resultSuccess = ref(true)

const keepAliveActive = ref(false)
const wakeLockActive = ref(false)
let wakeLockHandle = null

function toggleKeepAlive() {
    if (keepAliveActive.value) {
        stopKeepAlive()
        keepAliveActive.value = false
        localStorage.setItem('keep_alive_enabled', 'false')
        showResult('后台保活已关闭')
    } else {
        startKeepAlive()
        keepAliveActive.value = true
        localStorage.setItem('keep_alive_enabled', 'true')
        showResult('后台保活已启动 ✓')
    }
}

async function toggleWakeLock() {
    if (wakeLockActive.value) {
        if (wakeLockHandle) { await wakeLockHandle.release(); wakeLockHandle = null }
        wakeLockActive.value = false
        localStorage.setItem('wake_lock_enabled', 'false')
        showResult('屏幕常亮已关闭')
    } else {
        if ('wakeLock' in navigator) {
            try {
                wakeLockHandle = await navigator.wakeLock.request('screen')
                wakeLockActive.value = true
                localStorage.setItem('wake_lock_enabled', 'true')
                showResult('屏幕常亮已启动 ✓')
            } catch (e) {
                showResult('屏幕常亮不可用: ' + e.message, false)
            }
        } else {
            showResult('当前设备不支持屏幕常亮', false)
        }
    }
}

function showResult(msg, success = true) {
    resultMsg.value = msg
    resultSuccess.value = success
    setTimeout(() => { resultMsg.value = '' }, 3000)
}

async function saveProactive() {
    try {
        await api('/api/proactive/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...proactive })
        })
    } catch { }
}

function togglePersona(id) {
    const idx = proactive.enabledPersonas.indexOf(id)
    if (idx > -1) proactive.enabledPersonas.splice(idx, 1)
    else proactive.enabledPersonas.push(id)
    saveProactive()
}

async function testProactive() {
    try {
        const res = await api('/api/proactive/trigger', { method: 'POST' })
        const data = await res.json()
        showResult(data.success ? '主动消息触发成功 ✓' : '触发失败', data.success)
    } catch (e) {
        showResult('失败: ' + e.message, false)
    }
}

async function testPush() {
    try {
        const res = await api('/api/push/test', { method: 'POST' })
        const data = await res.json()
        showResult(data.subscribers > 0 ? `推送已发送给 ${data.subscribers} 个订阅者` : '没有订阅者', data.subscribers > 0)
    } catch (e) {
        showResult('失败: ' + e.message, false)
    }
}

async function reRegisterPush() {
    try {
        await api('/api/push/clear', { method: 'POST' })
        await registerPushSubscription()
        showResult('已重新注册推送 ✓', true)
    } catch (e) {
        showResult('失败: ' + e.message, false)
    }
}

onMounted(async () => {
    try {
        const pRes = await api('/api/prompts/personas')
        const pData = await pRes.json()
        personas.value = pData.personas || []

        const proRes = await api('/api/proactive/settings')
        const proData = await proRes.json()
        Object.assign(proactive, proData)
    } catch { }

    // 恢复保活状态
keepAliveActive.value = isKeepAliveActive()
wakeLockActive.value = localStorage.getItem('wake_lock_enabled') === 'true'

})
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
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
    position: relative;
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

.sgi-label {
    font-size: 14px;
    color: #4A3F41;
    flex-shrink: 0;
}

.sgi-label-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.sgi-desc {
    font-size: 11px;
    color: #B8A9AC;
}

.sgi-right {
    display: flex;
    align-items: center;
    gap: 4px;
}

.sgi-value {
    font-size: 13px;
    color: #B8A9AC;
}

.sgi-arrow {
    width: 14px;
    height: 14px;
    stroke: #D4C8CA;
}

.sgi-select-hidden {
    position: absolute;
    opacity: 0;
    right: 16px;
    width: 80px;
    height: 44px;
    cursor: pointer;
}

.toggle-sm {
    position: relative;
    width: 44px;
    height: 26px;
    flex-shrink: 0;
}

.toggle-sm input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider-sm {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(217, 163, 175, 0.2);
    border-radius: 13px;
    transition: 0.28s ease;
}

.slider-sm:before {
    position: absolute;
    content: "";
    height: 22px;
    width: 22px;
    left: 2px;
    bottom: 2px;
    background: white;
    border-radius: 50%;
    transition: 0.28s ease;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.toggle-sm input:checked+.slider-sm {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
}

.toggle-sm input:checked+.slider-sm:before {
    transform: translateX(18px);
}

/* 角色勾选 */
.persona-checks-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 16px 14px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
}

.persona-check-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(255, 240, 242, 0.5);
    cursor: pointer;
    transition: all 0.2s;
}

.persona-check-item.checked {
    background: rgba(232, 192, 201, 0.12);
    border-color: rgba(232, 192, 201, 0.35);
}

.pci-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(145deg, #FDE4E8, #F8D0D6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    overflow: hidden;
    flex-shrink: 0;
}

.pci-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.pci-name {
    font-size: 12px;
    color: #4A3F41;
    font-weight: 500;
}

.pci-check {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px solid rgba(217, 163, 175, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
}

.pci-check.active {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    border-color: transparent;
}

.pci-check svg {
    width: 10px;
    height: 10px;
}

/* 间隔输入 */
.interval-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.interval-input {
    width: 48px;
    height: 32px;
    border: 1px solid rgba(255, 240, 242, 0.6);
    background: rgba(255, 255, 255, 0.6);
    border-radius: 10px;
    padding: 0 8px;
    font-size: 13px;
    color: #4A3F41;
    outline: none;
    text-align: center;
    font-family: inherit;
}

.interval-select {
    border: 1px solid rgba(255, 240, 242, 0.6);
    background: rgba(255, 255, 255, 0.6);
    border-radius: 10px;
    padding: 5px 8px;
    font-size: 12px;
    color: #4A3F41;
    outline: none;
    font-family: inherit;
    -webkit-appearance: none;
    appearance: none;
}

.interval-unit {
    font-size: 12px;
    color: #B8A9AC;
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
</style>
