<template>
    <!-- 全景模式 -->
    <div v-if="viewMode === 'immersive'" class="pomo-immersive" :style="immersiveStyle">
        <div class="immersive-overlay"></div>

        <!-- 隐蔽时间 -->
        <div class="immersive-time-wrap" :class="{ 'time-hidden': !showImmersiveControls }">
            <div class="immersive-time">{{ timeDisplay }}</div>
            <div class="immersive-status">{{ isBreak ? '休息中' : (currentTask || '专注中') }}</div>
        </div>

        <!-- AI 陪伴区 -->
        <div class="immersive-ai-wrap">
            <div class="immersive-ai-avatar" @click="showAiSelect = true">
                <img v-if="currentAi.avatarUrl" :src="currentAi.avatarUrl" />
                <span v-else>{{ currentAi.avatar || '💬' }}</span>
                <div class="immersive-ai-online"></div>
            </div>
            <div class="immersive-ai-name">{{ currentAi.name }}</div>
            <Transition name="ai-bubble">
                <div v-if="aiMessage" class="immersive-ai-bubble">
                    {{ aiMessage }}
                </div>
            </Transition>
        </div>

        <!-- 进度环 -->
        <div class="immersive-ring-wrap" @click="toggleControls">
            <svg viewBox="0 0 120 120" class="immersive-ring-svg">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="4" />
                <circle cx="60" cy="60" r="52" fill="none"
                    :stroke="isBreak ? 'rgba(152,203,234,0.7)' : 'rgba(255,255,255,0.5)'" stroke-width="4"
                    stroke-linecap="round" :stroke-dasharray="ringCircumference" :stroke-dashoffset="ringOffset"
                    transform="rotate(-90 60 60)" style="transition: stroke-dashoffset 1s linear;" />
            </svg>
        </div>

        <!-- 控制区（点击显示/隐藏）-->
        <Transition name="controls-fade">
            <div v-if="showImmersiveControls" class="immersive-controls">
                <button class="immersive-btn" @click="reset">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                </button>
                <button class="immersive-btn immersive-main" @click="toggleTimer">
                    <svg v-if="!running" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                    </svg>
                </button>
                <button class="immersive-btn" @click="skip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <polygon points="5 4 15 12 5 20 5 4" />
                        <line x1="19" y1="5" x2="19" y2="19" />
                    </svg>
                </button>
            </div>
        </Transition>

        <!-- 顶部栏 -->
        <div class="immersive-topbar">
            <button class="immersive-back" @click="viewMode = 'normal'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <div class="immersive-count">第 {{ pomodoroCount }} 个 · 今日 {{ todayCount }}</div>
            <button class="immersive-back" @click="showWallpaperPicker = true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5L5 21" />
                </svg>
            </button>
        </div>

        <!-- 任务输入 -->
        <Transition name="fade-up">
            <div v-if="showTaskInput" class="immersive-task-wrap">
                <input class="immersive-task-input" v-model="currentTask" placeholder="要专注做什么？（可跳过）"
                    @keyup.enter="startTimer" autofocus />
                <div class="task-input-btns">
                    <button class="task-btn-skip" @click="startTimer">跳过</button>
                    <button class="task-btn-start" @click="startTimer">开始</button>
                </div>
            </div>
        </Transition>
    </div>

    <!-- 普通模式 -->
    <div v-else class="sub-page" :style="normalBgStyle">
        <div class="settings-blob sb-tl"></div>
        <div class="settings-blob sb-br"></div>

        <div class="settings-nav">
            <button class="settings-back" @click="$router.push('/')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <span class="settings-title">番茄钟</span>
            <button class="settings-back" @click="showWallpaperPicker = true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                </svg>
            </button>
        </div>

        <div class="sub-content">
            <!-- 模式切换 -->
            <div class="mode-switch">
                <button class="mode-btn" :class="{ active: viewMode === 'normal' }" @click="viewMode = 'normal'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                    </svg>
                    简洁
                </button>
                <button class="mode-btn" :class="{ active: viewMode === 'immersive' }" @click="viewMode = 'immersive'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                    全景
                </button>
            </div>

            <!-- AI 选择 -->
            <div class="ai-select-row" @click="showAiSelect = true">
                <div class="ai-select-avatar">
                    <img v-if="currentAi.avatarUrl" :src="currentAi.avatarUrl" />
                    <span v-else>{{ currentAi.avatar || '💬' }}</span>
                </div>
                <div class="ai-select-info">
                    <span class="ai-select-name">{{ currentAi.name }}</span>
                    <span class="ai-select-hint">陪你专注</span>
                </div>
                <div class="ai-select-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
            </div>

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

                <div class="pomodoro-count">第 {{ pomodoroCount }} 个番茄 · 今日完成 {{ todayCount }}</div>

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

                <Transition name="fade-up">
                    <div v-if="aiMessage" class="pomo-ai-msg">
                        <div class="pomo-ai-msg-avatar">
                            <img v-if="currentAi.avatarUrl" :src="currentAi.avatarUrl" />
                            <span v-else>{{ currentAi.avatar || '💬' }}</span>
                        </div>
                        <span>{{ aiMessage }}</span>
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
                <div class="settings-group-item">
                    <div class="sgi-label">AI 鼓励语</div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="aiEncourageEnabled" @change="saveSettings" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
            </div>

            <!-- 今日记录 -->
            <div class="section-label-sm">今日专注</div>
            <div class="pomo-history">
                <div v-if="todayHistory.length === 0" class="wish-empty">今天还没有完成的番茄</div>
                <div v-for="(record, idx) in todayHistory" :key="idx" class="pomo-record">
                    <div class="pomo-record-dot" :style="{ background: record.isBreak ? '#98CBEA' : '#E8C0C9' }"></div>
                    <div class="pomo-record-info">
                        <span class="pomo-record-text">{{ record.isBreak ? '休息' : '专注' }} {{ record.duration
                        }} 分钟</span>
                        <span v-if="record.task" class="pomo-record-task">{{ record.task }}</span>
                    </div>
                    <span class="pomo-record-time">{{ record.endTime }}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- AI 选择弹窗 -->
    <Teleport to="body">
        <div v-if="showAiSelect" class="ai-select-overlay" @click.self="showAiSelect = false">
            <div class="ai-select-panel">
                <div class="ai-select-header">选择陪伴的 TA</div>
                <div class="ai-select-list">
                    <div v-for="p in allPersonas" :key="p.id" class="ai-select-item"
                        :class="{ active: currentAi.id === p.id }" @click="selectAi(p)">
                        <div class="ai-item-avatar">
                            <img v-if="p.avatarUrl" :src="p.avatarUrl" />
                            <span v-else>{{ p.avatar || '💬' }}</span>
                        </div>
                        <span class="ai-item-name">{{ p.note || p.name }}</span>
                        <div v-if="currentAi.id === p.id" class="ai-item-check">✓</div>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>

    <!-- 壁纸选择 -->
    <Teleport to="body">
        <div v-if="showWallpaperPicker" class="ai-select-overlay" @click.self="showWallpaperPicker = false">
            <div class="ai-select-panel">
                <div class="ai-select-header">选择壁纸</div>
                <div class="wallpaper-options">
                    <div class="wallpaper-opt" :class="{ active: !customWallpaper }" @click="clearWallpaper">
                        <div class="wallpaper-preview default-wp">默认</div>
                    </div>
                    <div v-for="(wp, idx) in builtinWallpapers" :key="idx" class="wallpaper-opt"
                        :class="{ active: customWallpaper === wp }" @click="setWallpaper(wp)">
                        <div class="wallpaper-preview" :style="{ background: wp }"></div>
                    </div>
                </div>
                <label class="wallpaper-upload-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    上传图片
                    <input type="file" accept="image/*" style="display:none" @change="handleWallpaperUpload" />
                </label>
            </div>
        </div>
    </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '@/utils/api'

