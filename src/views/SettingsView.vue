<template>
    <div class="settings-page">
        <div class="settings-blob sb-tl"></div>
        <div class="settings-blob sb-br"></div>

        <div class="settings-nav">
            <button class="settings-back" @click="$router.push('/')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <span class="settings-title">设置</span>
            <div style="width:36px;"></div>
        </div>

        <div class="settings-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="11" cy="11" r="6" />
                <path d="M20 20l-3-3" />
            </svg>
            <input v-model="searchQuery" type="text" placeholder="搜索" />
        </div>

        <div class="settings-content">

            <!-- 个人信息卡 → 子页面 -->
            <div class="settings-profile-card" @click="$router.push('/settings/profile')">
                <div class="profile-avatar-wrap">
                    <div class="profile-avatar">
                        <img v-if="profileAvatar && (profileAvatar.startsWith('http') || profileAvatar.startsWith('data'))"
                            :src="profileAvatar" />
                        <span v-else>{{ profileAvatar || '🌙' }}</span>
                    </div>
                </div>
                <div class="profile-info">
                    <div class="profile-name">{{ profileName || '未设置名称' }}</div>
                    <div class="profile-phone">{{ profilePhone || '✧ 未设置' }}</div>
                </div>
                <svg class="profile-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round">
                    <path d="M9 18l6-6-6-6" />
                </svg>
            </div>

            <!-- 第一组：连接与网络 -->
            <div class="settings-group">
                <div class="settings-group-item" v-if="features.betaMode" @click="betaToggle">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #98CBEA, #7ab8e0);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div class="sgi-label">飞行模式</div>
                    <div class="sgi-right">
                        <label class="toggle-sm" @click.stop>
                            <input type="checkbox" v-model="isBetaMode" @change="toggleBetaMode" />
                            <span class="slider-sm"></span>
                        </label>
                    </div>
                </div>

                <div class="settings-group-item" @click="openWifiEdit">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #98CBEA, #6ba8d4);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                            <circle cx="12" cy="20" r="1" fill="white" />
                        </svg>
                    </div>
                    <div class="sgi-label">无线局域网</div>
                    <div class="sgi-right">
                        <span class="sgi-value">{{ wifiName }}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>

                <div class="settings-group-item" @click="$router.push('/settings/api')">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #D8CDEA, #b8a8d8);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <circle cx="12" cy="12" r="3" />
                            <path
                                d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
                        </svg>
                    </div>
                    <div class="sgi-label">蓝牙</div>
                    <div class="sgi-right">
                        <span class="sgi-value">{{ apiConfig.model || '未配置' }}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>

                <div class="settings-group-item">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #7ed6a0, #5bc280);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <rect x="1" y="6" width="22" height="12" rx="2" />
                            <path d="M23 13v-2a4 4 0 0 0 0-8V3" />
                        </svg>
                    </div>
                    <div class="sgi-label">蜂窝网络</div>
                    <div class="sgi-right">
                        <span class="sgi-value sgi-value-green">打开</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>

                <div class="settings-group-item">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #F5EAD0, #e8d5a8);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" />
                            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                        </svg>
                    </div>
                    <div class="sgi-label">个人热点</div>
                    <div class="sgi-right">
                        <span class="sgi-value">关闭</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>

                <div class="settings-group-item">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #7ed6a0, #4db870);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <rect x="2" y="7" width="20" height="11" rx="2" />
                            <path d="M22 11V9a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2" />
                            <line x1="7" y1="12" x2="7" y2="15" />
                        </svg>
                    </div>
                    <div class="sgi-label">电池</div>
                    <div class="sgi-right">
                        <span class="sgi-value">100%</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- 第二组：个性化 -->
            <div class="settings-group">
                <div class="settings-group-item" @click="$router.push('/settings/general')">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #B8B8C8, #9090a8);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8v4l3 3" />
                        </svg>
                    </div>
                    <div class="sgi-label">通用</div>
                    <div class="sgi-right">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>

                <div class="settings-group-item" @click="$router.push('/settings/control')">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #F1DADD, #e8b8c0);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                    </div>
                    <div class="sgi-label">控制中心</div>
                    <div class="sgi-right">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- 生活方式：独立一组 -->
            <div class="settings-group">
                <div class="settings-group-item" @click="$router.push('/settings/lifestyle')">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #98CBEA, #70b0d8);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <div class="sgi-label">生活方式</div>
                    <div class="sgi-right">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- 第三组：通知与安全 -->
            <div class="settings-group">
                <div class="settings-group-item" @click="$router.push('/settings/notifications')">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #E8C0C9, #d4899e);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            <circle cx="12" cy="3" r="1" fill="white" />
                        </svg>
                    </div>
                    <div class="sgi-label">通知</div>
                    <div class="sgi-right">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>

                <div class="settings-group-item" @click="$router.push('/settings/lock')">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #D8CDEA, #b8a8d8);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                    <div class="sgi-label">锁屏密码</div>
                    <div class="sgi-right">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- 第四组：钱包与存储 -->
            <div class="settings-group">
                <div class="settings-group-item" @click="$router.push('/wallet')">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #F5EAD0, #e8c870);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                            <path d="M2 10h20" />
                        </svg>
                    </div>
                    <div class="sgi-label">钱包</div>
                    <div class="sgi-right">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>

                <div class="settings-group-item" @click="$router.push('/settings/storage')">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #D8CDEA, #a898c8);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <ellipse cx="12" cy="5" rx="9" ry="3" />
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                        </svg>
                    </div>
                    <div class="sgi-label">存储空间</div>
                    <div class="sgi-right">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- 维护工具 -->
            <div class="settings-group">
                <div class="settings-group-item" @click="$router.push('/settings/maintenance')">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #A8D8EA, #72c2e0);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <circle cx="12" cy="12" r="3" />
                            <path
                                d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
                        </svg>
                    </div>
                    <div class="sgi-label">维护工具</div>
                    <div class="sgi-right">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- 帮助与信息 -->
            <div class="settings-group">
                <div class="settings-group-item" @click="$router.push('/settings/guide')">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #B8D4C8, #7eb8a0);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <circle cx="12" cy="17" r="0.5" fill="white" />
                        </svg>
                    </div>
                    <div class="sgi-label">使用说明</div>
                    <div class="sgi-right">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>
            </div>

        </div>

        <!-- 只保留 WiFi 弹窗 -->
        <BlurModal :visible="showWifiEdit" @close="showWifiEdit = false">
            <h3>无线局域网名称</h3>
            <DreamInput label="自定义名称" v-model="editWifiName" placeholder="✧*｡٩(ˊᗜˋ*)و✧*｡" />
            <div class="modal-actions">
                <SoftButton variant="secondary" @click="showWifiEdit = false">取消</SoftButton>
                <SoftButton variant="primary" @click="saveWifiName">保存</SoftButton>
            </div>
        </BlurModal>

    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from '@/utils/api'
