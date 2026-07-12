<template>
    <div class="sub-page">
        <div class="settings-blob sb-tl"></div>
        <div class="settings-blob sb-br"></div>

        <div class="settings-nav">
            <button class="settings-back" @click="$router.push('/')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <span class="settings-title">番茄钟</span>
            <div style="width:36px;"></div>
        </div>

        <div class="sub-content">

            <!-- 计时器 -->
            <div class="pomodoro-hero">
                <div class="pomodoro-ring">
                    <svg viewBox="0 0 120 120" class="ring-svg">
                        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(232,192,201,0.15)" stroke-width="8" />
                        <circle cx="60" cy="60" r="52" fill="none" :stroke="isBreak ? '#98CBEA' : '#E8C0C9'"
                            stroke-width="8" stroke-linecap="round" :stroke-dasharray="ringCircumference"
                            :stroke-dashoffset="ringOffset" transform="rotate(-90 60 60)"
                            style="transition: stroke-dashoffset 1s linear;" />
                    </svg>
                    <div class="pomodoro-time">
                        <div class="time-display">{{ timeDisplay }}</div>
                        <div class="time-label">{{ isBreak ? '休息中' : '专注中' }}</div>
                    </div>
                </div>

                <div class="pomodoro-controls">
                    <button class="pomo-btn pomo-reset" @click="reset">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                    </button>
                    <button class="pomo-btn pomo-main" @click="toggleTimer">
                        <svg v-if="!running" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                        <svg v-else viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                        </svg>
                    </button>
                    <button class="pomo-btn pomo-skip" @click="skip">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <polygon points="5 4 15 12 5 20 5 4" />
                            <line x1="19" y1="5" x2="19" y2="19" />
                        </svg>
                    </button>
                </div>

                <div class="pomodoro-count">
                    第 {{ pomodoroCount }} 个番茄 · 今日完成 {{ todayCount }}
                </div>

                <!-- 任务输入 -->
                <Transition name="fade-up">
                    <div v-if="showTaskInput" class="task-input-wrap">
                        <input class="task-input" v-model="currentTask" placeholder="要专注做什么？（可跳过）"
                            @keyup.enter="startTimer" autofocus />
                        <div class="task-input-btns">
                            <button class="task-btn-skip" @click="startTimer">跳过</button>
                            <button class="task-btn-start" @click="startTimer">开始专注</button>
                        </div>
                    </div>
                </Transition>

                <!-- AI 消息 -->
                <Transition name="fade-up">
                    <div v-if="aiMessage" class="pomo-ai-msg">
                        {{ aiMessage }}
                    </div>
                </Transition>

            </div>

            <!-- 时长设置 -->
            <div class="section-label-sm">时长设置</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label">专注时长</div>
                    <div class="pomo-duration-ctrl">
                        <button @click="adjustDuration('focus', -5)">−</button>
                        <span>{{ focusDuration }} 分钟</span>
                        <button @click="adjustDuration('focus', 5)">+</button>
                    </div>
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">短休息</div>
                    <div class="pomo-duration-ctrl">
                        <button @click="adjustDuration('short', -1)">−</button>
                        <span>{{ shortBreak }} 分钟</span>
                        <button @click="adjustDuration('short', 1)">+</button>
                    </div>
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">长休息</div>
                    <div class="pomo-duration-ctrl">
                        <button @click="adjustDuration('long', -5)">−</button>
                        <span>{{ longBreak }} 分钟</span>
                        <button @click="adjustDuration('long', 5)">+</button>
                    </div>
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">长休息间隔</div>
                    <div class="pomo-duration-ctrl">
                        <button @click="adjustDuration('interval', -1)">−</button>
                        <span>每 {{ longBreakInterval }} 个</span>
                        <button @click="adjustDuration('interval', 1)">+</button>
                    </div>
                </div>
            </div>

            <!-- 今日记录 -->
            <div class="section-label-sm">今日专注</div>
            <div class="pomo-history">
                <div v-if="todayHistory.length === 0" class="wish-empty">今天还没有完成的番茄</div>
                <div v-for="(record, idx) in todayHistory" :key="idx" class="pomo-record">
                    <div class="pomo-record-dot" :style="{ background: record.isBreak ? '#98CBEA' : '#E8C0C9' }"></div>
                    <div class="pomo-record-info">
                        <span class="pomo-record-text">{{ record.isBreak ? '休息' : '专注' }} {{ record.duration }}
                            分钟</span>
                        <span v-if="record.task" class="pomo-record-task">{{ record.task }}</span>
                    </div>
                    <span class="pomo-record-time">{{ record.endTime }}</span>
                </div>
            </div>

        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '@/utils/api'