const focusDuration = ref(parseInt(localStorage.getItem('pomo_focus') || '25'))
const shortBreak = ref(parseInt(localStorage.getItem('pomo_short') || '5'))
const longBreak = ref(parseInt(localStorage.getItem('pomo_long') || '15'))
const longBreakInterval = ref(parseInt(localStorage.getItem('pomo_interval') || '4'))
const aiEncourageEnabled = ref(localStorage.getItem('pomo_ai_encourage') !== 'false')

const running = ref(false)
const isBreak = ref(false)
const pomodoroCount = ref(0)
const todayCount = ref(0)
const todayHistory = ref([])
const currentTask = ref('')
const showTaskInput = ref(false)
const aiMessage = ref('')
const viewMode = ref(localStorage.getItem('pomo_view_mode') || 'normal')
const showImmersiveControls = ref(true)
const showAiSelect = ref(false)
const showWallpaperPicker = ref(false)
const customWallpaper = ref(localStorage.getItem('pomo_wallpaper') || '')
const allPersonas = ref([])

const currentAi = ref({
    id: '',
    name: 'TA',
    avatar: '💬',
    avatarUrl: '',
})

const builtinWallpapers = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #2d3436 0%, #636e72 100%)',
]

const immersiveStyle = computed(() => {
    if (customWallpaper.value) {
        if (customWallpaper.value.startsWith('data:') || customWallpaper.value.startsWith('http')) {
            return { backgroundImage: `url(${customWallpaper.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        }
        return { background: customWallpaper.value }
    }
    return { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }
})

const normalBgStyle = computed(() => {
    if (customWallpaper.value) {
        if (customWallpaper.value.startsWith('data:') || customWallpaper.value.startsWith('http')) {
            return { backgroundImage: `url(${customWallpaper.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        }
        return { background: customWallpaper.value }
    }
    return {}
})

function toggleControls() {
    showImmersiveControls.value = !showImmersiveControls.value
}

function setWallpaper(wp) {
    customWallpaper.value = wp
    localStorage.setItem('pomo_wallpaper', wp)
    showWallpaperPicker.value = false
}

function clearWallpaper() {
    customWallpaper.value = ''
    localStorage.removeItem('pomo_wallpaper')
    showWallpaperPicker.value = false
}

function handleWallpaperUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
        customWallpaper.value = ev.target.result
        localStorage.setItem('pomo_wallpaper', ev.target.result)
        showWallpaperPicker.value = false
    }
    reader.readAsDataURL(file)
}

function selectAi(p) {
    currentAi.value = {
        id: p.id,
        name: p.note || p.name,
        avatar: p.avatar || '💬',
        avatarUrl: p.avatarUrl || '',
    }
    localStorage.setItem('pomo_ai_id', p.id)
    localStorage.setItem('pomo_ai_name', currentAi.value.name)
    localStorage.setItem('pomo_ai_avatar', currentAi.value.avatar)
    localStorage.setItem('pomo_ai_avatar_url', currentAi.value.avatarUrl)
    showAiSelect.value = false
}

async function loadPersonas() {
    try {
        const res = await api('/api/personas/all')
        allPersonas.value = await res.json()

        // 恢复上次选择的 AI
        const savedId = localStorage.getItem('pomo_ai_id')
        if (savedId) {
            const found = allPersonas.value.find(p => p.id === savedId)
            if (found) {
                currentAi.value = {
                    id: found.id,
                    name: found.note || found.name,
                    avatar: found.avatar || '💬',
                    avatarUrl: found.avatarUrl || '',
                }
                return
            }
        }

        // 默认用最近聊天的 AI
        try {
            const latestRes = await api('/api/messages/latest-persona')
            const latestData = await latestRes.json()
            const found = allPersonas.value.find(p => p.id === latestData.personaId)
            if (found) {
                currentAi.value = {
                    id: found.id,
                    name: found.note || found.name,
                    avatar: found.avatar || '💬',
                    avatarUrl: found.avatarUrl || '',
                }
            } else if (allPersonas.value.length > 0) {
                const first = allPersonas.value[0]
                currentAi.value = {
                    id: first.id,
                    name: first.note || first.name,
                    avatar: first.avatar || '💬',
                    avatarUrl: first.avatarUrl || '',
                }
            }
        } catch { }
    } catch { }
}

// AI 鼓励语（不调用后端，本地生成）
const encourageMessages = {
    start: [
        '加油，我在这里陪着你 ✿',
        '专注的你最好看了',
        '我就在这，你专心做吧',
        '一起加油，你可以的',
        '我陪着你，放心去做',
    ],
    mid: [
        '做得很好，继续保持',
        '已经过了一半了，加油',
        '看着你认真的样子，很喜欢',
        '还有一半，我陪着你',
    ],
    end: [
        '完成了！辛苦了，休息一下吧 ✿',
        '太棒了，这个番茄完成啦',
        '你真的很厉害，休息一会儿',
        '完成了，给自己鼓个掌',
    ],
    pause: [
        '休息一下也没关系的',
        '暂停了？需要我陪你说说话吗',
        '没关系，随时都可以继续',
    ],
    breakEnd: [
        '休息好了吗，准备继续了吗',
        '休息结束，要继续加油了 ✿',
        '我等你好久了，继续吧',
    ],
    reset: [
        '重新开始也没关系的',
        '没事，重来就好',
    ]
}

function getRandomMessage(type) {
    const msgs = encourageMessages[type] || []
    return msgs[Math.floor(Math.random() * msgs.length)] || ''
}

let encourageTimer = null

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

// 上报专注状态给后端（让 AI 知道用户是否在专注）
async function reportFocusStatus(isRunning) {
    try {
        await api('/api/focus/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ running: isRunning })
        })
    } catch { }
}

