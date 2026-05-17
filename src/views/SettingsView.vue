<template>
    <div class="settings-page">
        <div class="settings-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>设置</h2>
        </div>

        <div class="settings-content">
            <!-- API 配置 -->
            <div class="section">
                <h3>✦ 连接方式</h3>
                <p class="section-sub">这里决定你们如何继续交流</p>
                <GlassCard size="md">
                    <DreamInput label="API Key" type="password" v-model="apiConfig.key" placeholder="sk-..." />
                    <DreamInput label="API 地址" v-model="apiConfig.baseUrl" placeholder="https://api.openai.com/v1" />
                    <DreamInput label="模型名称" v-model="apiConfig.model" placeholder="gpt-4o-mini" />
                    <SoftButton variant="primary" block @click="saveApiConfig">保存 API 配置</SoftButton>
                    <p class="save-tip" v-if="apiSaved">已保存 ✓</p>

                    <div class="api-actions">
                        <SoftButton variant="glass" size="sm" @click="fetchModels">获取模型</SoftButton>
                        <SoftButton variant="glass" size="sm" @click="testApiConnection">测试连接</SoftButton>
                    </div>

                    <div v-if="modelList.length > 0" class="model-list">
                        <p class="list-label">可用模型：</p>
                        <div class="model-scroll">
                            <div v-for="m in modelList" :key="m" class="model-item" @click="apiConfig.model = m">
                                {{ m }}
                            </div>
                        </div>
                    </div>

                    <p v-if="apiTestResult" class="api-result" :class="apiTestResult.success ? 'success' : 'error'">
                        {{ apiTestResult.message }}
                    </p>
                </GlassCard>
            </div>

            <!-- 主动消息设置 -->
            <div class="section">
                <h3>◐ 陪伴频率</h3>
                <p class="section-sub">决定谁会在什么时候更自然地出现</p>
                <GlassCard size="md">
                    <!-- 选择AI -->
                    <div class="setting-row">
                        <span>设置对象</span>
                        <select v-model="proactivePersona" @change="loadProactiveForPersona">
                            <option value="">全局默认</option>
                            <option v-for="p in personas" :key="p.id" :value="p.id">{{ p.name }}</option>
                        </select>
                    </div>

                    <div class="setting-row">
                        <span>启用主动消息</span>
                        <label class="toggle">
                            <input type="checkbox" v-model="proactive.enabled" @change="saveProactive" />
                            <span class="slider"></span>
                        </label>
                    </div>

                    <div v-if="proactive.enabled">
                        <div class="setting-row">
                            <span>未互动提醒</span>
                            <select v-model="proactive.idleHours" @change="saveProactive">
                                <option :value="6">6 小时</option>
                                <option :value="12">12 小时</option>
                                <option :value="24">24 小时</option>
                            </select>
                        </div>
                        <div class="setting-row">
                            <span>启用的AI</span>
                            <span class="setting-hint">{{ enabledAiNames }}</span>
                        </div>
                        <div class="setting-row">
                            <span>每日最多主动</span>
                            <select v-model="proactive.maxPerDay" @change="saveProactive">
                                <option :value="1">1 次</option>
                                <option :value="2">2 次</option>
                                <option :value="3">3 次</option>
                                <option :value="5">5 次</option>
                            </select>
                        </div>
                    </div>

                    <div class="action-group">
                        <SoftButton variant="glass" block @click="testProactive">测试主动消息</SoftButton>
                        <SoftButton variant="glass" block @click="testPush">测试推送通知</SoftButton>
                        <SoftButton variant="glass" block @click="reRegisterPush">重新注册推送</SoftButton>
                    </div>

                    <p v-if="proactiveTestResult" class="api-result"
                        :class="proactiveTestResult.success ? 'success' : 'error'">
                        {{ proactiveTestResult.message }}
                    </p>
                    <p v-if="pushTestResult" class="api-result" :class="pushTestResult.success ? 'success' : 'error'">
                        {{ pushTestResult.message }}
                    </p>
                </GlassCard>
            </div>

            <!-- 用户偏好 -->
            <div class="section">
                <h3>❋ 陪伴方式</h3>
                <p class="section-sub">调整你们之间的交流风格</p>
                <GlassCard size="md">
                    <div class="setting-row">
                        <span>AI 输出包含动作描写</span>
                        <label class="toggle">
                            <input type="checkbox" v-model="outputPrefs.actionDesc" @change="saveOutputPrefs" />
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="setting-row">
                        <span>AI 分句输出</span>
                        <label class="toggle">
                            <input type="checkbox" v-model="outputPrefs.splitSentence" @change="saveOutputPrefs" />
                            <span class="slider"></span>
                        </label>
                    </div>

                    <DreamInput type="textarea" v-model="userPrompt" :placeholder="template" :rows="8" />
                    <SoftButton variant="primary" block @click="saveUserPrompt">保存偏好</SoftButton>
                    <p class="save-tip" v-if="saved">已保存 ✓</p>
                </GlassCard>
            </div>

            <!-- 导入导出 -->
            <div class="section">
                <h3>◌ 时间整理</h3>
                <p class="section-sub">整理那些被留下来的痕迹</p>
                <GlassCard size="md">
                    <SoftButton variant="secondary" block @click="exportData">导出数据 (JSON)</SoftButton>
                    <SoftButton variant="secondary" block @click="triggerImport">导入数据 (JSON)</SoftButton>
                    <input type="file" ref="importInput" accept=".json" style="display:none" @change="importData" />
                    <SoftButton variant="primary" block @click="syncToCloud">上传至云端</SoftButton>
                </GlassCard>
            </div>

            <!-- 手机状态感知 -->
            <div class="section">
                <h3>◑ 生活感知</h3>
                <p class="section-sub">让他更自然地感受到你的生活节奏</p>
                <GlassCard size="md">
                    <p class="guide-text">通过 iOS 快捷指令自动上报手机状态，让 AI 感知你的生活节奏。</p>
                    <p class="guide-step">1. 打开「快捷指令」App</p>
                    <p class="guide-step">2. 创建自动化 → 选择触发条件</p>
                    <p class="guide-step">3. 添加「获取 URL 内容」操作</p>
                    <p class="guide-step">4. 设置以下 Webhook：</p>
                    <div class="webhook-box">
                        <p class="webhook-url">POST {{ webhookUrl }}/api/phone/status</p>
                        <p class="webhook-body">Body: {"type":"sleep","data":"入睡"}</p>
                    </div>
                    <p class="guide-text">推荐自动化触发条件：</p>
                    <div class="trigger-list">
                        <GlassTag variant="pink" size="sm">睡觉时</GlassTag>
                        <GlassTag variant="pink" size="sm">起床时</GlassTag>
                        <GlassTag variant="warm" size="sm">电量低于20%</GlassTag>
                        <GlassTag variant="purple" size="sm">打开某个App</GlassTag>
                        <GlassTag variant="soft" size="sm">连接WiFi</GlassTag>
                    </div>
                </GlassCard>
            </div>

            <div class="section">
                <h3>◑ 微信同步</h3>
                <p class="section-sub">将微信对话实时同步到这里</p>
                <GlassCard size="md">
                    <p class="guide-text">微信机器人 Webhook 地址：</p>
                    <div class="webhook-box">
                        <p class="webhook-url">用户消息：POST {{ webhookUrl }}/api/sync/wechat/user</p>
                        <p class="webhook-body">Body: {"content":"消息内容"}</p>
                    </div>
                    <div class="webhook-box">
                        <p class="webhook-url">AI回复：POST {{ webhookUrl }}/api/sync/wechat/ai</p>
                        <p class="webhook-body">Body: {"content":"AI回复内容"}</p>
                    </div>
                    <p class="guide-text" style="margin-top:10px">在会话列表中选择"微信同步"即可查看同步的对话。</p>
                </GlassCard>
            </div>

        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from '@/utils/api'
