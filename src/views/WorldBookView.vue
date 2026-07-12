<template>
    <div class="worldbook-page">
        <!-- 顶部 -->
        <div class="wb-header-wrap">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <div class="wb-header-title">
                <span class="wb-title">世界书</span>
                <span class="wb-subtitle">World Book</span>
            </div>
            <div class="wb-header-actions">
                <button class="wb-icon-btn" :class="{ active: selectMode }" @click="toggleSelectMode">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                </button>
                <button class="wb-icon-btn" @click="showAdd = true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- 搜索栏 -->
        <div class="wb-search-wrap">
            <div class="wb-search-box">
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </svg>
                <input v-model="searchQuery" class="wb-search-input" placeholder="搜索标题或内容..." />
                <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</button>
            </div>
        </div>

        <!-- 注入位置说明 -->
        <div class="guide-toggle" @click="showGuide = !showGuide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span>注入位置说明</span>
            <svg class="guide-chevron" :class="{ open: showGuide }" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M6 9l6 6 6-6" />
            </svg>
        </div>
        <div v-if="showGuide" class="guide-panel">
            <div v-for="g in guideItems" :key="g.label" class="guide-item">
                <div class="guide-dot" :style="{ background: g.color }"></div>
                <div>
                    <span class="guide-label">{{ g.label }}</span>
                    <span class="guide-desc">{{ g.desc }}</span>
                </div>
            </div>
        </div>

        <!-- 分类筛选 -->
        <div v-if="existingCategories.length > 0" class="category-filter">
            <button class="filter-chip" :class="{ active: filterCategory === '' }"
                @click="filterCategory = ''">全部</button>
            <button v-for="cat in existingCategories" :key="cat" class="filter-chip"
                :class="{ active: filterCategory === cat }" @click="filterCategory = cat">
                {{ cat }}
            </button>
        </div>

        <!-- 批量操作栏 -->
        <div v-if="selectMode && selectedBooks.length > 0" class="batch-bar">
            <button class="batch-btn" @click="selectAll">{{ selectedBooks.length === filteredBooks.length ? '取消全选' :
                '全选' }}</button>
            <button class="batch-btn batch-btn-primary" @click="showBindModal = true">绑定</button>
            <button class="batch-btn" @click="showCategoryModal = true">分类</button>
            <button class="batch-btn" @click="exportSelected">导出</button>
            <span class="batch-count">已选 {{ selectedBooks.length }}</span>
        </div>

        <!-- 列表 -->
        <div class="wb-list">
            <div v-for="book in filteredBooks" :key="book.id" class="wb-card"
                @click="selectMode ? toggleSelect(book.id) : editBook(book)">
                <div class="wb-card-left">
                    <div v-if="selectMode" class="wb-checkbox" :class="{ checked: selectedBooks.includes(book.id) }">
                        <svg v-if="selectedBooks.includes(book.id)" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                    </div>
                    <label class="wb-toggle" @click.stop>
                        <input type="checkbox" :checked="book.enabled !== false"
                            @change="toggleBook(book.id, $event.target.checked)" />
                        <span class="wb-toggle-track">
                            <span class="wb-toggle-thumb"></span>
                        </span>
                    </label>
                </div>
                <div class="wb-card-body">
                    <div class="wb-card-title-row">
                        <span class="wb-card-title">{{ book.title }}</span>
                        <div class="wb-card-actions">
                            <button class="wb-preview-btn" @click.stop="previewBook(book)">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                    stroke-linecap="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            </button>
                            <button class="wb-delete-btn" @click.stop="deleteBook(book.id)">×</button>
                        </div>
                    </div>
                    <div class="wb-tags">
                        <span class="wb-tag" :class="'wb-tag-' + positionColor(book.position)">
                            {{ positionLabel(book.position) }}
                        </span>
                        <span v-if="book.keyword_enabled" class="wb-tag wb-tag-warm">关键词</span>
                        <span v-if="book.category" class="wb-tag wb-tag-default">{{ book.category }}</span>
                        <span v-if="book.enabled === false" class="wb-tag wb-tag-off">已关闭</span>
                    </div>
                </div>
            </div>

            <div v-if="filteredBooks.length === 0" class="wb-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="#D4C8CA" stroke-width="1.2" stroke-linecap="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <p>还没有世界书</p>
            </div>
        </div>

        <!-- 编辑/新建弹窗 -->
        <BlurModal :visible="showAdd || !!editingBook" @close="closeModal">
            <h3>{{ editingBook ? '编辑世界书' : '新建世界书' }}</h3>
            <DreamInput label="标题" v-model="bookForm.title" placeholder="世界书名称" />
            <div class="form-row">
                <label class="form-label">注入位置</label>
                <select v-model="bookForm.position" class="form-select">
                    <option value="override">最高覆盖</option>
                    <option value="before_char">角色前</option>
                    <option value="after_char">角色后</option>
                    <option value="before_user">用户输入前</option>
                    <option value="tail">尾部临时层</option>
                </select>
            </div>
            <div class="form-row">
                <label class="form-label">关键词触发</label>
                <div class="keyword-row">
                    <label class="wb-toggle">
                        <input type="checkbox" v-model="bookForm.keyword_enabled" />
                        <span class="wb-toggle-track">
                            <span class="wb-toggle-thumb"></span>
                        </span>
                    </label>
                    <DreamInput v-if="bookForm.keyword_enabled" v-model="bookForm.keywords" placeholder="关键词，用逗号分隔" />
                </div>
            </div>
            <DreamInput label="内容" type="textarea" v-model="bookForm.content" :rows="8"
                placeholder="世界观设定、背景信息、规则..." />

            <!-- 导入区域 -->
            <div class="import-area">
                <button class="import-btn" @click="fileInput?.click()" :disabled="importing">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                        stroke-linecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    {{ importing ? '导入中...' : '从文件导入' }}
                </button>
                <span class="import-hint">支持 txt · md · json · docx</span>
                <input ref="fileInput" type="file" accept=".txt,.md,.json,.docx" style="display:none"
                    @change="handleFileImport" />
            </div>
            <div v-if="importError" class="import-error">{{ importError }}</div>

            <div class="modal-actions">
                <SoftButton variant="secondary" @click="closeModal">取消</SoftButton>
                <SoftButton variant="primary" @click="saveBook">保存</SoftButton>
            </div>
        </BlurModal>

        <!-- 预览弹窗 -->
        <BlurModal :visible="!!previewingBook" @close="previewingBook = null">
            <div v-if="previewingBook" class="preview-modal">
                <div class="preview-header">
                    <h3>{{ previewingBook.title }}</h3>
                    <div class="preview-tags">
                        <span class="wb-tag" :class="'wb-tag-' + positionColor(previewingBook.position)">
                            {{ positionLabel(previewingBook.position) }}
                        </span>
                        <span v-if="previewingBook.keyword_enabled" class="wb-tag wb-tag-warm">
                            关键词: {{ previewingBook.keywords }}
                        </span>
                        <span v-if="previewingBook.category" class="wb-tag wb-tag-default">
                            {{ previewingBook.category }}
                        </span>
                    </div>
                </div>
                <div class="preview-content">{{ previewingBook.content }}</div>
                <div class="modal-actions">
                    <SoftButton variant="secondary" @click="exportSingle(previewingBook)">导出</SoftButton>
                    <SoftButton variant="primary" @click="editBook(previewingBook); previewingBook = null">编辑
                    </SoftButton>
                </div>
            </div>
        </BlurModal>

        <!-- AI压缩区域 -->
        <div v-if="bookForm.content && bookForm.content.length > 5000" class="compress-area">
            <div class="compress-info">
                <span class="compress-size">当前内容 {{ Math.round(bookForm.content.length / 1000) }}K 字</span>
                <span class="compress-hint">内容较长，建议压缩后注入以节省 token</span>
            </div>
            <div class="compress-btns">
                <button class="compress-btn" @click="compressContent" :disabled="compressing">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                        stroke-linecap="round">
                        <path
                            d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                    {{ compressing ? '压缩中...' : 'AI 提取核心' }}
                </button>
                <button v-if="originalContent" class="restore-btn" @click="restoreContent">
                    恢复原文
                </button>
            </div>
            <div v-if="compressMsg" class="compress-msg">{{ compressMsg }}</div>
        </div>

        <!-- 绑定弹窗 -->
        <BlurModal :visible="showBindModal" @close="showBindModal = false">
            <h3>绑定世界书</h3>
            <div class="bind-option" :class="{ active: bindType === 'global' }" @click="bindType = 'global'">
                <p class="bind-title">全局绑定</p>
                <span class="bind-desc">所有角色都会加载</span>
            </div>
            <div class="bind-option" :class="{ active: bindType === 'specific' }" @click="bindType = 'specific'">
                <p class="bind-title">绑定特定角色</p>
                <span class="bind-desc">只有选中的角色会加载</span>
            </div>
            <div v-if="bindType === 'specific'" class="persona-select">
                <div v-for="p in personas" :key="p.id" class="persona-check" @click="toggleBindPersona(p.id)">
                    <div class="wb-checkbox" :class="{ checked: bindPersonas.includes(p.id) }">
                        <svg v-if="bindPersonas.includes(p.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2.5" stroke-linecap="round">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                    </div>
                    <span>{{ p.name }}</span>
                </div>
            </div>
            <div class="modal-actions">
                <SoftButton variant="secondary" @click="showBindModal = false">取消</SoftButton>
                <SoftButton variant="primary" @click="applyBind">确认绑定</SoftButton>
            </div>
        </BlurModal>

        <!-- 分类弹窗 -->
        <BlurModal :visible="showCategoryModal" @close="showCategoryModal = false">
            <h3>设置分类</h3>
            <DreamInput v-model="newCategory" placeholder="输入分类名称" />
            <div v-if="existingCategories.length > 0" class="category-chips">
                <button v-for="cat in existingCategories" :key="cat" class="filter-chip"
                    :class="{ active: newCategory === cat }" @click="newCategory = cat">
                    {{ cat }}
                </button>
            </div>
            <div class="modal-actions">
                <SoftButton variant="secondary" @click="showCategoryModal = false">取消</SoftButton>
                <SoftButton variant="primary" @click="applyCategory">确认</SoftButton>
            </div>
        </BlurModal>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from '@/utils/api'
