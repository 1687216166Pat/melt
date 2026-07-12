<template>
    <div class="sub-page">
        <div class="settings-blob sb-tl"></div>
        <div class="settings-blob sb-br"></div>

        <div class="settings-nav">
            <button class="settings-back" @click="$router.push('/settings/lifestyle')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <span class="settings-title">生活感知</span>
            <div style="width:36px;"></div>
        </div>

        <div class="sub-content">

            <div class="section-label-sm">状态感知</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">启用生活感知</div>
                        <div class="sgi-desc">让 char 感知你的生活状态与节奏</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="lifeAwareEnabled" @change="save" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
            </div>

            <div class="section-label-sm">iOS 快捷指令配置</div>
            <div class="settings-group">
                <div class="settings-group-item col-item">
                    <div class="sgi-label">Webhook 地址</div>
                    <div class="webhook-box">
                        <span class="webhook-method">POST</span>
                        <span class="webhook-url">{{ webhookUrl }}/api/phone/status</span>
                    </div>
                    <div class="webhook-body-box">
                        <span class="webhook-body">Body: {"type":"sleep","data":"入睡"}</span>
                    </div>
                </div>
            </div>

            <div class="section-label-sm">推荐触发条件</div>
            <div class="settings-group">
                <div v-for="trigger in triggers" :key="trigger.type" class="settings-group-item">
                    <div class="trigger-icon" :style="{ background: trigger.color }">
                        <span>{{ trigger.emoji }}</span>
                    </div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">{{ trigger.label }}</div>
                        <div class="sgi-desc">{{ trigger.desc }}</div>
                    </div>
                    <div class="trigger-body">{{ trigger.body }}</div>
                </div>
            </div>

            <div class="section-label-sm">配置步骤</div>
            <div class="settings-group">
                <div v-for="(step, idx) in steps" :key="idx" class="settings-group-item step-item">
                    <div class="step-num">{{ idx + 1 }}</div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">{{ step.title }}</div>
                        <div class="sgi-desc">{{ step.desc }}</div>
                    </div>
                </div>
            </div>

            <div class="section-label-sm">最新上报</div>
            <div class="settings-group">
                <div v-if="latestStatus" class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">{{ latestStatus.type }}</div>
                        <div class="sgi-desc">{{ latestStatus.data }} · {{ formatTime(latestStatus.timestamp) }}</div>
                    </div>
                    <div class="status-dot-green"></div>
                </div>
                <div v-else class="settings-group-item">
                    <div class="sgi-label" style="color: #B8A9AC;">暂无上报记录</div>
                </div>
            </div>

        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api'

const lifeAwareEnabled = ref(localStorage.getItem('life_aware_enabled') === 'true')
const webhookUrl = ref(import.meta.env.VITE_API_URL || window.location.origin)
const latestStatus = ref(null)

function save() {
    localStorage.setItem('life_aware_enabled', lifeAwareEnabled.value)
}

function formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const triggers = [
    { type: 'sleep', emoji: '🌙', label: '睡觉时', desc: '上报入睡状态', body: 'type:sleep, data:入睡', color: 'rgba(216,205,234,0.3)' },
    { type: 'wake', emoji: '☀️', label: '起床时', desc: '上报起床状态', body: 'type:wake, data:醒来', color: 'rgba(245,234,208,0.3)' },
    { type: 'low_battery', emoji: '🔋', label: '电量低于20%', desc: '上报低电量', body: 'type:battery, data:低电量', color: 'rgba(232,192,201,0.3)' },
    { type: 'app_open', emoji: '📱', label: '打开某个App', desc: '上报当前活动', body: 'type:app, data:打开微信', color: 'rgba(152,203,234,0.3)' },
    { type: 'wifi', emoji: '📶', label: '连接WiFi', desc: '上报位置变化', body: 'type:wifi, data:连接到家里WiFi', color: 'rgba(152,203,234,0.2)' },

    // 新增：运动
    { type: 'exercise_start', emoji: '🏃', label: '开始运动', desc: '开始跑步、健身', body: 'type:exercise, data:开始跑步', color: 'rgba(168,213,162,0.3)' },
    { type: 'exercise_end', emoji: '💪', label: '运动结束', desc: '完成锻炼', body: 'type:exercise, data:跑步结束', color: 'rgba(168,213,162,0.25)' },

    // 新增：通勤
    { type: 'commute_leave', emoji: '🚶', label: '出门上班/上学', desc: '离开家', body: 'type:commute, data:出门上班', color: 'rgba(245,193,122,0.3)' },
    { type: 'commute_arrive', emoji: '🏢', label: '到达公司/学校', desc: '到达目的地', body: 'type:commute, data:到公司了', color: 'rgba(245,193,122,0.25)' },
    { type: 'commute_home', emoji: '🏠', label: '下班回家', desc: '结束工作', body: 'type:commute, data:下班回家', color: 'rgba(245,193,122,0.2)' },

    // 新增：工作/学习
    { type: 'focus_start', emoji: '💻', label: '开始专注', desc: '进入工作/学习状态', body: 'type:focus, data:开始工作', color: 'rgba(184,160,200,0.3)' },
    { type: 'focus_break', emoji: '☕', label: '休息时间', desc: '暂时休息', body: 'type:focus, data:休息一下', color: 'rgba(184,160,200,0.2)' },
    { type: 'focus_end', emoji: '✅', label: '结束工作', desc: '完成今天的任务', body: 'type:focus, data:工作结束', color: 'rgba(184,160,200,0.25)' },

    // 新增：情绪
    { type: 'mood_good', emoji: '😊', label: '心情不错', desc: '感觉开心', body: 'type:mood, data:心情不错', color: 'rgba(255,233,237,0.4)' },
    { type: 'mood_tired', emoji: '😴', label: '累了', desc: '感到疲惫', body: 'type:mood, data:好累', color: 'rgba(212,200,202,0.3)' },
    { type: 'mood_stress', emoji: '😓', label: '压力大', desc: '感到压力', body: 'type:mood, data:压力有点大', color: 'rgba(232,192,201,0.25)' },
]

const steps = [
    { title: '打开「快捷指令」App', desc: '在 iOS 系统自带的快捷指令 App 中操作' },
    { title: '创建自动化', desc: '选择「创建个人自动化」，设置触发条件' },
    { title: '添加「获取 URL 内容」操作', desc: '方法选择 POST，URL 填入上方地址' },
    { title: '设置请求 Body', desc: '选择 JSON 格式，填入对应的 type 和 data 字段' },
    { title: '关闭「运行前询问」', desc: '让自动化在触发时直接静默执行' },
]

onMounted(async () => {
    try {
        const res = await api('/api/phone/status')
        const data = await res.json()
        if (data && data.type) latestStatus.value = data
    } catch { }
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
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
    position: relative;
}

.settings-group-item:last-child {
    border-bottom: none;
}

.col-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
}

.step-item {
    align-items: flex-start;
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
    line-height: 1.5;
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

.webhook-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(217, 163, 175, 0.06);
    border-radius: 10px;
    padding: 8px 12px;
    width: 100%;
}

.webhook-method {
    font-size: 10px;
    font-weight: 700;
    color: #D9A3AF;
    background: rgba(232, 192, 201, 0.2);
    padding: 2px 8px;
    border-radius: 6px;
    flex-shrink: 0;
}

.webhook-url {
    font-size: 11px;
    color: #4A3F41;
    font-family: monospace;
    word-break: break-all;
}

.webhook-body-box {
    background: rgba(217, 163, 175, 0.04);
    border-radius: 10px;
    padding: 8px 12px;
    width: 100%;
}

.webhook-body {
    font-size: 11px;
    color: #B8A9AC;
    font-family: monospace;
}

.trigger-icon {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
}

.trigger-body {
    font-size: 10px;
    color: #B8A9AC;
    font-family: monospace;
    background: rgba(217, 163, 175, 0.06);
    padding: 3px 8px;
    border-radius: 8px;
    flex-shrink: 0;
}

.step-num {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
}

.status-dot-green {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #6BAF7A;
    flex-shrink: 0;
    box-shadow: 0 0 0 3px rgba(107, 175, 122, 0.2);
}
</style>
