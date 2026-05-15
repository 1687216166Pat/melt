<template>
    <div class="worldbook-page">
        <div class="worldbook-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>世界书</h2>
            <button class="add-btn" @click="showAdd = true">+</button>
        </div>

        <div class="worldbook-list">
            <div v-for="book in books" :key="book.id" class="book-item" @click="editBook(book)">
                <p class="book-title">{{ book.title }}</p>
                <p class="book-preview">{{ book.content.slice(0, 50) }}...</p>
                <button class="delete-btn" @click.stop="deleteBook(book.id)">×</button>
            </div>
            <p v-if="books.length === 0" class="empty">还没有世界书，点右上角 + 创建</p>
        </div>

        <!-- 编辑/新建弹窗 -->
        <div v-if="showAdd || editingBook" class="modal-overlay" @click.self="closeModal">
            <div class="modal">
                <h3>{{ editingBook ? '编辑世界书' : '新建世界书' }}</h3>
                <div class="input-group">
                    <label>标题</label>
                    <input v-model="bookForm.title" placeholder="世界书名称" />
                </div>
                <div class="input-group">
                    <label>内容</label>
                    <textarea v-model="bookForm.content" rows="12" placeholder="世界观设定、背景信息、规则..."></textarea>
                </div>
                <div class="modal-actions">
                    <button class="cancel-btn" @click="closeModal">取消</button>
                    <button class="confirm-btn" @click="saveBook">保存</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { api } from '@/utils/api'

const books = ref([])
const showAdd = ref(false)
const editingBook = ref(null)

const bookForm = reactive({
    title: '',
    content: ''
})

async function loadBooks() {
    try {
        const res = await api('/api/worldbooks')
        books.value = await res.json()
    } catch (e) {
        console.error('加载世界书失败:', e)
    }
}

function editBook(book) {
    editingBook.value = book
    bookForm.title = book.title
    bookForm.content = book.content
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
}

onMounted(loadBooks)
</script>

<style scoped>
.worldbook-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
}

.worldbook-header {
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

.worldbook-header h2 {
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
}

.worldbook-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px 0;
}

.book-item {
    background: var(--color-white);
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 8px;
    position: relative;
    cursor: pointer;
}

.book-item:active {
    opacity: 0.8;
}

.book-title {
    font-size: 15px;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 4px;
}

.book-preview {
    font-size: 12px;
    color: var(--color-text-light);
}

.delete-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    font-size: 20px;
    color: var(--color-text-light);
    cursor: pointer;
}

.empty {
    text-align: center;
    color: var(--color-text-light);
    font-size: 14px;
    margin-top: 40px;
}

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

.input-group {
    margin-bottom: 12px;
}

.input-group label {
    display: block;
    font-size: 12px;
    color: var(--color-text-light);
    margin-bottom: 4px;
}

.input-group input {
    width: 100%;
    height: 36px;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 8px;
    padding: 0 12px;
    font-size: 14px;
    background: var(--color-white);
    outline: none;
}

.input-group textarea {
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
</style>