function sendAiMessage(message) {
    if (!aiEncourageEnabled.value) return
    aiMessage.value = message
    setTimeout(() => { aiMessage.value = '' }, 5000)
}

function saveSettings() {
    localStorage.setItem('pomo_ai_encourage', String(aiEncourageEnabled.value))
}

function startTimer() {
    showTaskInput.value = false
    running.value = true
    showImmersiveControls.value = true
    reportFocusStatus(!isBreak.value) // 专注时为 true，休息时为 false

    const taskDesc = currentTask.value ? `（任务：${currentTask.value}）` : ''
    if (!isBreak.value) {
        reportStatus('focus', `开始专注${focusDuration.value}分钟${taskDesc}`)
        sendAiMessage(getRandomMessage('start'))

        // 中途鼓励（专注一半时）
        if (aiEncourageEnabled.value) {
            encourageTimer = setTimeout(() => {
                if (running.value && !isBreak.value) {
                    sendAiMessage(getRandomMessage('mid'))
                }
            }, (totalSeconds.value / 2) * 1000)
        }
    } else {
        const breakMin = pomodoroCount.value % longBreakInterval.value === 0 ? longBreak.value : shortBreak.value
        reportStatus('focus', `开始休息${breakMin}分钟`)
    }

    // 控制区自动隐藏（全景模式下3秒后隐藏）
    if (viewMode.value === 'immersive') {
        setTimeout(() => { showImmersiveControls.value = false }, 3000)
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
    clearTimeout(encourageTimer)
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
        sendAiMessage(getRandomMessage('end'))
        reportFocusStatus(false) // 专注结束，休息开始
    } else {
        reportStatus('focus', `休息${duration}分钟结束`)
        sendAiMessage(getRandomMessage('breakEnd'))
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

    setTimeout(() => { startTimer() }, 2000)
}

function toggleTimer() {
    if (running.value) {
        clearInterval(timer)
        clearTimeout(encourageTimer)
        running.value = false
        const elapsed = Math.floor((totalSeconds.value - remaining.value) / 60)
        const taskDesc = currentTask.value ? `（任务：${currentTask.value}）` : ''
        reportStatus('focus', `暂停专注${taskDesc}，已进行${elapsed}分钟`)
        sendAiMessage(getRandomMessage('pause'))
        reportFocusStatus(false) // 暂停时清除专注状态
        if (viewMode.value === 'immersive') {
            showImmersiveControls.value = true
        }
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
    clearTimeout(encourageTimer)
    running.value = false
    const elapsed = Math.floor((totalSeconds.value - remaining.value) / 60)
    if (elapsed > 0) {
        const taskDesc = currentTask.value ? `（任务：${currentTask.value}）` : ''
        reportStatus('focus', `中断专注${taskDesc}，已进行${elapsed}分钟`)
        sendAiMessage(getRandomMessage('reset'))
    }
    reportFocusStatus(false) // 重置时清除专注状态
    isBreak.value = false
    pomodoroCount.value = 0
    currentTask.value = ''
    totalSeconds.value = focusDuration.value * 60
    remaining.value = totalSeconds.value
    if (viewMode.value === 'immersive') {
        showImmersiveControls.value = true
    }
}

function skip() {
    clearInterval(timer)
    clearTimeout(encourageTimer)
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

onMounted(() => {
    checkDayReset()
    loadPersonas()
    // 恢复上次模式
    const savedMode = localStorage.getItem('pomo_view_mode')
    if (savedMode) viewMode.value = savedMode
})

onUnmounted(() => {
    clearInterval(timer)
    clearTimeout(encourageTimer)
    reportFocusStatus(false) // 离开页面时清除状态

})
</script>

<style scoped>
/* ===== 基础 ===== */
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

/* ===== 模式切换 ===== */
.mode-switch {
    display: flex;
    gap: 8px;
    padding: 12px 0 4px;
}

.mode-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    border-radius: 16px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    font-size: 13px;
    color: #B8A9AC;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
}

.mode-btn svg {
    width: 15px;
    height: 15px;
    stroke: currentColor;
}

.mode-btn.active {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    border-color: transparent;
}

/* ===== AI 选择行 ===== */
.ai-select-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-radius: 18px;
    padding: 12px 16px;
    border: 1px solid rgba(255, 240, 242, 0.4);
    cursor: pointer;
    margin-bottom: 4px;
}

.ai-select-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba(255, 233, 237, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    overflow: hidden;
    flex-shrink: 0;
    border: 2px solid rgba(255, 255, 255, 0.8);
}

.ai-select-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.ai-select-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.ai-select-name {
    font-size: 14px;
    font-weight: 600;
    color: #4A3F41;
}

.ai-select-hint {
    font-size: 11px;
    color: #B8A9AC;
}

.ai-select-arrow svg {
    width: 14px;
    height: 14px;
    stroke: #D4C8CA;
}

/* ===== 计时器 ===== */
.pomodoro-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 0 8px;
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

/* ===== AI 消息 ===== */
.pomo-ai-msg {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 16px;
    padding: 10px 14px;
    font-size: 13px;
    color: #4A3F41;
    border: 1px solid rgba(255, 240, 242, 0.5);
    max-width: 280px;
}

.pomo-ai-msg-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(255, 233, 237, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    overflow: hidden;
    flex-shrink: 0;
}

.pomo-ai-msg-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* ===== 时长设置 ===== */
.settings-group {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 22px;
    overflow: hidden;
    margin-bottom: 10px;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.1);
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
}

