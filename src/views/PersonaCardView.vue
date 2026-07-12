<template>
    <div class="card-page">
        <div class="card-blob cb-tl"></div>
        <div class="card-blob cb-br"></div>

        <!-- 顶部导航 -->
        <div class="card-nav">
            <button class="card-back" @click="$router.push('/')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <div class="card-nav-title">
                <span class="card-title">人设书</span>
                <span class="card-subtitle">{{ personas.length }} 个角色</span>
            </div>
            <div class="card-nav-actions">
                <button class="card-icon-btn" @click="showImportMenu = true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                </button>
                <button class="card-icon-btn" @click="openNewPersona">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- 搜索栏 -->
        <div class="card-search-wrap">
            <div class="card-search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </svg>
                <input v-model="searchQuery" placeholder="搜索角色名、人设内容..." />
                <button v-if="searchQuery" @click="searchQuery = ''">×</button>
            </div>
        </div>

        <!-- 排序栏 -->
        <div class="card-sort-bar">
            <button class="sort-chip" :class="{ active: sortBy === 'recent' }" @click="sortBy = 'recent'">最近添加</button>
            <button class="sort-chip" :class="{ active: sortBy === 'name' }" @click="sortBy = 'name'">名称</button>
            <button class="sort-chip" :class="{ active: sortBy === 'chat' }" @click="sortBy = 'chat'">最近聊天</button>
        </div>

        <!-- 角色列表 -->
        <div class="card-content">
            <div v-if="loading" class="card-loading">
                <div class="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>

            <div v-else-if="filteredPersonas.length === 0" class="card-empty">
                <p class="empty-icon">🎭</p>
                <p class="empty-title">还没有角色</p>
                <p class="empty-sub">点击右上角 + 新建，或导入角色卡</p>
            </div>

            <div v-else class="persona-list">
                <div v-for="p in filteredPersonas" :key="p.id" class="persona-card" @click="openDetail(p)">
                    <!-- 左侧头像 -->
                    <div class="persona-card-avatar">
                        <img v-if="p.avatarUrl || p.avatar_url" :src="p.avatarUrl || p.avatar_url" />
                        <span v-else>{{ p.avatar || '💬' }}</span>
                    </div>

                    <!-- 中间信息 -->
                    <div class="persona-card-info">
                        <div class="persona-card-name-row">
                            <span class="persona-card-name">{{ p.note || p.name }}</span>
                            <span v-if="p.gender" class="persona-card-gender">
                                {{ { female: '♀', male: '♂', other: '⚥' }[p.gender] || '' }}
                            </span>
                        </div>
                        <p class="persona-card-desc">{{ (p.content || '').slice(0, 60) }}{{ (p.content || '').length >
                            60 ? '...' : '' }}</p>
                        <div class="persona-card-meta">
                            <span class="persona-card-date">{{ formatDate(p.created_at) }} 添加</span>
                            <span v-if="p.lastMessage" class="persona-card-last">{{ p.lastMessage.slice(0, 15)
                            }}...</span>
                        </div>
                    </div>

                    <!-- 右侧箭头 -->
                    <svg class="persona-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
            </div>
        </div>

        <!-- 角色详情弹窗 -->
        <Teleport to="body">
            <Transition name="card-slide">
                <div v-if="showDetail && detailPersona" class="detail-overlay">

                    <div class="detail-nav">
                        <button class="detail-back-btn" @click="showDetail = false">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span class="detail-nav-title">人设详情</span>
                        <div style="width:36px;"></div>
                    </div>

                    <div class="detail-scroll">

                        <!-- 身份卡片 -->
                        <div class="identity-hero">
                            <div class="identity-avatar">
                                <img v-if="detailPersona.avatarUrl || detailPersona.avatar_url"
                                    :src="detailPersona.avatarUrl || detailPersona.avatar_url" />
                                <span v-else>{{ detailPersona.avatar || '💬' }}</span>
                            </div>
                            <div class="identity-meta">
                                <p class="identity-name">{{ detailPersona.note || detailPersona.name }}</p>
                                <div class="identity-tags">
                                    <span v-if="detailPersona.gender" class="detail-tag">
                                        {{ { female: '女', male: '男', other: '其他' }[detailPersona.gender] || '' }}
                                    </span>
                                    <span class="detail-tag">{{ formatDate(detailPersona.created_at) }} 添加</span>
                                    <span v-if="detailPersona.ai_relationship" class="detail-tag">
                                        {{ detailPersona.ai_relationship }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div v-if="detailLoading" class="detail-loading">
                            <div class="loading-dots">
                                <span></span><span></span><span></span>
                            </div>
                        </div>

                        <template v-else>
                            <div class="section-label-sm">基本信息</div>
                            <div class="settings-group">
                                <div v-if="detailPersona.gender" class="settings-group-item">
                                    <div class="sgi-label">性别</div>
                                    <span class="sgi-value">{{ {
                                        female: '女', male: '男', other: '其他'
                                    }[detailPersona.gender] || '' }}</span>
                                </div>
                                <div v-if="detailPersona.call_user" class="settings-group-item">
                                    <div class="sgi-label">称呼用户</div>
                                    <span class="sgi-value">{{ detailPersona.call_user }}</span>
                                </div>
                                <div v-if="detailPersona.user_relationship" class="settings-group-item">
                                    <div class="sgi-label">我对TA的关系</div>
                                    <span class="sgi-value">{{ detailPersona.user_relationship }}</span>
                                </div>
                                <div v-if="detailPersona.ai_relationship" class="settings-group-item">
                                    <div class="sgi-label">TA眼中的关系</div>
                                    <span class="sgi-value">{{ detailPersona.ai_relationship }}</span>
                                </div>
                            </div>

                            <div class="action-row">
                                <button class="detail-action-btn primary"
                                    @click="$router.push(`/chat/${detailPersona.id}`)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                    进入对话
                                </button>
                                <button class="detail-action-btn ghost"
                                    @click="$router.push(`/persona-detail/${detailPersona.id}`)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    编辑详情
                                </button>
                            </div>

                            <!-- 人设内容（可折叠，放最后）-->
                            <div class="section-label-sm collapsible-label" @click="contentExpanded = !contentExpanded">
                                <span>人设内容</span>
                                <svg class="collapse-icon" :class="{ open: contentExpanded }" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </div>
                            <div v-if="contentExpanded" class="settings-group">
                                <div class="settings-group-item col-item">
                                    <p class="detail-persona-text">{{ detailPersona.content || '暂无人设' }}</p>
                                </div>
                            </div>

                            <div class="section-label-sm" style="margin-top:28px;">操作</div>
                            <div class="settings-group">
                                <div class="settings-group-item danger-item" @click="deletePersona(detailPersona)">
                                    <div class="sgi-label" style="color:#C07070;">删除这个角色</div>
                                </div>
                            </div>
                        </template>

                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- 导入菜单 -->
        <Teleport to="body">
            <div v-if="showImportMenu" class="import-overlay" @click.self="showImportMenu = false">
                <div class="import-panel">
                    <div class="import-panel-title">导入角色</div>
                    <div class="import-options">
                        <label class="import-opt">
                            <div class="import-opt-icon">🎴</div>
                            <div class="import-opt-info">
                                <span class="import-opt-name">酒馆角色卡</span>
                                <span class="import-opt-desc">支持 PNG 图片卡和 JSON 格式</span>
                            </div>
                            <input type="file" accept=".png,.json" style="display:none" @change="handleTavernImport" />
                        </label>
                        <label class="import-opt">
                            <div class="import-opt-icon">📄</div>
                            <div class="import-opt-info">
                                <span class="import-opt-name">文本文件</span>
                                <span class="import-opt-desc">txt、md 格式的人设文本</span>
                            </div>
                            <input type="file" accept=".txt,.md" style="display:none" @change="handleTextImport" />
                        </label>
                    </div>
                    <div v-if="importing" class="import-loading">正在导入...</div>
                    <div v-if="importError" class="import-error">{{ importError }}</div>
                </div>
            </div>
        </Teleport>

        <!-- 新建角色弹窗 -->
        <Teleport to="body">
            <div v-if="showNewPersona" class="import-overlay" @click.self="showNewPersona = false">
                <div class="import-panel new-persona-panel">
                    <div class="import-panel-title">新建角色</div>
                    <input class="np-input" v-model="newPersonaForm.name" placeholder="角色名称 *" />
                    <input class="np-input" v-model="newPersonaForm.note" placeholder="备注名（显示用）" />
                    <textarea class="np-textarea" v-model="newPersonaForm.content" placeholder="人设内容 *"
                        rows="5"></textarea>
                    <div class="np-actions">
                        <button class="np-btn-cancel" @click="showNewPersona = false">取消</button>
                        <button class="np-btn-confirm" @click="createNewPersona"
                            :disabled="!newPersonaForm.name || !newPersonaForm.content">
                            创建
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/utils/api'

const router = useRouter()

const personas = ref([])
const loading = ref(true)
const searchQuery = ref('')
const sortBy = ref('recent')
const showDetail = ref(false)
const detailPersona = ref(null)
const detailLoading = ref(false)
const contentExpanded = ref(false)
const showImportMenu = ref(false)
const showNewPersona = ref(false)
const importing = ref(false)
const importError = ref('')

const newPersonaForm = ref({ name: '', note: '', content: '' })

const filteredPersonas = computed(() => {
    let result = [...personas.value]
    if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(p =>
            (p.name || '').toLowerCase().includes(q) ||
            (p.note || '').toLowerCase().includes(q) ||
            (p.content || '').toLowerCase().includes(q)
        )
    }
    if (sortBy.value === 'name') {
        result.sort((a, b) => (a.note || a.name).localeCompare(b.note || b.name))
    } else if (sortBy.value === 'recent') {
        result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    } else if (sortBy.value === 'chat') {
        result.sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0))
    }
    return result
})