import SoftButton from '@/components/ui/SoftButton.vue'
import DreamInput from '@/components/ui/DreamInput.vue'
import BlurModal from '@/components/ui/BlurModal.vue'

const books = ref([])
const personas = ref([])
const showAdd = ref(false)
const editingBook = ref(null)
const showGuide = ref(false)
const selectMode = ref(false)
const selectedBooks = ref([])
const showBindModal = ref(false)
const bindType = ref('global')
const bindPersonas = ref([])
const fileInput = ref(null)
const showCategoryModal = ref(false)
const newCategory = ref('')
const filterCategory = ref('')
const importing = ref(false)
const importError = ref('')
const compressing = ref(false)
const compressMsg = ref('')
const originalContent = ref('')
const searchQuery = ref('')
const previewingBook = ref(null)

const guideItems = [
    { label: '最高覆盖', desc: '绝对核心，强规则、安全限制、禁止事项', color: '#E8C0C9' },
    { label: '角色前', desc: '世界观、背景设定、环境规则', color: '#D8CDEA' },
    { label: '角色后', desc: '补充设定、关系状态、临时人格偏移', color: '#F5EAD0' },
    { label: '用户输入前', desc: '权重低，像"参考资料"，适合关键词触发', color: '#D8EDF7' },
    { label: '尾部临时层', desc: '最低优先级，当前状态、一次性提醒', color: '#E8E8E8' },
]

