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

        <!-- Tab 切换 -->
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

            <!-- Char 的手机 -->
            <template v-if="currentTab === 'char'">
                <!-- 虚拟地图 -->
                <div class="map-card" @click="showCharMapEdit = true">
                    <div class="map-inner" :style="charMap.background_url
                        ? { backgroundImage: `url(${charMap.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : {}">
                        <div v-if="!charMap.background_url" class="map-placeholder">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                                stroke-linecap="round">
                                <path
                                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span>点击设置虚拟地图</span>
                        </div>
                        <!-- 地点标注 -->
                        <div v-for="loc in charLocations" :key="loc.id" class="map-pin"
                            :style="{ left: (loc.x * 100) + '%', top: (loc.y * 100) + '%' }"
                            :class="{ active: charCurrentLocation === loc.location_name }"
                            @click.stop="setCharLocation(loc)">
                            <span class="pin-icon">{{ loc.icon }}</span>
                            <span class="pin-label">{{ loc.location_name }}</span>
                        </div>
                    </div>
                    <div class="map-edit-hint">点击编辑地图</div>
                </div>

                <!-- Char 手机状态 -->
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

                <!-- 到达记录 -->
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

            <!-- User 的手机 -->
            <template v-if="currentTab === 'user'">
                <!-- 虚拟地图 -->
                <div class="map-card" @click="showUserMapEdit = true">
                    <div class="map-inner" :style="userMap.background_url
                        ? { backgroundImage: `url(${userMap.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : {}">
                        <div v-if="!userMap.background_url" class="map-placeholder">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                                stroke-linecap="round">
                                <path
                                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span>点击设置我的虚拟地图</span>
                        </div>
                        <div v-for="loc in userLocations" :key="loc.id" class="map-pin"
                            :style="{ left: (loc.x * 100) + '%', top: (loc.y * 100) + '%' }"
                            :class="{ active: userCurrentLocation === loc.location_name }"
                            @click.stop="setUserLocation(loc)">
                            <span class="pin-icon">{{ loc.icon }}</span>
                            <span class="pin-label">{{ loc.location_name }}</span>
                        </div>
                    </div>
                    <div class="map-edit-hint">点击编辑地图</div>
                </div>

                <!-- User 手机状态 -->
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

                <!-- 到达记录 -->
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

        <!-- Char 地图编辑弹窗 -->
        <div v-if="showCharMapEdit" class="map-edit-overlay" @click.self="showCharMapEdit = false">
            <div class="map-edit-panel">
                <div class="map-edit-header">
                    <span>编辑 {{ charName }} 的地图</span>
                    <button @click="showCharMapEdit = false">×</button>
                </div>
                <div class="map-edit-body">
                    <div class="edit-row">
                        <span class="edit-label">地图背景 URL</span>
                        <input class="edit-input" v-model="charMapBgUrl" placeholder="图片链接..." />
                    </div>
                    <div class="edit-row">
                        <span class="edit-label">或上传图片</span>
                        <label class="upload-btn">
                            选择文件
                            <input type="file" accept="image/*" style="display:none" @change="handleCharMapUpload" />
                        </label>
                    </div>
                    <button class="edit-save-btn" @click="saveCharMap">保存地图</button>

                    <div class="edit-divider">地点标注</div>
                    <div class="location-add-row">
                        <input class="edit-input-sm" v-model="newLocName" placeholder="地点名称" />
                        <input class="edit-input-sm" v-model="newLocIcon" placeholder="图标" style="width:60px;" />
                        <button class="add-loc-btn" @click="addCharLocation">添加</button>
                    </div>
                    <div class="location-hint">添加后点击地图上的地点可切换当前位置</div>
                    <div class="location-list">
                        <div v-for="loc in charLocations" :key="loc.id" class="location-chip">
                            <span>{{ loc.icon }} {{ loc.location_name }}</span>
                            <button @click="deleteLocation(loc.id, 'char')">×</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- User 地图编辑弹窗 -->
        <div v-if="showUserMapEdit" class="map-edit-overlay" @click.self="showUserMapEdit = false">
            <div class="map-edit-panel">
                <div class="map-edit-header">
                    <span>编辑我的地图</span>
                    <button @click="showUserMapEdit = false">×</button>
                </div>
                <div class="map-edit-body">
                    <div class="edit-row">
                        <span class="edit-label">地图背景 URL</span>
                        <input class="edit-input" v-model="userMapBgUrl" placeholder="图片链接..." />
                    </div>
                    <div class="edit-row">
                        <span class="edit-label">或上传图片</span>
                        <label class="upload-btn">
                            选择文件
                            <input type="file" accept="image/*" style="display:none" @change="handleUserMapUpload" />
                        </label>
                    </div>
                    <button class="edit-save-btn" @click="saveUserMap">保存地图</button>

                    <div class="edit-divider">地点标注</div>
                    <div class="location-add-row">
                        <input class="edit-input-sm" v-model="newUserLocName" placeholder="地点名称" />
                        <input class="edit-input-sm" v-model="newUserLocIcon" placeholder="图标" style="width:60px;" />
                        <button class="add-loc-btn" @click="addUserLocation">添加</button>
                    </div>
                    <div class="location-hint">添加后点击地图上的地点可切换当前位置</div>
                    <div class="location-list">
                        <div v-for="loc in userLocations" :key="loc.id" class="location-chip">
                            <span>{{ loc.icon }} {{ loc.location_name }}</span>
                            <button @click="deleteLocation(loc.id, 'user')">×</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api'

const currentTab = ref('char')

// Char 信息
const charName = ref('TA')
const charAvatar = ref('💬')
const charAvatarUrl = ref('')
const charPersonaId = ref('')
const charBattery = ref(88)
const charEnvironment = ref('安静的房间')
const charCurrentLocation = ref('')
const charMap = ref({})
const charLocations = ref([])
const charArrivalLogs = ref([])
const showCharMapEdit = ref(false)
const charMapBgUrl = ref('')
const newLocName = ref('')
const newLocIcon = ref('📍')

// User 信息
const userName = ref(localStorage.getItem('user_name') || '我')
const userAvatar = ref(localStorage.getItem('home_user_avatar') || '')
const myBattery = ref(0)
const myEnvironment = ref('未知')
const userCurrentLocation = ref('')
const userMap = ref({})
const userLocations = ref([])
const userArrivalLogs = ref([])
const showUserMapEdit = ref(false)
const userMapBgUrl = ref('')
const newUserLocName = ref('')
const newUserLocIcon = ref('📍')

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

    try {
        const res = await api(`/api/location-logs/persona/${charPersonaId.value}`)
        charArrivalLogs.value = await res.json()
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

    try {
        const res = await api('/api/location-logs/user/default_user')
        userArrivalLogs.value = await res.json()
    } catch { }

    // 电量
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery()
            myBattery.value = Math.round(battery.level * 100)
        } catch { }
    }
}

async function saveCharMap() {
    try {
        const res = await api('/api/virtual-map', {
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
    } catch { }
}

async function saveUserMap() {
    try {
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
    } catch { }
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

async function addCharLocation() {
    if (!newLocName.value.trim() || !charMap.value.id) return
    await api('/api/map-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mapId: charMap.value.id,
            locationName: newLocName.value.trim(),
            x: 0.5,
            y: 0.5,
            icon: newLocIcon.value || '📍'
        })
    })
    newLocName.value = ''
    await loadCharData()
}

async function addUserLocation() {
    if (!newUserLocName.value.trim() || !userMap.value.id) return
    await api('/api/map-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mapId: userMap.value.id,
            locationName: newUserLocName.value.trim(),
            x: 0.5,
            y: 0.5,
            icon: newUserLocIcon.value || '📍'
        })
    })
    newUserLocName.value = ''
    await loadUserData()
}

