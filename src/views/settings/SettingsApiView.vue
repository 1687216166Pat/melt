<template>
    <div class="sub-page">
        <div class="settings-blob sb-tl"></div>
        <div class="settings-blob sb-br"></div>

        <div class="settings-nav">
            <button class="settings-back" @click="$router.push('/settings')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <span class="settings-title">蓝牙 · API</span>
            <div style="width:36px;"></div>
        </div>

        <div class="sub-content">
            <!-- 主 API -->
            <div class="section-label-sm">主 API</div>
            <div class="settings-group">
                <div v-if="savedConfigs.length > 0" class="config-pills">
                    <div v-for="(c, idx) in savedConfigs" :key="idx" class="config-pill"
                        :class="{ active: currentConfigIdx === idx }" @click="selectConfig(idx)">
                        <span>{{ c.name || c.model || '未命名' }}</span>
                        <button @click.stop="deleteConfig(idx)">×</button>
                    </div>
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">配置名称</div>
                    <input class="sgi-input" v-model="apiConfig.name" placeholder="例：主力模型" />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">API Key</div>
                    <input class="sgi-input" v-model="apiConfig.key" type="password" placeholder="sk-..." />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">API 地址</div>
                    <input class="sgi-input" v-model="apiConfig.baseUrl" placeholder="https://api.openai.com/v1" />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">模型</div>
                        <div class="sgi-desc">支持任意模型名，含前缀的会自动清理</div>
                    </div>
                    <input class="sgi-input" v-model="apiConfig.model" placeholder="gpt-4o / gemini-pro / ..." />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">温度</div>
                    <input class="sgi-input" v-model.number="apiConfig.temperature" type="number" min="0" max="2"
                        step="0.1" placeholder="0.7" style="max-width:80px;" />
                </div>
            </div>

            <div class="btn-row">
                <button class="action-btn primary" @click="saveApiConfig">保存并使用</button>
                <button class="action-btn ghost" @click="saveAsNewConfig">另存为新配置</button>
            </div>
            <div class="btn-row">
                <button class="action-btn ghost" @click="fetchModels" :disabled="fetchingModels">
                    {{ fetchingModels ? '获取中...' : '获取模型列表' }}
                </button>
                <button class="action-btn ghost" @click="testApiConnection" :disabled="testingApi">
                    {{ testingApi ? '测试中...' : '测试连接' }}
                </button>
            </div>

            <div v-if="modelList.length > 0" class="model-panel">
                <div class="model-panel-header">
                    <span class="model-panel-title">{{ modelList.length }} 个可用模型 · 点击选择并保存</span>
                    <input class="model-search" v-model="modelSearch" placeholder="搜索..." />
                </div>
                <div class="model-scroll">
                    <div v-for="m in filteredModelList" :key="m" class="model-chip"
                        :class="{ active: apiConfig.model === m }" @click="selectModel(m)">
                        {{ m }}
                    </div>
                </div>
            </div>

            <Transition name="toast-fade">
                <div v-if="apiTestResult" class="result-bar" :class="apiTestResult.success ? 'success' : 'error'">
                    {{ apiTestResult.message }}
                </div>
            </Transition>
            <div v-if="apiSaved" class="save-toast">已保存 ✓</div>

            <!-- 副 API -->
            <div class="section-label-sm" style="margin-top:28px;">
                副 API
                <span class="section-sub-hint">记忆 / 时间线 / 主动消息</span>
            </div>
            <div class="settings-group">
                <div v-if="savedSubConfigs.length > 0" class="config-pills">
                    <div v-for="(c, idx) in savedSubConfigs" :key="idx" class="config-pill"
                        :class="{ active: currentSubConfigIdx === idx }" @click="selectSubConfig(idx)">
                        <span>{{ c.name || c.model || '未命名' }}</span>
                        <button @click.stop="deleteSubConfig(idx)">×</button>
                    </div>
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">配置名称</div>
                    <input class="sgi-input" v-model="subApiConfig.name" placeholder="例：副模型" />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">API Key</div>
                    <input class="sgi-input" v-model="subApiConfig.key" type="password" placeholder="sk-..." />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">API 地址</div>
                    <input class="sgi-input" v-model="subApiConfig.baseUrl" placeholder="https://api.openai.com/v1" />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">模型</div>
                        <div class="sgi-desc">支持任意模型名，含前缀的会自动清理</div>
                    </div>
                    <input class="sgi-input" v-model="subApiConfig.model" placeholder="gpt-4o / gemini-pro / ..." />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label">温度</div>
                    <input class="sgi-input" v-model.number="subApiConfig.temperature" type="number" min="0" max="2"
                        step="0.1" placeholder="0.7" style="max-width:80px;" />
                </div>
            </div>

            <div class="btn-row">
                <button class="action-btn primary" @click="saveSubApiConfig">保存并使用</button>
                <button class="action-btn ghost" @click="saveAsNewSubConfig">另存为新配置</button>
            </div>
            <div class="btn-row">
                <button class="action-btn ghost" @click="fetchSubModels" :disabled="fetchingSubModels">
                    {{ fetchingSubModels ? '获取中...' : '获取模型列表' }}
                </button>
                <button class="action-btn ghost" @click="testSubApiConnection" :disabled="testingSubApi">
                    {{ testingSubApi ? '测试中...' : '测试连接' }}
                </button>
            </div>

            <div v-if="subModelList.length > 0" class="model-panel">
                <div class="model-panel-header">
                    <span class="model-panel-title">{{ subModelList.length }} 个可用模型 · 点击选择并保存</span>
                    <input class="model-search" v-model="subModelSearch" placeholder="搜索..." />
                </div>
                <div class="model-scroll">
                    <div v-for="m in filteredSubModelList" :key="m" class="model-chip"
                        :class="{ active: subApiConfig.model === m }" @click="selectSubModel(m)">
                        {{ m }}
                    </div>
                </div>
            </div>

            <Transition name="toast-fade">
                <div v-if="subApiTestResult" class="result-bar" :class="subApiTestResult.success ? 'success' : 'error'">
                    {{ subApiTestResult.message }}
                </div>
            </Transition>
            <div v-if="subApiSaved" class="save-toast">已保存 ✓</div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from '@/utils/api'