const existingCategories = computed(() => {
    const cats = new Set(books.value.map(b => b.category).filter(Boolean))
    return [...cats]
})

// 只保留这一个 filteredBooks
const filteredBooks = computed(() => {
    let result = books.value

    // 分类筛选
    if (filterCategory.value) {
        result = result.filter(b => b.category === filterCategory.value)
    }

    // 搜索筛选
    if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(b =>
            b.title.toLowerCase().includes(q) ||
            b.content.toLowerCase().includes(q)
        )
    }

    return result
})

const bookForm = reactive({
    title: '',
    content: '',
    position: 'before_char',
    keywords: '',
    keyword_enabled: false,
})

function positionLabel(pos) {
    const map = { override: '最高覆盖', before_char: '角色前', after_char: '角色后', before_user: '用户输入前', tail: '尾部临时层' }
    return map[pos] || '角色前'
}

function positionColor(pos) {
    const map = { override: 'pink', before_char: 'purple', after_char: 'warm', before_user: 'blue', tail: 'default' }
    return map[pos] || 'default'
}

async function loadBooks() {
    try {
        const res = await api('/api/worldbooks')
        books.value = await res.json()
    } catch { }
}

async function loadPersonas() {
    try {
        const res = await api('/api/prompts/personas')
        const data = await res.json()
        personas.value = data.personas
    } catch { }
}

