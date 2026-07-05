<template>
    <SplashScreen v-if="showSplash" @done="onSplashDone" />
    <transition name="main-enter">
        <div v-show="!showSplash" class="phone-screen" :class="[effectivePeriod, envClass]" :style="envStyle">
            <div class="bg-decor">
                <div class="decor-circle c1"></div>
                <div class="decor-circle c2"></div>
                <div class="decor-circle c3"></div>
            </div>
            <transition name="whisper">
                <p v-if="showWhisper && envWhisper" class="env-whisper">{{ envWhisper }}</p>
            </transition>
            <NotificationBanner />
            <main class="screen-content" :class="{ 'no-padding': isHomePage }">
                <RouterView />
            </main>
        </div>
    </transition>
</template>


<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import NotificationBanner from '@/components/NotificationBanner.vue'
import { useWebSocket } from '@/composables/useWebSocket'
import { useTime } from '@/composables/useTime'
import { useDeviceStatus } from '@/composables/useDeviceStatus'
import { api } from '@/utils/api'
import SplashScreen from '@/components/SplashScreen.vue'

const route = useRoute()
const isHomePage = computed(() => {
    const noPaddingRoutes = [
        'home', 'settings', 'chat-list',
        'settings-api', 'settings-control', 'settings-profile',
        'settings-general', 'settings-notifications', 'settings-storage',
        'settings-lock', 'settings-lifestyle', 'settings-life-aware', 'wallet'
    ]
    return noPaddingRoutes.includes(route.name) || route.path === '/'
})

const showSplash = ref(true)
const { connect, requestNotificationPermission, registerPushSubscription } = useWebSocket()
const { period, startClock, stopClock } = useTime()
const { startReporting, stopReporting } = useDeviceStatus()
const themeOverride = ref(localStorage.getItem('theme_mode') || 'auto')

function onSplashDone() {
    showSplash.value = false
}

window.addEventListener('theme-change', (e) => {
    themeOverride.value = e.detail
})

const envData = ref({
    warmth: 0.3,
    floatSpeed: 1,
    blurIntensity: 1,
    presence: 'normal',
})
const envWhisper = ref('')
const showWhisper = ref(false)

const envClass = computed(() => `env-${envData.value.presence}`)

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

const effectivePeriod = computed(() => {
    if (themeOverride.value === 'light') return 'forenoon'
    if (themeOverride.value === 'dark') return 'midnight'
    return period.value
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
    envInterval = setInterval(loadEnvironment, 10 * 60 * 1000)

    const savedWallpaper = localStorage.getItem('custom_wallpaper')
    const wallpaperScope = localStorage.getItem('wallpaper_scope') || 'home'
    if (savedWallpaper && wallpaperScope === 'global') {
        setTimeout(() => {
            const screen = document.querySelector('.phone-screen')
            if (screen) {
                screen.style.backgroundImage = `url(${savedWallpaper})`
                screen.style.backgroundSize = 'cover'
                screen.style.backgroundPosition = 'center'
            }
        }, 500)
    }

    setTimeout(() => {
        const savedFontUrl = localStorage.getItem('custom_font_url')
        const savedFontName = localStorage.getItem('custom_font_name')
        if (savedFontUrl && savedFontName) {
            const style = document.createElement('style')
            style.id = 'custom-font-style'
            style.textContent = `
                @font-face {
                    font-family: '${savedFontName}';
                    src: url('${savedFontUrl}') format('woff2'), url('${savedFontUrl}');
                    font-display: swap;
                }
                html, body, #app, * {
                    font-family: '${savedFontName}', -apple-system, BlinkMacSystemFont, sans-serif !important;
                }
            `
            document.head.appendChild(style)
        }
    }, 500)

    const savedCSS = localStorage.getItem('custom_css')
    if (savedCSS) {
        const style = document.createElement('style')
        style.id = 'custom-user-css'
        style.textContent = savedCSS
        document.head.appendChild(style)
    }
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
    background: linear-gradient(180deg, #221e28 0%, #1e1a22 40%, #1a1620 100%);
}

.phone-screen.midnight {
    background: linear-gradient(180deg, #1a1520 0%, #16121a 40%, #120e16 100%);
}

.screen-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 16px;
    -webkit-overflow-scrolling: touch;
    position: relative;
    z-index: 1;
}

.screen-content.no-padding {
    padding: 0;
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

.main-enter-enter-active {
    transition: opacity 0.8s ease, transform 0.8s ease;
}

.main-enter-enter-from {
    opacity: 0;
    transform: scale(1.02) translateY(-4px);
}

.scheme-list {
    margin-bottom: 12px;
}

.scheme-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-radius: 8px;
    margin-bottom: 4px;
    cursor: pointer;
}

.scheme-item.active {
    background: rgba(212, 137, 158, 0.06);
}

.scheme-name {
    font-size: 13px;
    color: var(--color-text);
}

.scheme-delete {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--color-text-light);
    opacity: 0.4;
    cursor: pointer;
}

.section-sub {
    font-size: 11px;
    color: var(--color-text-light);
    opacity: 0.5;
    margin-bottom: 10px;
    font-style: italic;
}
</style>