function cleanModelName(model) {
    if (!model) return model
    return model.replace(/^\[.*?\]/g, '').trim()
}

const apiConfig = reactive({ name: '', key: '', baseUrl: '', model: '', temperature: 0.7 })
const savedConfigs = ref([])
const currentConfigIdx = ref(-1)
const modelList = ref([])
const modelSearch = ref('')
const apiTestResult = ref(null)
const apiSaved = ref(false)
const fetchingModels = ref(false)
const testingApi = ref(false)

const subApiConfig = reactive({ name: '', key: '', baseUrl: '', model: '', temperature: 0.7 })
const savedSubConfigs = ref([])
const currentSubConfigIdx = ref(-1)
const subModelList = ref([])
const subModelSearch = ref('')
const subApiTestResult = ref(null)
const subApiSaved = ref(false)
const fetchingSubModels = ref(false)
const testingSubApi = ref(false)

const filteredModelList = computed(() => {
    if (!modelSearch.value.trim()) return modelList.value
    const q = modelSearch.value.toLowerCase()
    return modelList.value.filter(m => m.toLowerCase().includes(q))
})

const filteredSubModelList = computed(() => {
    if (!subModelSearch.value.trim()) return subModelList.value
    const q = subModelSearch.value.toLowerCase()
    return subModelList.value.filter(m => m.toLowerCase().includes(q))
})