function previewBook(book) {
    previewingBook.value = book
}

function exportSingle(book) {
    const data = {
        title: book.title,
        content: book.content,
        position: book.position,
        keywords: book.keywords,
        keyword_enabled: book.keyword_enabled,
        category: book.category,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${book.title || 'worldbook'}.json`
    a.click()
    URL.revokeObjectURL(url)
}

function exportSelected() {
    const selected = books.value.filter(b => selectedBooks.value.includes(b.id))
    const data = selected.map(b => ({
        title: b.title,
        content: b.content,
        position: b.position,
        keywords: b.keywords,
        keyword_enabled: b.keyword_enabled,
        category: b.category,
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `worldbooks-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)

    selectMode.value = false
    selectedBooks.value = []
}

async function compressContent() {
    if (!bookForm.content || bookForm.content.length < 1000) return
    compressing.value = true
    compressMsg.value = ''
    originalContent.value = bookForm.content
    try {
        const res = await api('/api/worldbooks/compress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: bookForm.content,
                title: bookForm.title
            })
        })
        const data = await res.json()
        if (data.compressed) {
            const before = Math.round(bookForm.content.length / 1000)
            bookForm.content = data.compressed
            const after = Math.round(data.compressed.length / 1000)
            compressMsg.value = `压缩完成：${before}K → ${after}K 字，保留了核心设定`
        } else {
            compressMsg.value = data.error || '压缩失败'
            originalContent.value = ''
        }
    } catch (e) {
        compressMsg.value = '压缩失败：' + e.message
        originalContent.value = ''
    } finally {
        compressing.value = false
    }
}

function restoreContent() {
    if (originalContent.value) {
        bookForm.content = originalContent.value
        originalContent.value = ''
        compressMsg.value = ''
    }
}

function editBook(book) {
    editingBook.value = book
    bookForm.title = book.title
    bookForm.content = book.content
    bookForm.position = book.position || 'before_char'
    bookForm.keywords = book.keywords || ''
    bookForm.keyword_enabled = book.keyword_enabled || false
}

async function saveBook() {
    if (!bookForm.title || !bookForm.content) return
    if (editingBook.value) {
        await api(`/api/worldbooks/${editingBook.value.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookForm)
        })
    } else {
        await api('/api/worldbooks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookForm)
        })
    }
    closeModal()
    await loadBooks()
}

async function deleteBook(id) {
    if (!confirm('确定删除？')) return
    await api(`/api/worldbooks/${id}`, { method: 'DELETE' })
    await loadBooks()
}

function closeModal() {
    showAdd.value = false
    editingBook.value = null
    bookForm.title = ''
    bookForm.content = ''
    bookForm.position = 'before_char'
    bookForm.keywords = ''
    bookForm.keyword_enabled = false
    importError.value = ''
    originalContent.value = ''
    compressMsg.value = ''
}

function toggleSelectMode() {
    selectMode.value = !selectMode.value
    if (!selectMode.value) selectedBooks.value = []
}

function toggleSelect(id) {
    const idx = selectedBooks.value.indexOf(id)
    if (idx > -1) selectedBooks.value.splice(idx, 1)
    else selectedBooks.value.push(id)
}

function selectAll() {
    if (selectedBooks.value.length === filteredBooks.value.length) {
        selectedBooks.value = []
    } else {
        selectedBooks.value = filteredBooks.value.map(b => b.id)
    }
}

function toggleBindPersona(id) {
    const idx = bindPersonas.value.indexOf(id)
    if (idx > -1) bindPersonas.value.splice(idx, 1)
    else bindPersonas.value.push(id)
}

async function toggleBook(id, enabled) {
    await api(`/api/worldbooks/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
    })
    const book = books.value.find(b => b.id === id)
    if (book) book.enabled = enabled
}

async function applyBind() {
    await api('/api/worldbooks/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            bookIds: selectedBooks.value,
            bindType: bindType.value,
            bindPersonas: bindPersonas.value.join(','),
        })
    })
    showBindModal.value = false
    selectMode.value = false
    selectedBooks.value = []
    await loadBooks()
}