import GlassCard from '@/components/ui/GlassCard.vue'
import SoftButton from '@/components/ui/SoftButton.vue'
import DreamInput from '@/components/ui/DreamInput.vue'
import { useWebSocket } from '@/composables/useWebSocket'

const personas = ref([])
const activePersona = ref('')
const userPrompt = ref('')
const template = ref('')
const saved = ref(false)
const apiSaved = ref(false)
const importInput = ref(null)
const proactivePersona = ref('')

const apiConfig = reactive({
    key: '',
    baseUrl: '',
    model: ''
})

const proactive = reactive({
    enabled: true,
    idleHours: 12,
    nightReminder: true,
    memoryReminder: true,
    maxPerDay: 3,
    minInterval: 4
})

const outputPrefs = reactive({
    actionDesc: false,
    splitSentence: false
})

const modelList = ref([])
const apiTestResult = ref(null)
const proactiveTestResult = ref(null)
const enabledAiNames = computed(() => {
    return '全部'
})
const webhookUrl = ref(import.meta.env.VITE_API_URL || window.location.origin)
const { registerPushSubscription } = useWebSocket()



onMounted(async () => {
    // 加载 API 配置（本地存储）
    const savedConfig = localStorage.getItem('api_config')
    if (savedConfig) {
        Object.assign(apiConfig, JSON.parse(savedConfig))
    }

    // 加载输出偏好（本地存储）
    const savedPrefs = localStorage.getItem('output_prefs')
    if (savedPrefs) {
        Object.assign(outputPrefs, JSON.parse(savedPrefs))
    }

    async function loadProactiveForPersona() {
        try {
            const query = proactivePersona.value ? `?persona=${proactivePersona.value}` : ''
            const proRes = await api(`/api/proactive/settings${query}`)
            const proData = await proRes.json()
            Object.assign(proactive, proData)
        } catch { }
    }

    async function saveProactive() {
        await api('/api/proactive/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...proactive, personaId: proactivePersona.value })
        })
    }

    try {
        const pRes = await api('/api/prompts/personas')
        const pData = await pRes.json()
        personas.value = pData.personas
        activePersona.value = pData.active

        const uRes = await api('/api/prompts/user')
        const uData = await uRes.json()
        // 剥离输出风格部分，只显示用户手写内容
        const content = uData.content || ''
        const styleIndex = content.indexOf('\n\n[输出风格')
        userPrompt.value = styleIndex > -1 ? content.slice(0, styleIndex) : content
        template.value = uData.template

        const proRes = await api('/api/proactive/settings')
        const proData = await proRes.json()
        Object.assign(proactive, proData)
    } catch (e) {
        console.error('加载设置失败:', e)
    }
})