onMounted(async () => {
    const c = localStorage.getItem('api_config')
    if (c) Object.assign(apiConfig, JSON.parse(c))
    const cs = localStorage.getItem('api_configs')
    if (cs) savedConfigs.value = JSON.parse(cs)
    const idx = localStorage.getItem('active_config_idx')
    if (idx !== null) currentConfigIdx.value = parseInt(idx)

    const sc = localStorage.getItem('sub_api_config')
    if (sc) Object.assign(subApiConfig, JSON.parse(sc))
    const scs = localStorage.getItem('sub_api_configs')
    if (scs) savedSubConfigs.value = JSON.parse(scs)
    const sidx = localStorage.getItem('active_sub_config_idx')
    if (sidx !== null) currentSubConfigIdx.value = parseInt(sidx)

    try {
        const res = await api('/api/settings/api')
        const data = await res.json()
        if (data.key) apiConfig.key = data.key
        if (data.baseUrl) apiConfig.baseUrl = data.baseUrl
        if (data.model) apiConfig.model = data.model
        if (data.temperature !== undefined) apiConfig.temperature = data.temperature
    } catch { }
})

function selectModel(m) { apiConfig.model = m; saveApiConfig() }
function selectSubModel(m) { subApiConfig.model = m; saveSubApiConfig() }

function selectConfig(idx) {
    currentConfigIdx.value = idx
    Object.assign(apiConfig, savedConfigs.value[idx])
    localStorage.setItem('active_config_idx', idx)
    saveApiConfig()
}

function deleteConfig(idx) {
    savedConfigs.value.splice(idx, 1)
    localStorage.setItem('api_configs', JSON.stringify(savedConfigs.value))
    if (currentConfigIdx.value >= savedConfigs.value.length)
        currentConfigIdx.value = savedConfigs.value.length - 1
}

function saveAsNewConfig() {
    savedConfigs.value.push({ ...apiConfig })
    currentConfigIdx.value = savedConfigs.value.length - 1
    localStorage.setItem('api_configs', JSON.stringify(savedConfigs.value))
    localStorage.setItem('active_config_idx', currentConfigIdx.value)
    saveApiConfig()
}

async function saveApiConfig() {
    const cleanedModel = cleanModelName(apiConfig.model)
    apiConfig.model = cleanedModel
    localStorage.setItem('api_config', JSON.stringify(apiConfig))
    if (currentConfigIdx.value >= 0 && savedConfigs.value[currentConfigIdx.value]) {
        savedConfigs.value[currentConfigIdx.value] = { ...apiConfig }
        localStorage.setItem('api_configs', JSON.stringify(savedConfigs.value))
    }
    await api('/api/settings/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiConfig.key, baseUrl: apiConfig.baseUrl, model: cleanedModel, temperature: apiConfig.temperature })
    })
    apiSaved.value = true
    setTimeout(() => { apiSaved.value = false }, 2000)
}

async function fetchModels() {
    apiTestResult.value = null; modelList.value = []; modelSearch.value = ''; fetchingModels.value = true
    try {
        const res = await api('/api/test/models', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseUrl: apiConfig.baseUrl, key: apiConfig.key }) })
        const data = await res.json()
        if (data.data && Array.isArray(data.data)) {
            modelList.value = data.data.map(m => m.id).sort()
            apiTestResult.value = { success: true, message: `获取到 ${modelList.value.length} 个模型` }
        } else {
            apiTestResult.value = { success: false, message: data.error || '返回格式异常' }
        }
    } catch (e) { apiTestResult.value = { success: false, message: e.message } }
    finally { fetchingModels.value = false }
}

