<template>
    <div class="presence-page">
        <div class="presence-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>相遇</h2>
        </div>

        <!-- 分页 -->
        <div class="presence-tabs">
            <button class="tab-item" :class="{ active: currentTab === 'presence' }" @click="currentTab = 'presence'">
                Presence
            </button>
            <button class="tab-item" :class="{ active: currentTab === 'echo' }" @click="currentTab = 'echo'">
                Echo
            </button>
        </div>

        <!-- Presence 页 -->
        <div v-if="currentTab === 'presence'" class="tab-content">
            <GlassCard size="lg" class="device-card">
                <div class="device-header">
                    <span class="device-icon">📱</span>
                    <div>
                        <p class="device-title">{{ aiName }}的手机</p>
                        <p class="device-sub">虚拟设备状态</p>
                    </div>
                </div>

                <div class="status-list">
                    <div class="status-item">
                        <span class="status-label">在线状态</span>
                        <span class="status-value" :class="aiOnline ? 'online' : 'offline'">
                            {{ aiOnline ? '在线' : '离线' }}
                        </span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">电量</span>
                        <span class="status-value">{{ aiBattery }}%</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">环境</span>
                        <span class="status-value">{{ aiEnvironment }}</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">位置</span>
                        <span class="status-value">{{ aiLocation }}</span>
                    </div>
                </div>
            </GlassCard>
        </div>

        <!-- Echo 页 -->
        <div v-if="currentTab === 'echo'" class="tab-content">
            <GlassCard size="lg" class="device-card">
                <div class="device-header">
                    <span class="device-icon">📱</span>
                    <div>
                        <p class="device-title">我的手机</p>
                        <p class="device-sub">实时设备状态</p>
                    </div>
                </div>

                <div class="status-list">
                    <div class="status-item">
                        <span class="status-label">电量</span>
                        <span class="status-value">{{ myBattery }}%</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">环境</span>
                        <span class="status-value">{{ myEnvironment }}</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">位置</span>
                        <span class="status-value">{{ myLocation }}</span>
                    </div>
                </div>
            </GlassCard>

            <GlassCard size="lg" class="device-card">
                <div class="device-header">
                    <span class="device-icon">📊</span>
                    <div>
                        <p class="device-title">手机使用情况</p>
                        <p class="device-sub">最近 {{ phoneStatuses.length }} 条记录</p>
                    </div>
                </div>

                <div class="status-scroll">
                    <div v-for="(status, idx) in phoneStatuses.slice(0, 15)" :key="idx" class="status-item">
                        <span class="status-label">{{ status.label }}</span>
                        <span class="status-value">{{ status.text }}</span>
                    </div>
                    <p v-if="phoneStatuses.length === 0" class="empty-text">暂无上报数据</p>
                </div>
            </GlassCard>

        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api'
import GlassCard from '@/components/ui/GlassCard.vue'

const currentTab = ref('presence')

// AI 设备状态（虚拟）
const aiName = ref('...')
const aiOnline = ref(true)
const aiBattery = ref(88)
const aiEnvironment = ref('安静的房间')
const aiLocation = ref('在这里等你')

// 我的设备状态
const myBattery = ref(0)
const myEnvironment = ref('未知')
const myLocation = ref('未知')

// 手机使用情况（快捷指令上报）
const phoneStatuses = ref([])

