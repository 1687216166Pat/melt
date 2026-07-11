<template>
    <div class="presence-page">
        <div class="settings-blob sb-tl"></div>
        <div class="settings-blob sb-br"></div>

        <div class="settings-nav">
            <button class="settings-back" @click="$router.push('/')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <span class="settings-title">相遇</span>
            <div style="width:36px;"></div>
        </div>

        <div class="presence-tabs">
            <button class="presence-tab" :class="{ active: currentTab === 'char' }" @click="currentTab = 'char'">
                <div class="tab-avatar">
                    <img v-if="charAvatarUrl" :src="charAvatarUrl" />
                    <span v-else>{{ charAvatar || '💬' }}</span>
                </div>
                {{ charName }}
            </button>
            <button class="presence-tab" :class="{ active: currentTab === 'user' }" @click="currentTab = 'user'">
                <div class="tab-avatar">
                    <img v-if="userAvatar && (userAvatar.startsWith('http') || userAvatar.startsWith('data'))"
                        :src="userAvatar" />
                    <span v-else>{{ userAvatar || '🌙' }}</span>
                </div>
                {{ userName }}
            </button>
        </div>

        <div class="presence-content">

            <!-- Char Tab -->
            <template v-if="currentTab === 'char'">
                <div class="map-card">
                    <MapCanvas :map="charMap" :locations="charLocations" :paths="charPaths"
                        :current-location="charCurrentLocation" :edit-mode="charEditMode" :draw-mode="charDrawMode"
                        :placing-pin="charPlacingPin" @location-click="setCharLocation"
                        @location-drag="handleCharLocationDrag" @path-drawn="handleCharPathDrawn"
                        @pin-placed="handleCharPinPlaced" @open-bg-edit="showCharMapEdit = true" />
                    <div class="map-toolbar">
                        <button class="tool-btn" :class="{ active: charEditMode }"
                            @click="charEditMode = !charEditMode; charDrawMode = null; charPlacingPin = false">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            编辑
                        </button>
                        <button v-if="charEditMode" class="tool-btn" :class="{ active: charPlacingPin }"
                            @click="charPlacingPin = !charPlacingPin; charDrawMode = null">
                            📍 放置标记
                        </button>
                        <button v-if="charEditMode" class="tool-btn" :class="{ active: charDrawMode === 'polygon' }"
                            @click="charDrawMode = charDrawMode === 'polygon' ? null : 'polygon'; charPlacingPin = false">
                            ✏️ 手绘区域
                        </button>
                        <button v-if="charEditMode" class="tool-btn" :class="{ active: charDrawMode === 'circle' }"
                            @click="charDrawMode = charDrawMode === 'circle' ? null : 'circle'; charPlacingPin = false">
                            ⭕ 圆形
                        </button>
                        <button v-if="charEditMode" class="tool-btn accent" @click="showCharMapEdit = true">
                            🖼️ 背景
                        </button>
                    </div>
                </div>

                <div class="phone-card">
                    <div class="phone-header">
                        <div class="phone-avatar">
                            <img v-if="charAvatarUrl" :src="charAvatarUrl" />
                            <span v-else>{{ charAvatar || '💬' }}</span>
                        </div>
                        <div class="phone-info">
                            <span class="phone-name">{{ charName }}的手机</span>
                            <span class="phone-status online">在线</span>
                        </div>
                        <div class="phone-battery">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round">
                                <rect x="2" y="7" width="18" height="11" rx="2" />
                                <path d="M22 11v3" />
                            </svg>
                            {{ charBattery }}%
                        </div>
                    </div>
                    <div class="phone-rows">
                        <div class="phone-row">
                            <span class="phone-row-label">当前位置</span>
                            <span class="phone-row-value">{{ charCurrentLocation || '未设置' }}</span>
                        </div>
                        <div class="phone-row">
                            <span class="phone-row-label">环境</span>
                            <span class="phone-row-value">{{ charEnvironment }}</span>
                        </div>
                    </div>
                </div>

                <div class="section-label-sm">到达记录</div>
                <div v-if="charArrivalLogs.length === 0" class="empty-row">暂无记录</div>
                <div v-else class="arrival-list">
                    <div v-for="log in charArrivalLogs" :key="log.id" class="arrival-item">
                        <span class="arrival-icon">📍</span>
                        <span class="arrival-place">{{ log.location_name }}</span>
                        <span class="arrival-time">{{ formatTime(log.arrived_at) }}</span>
                    </div>
                </div>
            </template>

            <!-- User Tab -->
            <template v-if="currentTab === 'user'">
                <div class="map-card">
                    <MapCanvas :map="userMap" :locations="userLocations" :paths="userPaths"
                        :current-location="userCurrentLocation" :edit-mode="userEditMode" :draw-mode="userDrawMode"
                        :placing-pin="userPlacingPin" @location-click="setUserLocation"
                        @location-drag="handleUserLocationDrag" @path-drawn="handleUserPathDrawn"
                        @pin-placed="handleUserPinPlaced" @open-bg-edit="showUserMapEdit = true" />
                    <div class="map-toolbar">
                        <button class="tool-btn" :class="{ active: userEditMode }"
                            @click="userEditMode = !userEditMode; userDrawMode = null; userPlacingPin = false">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            编辑
                        </button>
                        <button v-if="userEditMode" class="tool-btn" :class="{ active: userPlacingPin }"
                            @click="userPlacingPin = !userPlacingPin; userDrawMode = null">
                            📍 放置标记
                        </button>
                        <button v-if="userEditMode" class="tool-btn" :class="{ active: userDrawMode === 'polygon' }"
                            @click="userDrawMode = userDrawMode === 'polygon' ? null : 'polygon'; userPlacingPin = false">
                            ✏️ 手绘区域
                        </button>
                        <button v-if="userEditMode" class="tool-btn" :class="{ active: userDrawMode === 'circle' }"
                            @click="userDrawMode = userDrawMode === 'circle' ? null : 'circle'; userPlacingPin = false">
                            ⭕ 圆形
                        </button>
                        <button v-if="userEditMode" class="tool-btn accent" @click="showUserMapEdit = true">
                            🖼️ 背景
                        </button>
                    </div>
                </div>

                <div class="phone-card">
                    <div class="phone-header">
                        <div class="phone-avatar">
                            <img v-if="userAvatar && (userAvatar.startsWith('http') || userAvatar.startsWith('data'))"
                                :src="userAvatar" />
                            <span v-else>{{ userAvatar || '🌙' }}</span>
                        </div>
                        <div class="phone-info">
                            <span class="phone-name">{{ userName }}的手机</span>
                            <span class="phone-status online">在线</span>
                        </div>
                        <div class="phone-battery">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round">
                                <rect x="2" y="7" width="18" height="11" rx="2" />
                                <path d="M22 11v3" />
                            </svg>
                            {{ myBattery }}%
                        </div>
                    </div>
                    <div class="phone-rows">
                        <div class="phone-row">
                            <span class="phone-row-label">当前位置</span>
                            <span class="phone-row-value">{{ userCurrentLocation || '未设置' }}</span>
                        </div>
                        <div class="phone-row">
                            <span class="phone-row-label">环境</span>
                            <span class="phone-row-value">{{ myEnvironment }}</span>
                        </div>
                    </div>
                </div>

                <div class="section-label-sm">到达记录</div>
                <div v-if="userArrivalLogs.length === 0" class="empty-row">暂无记录</div>
                <div v-else class="arrival-list">
                    <div v-for="log in userArrivalLogs" :key="log.id" class="arrival-item">
                        <span class="arrival-icon">📍</span>
                        <span class="arrival-place">{{ log.location_name }}</span>
                        <span class="arrival-time">{{ formatTime(log.arrived_at) }}</span>
                    </div>
                </div>
            </template>

        </div>

        <!-- 放置标记命名弹窗 -->
        <Teleport to="body">
            <div v-if="showPinNameDialog" class="pin-dialog-overlay" @click.self="showPinNameDialog = false">
                <div class="pin-dialog">
                    <div class="pin-dialog-title">为这个地点命名</div>
                    <input class="pin-dialog-input" v-model="pendingPinName" placeholder="地点名称，如：家、咖啡店..."
                        @keyup.enter="confirmPin" autofocus />
                    <div class="pin-dialog-row">
                        <span class="pin-dialog-label">图标</span>
                        <div class="icon-picker">
                            <button v-for="ic in iconOptions" :key="ic" class="icon-opt"
                                :class="{ active: pendingPinIcon === ic }" @click="pendingPinIcon = ic">{{ ic
                                }}</button>
                        </div>
                    </div>
                    <div class="pin-dialog-btns">
                        <button class="pin-btn-cancel" @click="showPinNameDialog = false">取消</button>
                        <button class="pin-btn-confirm" @click="confirmPin">确定</button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- 手绘区域命名弹窗 -->
        <Teleport to="body">
            <div v-if="showPathNameDialog" class="pin-dialog-overlay" @click.self="showPathNameDialog = false">
                <div class="pin-dialog">
                    <div class="pin-dialog-title">为这片区域命名</div>
                    <input class="pin-dialog-input" v-model="pendingPathName" placeholder="区域名称，如：商业街、公园..."
                        @keyup.enter="confirmPath" autofocus />
                    <div class="pin-dialog-row">
                        <span class="pin-dialog-label">颜色</span>
                        <div class="color-picker">
                            <button v-for="c in colorOptions" :key="c" class="color-opt"
                                :class="{ active: pendingPathColor === c }" :style="{ background: c }"
                                @click="pendingPathColor = c"></button>
                        </div>
                    </div>
                    <div class="pin-dialog-btns">
                        <button class="pin-btn-cancel" @click="showPathNameDialog = false">取消</button>
                        <button class="pin-btn-confirm" @click="confirmPath">确定</button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- Char 背景编辑弹窗 -->
        <Teleport to="body">
            <div v-if="showCharMapEdit" class="map-edit-overlay" @click.self="showCharMapEdit = false">
                <div class="map-edit-panel">
                    <div class="map-edit-header">
                        <span>{{ charName }} 的地图背景</span>
                        <button @click="showCharMapEdit = false">×</button>
                    </div>
                    <div class="map-edit-body">
                        <div class="edit-row">
                            <span class="edit-label">图片链接</span>
                            <input class="edit-input" v-model="charMapBgUrl" placeholder="粘贴图片 URL..." />
                        </div>
                        <div class="edit-row">
                            <span class="edit-label">或上传图片</span>
                            <label class="upload-btn">
                                选择文件
                                <input type="file" accept="image/*" style="display:none"
                                    @change="handleCharMapUpload" />
                            </label>
                        </div>
                        <div class="edit-divider">✨ AI 生成地图</div>
                        <div class="edit-row">
                            <span class="edit-label">描述场景</span>
                            <textarea class="edit-textarea" v-model="aiMapPrompt"
                                placeholder="例如：一个温馨的小镇，有咖啡店、书店、公园和住宅区..."></textarea>
                        </div>
                        <div class="edit-row">
                            <span class="edit-label">风格</span>
                            <div class="style-picker">
                                <button v-for="s in mapStyles" :key="s.value" class="style-opt"
                                    :class="{ active: aiMapStyle === s.value }" @click="aiMapStyle = s.value">{{ s.label
                                    }}</button>
                            </div>
                        </div>
                        <button class="edit-ai-btn" @click="generateCharMap" :disabled="aiGenerating">
                            {{ aiGenerating ? '生成中...' : '✨ AI 生成' }}
                        </button>
                        <div v-if="aiError" class="ai-error">{{ aiError }}</div>
                        <button class="edit-save-btn" @click="saveCharMap">保存背景</button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- User 背景编辑弹窗 -->
        <Teleport to="body">
            <div v-if="showUserMapEdit" class="map-edit-overlay" @click.self="showUserMapEdit = false">
                <div class="map-edit-panel">
                    <div class="map-edit-header">
                        <span>我的地图背景</span>
                        <button @click="showUserMapEdit = false">×</button>
                    </div>
                    <div class="map-edit-body">
                        <div class="edit-row">
                            <span class="edit-label">图片链接</span>
                            <input class="edit-input" v-model="userMapBgUrl" placeholder="粘贴图片 URL..." />
                        </div>
                        <div class="edit-row">
                            <span class="edit-label">或上传图片</span>
                            <label class="upload-btn">
                                选择文件
                                <input type="file" accept="image/*" style="display:none"
                                    @change="handleUserMapUpload" />
                            </label>
                        </div>
                        <div class="edit-divider">✨ AI 生成地图</div>
                        <div class="edit-row">
                            <span class="edit-label">描述场景</span>
                            <textarea class="edit-textarea" v-model="aiMapPrompt"
                                placeholder="例如：一个温馨的小镇，有咖啡店、书店、公园和住宅区..."></textarea>
                        </div>
                        <div class="edit-row">
                            <span class="edit-label">风格</span>
                            <div class="style-picker">
                                <button v-for="s in mapStyles" :key="s.value" class="style-opt"
                                    :class="{ active: aiMapStyle === s.value }" @click="aiMapStyle = s.value">{{ s.label
                                    }}</button>
                            </div>
                        </div>
                        <button class="edit-ai-btn" @click="generateUserMap" :disabled="aiGenerating">
                            {{ aiGenerating ? '生成中...' : '✨ AI 生成' }}
                        </button>
                        <div v-if="aiError" class="ai-error">{{ aiError }}</div>
                        <button class="edit-save-btn" @click="saveUserMap">保存背景</button>
                    </div>
                </div>
            </div>
        </Teleport>

    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api'
