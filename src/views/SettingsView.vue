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
            </div>

            <!-- 人格切换 -->
            <div class="section">
                <h3>🎭 人格选择</h3>
                <div v-for="p in personas" :key="p.id" class="persona-card" :class="{ active: p.id === activePersona }"
                    @click="switchPersona(p.id)">
                    <span class="persona-name">{{ p.name }}</span>
                    <span class="persona-desc">{{ p.description }}</span>
                    <span class="check" v-if="p.id === activePersona">✓</span>
                </div>
            </div>

            <!-- 用户偏好 -->
            <div class="section">
                <h3>📝 我的偏好</h3>
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

onMounted(async () => {
    // 加载 API 配置（本地存储）
    const savedConfig = localStorage.getItem('api_config')
    if (savedConfig) {
        Object.assign(apiConfig, JSON.parse(savedConfig))
    }

    try {
        const pRes = await api('/api/prompts/personas')
        const pData = await pRes.json()
        personas.value = pData.personas
        activePersona.value = pData.active

        const uRes = await api('/api/prompts/user')
        const uData = await uRes.json()
        userPrompt.value = uData.content
        template.value = uData.template

        const proRes = await api('/api/proactive/settings')
        const proData = await proRes.json()
        Object.assign(proactive, proData)
    } catch (e) {
        console.error('加载设置失败:', e)
    }
})

function saveApiConfig() {
    localStorage.setItem('api_config', JSON.stringify(apiConfig))
    apiSaved.value = true
    setTimeout(() => { apiSaved.value = false }, 2000)
}

async function switchPersona(id) {
    await api(`/api/prompts/personas/${id}/activate`, { method: 'POST' })
    activePersona.value = id
}

async function saveUserPrompt() {
    await api('/api/prompts/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userPrompt.value })
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
</style>
