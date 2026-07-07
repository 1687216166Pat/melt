<template>
    <div class="diary-page">
        <div class="diary-header">
            <button class="back-btn" @click="goBack">‹</button>
            <h2>手记</h2>
            <button class="add-btn" @click="showWrite = true">+</button>
        </div>

        <div class="diary-tabs">
            <button class="tab-item" :class="{ active: currentTab === 'ai' }" @click="switchTab('ai')">
                {{ aiName }}的日记
            </button>
            <button class="tab-item" :class="{ active: currentTab === 'user' }" @click="switchTab('user')">
                我的日记
            </button>
        </div>

        <div class="diary-list">
            <GlassCard v-for="entry in entries" :key="entry.id" size="md" class="diary-entry">
                <div class="entry-header">
                    <span class="entry-date">{{ entry.date }}</span>
                    <button class="entry-edit" @click="startEdit(entry)">✎</button>
                </div>
                <p class="entry-title">{{ entry.title }}</p>
                <p class="entry-content">{{ entry.content }}</p>
            </GlassCard>

            <div v-if="entries.length === 0" class="empty-state">
                <p class="empty-icon">📝</p>
                <p class="empty-text">还没有日记</p>
            </div>
        </div>

        <!-- 写日记弹窗 -->
        <BlurModal :visible="showWrite" @close="showWrite = false">
            <h3>写日记</h3>
            <DreamInput label="标题" v-model="newDiary.title" placeholder="今天的标题..." />
            <DreamInput label="内容" type="textarea" v-model="newDiary.content" :rows="6" placeholder="写点什么..." />
            <div class="modal-actions">
                <SoftButton variant="secondary" @click="showWrite = false">取消</SoftButton>
                <SoftButton variant="primary" @click="writeDiary" :disabled="!newDiary.content.trim()">保存</SoftButton>
            </div>
        </BlurModal>

        <!-- 编辑弹窗 -->
        <BlurModal :visible="showEdit" @close="showEdit = false">
            <h3>编辑日记</h3>
            <DreamInput label="内容" type="textarea" v-model="editContent" :rows="6" />
            <div class="modal-actions">
                <SoftButton variant="secondary" @click="showEdit = false">取消</SoftButton>
                <SoftButton variant="primary" @click="saveEdit">保存</SoftButton>
            </div>
        </BlurModal>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { api } from '@/utils/api'
import GlassCard from '@/components/ui/GlassCard.vue'
import SoftButton from '@/components/ui/SoftButton.vue'
import DreamInput from '@/components/ui/DreamInput.vue'
import BlurModal from '@/components/ui/BlurModal.vue'
import { useRoute, useRouter } from 'vue-router'

const currentTab = ref('ai')
const entries = ref([])
const aiName = ref('TA')
const showWrite = ref(false)
const showEdit = ref(false)
const editPageId = ref('')
const editContent = ref('')
const route = useRoute()
const router = useRouter()


const newDiary = reactive({
    title: '',
    content: '',
})

async function loadEntries() {
    try {
        const res = await api(`/api/diary/${currentTab.value}`)
        entries.value = await res.json()
    } catch {
        entries.value = []
    }
}

async function loadAiName() {
    try {
        const latestRes = await api('/api/messages/latest-persona')
        const latestData = await latestRes.json()
        const personaId = latestData.personaId || 'xiaorou'
        const detailRes = await api(`/api/persona/${personaId}`)
        const detail = await detailRes.json()
        aiName.value = detail.note || detail.name || 'TA'
    } catch { }
}

function switchTab(tab) {
    currentTab.value = tab
    loadEntries()
}

async function writeDiary() {
    if (!newDiary.content.trim()) return
    const today = new Date().toISOString().slice(0, 10)
    await api('/api/diary/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: newDiary.title || `日记 - ${today}`,
            content: newDiary.content,
            date: today,
            type: currentTab.value,
        })
    })
    showWrite.value = false
    newDiary.title = ''
    newDiary.content = ''
    await loadEntries()
}

function goBack() {
    const from = route.query.from
    if (from === 'habitat') {
        sessionStorage.setItem('home_return_page', '0')
        router.push('/')
    } else {
        router.push('/')
    }
}

function startEdit(entry) {
    editPageId.value = entry.id
    editContent.value = entry.content
    showEdit.value = true
}

async function saveEdit() {
    if (!editContent.value.trim()) return
    await api(`/api/diary/${editPageId.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.value })
    })
    showEdit.value = false
    await loadEntries()
}

onMounted(() => {
    loadAiName()
    loadEntries()
})
</script>

<style scoped>
.diary-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
    overflow-x: hidden;
}

.diary-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
}

.back-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: var(--color-primary);
    cursor: pointer;
    opacity: 0.75;
}

.diary-header h2 {
    flex: 1;
    font-size: 15px;
    font-weight: 500;
    color: var(--color-text);
}

.add-btn {
    background: none;
    border: none;
    font-size: 22px;
    color: var(--color-primary);
    cursor: pointer;
    opacity: 0.6;
}

.diary-tabs {
    display: flex;
    gap: 8px;
    padding: 12px 0;
    flex-shrink: 0;
}

.tab-item {
    padding: 8px 16px;
    border-radius: 20px;
    border: 1px solid var(--color-border);
    background: var(--color-card);
    font-size: 12px;
    color: var(--color-text-light);
    cursor: pointer;
    transition: all 0.3s;
}

.tab-item.active {
    background: linear-gradient(135deg, #e8a8be, #d4899e);
    color: white;
    border-color: transparent;
}

.diary-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0 24px;
}

.diary-entry {
    margin-bottom: 12px;
}

.entry-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}

.entry-date {
    font-size: 11px;
    color: var(--color-text-light);
    opacity: 0.5;
}

.entry-edit {
    background: none;
    border: none;
    font-size: 14px;
    color: var(--color-primary);
    cursor: pointer;
    opacity: 0.5;
}

.entry-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 6px;
}

.entry-content {
    font-size: 13px;
    color: var(--color-text);
    line-height: 1.7;
    white-space: pre-line;
}

.empty-state {
    text-align: center;
    padding: 48px 20px;
}

.empty-icon {
    font-size: 28px;
    margin-bottom: 10px;
}

.empty-text {
    font-size: 13px;
    color: var(--color-text-light);
    opacity: 0.5;
}

.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
}
</style>