async function reRegisterPush() {
    await registerPushSubscription()
    alert('推送注册完成')
}

async function saveApiConfig() {
    localStorage.setItem('api_config', JSON.stringify(apiConfig))
    // 同步到后端
    await api('/api/settings/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            key: apiConfig.key,
            baseUrl: apiConfig.baseUrl,
            model: apiConfig.model
        })
    })
    apiSaved.value = true
    setTimeout(() => { apiSaved.value = false }, 2000)
}


async function fetchModels() {
    apiTestResult.value = null
    modelList.value = []
    try {
        const res = await api('/api/test/models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                baseUrl: apiConfig.baseUrl || 'https://api.openai.com/v1',
                key: apiConfig.key
            })
        })
        const data = await res.json()
        if (data.error) {
            apiTestResult.value = { success: false, message: `获取失败: ${data.error}` }
            return
        }
        if (data.data && Array.isArray(data.data)) {
            modelList.value = data.data.map(m => m.id).sort()
            apiTestResult.value = { success: true, message: `获取到 ${modelList.value.length} 个模型` }
        } else {
            apiTestResult.value = { success: false, message: '返回格式异常' }
        }
    } catch (e) {
        apiTestResult.value = { success: false, message: `请求失败: ${e.message}` }
    }
}

async function testApiConnection() {
    apiTestResult.value = null
    try {
        const res = await api('/api/test/connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                baseUrl: apiConfig.baseUrl || 'https://api.openai.com/v1',
                key: apiConfig.key,
                model: apiConfig.model || 'gpt-4o-mini'
            })
        })
        const data = await res.json()
        if (data.error) {
            apiTestResult.value = { success: false, message: `失败: ${data.error}` }
        } else if (data.ok && data.data.choices && data.data.choices[0]) {
            apiTestResult.value = { success: true, message: `连接成功 ✓ 模型: ${apiConfig.model}` }
        } else {
            apiTestResult.value = { success: false, message: `失败: ${data.data?.error?.message || '未知错误'}` }
        }
    } catch (e) {
        apiTestResult.value = { success: false, message: `连接失败: ${e.message}` }
    }
}