async function loadData() {
    // 加载 AI 信息
    try {
        const latestRes = await api('/api/messages/latest-persona')
        const latestData = await latestRes.json()
        const personaId = latestData.personaId || 'xiaorou'

        const detailRes = await api(`/api/persona/${personaId}`)
        const detail = await detailRes.json()
        aiName.value = detail.note || detail.name || 'AI'

        // 根据最近互动判断在线状态
        const msgRes = await api(`/api/messages/${personaId}`)
        const msgs = await msgRes.json()
        if (msgs.length > 0) {
            const lastTime = new Date(msgs[msgs.length - 1].timestamp)
            const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60)
            aiOnline.value = hoursSince < 2
        }
    } catch { }
    
    // 加载手机状态
    try {
        const res = await api('/api/phone/status')
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
            phoneStatuses.value = humanizeStatus(data.slice(0, 15))

            // 从上报数据更新我的状态
            const batteryStatus = data.find(s => s.status_type === 'battery')
            if (batteryStatus) myBattery.value = parseInt(batteryStatus.status_data) || 0

            const sleepStatus = data.find(s => s.status_type === 'sleep')
            if (sleepStatus) {
                myEnvironment.value = sleepStatus.status_data === '入睡' ? '休息中' : '清醒'
            }

            const locationStatus = data.find(s => s.status_type === 'location')
            if (locationStatus) myLocation.value = locationStatus.status_data
        }
    } catch { }


    // 实时电量监听（仅 Android Chrome 支持）
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery()
            myBattery.value = Math.round(battery.level * 100)
            battery.addEventListener('levelchange', () => {
                myBattery.value = Math.round(battery.level * 100)
            })
        } catch { }
    }

    // 每 5 分钟刷新位置
    setInterval(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    myLocation.value = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
                },
                () => { }
            )
        }
    }, 5 * 60 * 1000)

}

function humanizeStatus(statuses) {
    const result = []
    const now = Date.now()

    statuses.forEach(s => {
        const time = new Date(s.timestamp)
        const diff = now - time.getTime()
        const mins = Math.floor(diff / (1000 * 60))
        const hours = Math.floor(mins / 60)

        let timeText = ''
        if (mins < 1) timeText = '刚刚'
        else if (mins < 60) timeText = `${mins}分钟前`
        else if (hours < 24) timeText = `${hours}小时前`
        else timeText = `${Math.floor(hours / 24)}天前`

        let label = ''
        let text = ''

        switch (s.status_type) {
            case 'sleep':
                label = '💤 睡眠'
                text = s.status_data === '入睡' ? `${timeText}入睡` : `${timeText}醒来`
                break
            case 'app':
                label = '📱 应用'
                text = `${timeText}${s.status_data}`
                break
            case 'battery':
                label = '🔋 电量'
                text = `${timeText}报告电量 ${s.status_data}%`
                break
            case 'daily_first':
                label = '🌅 起床'
                text = `${timeText}开始使用手机`
                break
            case 'location':
                label = '📍 位置'
                text = `${timeText}${s.status_data}`
                break
            default:
                label = '📋 其他'
                text = `${timeText} ${s.status_data || s.status_type}`
        }

        result.push({ label, text })
    })

    return result
}


onMounted(loadData)
</script>

<style scoped>
.presence-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
    overflow-x: hidden;
}

.presence-header {
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

.presence-header h2 {
    font-size: 15px;
    font-weight: 500;
    color: var(--color-text);
}

.presence-tabs {
    display: flex;
    gap: 8px;
    padding: 14px 0;
    flex-shrink: 0;
}

.tab-item {
    padding: 8px 18px;
    border-radius: 20px;
    border: 1px solid var(--color-border);
    background: var(--color-card);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    font-size: 13px;
    color: var(--color-text-light);
    cursor: pointer;
    transition: all 0.3s;
}

.tab-item.active {
    background: linear-gradient(135deg, #e8a8be, #d4899e);
    color: white;
    border-color: transparent;
}

.tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.device-card {
    animation: fadeIn 0.4s var(--ease-soft);
}

.device-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.device-icon {
    font-size: 24px;
}

.device-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
}

.device-sub {
    font-size: 11px;
    color: var(--color-text-light);
    opacity: 0.6;
    margin-top: 2px;
}

.status-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--color-border);
}

.status-item:last-child {
    border-bottom: none;
}

.status-label {
    font-size: 13px;
    color: var(--color-text-light);
}

.status-value {
    font-size: 13px;
    color: var(--color-text);
    font-weight: 400;
}

.status-value.online {
    color: #7aab7a;
}

.status-value.offline {
    color: var(--color-text-light);
    opacity: 0.5;
}

.status-time {
    font-size: 10px;
    color: var(--color-text-light);
    opacity: 0.4;
    margin-left: 6px;
}

.empty-text {
    font-size: 12px;
    color: var(--color-text-light);
    opacity: 0.5;
    text-align: center;
    padding: 12px;
}

.status-scroll {
    max-height: 280px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}
</style>