async function deleteLocation(id, type) {
    await api(`/api/map-location/${id}`, { method: 'DELETE' })
    if (type === 'char') await loadCharData()
    else await loadUserData()
}

async function setCharLocation(loc) {
    charCurrentLocation.value = loc.location_name
    await api('/api/location-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ownerType: 'persona',
            ownerId: charPersonaId.value,
            locationName: loc.location_name
        })
    })
    await loadCharData()
}

async function setUserLocation(loc) {
    userCurrentLocation.value = loc.location_name
    await api('/api/location-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ownerType: 'user',
            ownerId: 'default_user',
            locationName: loc.location_name
        })
    })
    await loadUserData()
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

/* Tab */
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

/* 内容区 */
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

/* 地图卡片 */
.map-card {
    border-radius: 24px;
    overflow: hidden;
    margin-bottom: 14px;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.15);
    position: relative;
}

.map-inner {
    width: 100%;
    height: 220px;
    background: rgba(255, 233, 237, 0.3);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.map-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #D4C8CA;
    font-size: 12px;
}

.map-placeholder svg {
    width: 36px;
    height: 36px;
}

.map-edit-hint {
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.7);
    font-size: 11px;
    color: #B8A9AC;
    text-align: center;
}

/* 地点标注 */
.map-pin {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    transition: transform 0.2s;
}

.map-pin:active {
    transform: translate(-50%, -50%) scale(0.9);
}

.map-pin.active .pin-icon {
    filter: drop-shadow(0 0 6px rgba(217, 163, 175, 0.8));
}

.pin-icon {
    font-size: 24px;
}

.pin-label {
    font-size: 10px;
    color: #4A3F41;
    background: rgba(255, 255, 255, 0.9);
    padding: 2px 6px;
    border-radius: 8px;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.map-pin.active .pin-label {
    background: rgba(217, 163, 175, 0.9);
    color: white;
}

/* 手机卡片 */
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

.phone-status {
    font-size: 11px;
    color: #6BAF7A;
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

/* 小节标签 */
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

/* 到达列表 */
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

/* 地图编辑弹窗 */
.map-edit-overlay {
    position: fixed;
    inset: 0;
    z-index: 300;
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

.edit-divider {
    font-size: 12px;
    font-weight: 700;
    color: #D9A3AF;
    margin: 12px 0 4px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
}

.location-add-row {
    display: flex;
    gap: 8px;
}

.edit-input-sm {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid rgba(255, 240, 242, 0.6);
    background: rgba(255, 255, 255, 0.6);
    border-radius: 12px;
    font-size: 13px;
    color: #4A3F41;
    font-family: inherit;
    outline: none;
}

.add-loc-btn {
    padding: 10px 16px;
    border: none;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
}

.location-hint {
    font-size: 11px;
    color: #B8A9AC;
    padding: 0 4px;
}

.location-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.location-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 16px;
    background: rgba(255, 240, 242, 0.5);
    font-size: 12px;
    color: #6B5B5E;
}

.location-chip button {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(217, 163, 175, 0.3);
    border: none;
    font-size: 14px;
    color: #D9A3AF;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}
</style>
