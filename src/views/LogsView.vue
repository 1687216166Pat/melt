<template>
    <div class="logs-page">
        <div class="logs-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>语料库</h2>
            <button class="add-btn" @click="showAdd = true">+</button>
        </div>

        <div class="persona-tabs">
            <button v-for="p in personas" :key="p.id" class="tab-item" :class="{ active: currentPersona === p.id }"
                @click="switchPersona(p.id)">
                {{ p.name }}
            </button>
        </div>

        <!-- 分类筛选 -->
        <div class="filter-tabs">
            <button class="filter-btn" :class="{ active: filter === 'all' }" @click="filter = 'all'">全部</button>
            <button class="filter-btn" :class="{ active: filter === 'reply' }" @click="filter = 'reply'">回复样本</button>
            <button class="filter-btn" :class="{ active: filter === 'trait' }" @click="filter = 'trait'">行为特征</button>
            <button class="filter-btn" :class="{ active: filter === 'scene' }" @click="filter = 'scene'">情境行为</button>
            <button class="filter-btn" :class="{ active: filter === 'style' }" @click="filter = 'style'">关系风格</button>
        </div>

        <div class="samples-list">
            <GlassCard v-for="sample in filteredSamples" :key="sample.id" size="sm" class="sample-card">
                <div class="sample-type">
                    <GlassTag :variant="typeColor(sample.type)" size="sm">{{ typeLabel(sample.type) }}</GlassTag>
                    <button class="delete-sample" @click="deleteSample(sample.id)">×</button>
                </div>
                <div class="sample-content">
                    <!-- 回复样本 -->
                    <template v-if="sample.type === 'reply'">
                        <p class="sample-user">{{ sample.data.user_message }}</p>
                        <p class="sample-ai">{{ sample.data.assistant_reply }}</p>
                    </template>
                    <!-- 行为特征 -->
                    <template v-else-if="sample.type === 'trait'">
                        <p class="sample-trait">{{ sample.data.trait }}</p>
                        <p class="sample-desc">{{ sample.data.description }}</p>
                    </template>
                    <!-- 情境行为 -->
                    <template v-else-if="sample.type === 'scene'">
                        <p class="sample-scene">{{ sample.data.scene }}</p>
                        <p class="sample-behavior" v-for="b in sample.data.behavior" :key="b">· {{ b }}</p>
                    </template>
                    <!-- 关系风格 -->
                    <template v-else-if="sample.type === 'style'">
                        <p class="sample-style" v-for="s in sample.data.relationship_style" :key="s">· {{ s }}</p>
                    </template>
                </div>
            </GlassCard>

            <div v-if="filteredSamples.length === 0" class="empty-state">
                <p>暂无采样数据</p>
            </div>
        </div>

        <!-- 添加弹窗 -->
        <BlurModal :visible="showAdd" @close="showAdd = false">
            <h3>添加采样</h3>
            <div class="form-row">
                <label class="form-label">类型</label>
                <select v-model="newSample.type" class="form-select">
                    <option value="reply">回复样本</option>
                    <option value="trait">行为特征</option>
                    <option value="scene">情境行为</option>
                    <option value="style">关系风格</option>
                </select>
            </div>

            <template v-if="newSample.type === 'reply'">
                <DreamInput label="用户消息" v-model="newSample.user_message" placeholder="用户说了什么" />
                <DreamInput label="AI回复" v-model="newSample.assistant_reply" placeholder="AI怎么回的" />
            </template>

            <template v-if="newSample.type === 'trait'">
                <DreamInput label="特征名称" v-model="newSample.trait" placeholder="例：默认关系存在" />
                <DreamInput label="描述" v-model="newSample.description" placeholder="例：不会频繁确认关系" />
            </template>

            <template v-if="newSample.type === 'scene'">
                <DreamInput label="情境" v-model="newSample.scene" placeholder="例：late_night" />
                <DreamInput label="行为（换行分隔）" type="textarea" v-model="newSample.behavior" :rows="3"
                    placeholder="回复更短&#10;更安静&#10;增加停顿" />
            </template>

            <template v-if="newSample.type === 'style'">
                <DreamInput label="关系风格（换行分隔）" type="textarea" v-model="newSample.styles" :rows="3"
                    placeholder="长期陪伴&#10;默认亲近&#10;低情绪表达" />
            </template>

            <div class="modal-actions">
                <SoftButton variant="secondary" @click="showAdd = false">取消</SoftButton>
                <SoftButton variant="primary" @click="addSample">保存</SoftButton>
            </div>
        </BlurModal>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/utils/api'
import GlassCard from '@/components/ui/GlassCard.vue'
import GlassTag from '@/components/ui/GlassTag.vue'
import SoftButton from '@/components/ui/SoftButton.vue'
import DreamInput from '@/components/ui/DreamInput.vue'
import BlurModal from '@/components/ui/BlurModal.vue'

const personas = ref([])
const currentPersona = ref('')
const samples = ref([])
const filter = ref('all')
const showAdd = ref(false)

const newSample = ref({
    type: 'reply',
    user_message: '',
    assistant_reply: '',
    trait: '',
    description: '',
    scene: '',
    behavior: '',
    styles: '',
})

