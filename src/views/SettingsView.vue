<template>
    <div class="settings-page">
        <div class="settings-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>设置</h2>
        </div>

        <div class="settings-content">
            <!-- API 配置 -->
            <div class="section">
                <h3>🔑 API 配置</h3>
                <div class="input-group">
                    <label>API Key</label>
                    <input type="password" v-model="apiConfig.key" placeholder="sk-..." />
                </div>
                <div class="input-group">
                    <label>API 地址</label>
                    <input type="text" v-model="apiConfig.baseUrl" placeholder="https://api.openai.com/v1" />
                </div>
                <div class="input-group">
                    <label>模型名称</label>
                    <input type="text" v-model="apiConfig.model" placeholder="gpt-4o-mini" />
                </div>
                <button class="save-btn" @click="saveApiConfig">保存 API 配置</button>
                <p class="save-tip" v-if="apiSaved">已保存 ✓</p>

                <div class="api-actions">
                    <button class="action-btn" @click="fetchModels">获取模型列表</button>
                    <button class="action-btn" @click="testApiConnection">测试连接</button>
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
            </div>

            <!-- 主动消息设置 -->
            <div class="section">
                <h3>💬 主动消息</h3>
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
                        <span>每日最多主动</span>
                        <select v-model="proactive.maxPerDay" @change="saveProactive">
                            <option :value="1">1 次</option>
                            <option :value="2">2 次</option>
                            <option :value="3">3 次</option>
                            <option :value="5">5 次</option>
                        </select>
                    </div>
                </div>

                <button class="action-btn" @click="testProactive">测试主动消息</button>
                <p v-if="proactiveTestResult" class="api-result"
                    :class="proactiveTestResult.success ? 'success' : 'error'">
                    {{ proactiveTestResult.message }}
                </p>
            </div>

            <!-- 用户偏好 -->
            <div class="section">
                <h3>📝 我的偏好</h3>

                <div class="setting-row">
                    <span>AI 输出包含动作描写</span>
                    <label class="toggle">
                        <input type="checkbox" v-model="outputPrefs.actionDesc" @change="saveOutputPrefs" />
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-row">
                    <span>AI 分句输出（更有节奏感）</span>
                    <label class="toggle">
                        <input type="checkbox" v-model="outputPrefs.splitSentence" @change="saveOutputPrefs" />
                        <span class="slider"></span>
                    </label>
                </div>

                <textarea v-model="userPrompt" :placeholder="template" rows="8"></textarea>
                <button class="save-btn" @click="saveUserPrompt">保存偏好</button>
                <p class="save-tip" v-if="saved">已保存 ✓</p>
            </div>


            <!-- 导入导出 -->
            <div class="section">
                <h3>💾 数据管理</h3>
                <button class="action-btn" @click="exportData">导出数据 (JSON)</button>
                <button class="action-btn" @click="triggerImport">导入数据 (JSON)</button>
                <input type="file" ref="importInput" accept=".json" style="display:none" @change="importData" />
                <button class="action-btn upload-btn" @click="syncToCloud">上传至云端</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { api } from '@/utils/api'

const personas = ref([])
const activePersona = ref('')
const userPrompt = ref('')
const template = ref('')
const saved = ref(false)
const apiSaved = ref(false)
const importInput = ref(null)

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
}

.settings-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--color-bg-secondary);
}

.back-btn {
    background: none;
    border: none;
    font-size: 28px;
    color: var(--color-primary);
    cursor: pointer;
}

.settings-header h2 {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
}

.settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 0;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
}

.section {
    margin-bottom: 28px;
}

.section h3 {
    font-size: 13px;
    color: var(--color-text-light);
    margin-bottom: 10px;
}

.input-group {
    margin-bottom: 10px;
}

.input-group label {
    display: block;
    font-size: 12px;
    color: var(--color-text-light);
    margin-bottom: 4px;
}

.input-group input {
    width: 100%;
    height: 38px;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 10px;
    padding: 0 12px;
    font-size: 14px;
    background: var(--color-white);
    outline: none;
}

.input-group input:focus {
    border-color: var(--color-primary);
}

.setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    background: var(--color-white);
    border-radius: 10px;
    margin-bottom: 6px;
    font-size: 14px;
    color: var(--color-text);
}

.setting-row select {
    padding: 4px 8px;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 6px;
    font-size: 13px;
    background: var(--color-bg);
    outline: none;
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
    transition: 0.3s;
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
    transition: 0.3s;
}

.toggle input:checked+.slider {
    background: var(--color-primary);
}

.toggle input:checked+.slider:before {
    transform: translateX(20px);
}

.persona-card {
    background: var(--color-white);
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
}

.persona-card.active {
    border-color: var(--color-primary);
}

.persona-card:active {
    transform: scale(0.98);
}

.persona-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
}

.persona-desc {
    flex: 1;
    font-size: 13px;
    color: var(--color-text-light);
}

.check {
    color: var(--color-primary);
    font-weight: bold;
}

textarea {
    width: 100%;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 12px;
    padding: 12px;
    font-size: 14px;
    font-family: inherit;
    background: var(--color-white);
    outline: none;
    resize: none;
    line-height: 1.5;
}

textarea:focus {
    border-color: var(--color-primary);
}

.save-btn {
    margin-top: 10px;
    padding: 10px 20px;
    border-radius: 10px;
    border: none;
    background: var(--color-primary);
    color: white;
    font-size: 14px;
    cursor: pointer;
    width: 100%;
}

.save-tip {
    text-align: center;
    color: var(--color-primary);
    font-size: 13px;
    margin-top: 8px;
}

.action-btn {
    width: 100%;
    padding: 12px;
    margin-bottom: 8px;
    border: 1px solid var(--color-bg-secondary);
    background: var(--color-white);
    border-radius: 10px;
    font-size: 14px;
    color: var(--color-text);
    cursor: pointer;
}

.action-btn:active {
    background: var(--color-bg-secondary);
}

.upload-btn {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
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
    margin-top: 10px;
    background: var(--color-white);
    border-radius: 10px;
    padding: 10px;
}

.list-label {
    font-size: 12px;
    color: var(--color-text-light);
    margin-bottom: 6px;
}

.model-scroll {
    max-height: 150px;
    overflow-y: auto;
}

.model-item {
    padding: 6px 10px;
    font-size: 12px;
    color: var(--color-text);
    border-radius: 6px;
    cursor: pointer;
    word-break: break-all;
}

.model-item:active {
    background: var(--color-primary);
    color: white;
}

.api-result {
    font-size: 12px;
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 8px;
}

.api-result.success {
    color: #4caf50;
    background: rgba(76, 175, 80, 0.1);
}

.api-result.error {
    color: #f44336;
    background: rgba(244, 67, 54, 0.1);
}
</style>