async function testApiConnection() {
    apiTestResult.value = null; testingApi.value = true
    const cleanedModel = cleanModelName(apiConfig.model)
    try {
        const res = await api('/api/test/connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseUrl: apiConfig.baseUrl, key: apiConfig.key, model: cleanedModel }) })
        const data = await res.json()
        if (data.ok && data.data?.choices?.[0]) {
            apiTestResult.value = { success: true, message: `连接成功 ✓ 模型: ${cleanedModel}` }
        } else {
            apiTestResult.value = { success: false, message: data.error || data.data?.error?.message || '未知错误' }
        }
    } catch (e) { apiTestResult.value = { success: false, message: e.message } }
    finally { testingApi.value = false }
}

function selectSubConfig(idx) {
    currentSubConfigIdx.value = idx
    Object.assign(subApiConfig, savedSubConfigs.value[idx])
    localStorage.setItem('active_sub_config_idx', idx)
    saveSubApiConfig()
}

function deleteSubConfig(idx) {
    savedSubConfigs.value.splice(idx, 1)
    localStorage.setItem('sub_api_configs', JSON.stringify(savedSubConfigs.value))
    if (currentSubConfigIdx.value >= savedSubConfigs.value.length)
        currentSubConfigIdx.value = savedSubConfigs.value.length - 1
}

function saveAsNewSubConfig() {
    savedSubConfigs.value.push({ ...subApiConfig })
    currentSubConfigIdx.value = savedSubConfigs.value.length - 1
    localStorage.setItem('sub_api_configs', JSON.stringify(savedSubConfigs.value))
    localStorage.setItem('active_sub_config_idx', currentSubConfigIdx.value)
    saveSubApiConfig()
}

async function saveSubApiConfig() {
    const cleanedModel = cleanModelName(subApiConfig.model)
    subApiConfig.model = cleanedModel
    localStorage.setItem('sub_api_config', JSON.stringify(subApiConfig))
    if (currentSubConfigIdx.value >= 0 && savedSubConfigs.value[currentSubConfigIdx.value]) {
        savedSubConfigs.value[currentSubConfigIdx.value] = { ...subApiConfig }
        localStorage.setItem('sub_api_configs', JSON.stringify(savedSubConfigs.value))
    }
    await api('/api/settings/sub-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: subApiConfig.key, baseUrl: subApiConfig.baseUrl, model: cleanedModel, temperature: subApiConfig.temperature })
    })
    subApiSaved.value = true
    setTimeout(() => { subApiSaved.value = false }, 2000)
}

async function fetchSubModels() {
    subApiTestResult.value = null; subModelList.value = []; subModelSearch.value = ''; fetchingSubModels.value = true
    try {
        const res = await api('/api/test/models', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseUrl: subApiConfig.baseUrl, key: subApiConfig.key }) })
        const data = await res.json()
        if (data.data && Array.isArray(data.data)) {
            subModelList.value = data.data.map(m => m.id).sort()
            subApiTestResult.value = { success: true, message: `获取到 ${subModelList.value.length} 个模型` }
        } else {
            subApiTestResult.value = { success: false, message: data.error || '返回格式异常' }
        }
    } catch (e) { subApiTestResult.value = { success: false, message: e.message } }
    finally { fetchingSubModels.value = false }
}