function formatDate(ts) {
    if (!ts) return '未知'
    const d = new Date(ts)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

async function loadPersonas() {
    loading.value = true
    try {
        const res = await api('/api/personas/all')
        const data = await res.json()
        personas.value = data
    } catch (e) {
        console.error('加载角色失败:', e)
    } finally {
        loading.value = false
    }
}

async function openDetail(p) {
    detailPersona.value = p
    showDetail.value = true
    detailLoading.value = true
    contentExpanded.value = false
    try {
        const res = await api(`/api/persona/${p.id}`)
        const data = await res.json()
        detailPersona.value = {
            ...p,
            ...data,
            avatarUrl: data.avatarUrl || data.avatar_url || p.avatarUrl || p.avatar_url,
        }
    } catch (e) {
        console.error('加载详情失败:', e)
    } finally {
        detailLoading.value = false
    }
}

function openNewPersona() {
    newPersonaForm.value = { name: '', note: '', content: '' }
    showNewPersona.value = true
}

async function createNewPersona() {
    if (!newPersonaForm.value.name || !newPersonaForm.value.content) return
    try {
        await api('/api/personas/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newPersonaForm.value.name,
                note: newPersonaForm.value.note || newPersonaForm.value.name,
                content: newPersonaForm.value.content,
                avatar: '💬',
            })
        })
        showNewPersona.value = false
        await loadPersonas()
    } catch (e) {
        console.error('创建失败:', e)
    }
}

