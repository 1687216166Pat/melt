<template>
    <div class="phone-screen" :class="[period, envClass]" :style="envStyle">
        <div class="bg-decor">
            <div class="decor-circle c1"></div>
            <div class="decor-circle c2"></div>
            <div class="decor-circle c3"></div>
        </div>
        <!-- 环境低语 -->
        <transition name="whisper">
            <p v-if="showWhisper && envWhisper" class="env-whisper">{{ envWhisper }}</p>
        </transition>
        <NotificationBanner />
        <main class="screen-content">
            <RouterView />
        </main>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import NotificationBanner from '@/components/NotificationBanner.vue'
import { useWebSocket } from '@/composables/useWebSocket'
import { useTime } from '@/composables/useTime'
import { useDeviceStatus } from '@/composables/useDeviceStatus'
import { api } from '@/utils/api'

const { connect, requestNotificationPermission, registerPushSubscription } = useWebSocket()
const { period, startClock, stopClock } = useTime()
const { startReporting, stopReporting } = useDeviceStatus()

// 环境状态
const envData = ref({
    warmth: 0.3,
    floatSpeed: 1,
    blurIntensity: 1,
    presence: 'normal',
})
const envWhisper = ref('')
const showWhisper = ref(false)

const envClass = computed(() => {
    return `env-${envData.value.presence}`
})

const envStyle = computed(() => {
    const d = envData.value
    return {
        '--env-warmth': d.warmth,
        '--env-float-speed': d.floatSpeed,
        '--env-blur': d.blurIntensity,
        '--decor-opacity': 0.2 + d.warmth * 0.2,
        '--decor-scale': 0.9 + d.warmth * 0.2,
    }
})

async function loadEnvironment() {
    try {
        const pRes = await api('/api/prompts/personas')
        const pData = await pRes.json()
        const activeId = pData.active || 'xiaorou'

        const res = await api(`/api/environment/${activeId}`)
        const data = await res.json()
        envData.value = {
            warmth: data.warmth || 0.3,
            floatSpeed: data.floatSpeed || 1,
            blurIntensity: data.blurIntensity || 1,
            presence: data.presence || 'normal',
        }
        envWhisper.value = data.whisper || ''

        // 显示低语（延迟出现，缓慢消失）
        if (envWhisper.value) {
            setTimeout(() => { showWhisper.value = true }, 2000)
            setTimeout(() => { showWhisper.value = false }, 8000)
        }
    } catch { }
}

let envInterval = null

onMounted(() => {
    connect()
    requestNotificationPermission()
    registerPushSubscription()
    startClock()
    startReporting()
    loadEnvironment()
    envInterval = setInterval(loadEnvironment, 10 * 60 * 1000) // 每10分钟
})

onUnmounted(() => {
    stopClock()
    stopReporting()
    if (envInterval) clearInterval(envInterval)
})
</script>

<style scoped>
.phone-screen {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    transition: background 2s var(--ease-soft);
}

.phone-screen.morning {
    background: linear-gradient(180deg, #fff8fa 0%, #fdf6f8 40%);
}

.phone-screen.forenoon {
    background: var(--color-bg);
}

.phone-screen.noon {
    background: linear-gradient(180deg, #fffaf5 0%, #fdf6f8 40%);
}

.phone-screen.afternoon {
    background: var(--color-bg);
}

.phone-screen.evening {
    background: linear-gradient(180deg, #f8e8e0 0%, #fdf6f8 40%);
}

.phone-screen.night {
    background: linear-gradient(180deg, #f0e0ea 0%, #f5eaf0 40%);
}

.phone-screen.midnight {
    background: linear-gradient(180deg, #382830 0%, #2a2228 50%);
}

/* 环境状态修正 */


.screen-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 22px;
    -webkit-overflow-scrolling: touch;
    position: relative;
    z-index: 1;
}

/* 背景装饰 */
.bg-decor {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 0;
}

.decor-circle {
    position: absolute;
    border-radius: 50%;
    filter: blur(calc(60px * var(--env-blur, 1)));
    opacity: var(--decor-opacity, 0.3);
    transform: scale(var(--decor-scale, 1));
    transition: opacity 3s var(--ease-soft), transform 3s var(--ease-soft), filter 3s var(--ease-soft);
}

.c1 {
    width: 200px;
    height: 200px;
    background: #f0c0d0;
    top: -40px;
    right: -60px;
    animation: softFloat calc(12s / var(--env-float-speed, 1)) ease-in-out infinite;
}

.c2 {
    width: 160px;
    height: 160px;
    background: #d0c0e8;
    bottom: 20%;
    left: -40px;
    animation: softFloat calc(10s / var(--env-float-speed, 1)) ease-in-out infinite 2s;
}

.c3 {
    width: 120px;
    height: 120px;
    background: #f0d8c0;
    bottom: -20px;
    right: 20%;
    animation: softFloat calc(14s / var(--env-float-speed, 1)) ease-in-out infinite 4s;
}

/* 环境低语 */
.env-whisper {
    position: absolute;
    top: calc(env(safe-area-inset-top, 44px) + 12px);
    left: 0;
    right: 0;
    text-align: center;
    font-size: 11px;
    color: var(--color-text-light);
    opacity: 0.4;
    font-style: italic;
    letter-spacing: 0.05em;
    z-index: 2;
    pointer-events: none;
}

.whisper-enter-active {
    transition: opacity 1.5s var(--ease-soft), transform 1.5s var(--ease-soft);
}

.whisper-leave-active {
    transition: opacity 2s var(--ease-soft), transform 2s var(--ease-soft);
}

.whisper-enter-from {
    opacity: 0;
    transform: translateY(-4px);
}

.whisper-leave-to {
    opacity: 0;
    transform: translateY(2px);
}

@keyframes softFloat {

    0%,
    100% {
        transform: translateY(0) scale(var(--decor-scale, 1));
    }

    50% {
        transform: translateY(-8px) scale(var(--decor-scale, 1));
    }
}
</style>