import SoftButton from '@/components/ui/SoftButton.vue'
import DreamInput from '@/components/ui/DreamInput.vue'
import GlassTag from '@/components/ui/GlassTag.vue'
import BlurModal from '@/components/ui/BlurModal.vue'
import { useWebSocket } from '@/composables/useWebSocket'
import { features } from '@/utils/features'

const { registerPushSubscription } = useWebSocket()

// 个人信息（从 localStorage 读取，子页面写入）
const profileName = ref(localStorage.getItem('user_name') || '')
const profileAvatar = ref(localStorage.getItem('home_user_avatar') || '')
const profilePhone = ref(localStorage.getItem('user_phone') || '✧ 1314-5201314')

// WiFi
const wifiName = ref(localStorage.getItem('custom_wifi_name') || '✧*｡٩(ˊᗜˋ*)و✧*｡')
const showWifiEdit = ref(false)
const editWifiName = ref('')
const searchQuery = ref('')

// API 配置（只读显示用）
const apiConfig = reactive({ name: '', key: '', baseUrl: '', model: '' })

// Beta
const isBetaMode = ref(localStorage.getItem('is_beta_mode') === 'true')

// 主动消息（通知子页面需要）
const proactive = reactive({
    enabled: true,
    idleHours: 12,
    maxPerDay: 3,
    intervalValue: 4,
    intervalUnit: 'hours',
    enabledPersonas: [],
})

// 输出偏好
const outputPrefs = reactive({ actionDesc: false, splitSentence: false })

// 用于控制中心子页面的数据
const userPrompt = ref('')
const template = ref('')
const saved = ref(false)

// 推送测试结果
const proactiveTestResult = ref(null)
const pushTestResult = ref(null)

const webhookUrl = ref(import.meta.env.VITE_API_URL || window.location.origin)

function toggleBetaMode() {
    localStorage.setItem('is_beta_mode', isBetaMode.value)
    window.location.reload()
}

function betaToggle() {
    isBetaMode.value = !isBetaMode.value
    toggleBetaMode()
}

function openWifiEdit() {
    editWifiName.value = wifiName.value
    showWifiEdit.value = true
}

function saveWifiName() {
    wifiName.value = editWifiName.value || '✧*｡٩(ˊᗜˋ*)و✧*｡'
    localStorage.setItem('custom_wifi_name', wifiName.value)
    showWifiEdit.value = false
}

// 监听子页面保存后的 localStorage 变化，刷新个人信息显示
function refreshProfileFromStorage() {
    profileName.value = localStorage.getItem('user_name') || ''
    profileAvatar.value = localStorage.getItem('home_user_avatar') || ''
    profilePhone.value = localStorage.getItem('user_phone') || '✧ 1314-5201314'
}