async function applyCategory() {
    if (!newCategory.value.trim()) return
    await api('/api/worldbooks/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            bookIds: selectedBooks.value,
            category: newCategory.value.trim()
        })
    })
    showCategoryModal.value = false
    newCategory.value = ''
    selectMode.value = false
    selectedBooks.value = []
    await loadBooks()
}

async function handleFileImport(event) {
    const file = event.target.files[0]
    if (!file) return

    importing.value = true
    importError.value = ''
    event.target.value = ''

    try {
        const ext = file.name.split('.').pop().toLowerCase()
        if (ext === 'docx') await importDocx(file)
        else if (ext === 'json') await importJson(file)
        else await importText(file)

        if (!bookForm.title) {
            bookForm.title = file.name.replace(/\.[^.]+$/, '')
        }
    } catch (e) {
        importError.value = `导入失败：${e.message}`
    } finally {
        importing.value = false
    }
}

async function importText(file) {
    const utfText = await readAsText(file, 'UTF-8')
    const hasGarbled = (utfText.match(/\uFFFD/g) || []).length > 5
    if (hasGarbled) {
        try {
            const gbkText = await readAsText(file, 'GBK')
            bookForm.content = gbkText
        } catch {
            bookForm.content = utfText
        }
    } else {
        bookForm.content = utfText
    }
}

function readAsText(file, encoding) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = () => reject(new Error(`读取文件失败（${encoding}）`))
        reader.readAsText(file, encoding)
    })
}

async function importDocx(file) {
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    if (result.messages?.length) {
        console.warn('mammoth warnings:', result.messages)
    }
    bookForm.content = result.value.trim()
}

async function importJson(file) {
    const text = await readAsText(file, 'UTF-8')
    try {
        const obj = JSON.parse(text)
        if (typeof obj === 'object' && obj !== null) {
            if (typeof obj.content === 'string') {
                bookForm.content = obj.content
                if (obj.title && !bookForm.title) bookForm.title = obj.title
            } else {
                bookForm.content = JSON.stringify(obj, null, 2)
            }
        } else {
            bookForm.content = text
        }
    } catch {
        bookForm.content = text
    }
}

onMounted(() => {
    loadBooks()
    loadPersonas()
})
</script>

<style scoped>
.worldbook-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
    background: linear-gradient(180deg, #FFFBFA 0%, #FFF0F2 60%, #FFE9ED 100%);
    box-sizing: border-box;
}

/* 头部 */
.wb-header-wrap {
    padding-top: calc(env(safe-area-inset-top, 44px) + 27px);
    padding-left: 16px;
    padding-right: 16px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--color-border);
}

.wb-header {
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

.wb-header-title {
    flex: 1;
    display: flex;
    align-items: baseline;
    gap: 8px;
}

.wb-title {
    font-size: 22px;
    font-weight: 800;
    color: #4A3F41;
    letter-spacing: 0.3px;
}

.wb-subtitle {
    font-size: 11px;
    color: #B8A9AC;
    font-weight: 400;
    letter-spacing: 1.5px;
}

.wb-header-actions {
    display: flex;
    gap: 8px;
}

.wb-icon-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    color: #B8A9AC;
    transition: all 0.2s;
}

.wb-icon-btn svg {
    width: 18px;
    height: 18px;
}

.wb-icon-btn.active {
    background: rgba(217, 163, 175, 0.15);
    color: #D9A3AF;
}

/* 说明区 */
.guide-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 0;
    cursor: pointer;
    color: #B8A9AC;
    font-size: 12px;
    flex-shrink: 0;
    padding-left: 16px;
    padding-right: 16px;
}

.guide-toggle svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
}

.guide-chevron {
    margin-left: auto;
    transition: transform 0.2s;
}

.guide-chevron.open {
    transform: rotate(180deg);
}

.guide-panel {
    background: rgba(255, 255, 255, 0.5);
    border-radius: 16px;
    padding: 12px 14px;
    margin-bottom: 10px;
    border: 1px solid rgba(255, 255, 255, 0.6);
    flex-shrink: 0;
}

.guide-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 6px 0;
}

.guide-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 4px;
    flex-shrink: 0;
}

.guide-label {
    font-size: 12px;
    font-weight: 600;
    color: #4A3F41;
    margin-right: 6px;
}

.guide-desc {
    font-size: 11px;
    color: #B8A9AC;
}