async function deletePersona(p) {
    if (!confirm(`确定删除「${p.note || p.name}」？所有对话和记忆都会被清除。`)) return
    try {
        await api(`/api/messages/${p.id}`, { method: 'DELETE' })
        await api(`/api/memories/${p.id}/clear`, { method: 'DELETE' })
        if (p.custom || p.id.startsWith('custom_')) {
            await api(`/api/personas/custom/${p.id}`, { method: 'DELETE' })
        } else {
            await api(`/api/personas/builtin/${p.id}/hide`, { method: 'POST' })
        }
        showDetail.value = false
        await loadPersonas()
    } catch (e) {
        console.error('删除失败:', e)
    }
}

async function handleTavernImport(event) {
    const file = event.target.files[0]
    if (!file) return
    event.target.value = ''
    importing.value = true
    importError.value = ''
    showImportMenu.value = false
    try {
        const ext = file.name.split('.').pop().toLowerCase()
        let cardData = null
        if (ext === 'png') {
            cardData = await extractTavernCardFromPNG(file)
        } else if (ext === 'json') {
            const text = await file.text()
            cardData = JSON.parse(text)
        }
        if (!cardData) throw new Error('无法解析角色卡数据')
        const persona = mapTavernToPersona(cardData, file.name)
        await saveImportedPersona(persona)
        await loadPersonas()
    } catch (e) {
        importError.value = `导入失败：${e.message}`
        showImportMenu.value = true
    } finally {
        importing.value = false
    }
}