import MapCanvas from '@/components/MapCanvas.vue'

const currentTab = ref('char')

const charName = ref('TA')
const charAvatar = ref('💬')
const charAvatarUrl = ref('')
const charPersonaId = ref('')
const charBattery = ref(88)
const charEnvironment = ref('安静的房间')
const charCurrentLocation = ref('')
const charMap = ref({})
const charLocations = ref([])
const charPaths = ref([])
const charArrivalLogs = ref([])
const charEditMode = ref(false)
const charDrawMode = ref(null)
const charPlacingPin = ref(false)
const showCharMapEdit = ref(false)
const charMapBgUrl = ref('')

const userName = ref(localStorage.getItem('user_name') || '我')
const userAvatar = ref(localStorage.getItem('home_user_avatar') || '')
const myBattery = ref(0)
const myEnvironment = ref('未知')
const userCurrentLocation = ref('')
const userMap = ref({})
const userLocations = ref([])
const userPaths = ref([])
const userArrivalLogs = ref([])
const userEditMode = ref(false)
const userDrawMode = ref(null)
const userPlacingPin = ref(false)
const showUserMapEdit = ref(false)
const userMapBgUrl = ref('')

const showPinNameDialog = ref(false)
const pendingPinName = ref('')
const pendingPinIcon = ref('📍')
const pendingPinPos = ref({ x: 0.5, y: 0.5 })
const pendingPinTarget = ref('char')