/* 分类筛选 */
.category-filter {
    display: flex;
    gap: 6px;
    padding: 8px 0;
    overflow-x: auto;
    flex-shrink: 0;
    padding-left: 16px;
    padding-right: 16px;
}

.category-filter::-webkit-scrollbar {
    display: none;
}

.filter-chip {
    padding: 5px 14px;
    border-radius: 20px;
    border: 1px solid var(--color-border);
    background: none;
    font-size: 11px;
    color: #B8A9AC;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
}

.filter-chip.active {
    background: rgba(217, 163, 175, 0.15);
    color: #D9A3AF;
    border-color: rgba(217, 163, 175, 0.4);
}

/* 批量操作栏 */
.batch-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    flex-shrink: 0;
    padding-left: 16px;
    padding-right: 16px;
}

.batch-btn {
    padding: 6px 14px;
    border-radius: 20px;
    border: 1px solid var(--color-border);
    background: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    color: #6B5B5E;
    cursor: pointer;
}

.batch-btn-primary {
    background: rgba(217, 163, 175, 0.15);
    border-color: rgba(217, 163, 175, 0.4);
    color: #D9A3AF;
}

.batch-count {
    font-size: 11px;
    color: #B8A9AC;
    margin-left: auto;
}

/* 列表 */
.wb-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
    padding-left: 16px;
    padding-right: 16px;
}

.wb-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 18px;
    padding: 14px 16px;
    margin-bottom: 10px;
    cursor: pointer;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: transform 0.2s, box-shadow 0.2s;
}

.wb-card:active {
    transform: scale(0.98);
}

.wb-card-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
}

.wb-card-body {
    flex: 1;
    min-width: 0;
}

.wb-card-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
}

.wb-card-title {
    font-size: 14px;
    font-weight: 600;
    color: #4A3F41;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.wb-delete-btn {
    background: none;
    border: none;
    font-size: 18px;
    color: #B8A9AC;
    cursor: pointer;
    opacity: 0.5;
    padding: 0 4px;
    flex-shrink: 0;
}

/* 标签 */
.wb-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.wb-tag {
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 500;
}

.wb-tag-pink {
    background: rgba(232, 192, 201, 0.25);
    color: #D9A3AF;
}

.wb-tag-purple {
    background: rgba(216, 205, 234, 0.35);
    color: #9B89B4;
}

.wb-tag-warm {
    background: rgba(245, 234, 208, 0.5);
    color: #B8965A;
}

.wb-tag-blue {
    background: rgba(216, 237, 247, 0.5);
    color: #6BAED6;
}

.wb-tag-default {
    background: rgba(180, 170, 172, 0.15);
    color: #8A7A7D;
}

.wb-tag-off {
    background: rgba(180, 170, 172, 0.1);
    color: #B8A9AC;
}

/* 开关 */
.wb-toggle {
    position: relative;
    width: 34px;
    height: 20px;
    flex-shrink: 0;
    cursor: pointer;
}

.wb-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
}

.wb-toggle-track {
    position: absolute;
    inset: 0;
    background: rgba(180, 170, 172, 0.25);
    border-radius: 20px;
    transition: background 0.25s;
}

.wb-toggle input:checked~.wb-toggle-track {
    background: #D9A3AF;
}

.wb-toggle-thumb {
    position: absolute;
    width: 14px;
    height: 14px;
    background: white;
    border-radius: 50%;
    top: 3px;
    left: 3px;
    transition: transform 0.25s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.wb-toggle input:checked~.wb-toggle-track .wb-toggle-thumb {
    transform: translateX(14px);
}

/* 勾选框 */
.wb-checkbox {
    width: 22px;
    height: 22px;
    border-radius: 7px;
    border: 1.5px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
}

.wb-checkbox svg {
    width: 13px;
    height: 13px;
}

.wb-checkbox.checked {
    background: #D9A3AF;
    border-color: #D9A3AF;
    color: white;
}

/* 空状态 */
.wb-empty {
    text-align: center;
    padding: 48px 20px;
    color: #D4C8CA;
}

.wb-empty svg {
    width: 36px;
    height: 36px;
    margin-bottom: 12px;
}

.wb-empty p {
    font-size: 13px;
    color: #B8A9AC;
}

/* 弹窗内 */
.form-row {
    margin-bottom: 14px;
}

.form-label {
    display: block;
    font-size: 11px;
    color: #B8A9AC;
    margin-bottom: 6px;
}

.form-select {
    width: 100%;
    height: 38px;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 0 12px;
    font-size: 13px;
    background: var(--color-card);
    color: var(--color-text);
    outline: none;
    appearance: none;
    -webkit-appearance: none;
}

.keyword-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.import-area {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border);
}