onMounted(async () => {
    // 读取 API 配置用于显示
    const savedConfig = localStorage.getItem('api_config')
    if (savedConfig) Object.assign(apiConfig, JSON.parse(savedConfig))

    // 读取输出偏好
    const savedPrefs = localStorage.getItem('output_prefs')
    if (savedPrefs) Object.assign(outputPrefs, JSON.parse(savedPrefs))

    // 加载主动消息设置
    try {
        const proRes = await api('/api/proactive/settings')
        const proData = await proRes.json()
        Object.assign(proactive, proData)
    } catch { }

    // 加载用户偏好文案
    try {
        const uRes = await api('/api/prompts/user')
        const uData = await uRes.json()
        const content = uData.content || ''
        const styleIndex = content.indexOf('\n\n[输出风格')
        userPrompt.value = styleIndex > -1 ? content.slice(0, styleIndex) : content
        template.value = uData.template
    } catch { }

    // 从子页面返回时刷新个人信息
    window.addEventListener('focus', refreshProfileFromStorage)
})
</script>

<style scoped>
.settings-page {
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
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: saturate(180%) blur(12px);
    -webkit-backdrop-filter: saturate(180%) blur(12px);
    border: 1px solid rgba(255, 240, 242, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(217, 163, 175, 0.1);
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

.settings-search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 16px 12px;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: saturate(180%) blur(12px);
    -webkit-backdrop-filter: saturate(180%) blur(12px);
    border-radius: 16px;
    padding: 10px 14px;
    box-shadow: 0 4px 14px rgba(217, 163, 175, 0.08);
    border: 1px solid rgba(255, 240, 242, 0.45);
    position: relative;
    z-index: 2;
    flex-shrink: 0;
}

.settings-search svg {
    width: 15px;
    height: 15px;
    stroke: #B8A9AC;
    flex-shrink: 0;
}

.settings-search input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 14px;
    color: #4A3F41;
    font-family: inherit;
}

.settings-search input::placeholder {
    color: #D4C8CA;
}

.settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 32px);
    position: relative;
    z-index: 1;
}

.settings-content::-webkit-scrollbar {
    display: none;
}

/* 个人信息卡 */
.settings-profile-card {
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: saturate(180%) blur(16px);
    -webkit-backdrop-filter: saturate(180%) blur(16px);
    border-radius: 24px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 24px;
    cursor: pointer;
    box-shadow:
        0 10px 28px rgba(217, 163, 175, 0.12),
        0 0 0 1px rgba(255, 255, 255, 0.5) inset;
    border: 1px solid rgba(255, 240, 242, 0.4);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.settings-profile-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 32px rgba(217, 163, 175, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
}

.settings-profile-card:active {
    transform: scale(0.98);
}

.profile-avatar-wrap {
    flex-shrink: 0;
}

.profile-avatar {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    background: linear-gradient(145deg, #FDE4E8, #F8D0D6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    overflow: hidden;
    box-shadow: 0 4px 14px rgba(217, 163, 175, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.8);
}

.profile-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.profile-info {
    flex: 1;
    min-width: 0;
}

.profile-name {
    font-size: 18px;
    font-weight: 700;
    color: #4A3F41;
    margin-bottom: 3px;
}

.profile-phone {
    font-size: 12px;
    color: #B8A9AC;
}

.profile-arrow {
    width: 16px;
    height: 16px;
    stroke: #D4C8CA;
    flex-shrink: 0;
}

/* 分组列表 */
.settings-group {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 22px;
    overflow: hidden;
    margin-bottom: 20px;
    box-shadow:
        0 8px 24px rgba(217, 163, 175, 0.1),
        0 2px 6px rgba(217, 163, 175, 0.06),
        0 0 0 1px rgba(255, 255, 255, 0.5) inset;
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.settings-group-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    cursor: pointer;
    transition: background 0.15s;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
    background: transparent;
}

.settings-group-item:last-child {
    border-bottom: none;
}

.settings-group-item:active {
    background: rgba(217, 163, 175, 0.06);
}

.sgi-icon-wrap {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.sgi-icon-wrap svg {
    width: 16px;
    height: 16px;
}

.sgi-label {
    flex: 1;
    font-size: 14px;
    color: #4A3F41;
    font-weight: 400;
}

.sgi-right {
    display: flex;
    align-items: center;
    gap: 6px;
}

.sgi-value {
    font-size: 13px;
    color: #B8A9AC;
}

.sgi-value-green {
    color: #6BAF7A;
}

.sgi-arrow {
    width: 14px;
    height: 14px;
    stroke: #D4C8CA;
}

/* 开关 */
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

.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
}
</style>
