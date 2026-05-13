<template>
    <div class="memory-page">
        <div class="memory-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>记忆库</h2>
        </div>

        <div class="memory-content">
            <!-- 总档案 -->
            <div class="section">
                <div class="section-title-row">
                    <h3>📋 总档案</h3>
                    <button class="action-btn" @click="editingProfile = !editingProfile">
                        {{ editingProfile ? '取消' : '编辑' }}
                    </button>
                </div>
                <p class="section-desc">AI 对你的核心认知，一读即懂</p>

                <div v-if="!editingProfile" class="profile-display">
                    <p v-if="profile">{{ profile }}</p>
                    <p v-else class="empty">暂无档案，聊几句后会自动生成</p>
                </div>
                <div v-else class="profile-edit">
                    <textarea v-model="profileEdit" rows="5" placeholder="格式：名:xx|住:xx|喜欢:xx"></textarea>
                    <div class="edit-actions">
                        <button @click="saveProfile">保存</button>
                        <button class="secondary" @click="doConsolidate">AI 重新整理</button>
                    </div>
                </div>
            </div>

            <!-- 每日记忆 -->
            <div class="section">
                <h3>📅 每日记忆</h3>
                <p class="section-desc">最近 7 天的对话摘要，自动提取</p>

                <div v-for="m in recentMemories" :key="m.id" class="memory-item">
                    <div class="memory-main">
                        <span class="memory-date">{{ m.source_session }}</span>
                        <span class="memory-text">{{ m.content }}</span>
                    </div>
                    <button class="del-btn" @click="deleteRecent(m.id)">×</button>
                </div>
                <p v-if="recentMemories.length === 0" class="empty">暂无每日记忆</p>
            </div>

            <!-- 说明 -->
            <div class="section">
                <h3>💡 工作原理</h3>
                <div class="info-card">
                    <p>1. 每次对话后，AI 自动提取值得记住的信息</p>
                    <p>2. 按日期存储为精简摘要</p>
                    <p>3. 每 6 小时自动合并到总档案</p>
                    <p>4. 对话时 AI 读取：总档案 + 近 3 天记忆 + 当前会话</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const profile = ref('')
const profileEdit = ref('')
const recentMemories = ref([])
const editingProfile = ref(false)

async function loadMemories() {
    const res = await fetch('/api/memories')
    const data = await res.json()
    profile.value = data.profile
    profileEdit.value = data.profile
    recentMemories.value = data.recent
}

async function saveProfile() {
    await fetch('/api/memories/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: profileEdit.value })
    })
    profile.value = profileEdit.value
    editingProfile.value = false
}

async function doConsolidate() {
    await fetch('/api/memories/consolidate', { method: 'POST' })
    loadMemories()
}

async function deleteRecent(id) {
    await fetch(`/api/memories/recent/${id}`, { method: 'DELETE' })
    recentMemories.value = recentMemories.value.filter(m => m.id !== id)
}

onMounted(loadMemories)
</script>

<style scoped>
.memory-page {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.memory-header {
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

.memory-header h2 {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
}

.memory-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 0;
}

.section {
    margin-bottom: 28px;
}

.section-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.section h3 {
    font-size: 15px;
    color: var(--color-text);
    margin-bottom: 4px;
}

.section-desc {
    font-size: 12px;
    color: var(--color-text-light);
    margin-bottom: 12px;
}

.action-btn {
    font-size: 13px;
    color: var(--color-primary);
    background: none;
    border: none;
    cursor: pointer;
}

.profile-display {
    background: var(--color-white);
    border-radius: 12px;
    padding: 14px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-text);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.profile-edit textarea {
    width: 100%;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 10px;
    padding: 12px;
    font-size: 13px;
    font-family: inherit;
    background: var(--color-white);
    outline: none;
    resize: none;
    line-height: 1.5;
}

.edit-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
}

.edit-actions button {
    flex: 1;
    padding: 8px;
    border-radius: 8px;
    border: none;
    font-size: 13px;
    cursor: pointer;
    background: var(--color-primary);
    color: white;
}

.edit-actions button.secondary {
    background: var(--color-bg-secondary);
    color: var(--color-text);
}

.memory-item {
    background: var(--color-white);
    border-radius: 10px;
    padding: 10px 12px;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.memory-main {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
}

.memory-date {
    font-size: 11px;
    background: var(--color-bg-secondary);
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--color-text-light);
    flex-shrink: 0;
}

.memory-text {
    font-size: 13px;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.del-btn {
    background: none;
    border: none;
    font-size: 18px;
    color: var(--color-text-light);
    cursor: pointer;
    padding: 0 4px;
}

.empty {
    font-size: 13px;
    color: var(--color-text-light);
    text-align: center;
    padding: 20px 0;
}

.info-card {
    background: var(--color-white);
    border-radius: 12px;
    padding: 14px;
    font-size: 13px;
    line-height: 2;
    color: var(--color-text-light);
}
</style>