const focusDuration = ref(parseInt(localStorage.getItem('pomo_focus') || '25'))
const shortBreak = ref(parseInt(localStorage.getItem('pomo_short') || '5'))
const longBreak = ref(parseInt(localStorage.getItem('pomo_long') || '15'))
const longBreakInterval = ref(parseInt(localStorage.getItem('pomo_interval') || '4'))

const running = ref(false)
const isBreak = ref(false)
const pomodoroCount = ref(0)
const todayCount = ref(0)
const todayHistory = ref([])
const currentTask = ref('')
const showTaskInput = ref(false)
const aiMessage = ref('')

function checkDayReset() {
    const lastDate = localStorage.getItem('pomo_last_date')
    const today = new Date().toISOString().slice(0, 10)
    if (lastDate !== today) {
        todayCount.value = 0
        todayHistory.value = []
        localStorage.setItem('pomo_today_count', '0')
        localStorage.setItem('pomo_today_history', '[]')
        localStorage.setItem('pomo_last_date', today)
    } else {
        todayCount.value = parseInt(localStorage.getItem('pomo_today_count') || '0')
        todayHistory.value = JSON.parse(localStorage.getItem('pomo_today_history') || '[]')
    }
}

const totalSeconds = ref(focusDuration.value * 60)
const remaining = ref(totalSeconds.value)
let timer = null

const timeDisplay = computed(() => {
    const m = Math.floor(remaining.value / 60)
    const s = remaining.value % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const ringCircumference = computed(() => 2 * Math.PI * 52)
const ringOffset = computed(() => {
    const progress = remaining.value / totalSeconds.value
    return ringCircumference.value * (1 - progress)
})

async function reportStatus(type, data) {
    try {
        await api('/api/phone/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                type: 'focus', 
                data,
                timestamp: new Date().toISOString()
            })
        })
    } catch { }
}

async function sendAiMessage(message) {
    aiMessage.value = message
    setTimeout(() => { aiMessage.value = '' }, 5000)
}

function startTimer() {
    showTaskInput.value = false
    running.value = true

    const taskDesc = currentTask.value ? `（任务：${currentTask.value}）` : ''
    if (!isBreak.value) {
        reportStatus('focus', `开始专注${focusDuration.value}分钟${taskDesc}`)
    } else {
        const breakMin = pomodoroCount.value % longBreakInterval.value === 0 ? longBreak.value : shortBreak.value
        reportStatus('focus', `开始休息${breakMin}分钟`)
    }

    timer = setInterval(() => {
        if (remaining.value <= 0) {
            clearInterval(timer)
            running.value = false
            onTimerEnd()
        } else {
            remaining.value--
        }
    }, 1000)
}

async function onTimerEnd() {
    const duration = isBreak.value
        ? (pomodoroCount.value % longBreakInterval.value === 0 ? longBreak.value : shortBreak.value)
        : focusDuration.value

    todayHistory.value.unshift({
        isBreak: isBreak.value,
        duration,
        task: currentTask.value,
        endTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    })
    localStorage.setItem('pomo_today_history', JSON.stringify(todayHistory.value))

    if (!isBreak.value) {
        pomodoroCount.value++
        todayCount.value++
        localStorage.setItem('pomo_today_count', String(todayCount.value))

        const taskDesc = currentTask.value ? `（任务：${currentTask.value}）` : ''
        reportStatus('focus', `完成专注${focusDuration.value}分钟${taskDesc}，这是今天第${todayCount.value}个番茄钟`)
        sendAiMessage('专注完成了，休息一下吧 ✿')
    } else {
        reportStatus('focus', `休息${duration}分钟结束`)
        sendAiMessage('休息结束，准备好继续了吗')
    }

    isBreak.value = !isBreak.value
    if (isBreak.value) {
        const breakTime = pomodoroCount.value % longBreakInterval.value === 0
            ? longBreak.value : shortBreak.value
        totalSeconds.value = breakTime * 60
    } else {
        totalSeconds.value = focusDuration.value * 60
    }
    remaining.value = totalSeconds.value

    setTimeout(() => { startTimer() }, 1500)
}

function toggleTimer() {
    if (running.value) {
        clearInterval(timer)
        running.value = false
        const elapsed = Math.floor((totalSeconds.value - remaining.value) / 60)
        const taskDesc = currentTask.value ? `（任务：${currentTask.value}）` : ''
        reportStatus('focus', `暂停专注${taskDesc}，已进行${elapsed}分钟`)
    } else {
        if (!isBreak.value && pomodoroCount.value === 0 && remaining.value === totalSeconds.value) {
            showTaskInput.value = true
            return
        }
        startTimer()
    }
}

function reset() {
    clearInterval(timer)
    running.value = false
    const elapsed = Math.floor((totalSeconds.value - remaining.value) / 60)
    if (elapsed > 0) {
        const taskDesc = currentTask.value ? `（任务：${currentTask.value}）` : ''
        reportStatus('focus', `中断专注${taskDesc}，已进行${elapsed}分钟`)
    }
    isBreak.value = false
    pomodoroCount.value = 0
    currentTask.value = ''
    totalSeconds.value = focusDuration.value * 60
    remaining.value = totalSeconds.value
}