.pomo-duration-ctrl span {
    font-size: 13px;
    color: #4A3F41;
    font-weight: 600;
    min-width: 60px;
    text-align: center;
}

/* ===== Toggle ===== */
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

/* ===== 历史记录 ===== */
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
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
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

.pomo-record-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.pomo-record-text {
    font-size: 13px;
    color: #4A3F41;
}

.pomo-record-task {
    font-size: 11px;
    color: #B8A9AC;
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

/* ===== 任务输入 ===== */
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

/* ===== 全景模式 ===== */
.pomo-immersive {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-sizing: border-box;
}

.immersive-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    z-index: 0;
}

.immersive-topbar {
    position: absolute;
    top: env(safe-area-inset-top, 44px);
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    z-index: 10;
}

.immersive-back {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.immersive-back svg {
    width: 16px;
    height: 16px;
    stroke: white;
}

.immersive-count {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
}

/* AI 陪伴区 */
.immersive-ai-wrap {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 120px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 5;
}

.immersive-ai-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    overflow: hidden;
    border: 2px solid rgba(255, 255, 255, 0.3);
    cursor: pointer;
    position: relative;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.immersive-ai-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.immersive-ai-online {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #6BAF7A;
    border: 2px solid rgba(0, 0, 0, 0.3);
}

.immersive-ai-name {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
}

.immersive-ai-bubble {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 18px;
    padding: 10px 16px;
    font-size: 13px;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    max-width: 240px;
    text-align: center;
}

/* 时间显示 */
.immersive-time-wrap {
    position: absolute;
    top: calc(env(safe-area-inset-top, 44px) + 60px);
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    z-index: 5;
    transition: opacity 0.5s ease;
}

.immersive-time-wrap.time-hidden {
    opacity: 0.15;
}

.immersive-time {
    font-size: 64px;
    font-weight: 800;
    color: white;
    letter-spacing: -2px;
    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
}

.immersive-status {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    letter-spacing: 1px;
}

/* 进度环 */
.immersive-ring-wrap {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3;
    cursor: pointer;
}

.immersive-ring-svg {
    width: 280px;
    height: 280px;
    opacity: 0.6;
}

/* 控制区 */
.immersive-controls {
    position: absolute;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 40px);
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    z-index: 10;
}

