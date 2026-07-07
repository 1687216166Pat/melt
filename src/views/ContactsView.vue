<template>
    <div class="contacts-page">
        <div class="contacts-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>联系人</h2>
            <button class="add-btn" @click="showAddModal = true">+</button>
        </div>
        <div class="contacts-list">
            <div v-for="persona in personas" :key="persona.id" class="contact-item"
                @click="$router.push(`/persona-detail/${persona.id}`)">
                <div class="contact-avatar">{{ persona.avatar }}</div>
                <div class="contact-info">
                    <p class="contact-name">{{ persona.note || persona.name }}</p>
                    <p class="contact-desc">{{ persona.description }}</p>
                </div>
                <button v-if="persona.custom" class="delete-persona-btn"
                    @click.stop="deletePersona(persona.id)">×</button>
                <span class="active-badge" v-if="persona.id === activePersona">当前</span>
            </div>
        </div>

        <!-- 添加人格弹窗 -->
        <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
            <div class="modal">
                <h3>添加人格</h3>
                <div class="modal-tabs">
                    <button :class="{ active: addMode === 'custom' }" @click="addMode = 'custom'">自定义</button>
                    <button :class="{ active: addMode === 'import' }" @click="addMode = 'import'">导入文件</button>
                </div>

                <div v-if="addMode === 'custom'" class="modal-form">
                    <div class="input-group">
                        <label>名字</label>
                        <input v-model="newPersona.name" placeholder="角色名称" />
                    </div>
                    <div class="input-group">
                        <label>头像 (emoji)</label>
                        <input v-model="newPersona.avatar" placeholder="💬" maxlength="2" />
                    </div>
                    <div class="input-group">
                        <label>设定</label>
                        <textarea v-model="newPersona.content" rows="8" placeholder="描述这个角色的性格、说话方式、身份背景..."></textarea>
                    </div>
                </div>

                <div v-if="addMode === 'import'" class="modal-form">
                    <p class="import-tip">支持 .txt .md .json 格式</p>
                    <input type="file" ref="fileInput" accept=".txt,.md,.json" @change="handleFileImport" />
                    <div v-if="newPersona.content && addMode === 'import'" class="import-preview">
                        <div class="input-group">
                            <label>名字</label>
                            <input v-model="newPersona.name" placeholder="角色名称" />
                        </div>
                        <div class="input-group">
                            <label>头像 (emoji)</label>
                            <input v-model="newPersona.avatar" placeholder="💬" maxlength="2" />
                        </div>
                        <div class="input-group">
                            <label>预览</label>
                            <textarea :value="newPersona.content" rows="4" readonly></textarea>
                        </div>
                    </div>
                </div>

                <div class="modal-actions">
                    <button class="cancel-btn" @click="closeModal">取消</button>
                    <button class="confirm-btn" @click="createPersona"
                        :disabled="!newPersona.name || !newPersona.content">
                        创建
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { api } from '@/utils/api'

const personas = ref([])
const activePersona = ref('')
const showAddModal = ref(false)
const addMode = ref('custom')
const fileInput = ref(null)

const newPersona = reactive({
    name: '',
    avatar: '💬',
    content: ''
})

async function loadPersonas() {
    try {
        const res = await api('/api/prompts/personas')
        const data = await res.json()
        activePersona.value = data.active

        // 逐个获取详情（包含备注）
        const detailed = await Promise.all(
            data.personas.map(async (p) => {
                try {
                    const detailRes = await api(`/api/persona/${p.id}`)
                    const detail = await detailRes.json()
                    return { ...p, note: detail.note || '' }
                } catch {
                    return p
                }
            })
        )
        personas.value = detailed
    } catch (e) {
        console.error('加载联系人失败:', e)
    }
}


async function createPersona() {
    if (!newPersona.name || !newPersona.content) return

    try {
        await api('/api/personas/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newPersona.name,
                content: newPersona.content,
                avatar: newPersona.avatar || '💬'
            })
        })
        closeModal()
        await loadPersonas()
    } catch (e) {
        console.error('创建人格失败:', e)
    }
}

async function deletePersona(id) {
    if (!confirm('确定删除这个人格？')) return
    try {
        await api(`/api/personas/custom/${id}`, { method: 'DELETE' })
        await loadPersonas()
    } catch (e) {
        console.error('删除人格失败:', e)
    }
}

function handleWallpaperUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => {
        img.onload = () => {
            const canvas = document.createElement('canvas')
            const maxSize = 800
            let w = img.width, h = img.height
            if (w > maxSize || h > maxSize) {
                if (w > h) { h = h * maxSize / w; w = maxSize }
                else { w = w * maxSize / h; h = maxSize }
            }
            canvas.width = w
            canvas.height = h
            canvas.getContext('2d').drawImage(img, 0, 0, w, h)
            wallpaperUrl.value = canvas.toDataURL('image/jpeg', 0.7)
            applyWallpaper() // 自动应用
        }
        img.src = e.target.result
    }
    reader.readAsDataURL(file)
}

async function handleFileImport(event) {
    const file = event.target.files[0]
    if (!file) return

    try {
        const text = await file.text()

        if (file.name.endsWith('.json')) {
            const json = JSON.parse(text)
            newPersona.name = json.name || file.name.replace('.json', '')
            newPersona.content = json.content || json.prompt || json.description || text
            newPersona.avatar = json.avatar || '💬'
        } else {
            newPersona.name = file.name.replace(/\.(txt|md)$/, '')
            newPersona.content = text
        }
    } catch (e) {
        console.error('文件读取失败:', e)
    }
}

function closeModal() {
    showAddModal.value = false
    addMode.value = 'custom'
    newPersona.name = ''
    newPersona.avatar = '💬'
    newPersona.content = ''
}

onMounted(loadPersonas)
</script>

<style scoped>
.contacts-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
}

.contacts-header {
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
    padding: 0 4px;
}

.contacts-header h2 {
    flex: 1;
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
}

.add-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: var(--color-primary);
    cursor: pointer;
    padding: 0 4px;
}

.contacts-list {
    flex: 1;
    overflow-y: auto;
}

.contact-item {
    display: flex;
    align-items: center;
    padding: 16px 4px;
    border-bottom: 1px solid var(--color-bg-secondary);
    cursor: pointer;
    transition: background 0.15s;
}

.contact-item:active {
    background: var(--color-bg-secondary);
}

.contact-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--color-bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-right: 12px;
    flex-shrink: 0;
}

.contact-info {
    flex: 1;
}

.contact-name {
    font-size: 16px;
    color: var(--color-text);
    font-weight: 500;
}

.contact-desc {
    font-size: 13px;
    color: var(--color-text-light);
    margin-top: 2px;
}

.active-badge {
    font-size: 11px;
    color: var(--color-primary);
    background: rgba(232, 160, 191, 0.15);
    padding: 2px 8px;
    border-radius: 10px;
}

.delete-persona-btn {
    background: none;
    border: none;
    font-size: 20px;
    color: var(--color-text-light);
    cursor: pointer;
    padding: 4px 8px;
    margin-right: 8px;
}

/* 弹窗 */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
}

.modal {
    background: var(--color-bg);
    border-radius: 16px;
    padding: 20px;
    width: 100%;
    max-width: 340px;
    max-height: 80vh;
    overflow-y: auto;
}

.modal h3 {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 16px;
    text-align: center;
}

.modal-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
}

.modal-tabs button {
    flex: 1;
    padding: 8px;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 8px;
    background: var(--color-white);
    font-size: 13px;
    color: var(--color-text);
    cursor: pointer;
}

.modal-tabs button.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
}

.modal-form .input-group {
    margin-bottom: 12px;
}

.modal-form .input-group label {
    display: block;
    font-size: 12px;
    color: var(--color-text-light);
    margin-bottom: 4px;
}

.modal-form .input-group input {
    width: 100%;
    height: 36px;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 8px;
    padding: 0 12px;
    font-size: 14px;
    background: var(--color-white);
    outline: none;
}

.modal-form .input-group input:focus {
    border-color: var(--color-primary);
}

.modal-form .input-group textarea {
    width: 100%;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 13px;
    font-family: inherit;
    background: var(--color-white);
    outline: none;
    resize: none;
    line-height: 1.5;
}

.modal-form .input-group textarea:focus {
    border-color: var(--color-primary);
}

.import-tip {
    font-size: 12px;
    color: var(--color-text-light);
    margin-bottom: 10px;
}

.import-preview {
    margin-top: 12px;
}

.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
}

.cancel-btn {
    flex: 1;
    padding: 10px;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 10px;
    background: var(--color-white);
    font-size: 14px;
    color: var(--color-text);
    cursor: pointer;
}

.confirm-btn {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 10px;
    background: var(--color-primary);
    font-size: 14px;
    color: white;
    cursor: pointer;
}

.confirm-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}
</style>