function skip() {
    clearInterval(timer)
    running.value = false
    onTimerEnd()
}

function adjustDuration(type, delta) {
    if (type === 'focus') {
        focusDuration.value = Math.max(5, focusDuration.value + delta)
        localStorage.setItem('pomo_focus', String(focusDuration.value))
        if (!running.value && !isBreak.value) {
            totalSeconds.value = focusDuration.value * 60
            remaining.value = totalSeconds.value
        }
    } else if (type === 'short') {
        shortBreak.value = Math.max(1, shortBreak.value + delta)
        localStorage.setItem('pomo_short', String(shortBreak.value))
    } else if (type === 'long') {
        longBreak.value = Math.max(5, longBreak.value + delta)
        localStorage.setItem('pomo_long', String(longBreak.value))
    } else if (type === 'interval') {
        longBreakInterval.value = Math.max(2, longBreakInterval.value + delta)
        localStorage.setItem('pomo_interval', String(longBreakInterval.value))
    }
}

onMounted(() => { checkDayReset() })
onUnmounted(() => { clearInterval(timer) })
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

/* 番茄钟主体 */
.pomodoro-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 0 16px;
    gap: 20px;
}

.pomodoro-ring {
    position: relative;
    width: 180px;
    height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ring-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
}

.pomodoro-time {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    position: relative;
    z-index: 1;
}

.time-display {
    font-size: 40px;
    font-weight: 800;
    color: #4A3F41;
    letter-spacing: -1px;
}

.time-label {
    font-size: 12px;
    color: #B8A9AC;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.pomodoro-controls {
    display: flex;
    align-items: center;
    gap: 16px;
}

.pomo-btn {
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.pomo-btn:active {
    transform: scale(0.92);
}

.pomo-main {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    box-shadow: 0 8px 20px rgba(217, 163, 175, 0.3);
}

.pomo-main svg {
    width: 22px;
    height: 22px;
}

.pomo-reset,
.pomo-skip {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 240, 242, 0.5);
    box-shadow: 0 4px 12px rgba(217, 163, 175, 0.08);
}

.pomo-reset svg,
.pomo-skip svg {
    width: 16px;
    height: 16px;
    stroke: #B8A9AC;
}

.pomodoro-count {
    font-size: 12px;
    color: #B8A9AC;
}

/* 时长设置 */
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
}

.settings-group-item:last-child {
    border-bottom: none;
}

.sgi-label {
    font-size: 14px;
    color: #4A3F41;
}

.pomo-duration-ctrl {
    display: flex;
    align-items: center;
    gap: 12px;
}

.pomo-duration-ctrl button {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(232, 192, 201, 0.15);
    border: 1px solid rgba(232, 192, 201, 0.3);
    font-size: 16px;
    color: #D9A3AF;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

.pomo-duration-ctrl span {
    font-size: 13px;
    color: #4A3F41;
    font-weight: 600;
    min-width: 60px;
    text-align: center;
}

/* 历史记录 */
.pomo-history {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.pomo-record {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(16px);
    -webkit-backdrop-filter: saturate(180%) blur(16px);
    border-radius: 14px;
    padding: 10px 14px;
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.pomo-record-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.pomo-record-text {
    flex: 1;
    font-size: 13px;
    color: #4A3F41;
}

.pomo-record-time {
    font-size: 11px;
    color: #B8A9AC;
}

.wish-empty {
    font-size: 12px;
    color: #B8A9AC;
    text-align: center;
    padding: 16px 0;
}

.task-input-wrap {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0 8px;
}

.task-input {
    width: 100%;
    padding: 12px 16px;
    border-radius: 16px;
    border: 1px solid rgba(217, 163, 175, 0.25);
    background: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    color: #4A3F41;
    font-family: inherit;
    outline: none;
    text-align: center;
    box-sizing: border-box;
}

.task-input-btns {
    display: flex;
    gap: 8px;
}

.task-btn-skip {
    flex: 1;
    height: 40px;
    border-radius: 14px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.5);
    font-size: 13px;
    color: #B8A9AC;
    cursor: pointer;
    font-family: inherit;
}

.task-btn-start {
    flex: 2;
    height: 40px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    font-size: 13px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
}

.pomo-ai-msg {
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 16px;
    padding: 10px 16px;
    font-size: 13px;
    color: #4A3F41;
    border: 1px solid rgba(255, 240, 242, 0.5);
    text-align: center;
}

.pomo-record-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.pomo-record-task {
    font-size: 11px;
    color: #B8A9AC;
}

.fade-up-enter-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-up-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-up-enter-from {
    opacity: 0;
    transform: translateY(8px);
}

.fade-up-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