async function extractTavernCardFromPNG(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
            try {
                const buffer = e.target.result
                const bytes = new Uint8Array(buffer)
                const pngSig = [137, 80, 78, 71, 13, 10, 26, 10]
                for (let i = 0; i < 8; i++) {
                    if (bytes[i] !== pngSig[i]) throw new Error('不是有效的 PNG 文件')
                }
                let offset = 8
                while (offset < bytes.length - 12) {
                    const length = (bytes[offset] << 24) | (bytes[offset + 1] << 16) |
                        (bytes[offset + 2] << 8) | bytes[offset + 3]
                    const type = String.fromCharCode(
                        bytes[offset + 4], bytes[offset + 5],
                        bytes[offset + 6], bytes[offset + 7]
                    )
                    if (type === 'tEXt') {
                        const chunkData = bytes.slice(offset + 8, offset + 8 + length)
                        const nullIdx = chunkData.indexOf(0)
                        const keyword = new TextDecoder().decode(chunkData.slice(0, nullIdx))
                        const value = new TextDecoder().decode(chunkData.slice(nullIdx + 1))
                        if (keyword === 'chara') {
                            const decoded = atob(value)
                            resolve(JSON.parse(decoded))
                            return
                        }
                    }
                    offset += 12 + length
                }
                reject(new Error('PNG 中未找到角色数据，请确认是酒馆格式的角色卡'))
            } catch (err) {
                reject(err)
            }
        }
        reader.onerror = () => reject(new Error('文件读取失败'))
        reader.readAsArrayBuffer(file)
    })
}

function mapTavernToPersona(cardData, filename) {
    const data = cardData.data || cardData
    const name = data.name || filename.replace(/\.[^.]+$/, '')
    const parts = []
    if (data.description) parts.push(`【性格与描述】\n${data.description}`)
    if (data.personality) parts.push(`【性格特点】\n${data.personality}`)
    if (data.scenario) parts.push(`【场景设定】\n${data.scenario}`)
    if (data.mes_example) parts.push(`【对话示例】\n${data.mes_example}`)
    const content = parts.join('\n\n')
    const firstMessage = data.first_mes || data.first_message || ''
    return { name, note: name, content, firstMessage, avatar: '🎭', source: 'tavern' }
}

async function handleTextImport(event) {
    const file = event.target.files[0]
    if (!file) return
    event.target.value = ''
    importing.value = true
    importError.value = ''
    showImportMenu.value = false
    try {
        const text = await file.text()
        const name = file.name.replace(/\.[^.]+$/, '')
        await saveImportedPersona({ name, note: name, content: text, avatar: '💬', source: 'text' })
        await loadPersonas()
    } catch (e) {
        importError.value = `导入失败：${e.message}`
        showImportMenu.value = true
    } finally {
        importing.value = false
    }
}

async function saveImportedPersona(persona) {
    await api('/api/personas/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(persona)
    })
}

onMounted(loadPersonas)
</script>

<style scoped>
.card-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background: linear-gradient(180deg, #FFFBFA 0%, #FFF0F2 60%, #FFE9ED 100%);
    box-sizing: border-box;
}

.card-blob {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    filter: blur(60px);
}

.cb-tl {
    top: -40px;
    left: -50px;
    width: 220px;
    height: 220px;
    background: #F1DADD;
    opacity: 0.45;
}

.cb-br {
    bottom: 40px;
    right: -60px;
    width: 200px;
    height: 200px;
    background: #98CBEA;
    opacity: 0.2;
}

.card-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(env(safe-area-inset-top, 44px) + 8px) 16px 4px;
    flex-shrink: 0;
    position: relative;
    z-index: 2;
}

.card-nav-title {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
}

.card-title {
    font-size: 17px;
    font-weight: 800;
    color: #4A3F41;
}

.card-subtitle {
    font-size: 10px;
    color: #B8A9AC;
}

.card-nav-actions {
    display: flex;
    gap: 8px;
}

.card-back,
.card-icon-btn {
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

.card-back svg,
.card-icon-btn svg {
    width: 16px;
    height: 16px;
    stroke: #D9A3AF;
}

.card-search-wrap {
    padding: 8px 16px 4px;
    position: relative;
    z-index: 1;
}

.card-search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(217, 163, 175, 0.2);
    border-radius: 16px;
    padding: 0 14px;
    height: 40px;
}

.card-search-box svg {
    width: 16px;
    height: 16px;
    stroke: #B8A9AC;
    flex-shrink: 0;
}

.card-search-box input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 13px;
    color: #4A3F41;
    outline: none;
    font-family: inherit;
}

.card-search-box input::placeholder {
    color: #D4C8CA;
}