.import-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    color: #6B5B5E;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
}

.import-btn svg {
    width: 14px;
    height: 14px;
}

.import-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.import-hint {
    font-size: 11px;
    color: #B8A9AC;
}

.import-error {
    margin-top: 8px;
    font-size: 12px;
    color: #E8A0A0;
    padding: 8px 12px;
    background: rgba(232, 160, 160, 0.08);
    border-radius: 8px;
}

/* 绑定弹窗 */
.bind-option {
    padding: 14px;
    border-radius: 14px;
    border: 1px solid var(--color-border);
    margin-bottom: 8px;
    cursor: pointer;
    opacity: 0.5;
    transition: all 0.2s;
}

.bind-option.active {
    opacity: 1;
    border-color: rgba(217, 163, 175, 0.5);
    background: rgba(217, 163, 175, 0.06);
}

.bind-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 2px;
}

.bind-desc {
    font-size: 11px;
    color: #B8A9AC;
}

.persona-select {
    margin-top: 12px;
}

.persona-check {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    cursor: pointer;
    font-size: 14px;
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
}

.persona-check:last-child {
    border-bottom: none;
}

/* 分类弹窗 */
.category-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
}

.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
}

.compress-area {
    margin-top: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(216, 205, 234, 0.1);
    border: 1px solid rgba(216, 205, 234, 0.3);
}

.compress-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-bottom: 10px;
}

.compress-size {
    font-size: 12px;
    font-weight: 600;
    color: #9B89B4;
}

.compress-hint {
    font-size: 11px;
    color: #B8A9AC;
}

.compress-btns {
    display: flex;
    gap: 8px;
}

.compress-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 10px;
    border: 1px solid rgba(216, 205, 234, 0.5);
    background: rgba(216, 205, 234, 0.2);
    font-size: 12px;
    color: #9B89B4;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
}

.compress-btn svg {
    width: 14px;
    height: 14px;
}

.compress-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.restore-btn {
    padding: 7px 14px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    color: #B8A9AC;
    cursor: pointer;
    font-family: inherit;
}

.compress-msg {
    margin-top: 8px;
    font-size: 11px;
    color: #9B89B4;
}

.wb-search-wrap {
    padding: 8px 16px 12px;
}

.wb-search-box {
    position: relative;
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(217, 163, 175, 0.2);
    border-radius: 16px;
    padding: 0 14px;
    height: 44px;
}

.search-icon {
    width: 18px;
    height: 18px;
    stroke: #B8A9AC;
    flex-shrink: 0;
}

.wb-search-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 14px;
    color: #4A3F41;
    padding: 0 10px;
    outline: none;
    font-family: inherit;
}

.wb-search-input::placeholder {
    color: #D4C8CA;
}

.search-clear {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(217, 163, 175, 0.15);
    border: none;
    font-size: 16px;
    color: #B8A9AC;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.wb-card-actions {
    display: flex;
    align-items: center;
    gap: 6px;
}

.wb-preview-btn {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(152, 203, 234, 0.12);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.wb-preview-btn svg {
    width: 14px;
    height: 14px;
    stroke: #98CBEA;
}

.wb-preview-btn:hover {
    background: rgba(152, 203, 234, 0.2);
}

.preview-modal {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 70vh;
}

.preview-header {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.preview-header h3 {
    margin: 0;
    font-size: 18px;
    color: #4A3F41;
}

.preview-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.preview-content {
    flex: 1;
    overflow-y: auto;
    background: rgba(255, 251, 250, 0.6);
    border-radius: 12px;
    padding: 14px;
    font-size: 13px;
    line-height: 1.7;
    color: #4A3F41;
    white-space: pre-wrap;
    word-break: break-word;
    border: 1px solid rgba(217, 163, 175, 0.1);
}

.preview-content::-webkit-scrollbar {
    width: 4px;
}

.preview-content::-webkit-scrollbar-thumb {
    background: rgba(217, 163, 175, 0.3);
    border-radius: 2px;
}
</style>