.immersive-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

.immersive-btn svg {
    width: 16px;
    height: 16px;
    stroke: white;
}

.immersive-btn:active {
    transform: scale(0.92);
}

.immersive-main {
    width: 64px;
    height: 64px;
    background: rgba(255, 255, 255, 0.25);
}

.immersive-main svg {
    width: 24px;
    height: 24px;
    fill: white;
    stroke: none;
}

/* 全景任务输入 */
.immersive-task-wrap {
    position: absolute;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 120px);
    left: 24px;
    right: 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 20;
}

.immersive-task-input {
    width: 100%;
    padding: 14px 18px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    font-size: 15px;
    color: white;
    font-family: inherit;
    outline: none;
    text-align: center;
    box-sizing: border-box;
}

.immersive-task-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
}

/* ===== AI 选择弹窗 ======== */
.ai-select-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(74, 63, 65, 0.3);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-end;
    padding: 0 16px calc(env(safe-area-inset-bottom, 0px) + 16px);
}

.ai-select-panel {
    background: rgba(255, 252, 252, 0.97);
    border-radius: 28px;
    width: 100%;
    max-height: 60vh;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 20px 60px rgba(217, 163, 175, 0.2);
    animation: slideUp 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.ai-select-panel::-webkit-scrollbar {
    display: none;
}

@keyframes slideUp {
    from {
        transform: translateY(40px);
        opacity: 0;
    }

    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.ai-select-header {
    font-size: 16px;
    font-weight: 700;
    color: #4A3F41;
    text-align: center;
}

.ai-select-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.ai-select-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 16px;
    border: 1px solid rgba(217, 163, 175, 0.15);
    background: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: all 0.15s;
}

.ai-select-item.active {
    background: rgba(232, 192, 201, 0.15);
    border-color: rgba(217, 163, 175, 0.4);
}

.ai-item-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 233, 237, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    overflow: hidden;
    flex-shrink: 0;
    border: 2px solid rgba(255, 255, 255, 0.8);
}