const showPathNameDialog = ref(false)
const pendingPathName = ref('')
const pendingPathColor = ref('#D9A3AF')
const pendingPathPoints = ref([])
const pendingPathTarget = ref('char')

const aiMapPrompt = ref('')
const aiMapStyle = ref('cute')
const aiGenerating = ref(false)
const aiError = ref('')

const iconOptions = ['📍', '🏠', '☕', '🌳', '🏪', '🏫', '🌸', '⭐', '💝', '🎪', '🏖️', '🌙']
const colorOptions = ['#D9A3AF', '#98CBEA', '#A8D5A2', '#F5C17A', '#B8A0C8', '#F0A0A0']
const mapStyles = [
    { value: 'cute', label: '可爱插画' },
    { value: 'fantasy', label: '奇幻手绘' },
    { value: 'minimal', label: '简约线稿' },
]

function formatTime(ts) {
    if (!ts) return ''
    const now = new Date()
    const t = new Date(ts)
    const diff = now - t
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins}分钟前`
    if (hours < 24) return `${hours}小时前`
    return `${days}天前`
}

async function loadCharData() {
    try {
        const latestRes = await api('/api/messages/latest-persona')
        const latestData = await latestRes.json()
        charPersonaId.value = latestData.personaId || 'xiaorou'
        const detailRes = await api(`/api/persona/${charPersonaId.value}`)
        const detail = await detailRes.json()
        charName.value = detail.note || detail.name || 'TA'
        charAvatar.value = detail.avatar || '💬'
        charAvatarUrl.value = detail.avatarUrl || detail.avatar_url || ''
    } catch { }

    try {
        const res = await api(`/api/virtual-map/persona/${charPersonaId.value}`)
        const data = await res.json()
        charMap.value = data.map || {}
        charLocations.value = data.locations || []
        charMapBgUrl.value = charMap.value.background_url || ''
    } catch { }

    if (charMap.value?.id) {
        try {
            const res = await api(`/api/map-paths/${charMap.value.id}`)
            charPaths.value = await res.json()
        } catch { }
    }

    try {
        const res = await api(`/api/location-logs/persona/${charPersonaId.value}`)
        charArrivalLogs.value = await res.json()
        if (charArrivalLogs.value.length > 0) {
            charCurrentLocation.value = charArrivalLogs.value[0].location_name
        }
    } catch { }
}

async function loadUserData() {
    try {
        const res = await api('/api/virtual-map/user/default_user')
        const data = await res.json()
        userMap.value = data.map || {}
        userLocations.value = data.locations || []
        userMapBgUrl.value = userMap.value.background_url || ''
    } catch { }

    if (userMap.value?.id) {
        try {
            const res = await api(`/api/map-paths/${userMap.value.id}`)
            userPaths.value = await res.json()
        } catch { }
    }

    try {
        const res = await api('/api/location-logs/user/default_user')
        userArrivalLogs.value = await res.json()
        if (userArrivalLogs.value.length > 0) {
            userCurrentLocation.value = userArrivalLogs.value[0].location_name
        }
    } catch { }

    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery()
            myBattery.value = Math.round(battery.level * 100)
        } catch { }
    }
}

async function handleCharLocationDrag({ id, x, y }) {
    await api(`/api/map-location/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y })
    })
    const loc = charLocations.value.find(l => l.id === id)
    if (loc) { loc.x = x; loc.y = y }
}