async function testProactive() {
    proactiveTestResult.value = null
    try {
        const res = await api('/api/proactive/trigger', { method: 'POST' })
        const data = await res.json()
        if (data.success) {
            proactiveTestResult.value = { success: true, message: '主动消息触发成功 ✓ 检查聊天页面' }
        } else {
            proactiveTestResult.value = { success: false, message: '触发失败' }
        }
    } catch (e) {
        proactiveTestResult.value = { success: false, message: `失败: ${e.message}` }
    }
}

async function saveOutputPrefs() {
    localStorage.setItem('output_prefs', JSON.stringify(outputPrefs))
    const prefText = buildPrefText()
    await api('/api/prompts/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: prefText })
    })
}


function buildPrefText() {
    let text = userPrompt.value || ''
    const lines = []
    if (outputPrefs.actionDesc) {
        lines.push('- 回复中包含动作描写，用*号包裹，如 *轻轻叹了口气*、*歪头看着你*')
    } else {
        lines.push('- 禁止使用动作描写，禁止使用*号包裹的任何内容，只用纯对话文字回复')
    }
    if (outputPrefs.splitSentence) {
        lines.push('- 必须分句输出，每个短句单独一行，用换行分隔，营造停顿感和节奏感。示例：\n嗯...\n今天怎么这么晚才来\n是不是又加班了')
    } else {
        lines.push('- 正常连续输出，不需要刻意分行')
    }
    if (lines.length > 0) {
        text += '\n\n[输出风格 - 必须严格遵守]\n' + lines.join('\n')
    }
    return text
}


async function switchPersona(id) {
    await api(`/api/prompts/personas/${id}/activate`, { method: 'POST' })
    activePersona.value = id
}

async function saveUserPrompt() {
    const prefText = buildPrefText()
    await api('/api/prompts/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: prefText })
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
}


async function saveProactive() {
    await api('/api/proactive/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proactive)
    })
}

async function exportData() {
    try {
        const res = await api('/api/export')
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ai-phone-backup-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
    } catch (e) {
        console.error('导出失败:', e)
    }
}

function triggerImport() {
    importInput.value.click()
}

async function importData(event) {
    const file = event.target.files[0]
    if (!file) return

    try {
        const text = await file.text()
        const data = JSON.parse(text)
        await api('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        alert('导入成功')
    } catch (e) {
        console.error('导入失败:', e)
        alert('导入失败: ' + e.message)
    }
}

const pushTestResult = ref(null)

async function testPush() {
    pushTestResult.value = null
    try {
        const res = await api('/api/push/test', { method: 'POST' })
        const data = await res.json()
        if (data.subscribers > 0) {
            pushTestResult.value = { success: true, message: `推送已发送给 ${data.subscribers} 个订阅者` }
        } else {
            pushTestResult.value = { success: false, message: '没有订阅者，请先允许通知权限' }
        }
    } catch (e) {
        pushTestResult.value = { success: false, message: `失败: ${e.message}` }
    }
}

async function syncToCloud() {
    alert('数据已在云端（Supabase），无需额外同步')
}
</script>

<style scoped>
.settings-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
    overflow-y: auto;
}

.settings-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--color-border);
}

.back-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: var(--color-primary);
    cursor: pointer;
    opacity: 0.75;
}

.settings-header h2 {
    font-size: 15px;
    font-weight: 500;
    color: var(--color-text);
}

.settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px 0;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
}

.section {
    margin-bottom: 32px;
    animation: fadeIn 0.4s var(--ease-soft) backwards;
}

.section:nth-child(2) {
    animation-delay: 0.05s;
}

.section:nth-child(3) {
    animation-delay: 0.1s;
}

.section:nth-child(4) {
    animation-delay: 0.15s;
}

.section:nth-child(5) {
    animation-delay: 0.2s;
}

.section h3 {
    font-size: 12px;
    color: var(--color-text-light);
    margin-bottom: 12px;
    font-weight: 400;
    letter-spacing: 0.5px;
}

.input-group {
    margin-bottom: 12px;
}