.card-search-box button {
    background: none;
    border: none;
    font-size: 16px;
    color: #B8A9AC;
    cursor: pointer;
}

.card-sort-bar {
    display: flex;
    gap: 6px;
    padding: 6px 16px 8px;
    overflow-x: auto;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}

.card-sort-bar::-webkit-scrollbar {
    display: none;
}

.sort-chip {
    padding: 5px 14px;
    border-radius: 12px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    font-size: 11px;
    color: #B8A9AC;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all 0.15s;
}

.sort-chip.active {
    background: rgba(217, 163, 175, 0.15);
    color: #D9A3AF;
    border-color: rgba(217, 163, 175, 0.4);
}

.card-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
    position: relative;
    z-index: 1;
}

.card-content::-webkit-scrollbar {
    display: none;
}

.card-loading {
    display: flex;
    justify-content: center;
    padding: 48px 0;
}

.loading-dots {
    display: flex;
    gap: 6px;
}

.loading-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #E8C0C9;
    animation: dot-bounce 1.2s ease-in-out infinite;
}

.loading-dots span:nth-child(2) {
    animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes dot-bounce {

    0%,
    80%,
    100% {
        transform: scale(0.8);
        opacity: 0.5;
    }

    40% {
        transform: scale(1);
        opacity: 1;
    }
}

.card-empty {
    text-align: center;
    padding: 48px 24px;
}

.empty-icon {
    font-size: 32px;
    margin-bottom: 12px;
}

.empty-title {
    font-size: 14px;
    color: #4A3F41;
    margin-bottom: 6px;
}

.empty-sub {
    font-size: 12px;
    color: #B8A9AC;
}

.persona-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.persona-card {
    display: flex;
    align-items: center;
    gap: 14px;
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 22px;
    padding: 14px 16px;
    border: 1px solid rgba(255, 240, 242, 0.4);
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
    cursor: pointer;
    transition: transform 0.15s;
}

.persona-card:active {
    transform: scale(0.98);
}

.persona-card-avatar {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: rgba(255, 233, 237, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    overflow: hidden;
    border: 2px solid rgba(255, 255, 255, 0.9);
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(217, 163, 175, 0.12);
}

.persona-card-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.persona-card-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.persona-card-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.persona-card-name {
    font-size: 15px;
    font-weight: 700;
    color: #4A3F41;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.persona-card-gender {
    font-size: 11px;
    color: #D9A3AF;
    flex-shrink: 0;
}

.persona-card-desc {
    font-size: 12px;
    color: #8A7880;
    line-height: 1.5;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.persona-card-meta {
    display: flex;
    align-items: center;
    gap: 8px;
}

.persona-card-date {
    font-size: 10px;
    color: #B8A9AC;
}

.persona-card-last {
    font-size: 10px;
    color: #D4C8CA;
}

.persona-card-arrow {
    width: 14px;
    height: 14px;
    stroke: #D4C8CA;
    flex-shrink: 0;
}

/* ===== 详情页（照抄 PersonaDetailView 结构）===== */
.detail-overlay {
    position: fixed;
    inset: 0;
    z-index: 900;
    background: linear-gradient(180deg, #FFFBFA 0%, #FFF0F2 60%, #FFE9ED 100%);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
}

.detail-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(env(safe-area-inset-top, 44px) + 8px) 16px 4px;
    flex-shrink: 0;
    position: relative;
    z-index: 2;
}

.detail-back-btn {
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

.detail-back-btn svg {
    width: 16px;
    height: 16px;
    stroke: #D9A3AF;
}

.detail-nav-title {
    font-size: 17px;
    font-weight: 800;
    color: #4A3F41;
}

.detail-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 8px 16px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 32px);
    position: relative;
    z-index: 1;
}

.detail-scroll::-webkit-scrollbar {
    display: none;
}

.identity-hero {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 4px 24px;
}

.identity-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(255, 233, 237, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(217, 163, 175, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.8);
    flex-shrink: 0;
}

.identity-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.identity-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.identity-name {
    font-size: 22px;
    font-weight: 700;
    color: #4A3F41;
    margin: 0;
}

.identity-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.detail-tag {
    font-size: 11px;
    color: #D9A3AF;
    background: rgba(217, 163, 175, 0.12);
    padding: 3px 10px;
    border-radius: 10px;
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
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.settings-group-item {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
}

.settings-group-item:last-child {
    border-bottom: none;
}

.col-item {
    flex-direction: column;
    align-items: flex-start;
}

.sgi-label {
    font-size: 14px;
    color: #4A3F41;
}

.detail-persona-text {
    font-size: 13px;
    color: #4A3F41;
    line-height: 1.8;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    padding: 4px 0;
}

.detail-text {
    font-size: 13px;
    color: #4A3F41;
    line-height: 1.6;
    margin: 0;
}

.action-row {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    margin-bottom: 4px;
}

.detail-action-btn {
    flex: 1;
    height: 48px;
    border-radius: 16px;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
}

.detail-action-btn svg {
    width: 16px;
    height: 16px;
}

.detail-action-btn.primary {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    box-shadow: 0 6px 20px rgba(217, 163, 175, 0.3);
}

.detail-action-btn.primary svg {
    stroke: white;
}

.detail-action-btn.ghost {
    background: rgba(255, 255, 255, 0.5);
    color: #4A3F41;
    border: 1px solid rgba(217, 163, 175, 0.2);
}

.detail-action-btn.ghost svg {
    stroke: #B8A9AC;
}

.detail-action-btn:active {
    transform: scale(0.97);
}

.danger-item {
    cursor: pointer;
}

.danger-item:active {
    background: rgba(192, 112, 112, 0.04);
}

.detail-loading {
    display: flex;
    justify-content: center;
    padding: 48px 0;
}

/* ===== 导入/新建面板 ===== */
.import-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(74, 63, 65, 0.2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-end;
    padding: 0 16px calc(env(safe-area-inset-bottom, 0px) + 16px);
}

.import-panel {
    background: rgba(255, 252, 252, 0.97);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 28px;
    width: 100%;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 20px 60px rgba(217, 163, 175, 0.15);
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

.import-panel-title {
    font-size: 16px;
    font-weight: 700;
    color: #4A3F41;
    text-align: center;
    padding-bottom: 4px;
}

.import-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.import-opt {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(217, 163, 175, 0.12);
    cursor: pointer;
    transition: background 0.15s;
}

.import-opt:active {
    background: rgba(217, 163, 175, 0.06);
}

.import-opt-icon {
    font-size: 28px;
    flex-shrink: 0;
}

.import-opt-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.import-opt-name {
    font-size: 14px;
    font-weight: 600;
    color: #4A3F41;
}

.import-opt-desc {
    font-size: 11px;
    color: #B8A9AC;
}

.import-loading {
    text-align: center;
    font-size: 13px;
    color: #B8A9AC;
    padding: 4px 0;
}

.import-error {
    font-size: 12px;
    color: #C07070;
    background: rgba(192, 112, 112, 0.08);
    border-radius: 10px;
    padding: 8px 12px;
    text-align: center;
}

.new-persona-panel {
    max-height: 80vh;
    overflow-y: auto;
}

.new-persona-panel::-webkit-scrollbar {
    display: none;
}

.np-input {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    color: #4A3F41;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
}

.np-input::placeholder {
    color: #D4C8CA;
}

.np-textarea {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.6);
    font-size: 13px;
    color: #4A3F41;
    line-height: 1.6;
    font-family: inherit;
    outline: none;
    resize: none;
    box-sizing: border-box;
}

.np-textarea::placeholder {
    color: #D4C8CA;
}

.np-actions {
    display: flex;
    gap: 10px;
}

.np-btn-cancel {
    flex: 1;
    height: 44px;
    border-radius: 14px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    color: #B8A9AC;
    cursor: pointer;
    font-family: inherit;
}

.np-btn-confirm {
    flex: 2;
    height: 44px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 4px 12px rgba(217, 163, 175, 0.3);
}

.np-btn-confirm:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
}

/* ===== 过渡动画 ===== */
.card-slide-enter-active {
    transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.3s;
}

.card-slide-leave-active {
    transition: transform 0.25s ease, opacity 0.25s;
}

.card-slide-enter-from {
    transform: translateX(100%);
    opacity: 0;
}

.card-slide-leave-to {
    transform: translateX(100%);
    opacity: 0;
}

.sgi-value {
    font-size: 13px;
    color: #B8A9AC;
    text-align: right;
    flex: 1;
    padding-left: 12px;
}

.collapsible-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
}

.collapse-icon {
    width: 14px;
    height: 14px;
    stroke: #B8A9AC;
    transition: transform 0.2s;
}

.collapse-icon.open {
    transform: rotate(180deg);
}

</style>