async function handleUserLocationDrag({ id, x, y }) {
    await api(`/api/map-location/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y })
    })
    const loc = userLocations.value.find(l => l.id === id)
    if (loc) { loc.x = x; loc.y = y }
}

function handleCharPinPlaced({ x, y }) {
    pendingPinPos.value = { x, y }
    pendingPinTarget.value = 'char'
    pendingPinName.value = ''
    pendingPinIcon.value = '📍'
    showPinNameDialog.value = true
}

function handleUserPinPlaced({ x, y }) {
    pendingPinPos.value = { x, y }
    pendingPinTarget.value = 'user'
    pendingPinName.value = ''
    pendingPinIcon.value = '📍'
    showPinNameDialog.value = true
}

async function confirmPin() {
    if (!pendingPinName.value.trim()) return
    let targetMapId = pendingPinTarget.value === 'char' ? charMap.value?.id : userMap.value?.id
    if (!targetMapId) {
        if (pendingPinTarget.value === 'char') await ensureCharMap()
        else await ensureUserMap()
        targetMapId = pendingPinTarget.value === 'char' ? charMap.value?.id : userMap.value?.id
    }
    if (!targetMapId) return
    await api('/api/map-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mapId: targetMapId,
            locationName: pendingPinName.value.trim(),
            x: pendingPinPos.value.x,
            y: pendingPinPos.value.y,
            icon: pendingPinIcon.value
        })
    })
    showPinNameDialog.value = false
    if (pendingPinTarget.value === 'char') {
        charPlacingPin.value = false
        await loadCharData()
    } else {
        userPlacingPin.value = false
        await loadUserData()
    }
}

function handleCharPathDrawn(points) {
    pendingPathPoints.value = points
    pendingPathTarget.value = 'char'
    pendingPathName.value = ''
    pendingPathColor.value = '#D9A3AF'
    showPathNameDialog.value = true
}

function handleUserPathDrawn(points) {
    pendingPathPoints.value = points
    pendingPathTarget.value = 'user'
    pendingPathName.value = ''
    pendingPathColor.value = '#98CBEA'
    showPathNameDialog.value = true
}

async function confirmPath() {
    if (!pendingPathName.value.trim()) return
    const isChar = pendingPathTarget.value === 'char'
    let targetMapId = isChar ? charMap.value?.id : userMap.value?.id
    if (!targetMapId) {
        if (isChar) await ensureCharMap()
        else await ensureUserMap()
        targetMapId = isChar ? charMap.value?.id : userMap.value?.id
    }
    if (!targetMapId) return
    const existingPaths = isChar ? charPaths.value : userPaths.value
    const newPaths = [
        ...existingPaths,
        {
            name: pendingPathName.value.trim(),
            type: 'polygon',
            points: pendingPathPoints.value,
            color: pendingPathColor.value
        }
    ]
    await api('/api/map-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId: targetMapId, paths: newPaths })
    })
    showPathNameDialog.value = false
    if (isChar) {
        charDrawMode.value = null
        await loadCharData()
    } else {
        userDrawMode.value = null
        await loadUserData()
    }
}

async function ensureCharMap() {
    await api('/api/virtual-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ownerType: 'persona',
            ownerId: charPersonaId.value,
            mapName: `${charName.value}的地图`,
            backgroundUrl: ''
        })
    })
    await loadCharData()
}

async function ensureUserMap() {
    await api('/api/virtual-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ownerType: 'user',
            ownerId: 'default_user',
            mapName: '我的地图',
            backgroundUrl: ''
        })
    })
    await loadUserData()
}

async function setCharLocation(loc) {
    charCurrentLocation.value = loc.location_name
    await api('/api/location-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerType: 'persona', ownerId: charPersonaId.value, locationName: loc.location_name })
    })
    await loadCharData()
}

async function setUserLocation(loc) {
    userCurrentLocation.value = loc.location_name
    await api('/api/location-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerType: 'user', ownerId: 'default_user', locationName: loc.location_name })
    })
    await loadUserData()
}

function handleCharMapUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => { charMapBgUrl.value = e.target.result }
    reader.readAsDataURL(file)
}

function handleUserMapUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => { userMapBgUrl.value = e.target.result }
    reader.readAsDataURL(file)
}

async function saveCharMap() {
    await api('/api/virtual-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ownerType: 'persona',
            ownerId: charPersonaId.value,
            mapName: `${charName.value}的地图`,
            backgroundUrl: charMapBgUrl.value
        })
    })
    await loadCharData()
    showCharMapEdit.value = false
}

async function saveUserMap() {
    await api('/api/virtual-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ownerType: 'user',
            ownerId: 'default_user',
            mapName: '我的地图',
            backgroundUrl: userMapBgUrl.value
        })
    })
    await loadUserData()
    showUserMapEdit.value = false
}

async function generateCharMap() {
    if (!aiMapPrompt.value.trim()) { aiError.value = '请描述地图场景'; return }
    aiGenerating.value = true
    aiError.value = ''
    try {
        const res = await api('/api/map-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: aiMapPrompt.value, style: aiMapStyle.value })
        })
        const data = await res.json()
        if (data.url) {
            charMapBgUrl.value = data.url
        } else {
            aiError.value = data.error || '生成失败，请重试'
        }
    } catch {
        aiError.value = '网络错误，请重试'
    } finally {
        aiGenerating.value = false
    }
}

async function generateUserMap() {
    if (!aiMapPrompt.value.trim()) { aiError.value = '请描述地图场景'; return }
    aiGenerating.value = true
    aiError.value = ''
    try {
        const res = await api('/api/map-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: aiMapPrompt.value, style: aiMapStyle.value })
        })
        const data = await res.json()
        if (data.url) {
            userMapBgUrl.value = data.url
        } else {
            aiError.value = data.error || '生成失败，请重试'
        }
    } catch {
        aiError.value = '网络错误，请重试'
    } finally {
        aiGenerating.value = false
    }
}

onMounted(() => {
    loadCharData()
    loadUserData()
})
</script>

<style scoped>
.presence-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
    background: linear-gradient(180deg, #FFFBFA 0%, #FFF0F2 60%, #FFE9ED 100%);
    box-sizing: border-box;
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
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
    margin-top: env(safe-area-inset-top, 44px);
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

.presence-tabs {
    display: flex;
    gap: 10px;
    padding: 12px 16px;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}

.presence-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 18px;
    border: 1px solid rgba(255, 240, 242, 0.4);
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(16px);
    -webkit-backdrop-filter: saturate(180%) blur(16px);
    cursor: pointer;
    font-size: 13px;
    color: #B8A9AC;
    font-family: inherit;
    transition: all 0.2s;
}

.presence-tab.active {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    border-color: transparent;
}

.tab-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 233, 237, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    overflow: hidden;
    flex-shrink: 0;
}

.tab-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.presence-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
    position: relative;
    z-index: 1;
}

.presence-content::-webkit-scrollbar {
    display: none;
}

.map-card {
    border-radius: 24px;
    overflow: hidden;
    margin-bottom: 14px;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.15);
}

.map-toolbar {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    overflow-x: auto;
}

.map-toolbar::-webkit-scrollbar {
    display: none;
}

.tool-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    border-radius: 14px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    color: #B8A9AC;
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
    transition: all 0.2s;
    flex-shrink: 0;
}

.tool-btn svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
}

.tool-btn.active {
    background: rgba(217, 163, 175, 0.15);
    color: #D9A3AF;
    border-color: rgba(217, 163, 175, 0.4);
}

.tool-btn.accent {
    background: linear-gradient(135deg, rgba(232, 192, 201, 0.3), rgba(217, 163, 175, 0.3));
    color: #D9A3AF;
    border-color: rgba(217, 163, 175, 0.3);
}

.phone-card {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 22px;
    padding: 16px;
    margin-bottom: 14px;
    border: 1px solid rgba(255, 240, 242, 0.4);
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.1);
}

.phone-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
}

.phone-avatar {
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

.phone-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.phone-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.phone-name {
    font-size: 14px;
    font-weight: 600;
    color: #4A3F41;
}

.phone-status.online {
    color: #6BAF7A;
}

.phone-status.offline {
    color: #D4C8CA;
}

.phone-battery {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #B8A9AC;
    flex-shrink: 0;
}

.phone-battery svg {
    width: 16px;
    height: 16px;
}

.phone-rows {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.phone-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
}

.phone-row:last-child {
    border-bottom: none;
}

.phone-row-label {
    font-size: 13px;
    color: #B8A9AC;
}

.phone-row-value {
    font-size: 13px;
    color: #4A3F41;
    font-weight: 500;
}

.section-label-sm {
    font-size: 11px;
    font-weight: 700;
    color: #B8A9AC;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    padding: 0 4px 8px;
    margin-top: 16px;
}

.empty-row {
    font-size: 12px;
    color: #D4C8CA;
    text-align: center;
    padding: 12px 0;
}

.arrival-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
}

.arrival-item {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(16px);
    -webkit-backdrop-filter: saturate(180%) blur(16px);
    border-radius: 16px;
    padding: 10px 14px;
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.arrival-icon {
    font-size: 18px;
    flex-shrink: 0;
}

.arrival-place {
    flex: 1;
    font-size: 13px;
    color: #4A3F41;
    font-weight: 500;
}

.arrival-time {
    font-size: 11px;
    color: #B8A9AC;
    flex-shrink: 0;
}

/* 弹窗 */
.pin-dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 602;
    background: rgba(74, 63, 65, 0.25);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

.pin-dialog {
    background: rgba(255, 252, 252, 0.97);
    border-radius: 28px;
    padding: 24px;
    width: 100%;
    max-width: 320px;
    box-shadow: 0 20px 60px rgba(217, 163, 175, 0.2);
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: fadeIn 0.25s ease;
}

.pin-dialog-title {
    font-size: 16px;
    font-weight: 700;
    color: #4A3F41;
    text-align: center;
}

.pin-dialog-input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid rgba(217, 163, 175, 0.25);
    border-radius: 14px;
    font-size: 14px;
    color: #4A3F41;
    font-family: inherit;
    outline: none;
    background: rgba(255, 255, 255, 0.8);
    box-sizing: border-box;
}

.pin-dialog-input:focus {
    border-color: rgba(217, 163, 175, 0.5);
    box-shadow: 0 0 0 3px rgba(217, 163, 175, 0.08);
}

.pin-dialog-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.pin-dialog-label {
    font-size: 12px;
    color: #B8A9AC;
    font-weight: 600;
}

.icon-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.icon-opt {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1.5px solid transparent;
    background: rgba(255, 240, 242, 0.5);
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    font-family: inherit;
}

.icon-opt.active {
    border-color: #D9A3AF;
    background: rgba(217, 163, 175, 0.15);
    transform: scale(1.1);
}

.color-picker {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.color-opt {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
}

.color-opt.active {
    border-color: #4A3F41;
    transform: scale(1.15);
}

.pin-dialog-btns {
    display: flex;
    gap: 10px;
}

.pin-btn-cancel {
    flex: 1;
    height: 44px;
    border-radius: 14px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    color: #B8A9AC;
    cursor: pointer;
    font-family: inherit;
}

.pin-btn-confirm {
    flex: 1;
    height: 44px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    font-size: 14px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 4px 12px rgba(217, 163, 175, 0.3);
}

/* 背景编辑弹窗 */
.map-edit-overlay {
    position: fixed;
    inset: 0;
    z-index: 601;
    background: rgba(74, 63, 65, 0.25);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-end;
    padding: 0 16px 32px;
}

.map-edit-panel {
    background: rgba(255, 252, 252, 0.96);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 28px;
    width: 100%;
    max-height: 75vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(217, 163, 175, 0.2);
    border: 1px solid rgba(255, 240, 242, 0.5);
    animation: slideUp 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
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

.map-edit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
    font-size: 15px;
    font-weight: 700;
    color: #4A3F41;
}

.map-edit-header button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 240, 242, 0.5);
    border: none;
    font-size: 20px;
    color: #B8A9AC;
    cursor: pointer;
    font-family: inherit;
}

.map-edit-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.edit-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.edit-label {
    font-size: 12px;
    color: #B8A9AC;
    font-weight: 600;
}

.edit-input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid rgba(255, 240, 242, 0.6);
    background: rgba(255, 255, 255, 0.6);
    border-radius: 14px;
    font-size: 14px;
    color: #4A3F41;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
}

.edit-textarea {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid rgba(255, 240, 242, 0.6);
    background: rgba(255, 255, 255, 0.6);
    border-radius: 14px;
    font-size: 13px;
    color: #4A3F41;
    font-family: inherit;
    outline: none;
    resize: none;
    min-height: 72px;
    line-height: 1.5;
    box-sizing: border-box;
}

.upload-btn {
    padding: 12px 16px;
    border: 1px solid rgba(255, 240, 242, 0.6);
    background: rgba(255, 255, 255, 0.6);
    border-radius: 14px;
    font-size: 14px;
    color: #4A3F41;
    cursor: pointer;
    display: inline-block;
    text-align: center;
}

.edit-divider {
    font-size: 12px;
    font-weight: 700;
    color: #D9A3AF;
    margin: 4px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
}

.style-picker {
    display: flex;
    gap: 8px;
}

.style-opt {
    flex: 1;
    padding: 8px 4px;
    border-radius: 12px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    color: #B8A9AC;
    cursor: pointer;
    font-family: inherit;
    text-align: center;
    transition: all 0.15s;
}

.style-opt.active {
    background: rgba(217, 163, 175, 0.15);
    color: #D9A3AF;
    border-color: rgba(217, 163, 175, 0.4);
}

.edit-ai-btn {
    width: 100%;
    height: 44px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #B8A0C8, #9880B8);
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 4px 12px rgba(184, 160, 200, 0.3);
    transition: opacity 0.2s;
}

.edit-ai-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.ai-error {
    font-size: 12px;
    color: #C070;
    text-align: center;
}

.edit-save-btn {
    width: 100%;
    height: 46px;
    border-radius: 16px;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    border: none;
    font-size: 15px;
    color: white;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 6px 16px rgba(217, 163, 175, 0.3);
}
</style>