.input-group label {
    display: block;
    font-size: 11px;
    color: var(--color-text-light);
    margin-bottom: 5px;
    letter-spacing: 0.3px;
}

.input-group input {
    width: 100%;
    height: 40px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 0 14px;
    font-size: 14px;
    background: var(--color-card);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    outline: none;
    color: var(--color-text);
    transition: border-color var(--duration-normal) var(--ease-soft);
}

.input-group input:focus {
    border-color: rgba(212, 137, 158, 0.3);
}

.setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    background: var(--color-card);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: var(--radius-sm);
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--color-text);
    border: 1px solid var(--color-border);
}

.setting-row select {
    padding: 5px 10px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    font-size: 13px;
    background: var(--color-bg);
    outline: none;
    color: var(--color-text);
}

.toggle {
    position: relative;
    width: 44px;
    height: 24px;
}

.toggle input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-bg-secondary);
    border-radius: 24px;
    transition: var(--duration-normal) var(--ease-soft);
}

.slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: var(--duration-normal) var(--ease-soft);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toggle input:checked+.slider {
    background: linear-gradient(135deg, #e8a8be, #d4899e);
}

.toggle input:checked+.slider:before {
    transform: translateX(20px);
}

textarea {
    width: 100%;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    font-size: 14px;
    font-family: inherit;
    background: var(--color-card);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    outline: none;
    resize: none;
    line-height: 1.5;
    color: var(--color-text);
}

textarea:focus {
    border-color: rgba(212, 137, 158, 0.3);
}

.save-btn {
    margin-top: 12px;
    padding: 13px;
    border-radius: var(--radius-sm);
    border: none;
    background: linear-gradient(135deg, #e8a8be, #d4899e);
    color: white;
    font-size: 14px;
    cursor: pointer;
    width: 100%;
    box-shadow: 0 3px 12px rgba(212, 137, 158, 0.2);
}

.save-tip {
    text-align: center;
    color: var(--color-primary);
    font-size: 12px;
    margin-top: 8px;
    opacity: 0.8;
}

.action-btn {
    width: 100%;
    padding: 12px;
    margin-bottom: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-card);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--color-text);
    cursor: pointer;
}

.action-btn:active {
    background: rgba(212, 137, 158, 0.06);
}

.api-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
}

.api-actions .action-btn {
    flex: 1;
    margin-bottom: 0;
}

.model-list {
    margin-top: 12px;
    background: var(--color-card);
    border-radius: var(--radius-sm);
    padding: 12px;
    border: 1px solid var(--color-border);
}

.list-label {
    font-size: 11px;
    color: var(--color-text-light);
    margin-bottom: 6px;
}

.model-scroll {
    max-height: 150px;
    overflow-y: auto;
}

.model-item {
    padding: 7px 10px;
    font-size: 12px;
    color: var(--color-text);
    border-radius: 8px;
    cursor: pointer;
    word-break: break-all;
}

.model-item:active {
    background: linear-gradient(135deg, #e8a8be, #d4899e);
    color: white;
}

.api-result {
    font-size: 12px;
    margin-top: 8px;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
}

.api-result.success {
    color: #7aab7a;
    background: rgba(122, 171, 122, 0.08);
}

.api-result.error {
    color: #c07070;
    background: rgba(192, 112, 112, 0.08);
}

.guide-text {
    font-size: 13px;
    color: var(--color-text);
    line-height: 1.6;
    margin-bottom: 12px;
}

.guide-step {
    font-size: 12px;
    color: var(--color-text-light);
    padding: 4px 0;
    padding-left: 8px;
}

.webhook-box {
    background: var(--color-bg);
    border-radius: 8px;
    padding: 10px 12px;
    margin: 10px 0;
    font-family: monospace;
    font-size: 11px;
    color: var(--color-text);
    word-break: break-all;
}

.webhook-url {
    margin-bottom: 4px;
    color: var(--color-primary);
}

.webhook-body {
    color: var(--color-text-light);
}

.trigger-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
}

.section-sub {
    font-size: 11px;
    color: var(--color-text-light);
    opacity: 0.5;
    margin-bottom: 14px;
    font-style: italic;
    letter-spacing: 0.03em;
}
</style>