.ai-item-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.ai-item-name {
    flex: 1;
    font-size: 14px;
    color: #4A3F41;
    font-weight: 500;
}

.ai-item-check {
    font-size: 14px;
    color: #D9A3AF;
    font-weight: 700;
}

/* ===== 壁纸选择 ===== */
.wallpaper-options {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
}

.wallpaper-opt {
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s;
    aspect-ratio: 1;
}

.wallpaper-opt.active {
    border-color: #D9A3AF;
    transform: scale(0.95);
}

.wallpaper-preview {
    width: 100%;
    height: 100%;
    min-height: 60px;
    border-radius: 10px;
}

.default-wp {
    background: linear-gradient(180deg, #FFFBFA 0%, #FFE9ED 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: #B8A9AC;
}

.wallpaper-upload-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 44px;
    border-radius: 14px;
    border: 1px dashed rgba(217, 163, 175, 0.4);
    background: rgba(255, 255, 255, 0.4);
    font-size: 13px;
    color: #B8A9AC;
    cursor: pointer;
    font-family: inherit;
}

.wallpaper-upload-btn svg {
    width: 16px;
    height: 16px;
    stroke: #B8A9AC;
}

/* ===== 过渡动画 ===== */
.fade-up-enter-active,
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

.ai-bubble-enter-active,
.ai-bubble-leave-active {
    transition: opacity 0.4s ease, transform 0.4s ease;
}

.ai-bubble-enter-from {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
}

.ai-bubble-leave-to {
    opacity: 0;
    transform: translateY(-5px) scale(0.95);
}

.controls-fade-enter-active,
.controls-fade-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.controls-fade-enter-from {
    opacity: 0;
    transform: translateY(10px);
}

.controls-fade-leave-to {
    opacity: 0;
    transform: translateY(10px);
}
</style>