async function testSubApiConnection() {
    subApiTestResult.value = null; testingSubApi.value = true
    const cleanedModel = cleanModelName(subApiConfig.model)
    try {
        const res = await api('/api/test/connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseUrl: subApiConfig.baseUrl, key: subApiConfig.key, model: cleanedModel }) })
        const data = await res.json()
        if (data.ok && data.data?.choices?.[0]) {
            subApiTestResult.value = { success: true, message: `连接成功 ✓ 模型: ${cleanedModel}` }
        } else {
            subApiTestResult.value = { success: false, message: data.error || data.data?.error?.message || '未知错误' }
        }
    } catch (e) { subApiTestResult.value = { success: false, message: e.message } }
    finally { testingSubApi.value = false }
}
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

.section-sub-hint {
    font-size: 10px;
    color: #B8A9AC;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
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
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
    position: relative;
    gap: 12px;
}

.settings-group-item:last-child {
    border-bottom: none;
}

.sgi-label {
    font-size: 14px;
    color: #4A3F41;
    flex-shrink: 0;
    white-space: nowrap;
    min-width: 70px;
}

.sgi-label-wrap {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 70px;
    max-width: 50%;
}

.sgi-label-wrap .sgi-label {
    white-space: normal;
    word-break: keep-all;
}

.sgi-label-wrap .sgi-desc {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.sgi-desc {
    font-size: 10px;
    color: #B8A9AC;
}

.sgi-input {
    flex: 1;
    min-width: 0;
    max-width: 55%;
    border: none;
    background: transparent;
    outline: none;
    font-size: 13px;
    color: #4A3F41;
    text-align: right;
    font-family: inherit;
}

.sgi-input::placeholder {
    color: #D4C8CA;
}

.btn-row {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
}

.action-btn {
    flex: 1;
    height: 44px;
    border-radius: 16px;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.25s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.action-btn.primary {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    box-shadow: 0 6px 16px rgba(217, 163, 175, 0.3);
}

.action-btn.primary:active {
    transform: scale(0.97);
}

.action-btn.ghost {
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: saturate(180%) blur(16px);
    -webkit-backdrop-filter: saturate(180%) blur(16px);
    color: #6B5E;
    border: 1px solid rgba(255, 240, 242, 0.5);
    box-shadow: 0 4px 12px rgba(217, 163, 175, 0.08);
}

.action-btn.ghost:active {
    transform: scale(0.97);
}

.config-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 12px 16px 4px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
}

.config-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 10px;
    padding: 4px 10px;
    font-size: 11px;
    color: #B8A9AC;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.config-pill.active {
    background: rgba(232, 192, 201, 0.2);
    color: #D9A3AF;
    font-weight: 700;
    border-color: rgba(232, 192, 201, 0.3);
}

.config-pill button {
    background: none;
    border: none;
    font-size: 13px;
    color: #D4C8CA;
    cursor: pointer;
    padding: 0;
    line-height: 1;
}

.model-panel {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(16px);
    -webkit-backdrop-filter: saturate(180%) blur(16px);
    border-radius: 18px;
    padding: 12px 14px;
    margin-bottom: 10px;
    border: 1px solid rgba(255, 240, 242, 0.4);
    box-shadow: 0 6px 20px rgba(217, 163, 175, 0.08);
}

.model-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    gap: 10px;
}

.model-panel-title {
    font-size: 11px;
    color: #B8A9AC;
    font-weight: 600;
    letter-spacing: 0.5px;
    flex-shrink: 0;
}

.model-search {
    flex: 1;
    border: 1px solid rgba(217, 163, 175, 0.2);
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 11px;
    background: rgba(255, 255, 255, 0.5);
    color: #4A3F41;
    outline: none;
    font-family: inherit;
    max-width: 120px;
}

.model-search::placeholder {
    color: #D4C8CA;
}

.model-scroll {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    max-height: 160px;
    overflow-y: auto;
}

.model-scroll::-webkit-scrollbar {
    display: none;
}

.model-chip {
    padding: 4px 10px;
    border-radius: 10px;
    font-size: 11px;
    color: #6B5B5E;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 240, 242, 0.4);
    cursor: pointer;
    transition: all 0.15s;
    word-break: break-all;
}

.model-chip.active {
    background: rgba(232, 192, 201, 0.2);
    color: #D9A3AF;
    font-weight: 700;
    border-color: rgba(232, 192, 201, 0.3);
}

.result-bar {
    padding: 10px 14px;
    border-radius: 14px;
    font-size: 12px;
    margin-bottom: 8px;
}

.result-bar.success {
    color: #6BAF7A;
    background: rgba(107, 175, 122, 0.1);
}

.result-bar.error {
    color: #C07070;
    background: rgba(192, 112, 112, 0.1);
}

.save-toast {
    text-align: center;
    color: #D9A3AF;
    font-size: 12px;
    padding: 8px 0;
}

.toast-fade-enter-active {
    transition: opacity 0.3s;
}

.toast-fade-leave-active {
    transition: opacity 0.5s;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
    opacity: 0;
}
</style>
