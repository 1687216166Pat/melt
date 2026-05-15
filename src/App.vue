<template>
    <div class="phone-screen" :class="period" :style="atmosphereStyle">
        <div class="bg-decor">
            <div class="decor-circle c1"></div>
            <div class="decor-circle c2"></div>
            <div class="decor-circle c3"></div>
        </div>
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
import { api } from '@/utils/api'
import { useDeviceStatus } from '@/composables/useDeviceStatus'

const { connect, requestNotificationPermission, registerPushSubscription } = useWebSocket()
const { period, startClock, stopClock } = useTime()

const atmosphereWarmth = ref(0)
const { startReporting, stopReporting } = useDeviceStatus()

const atmosphereStyle = computed(() => {
    const w = atmosphereWarmth.value
    if (w <= 0) return {}
    return {
        '--decor-opacity': 0.3 + w * 0.2,
        '--decor-scale': 1 + w * 0.1,
    }
})

async function loadAtmosphere() {
    try {
        const pRes = await api('/api/prompts/personas')
        const pData = await pRes.json()
        const activeId = pData.active || 'xiaorou'

        const res = await api(`/api/atmosphere/${activeId}`)
        const data = await res.json()
        atmosphereWarmth.value = data.uiWarmth || 0
    } catch { }
}

onMounted(() => {
    connect()
    requestNotificationPermission()
    registerPushSubscription()
    startClock()
    loadAtmosphere()
    setInterval(loadAtmosphere, 5 * 60 * 1000)
})

onUnmounted(() => {
    stopReporting()
    stopClock()
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
    transition: background 1.2s var(--ease-soft);
}

.phone-screen.morning {
    background: linear-gradient(180deg, #fff5f8 0%, #fdf6f8 40%);
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

.screen-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 22px;
    -webkit-overflow-scrolling: touch;
    position: relative;
    z-index: 1;
}

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
    filter: blur(60px);
    opacity: var(--decor-opacity, 0.3);
    transform: scale(var(--decor-scale, 1));
    transition: opacity 2s var(--ease-soft), transform 2s var(--ease-soft);
}

.c1 {
    width: 200px;
    height: 200px;
    background: #f0c0d0;
    top: -40px;
    right: -60px;
    animation: softFloat 12s ease-in-out infinite;
}

.c2 {
    width: 160px;
    height: 160px;
    background: #d0c0e8;
    bottom: 20%;
    left: -40px;
    animation: softFloat 10s ease-in-out infinite 2s;
}

.c3 {
    width: 120px;
    height: 120px;
    background: #f0d8c0;
    bottom: -20px;
    right: 20%;
    animation: softFloat 14s ease-in-out infinite 4s;
}
</style>
