<template>
    <div class="phone-screen" :class="period">
        <StatusBar />
        <NotificationBanner />
        <main class="screen-content">
            <RouterView />
        </main>
        <HomeIndicator />
    </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import HomeIndicator from '@/components/HomeIndicator.vue'
import NotificationBanner from '@/components/NotificationBanner.vue'
import { useWebSocket } from '@/composables/useWebSocket'
import { useTime } from '@/composables/useTime'

const { connect, requestNotificationPermission, registerPushSubscription } = useWebSocket()
const { period, startClock, stopClock } = useTime()

onMounted(() => {
    connect()
    requestNotificationPermission()
    registerPushSubscription()
    startClock()
})

onUnmounted(() => {
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
    transition: background 1s ease;
}

/* 时间段主题色 */
.phone-screen.morning {
    background: linear-gradient(180deg, #fff5e6 0%, #fdf6f0 30%);
}

.phone-screen.forenoon {
    background: var(--color-bg);
}

.phone-screen.noon {
    background: linear-gradient(180deg, #fff8f0 0%, #fdf6f0 30%);
}

.phone-screen.afternoon {
    background: var(--color-bg);
}

.phone-screen.evening {
    background: linear-gradient(180deg, #f5e6d3 0%, #fdf6f0 30%);
}

.phone-screen.night {
    background: linear-gradient(180deg, #e8dff0 0%, #f5ebe3 30%);
}

.phone-screen.midnight {
    background: linear-gradient(180deg, #d4c5e2 0%, #e8dff0 50%);
}

.screen-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 20px;
}
</style>