const filteredSamples = computed(() => {
    if (filter.value === 'all') return samples.value
    return samples.value.filter(s => s.type === filter.value)
})

function typeLabel(type) {
    const map = { reply: '回复样本', trait: '行为特征', scene: '情境行为', style: '关系风格' }
    return map[type] || type
}

function typeColor(type) {
    const map = { reply: 'pink', trait: 'purple', scene: 'warm', style: 'soft' }
    return map[type] || 'default'
}

async function loadPersonas() {
    try {
        const res = await api('/api/prompts/personas')
        const data = await res.json()
        personas.value = data.personas.map(p => ({ id: p.id, name: p.name }))

        const pinnedList = JSON.parse(localStorage.getItem('pinned_personas') || '[]')
        personas.value.sort((a, b) => {
            if (pinnedList.includes(a.id) && !pinnedList.includes(b.id)) return -1
            if (!pinnedList.includes(a.id) && pinnedList.includes(b.id)) return 1
            return 0
        })

        try {
            const latestRes = await api('/api/messages/latest-persona')
            const latestData = await latestRes.json()
            currentPersona.value = latestData.personaId || personas.value[0]?.id || ''
        } catch {
            currentPersona.value = personas.value[0]?.id || ''
        }

        await loadSamples()
    } catch { }
}

async function loadSamples() {
    if (!currentPersona.value) return
    try {
        const res = await api(`/api/samples/${currentPersona.value}`)
        samples.value = await res.json()
    } catch {
        samples.value = []
    }
}

function switchPersona(id) {
    currentPersona.value = id
    loadSamples()
}

async function addSample() {
    let data = {}
    switch (newSample.value.type) {
        case 'reply':
            data = { user_message: newSample.value.user_message, assistant_reply: newSample.value.assistant_reply }
            break
        case 'trait':
            data = { trait: newSample.value.trait, description: newSample.value.description }
            break
        case 'scene':
            data = { scene: newSample.value.scene, behavior: newSample.value.behavior.split('\n').filter(Boolean) }
            break
        case 'style':
            data = { relationship_style: newSample.value.styles.split('\n').filter(Boolean) }
            break
    }

    await api(`/api/samples/${currentPersona.value}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newSample.value.type, data })
    })

    showAdd.value = false
    newSample.value = { type: 'reply', user_message: '', assistant_reply: '', trait: '', description: '', scene: '', behavior: '', styles: '' }
    await loadSamples()
}

async function deleteSample(id) {
    if (!confirm('删除这条采样？')) return
    await api(`/api/samples/${id}`, { method: 'DELETE' })
    await loadSamples()
}

onMounted(loadPersonas)
</script>

<style scoped>
.logs-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
    overflow-x: hidden;
}

.logs-header {
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

.logs-header h2 {
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

.persona-tabs {
    display: flex;
    gap: 8px;
    padding: 12px 0;
    overflow-x: auto;
    flex-shrink: 0;
}

.tab-item {
    padding: 6px 14px;
    border-radius: 20px;
    border: 1px solid var(--color-border);
    background: var(--color-card);
    font-size: 12px;
    color: var(--color-text-light);
    cursor: pointer;
    white-space: nowrap;
}

.tab-item.active {
    background: linear-gradient(135deg, #e8a8be, #d4899e);
    color: white;
    border-color: transparent;
}

.filter-tabs {
    display: flex;
    gap: 6px;
    padding: 8px 0;
    overflow-x: auto;
    flex-shrink: 0;
}

.filter-btn {
    padding: 5px 12px;
    border-radius: 14px;
    border: 1px solid var(--color-border);
    background: none;
    font-size: 11px;
    color: var(--color-text-light);
    cursor: pointer;
    white-space: nowrap;
}

.filter-btn.active {
    background: var(--color-card);
    color: var(--color-text);
    border-color: var(--color-primary);
}

.samples-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0 24px;
}

.sample-card {
    margin-bottom: 10px;
}

.sample-type {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.delete-sample {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--color-text-light);
    opacity: 0.4;
    cursor: pointer;
}

.sample-user {
    font-size: 12px;
    color: var(--color-text-light);
    margin-bottom: 4px;
    padding-left: 8px;
    border-left: 2px solid var(--color-border);
}

.sample-ai {
    font-size: 13px;
    color: var(--color-text);
    padding-left: 8px;
    border-left: 2px solid var(--color-primary);
}

.sample-trait {
    font-size: 13px;
    color: var(--color-text);
    font-weight: 500;
    margin-bottom: 4px;
}

.sample-desc {
    font-size: 12px;
    color: var(--color-text-light);
}

.sample-scene {
    font-size: 13px;
    color: var(--color-text);
    font-weight: 500;
    margin-bottom: 6px;
}

.sample-behavior {
    font-size: 12px;
    color: var(--color-text-light);
    padding: 2px 0;
}

.sample-style {
    font-size: 12px;
    color: var(--color-text);
    padding: 2px 0;
}

.empty-state {
    text-align: center;
    padding: 40px;
    color: var(--color-text-light);
    font-size: 13px;
    opacity: 0.5;
}

.form-row {
    margin-bottom: 12px;
}

.form-label {
    display: block;
    font-size: 11px;
    color: var(--color-text-light);
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
}

.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
}
</style>
