<template>
    <div class="chatlist-page">
        <!-- 顶部 -->
        <div class="cl-header">
            <button class="cl-back" @click="$router.push('/')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <div class="cl-title-wrap">
                <span class="cl-title">共语</span>
                <span class="cl-sub">Echoes</span>
            </div>
            <button class="cl-add" @click="showAddModal = true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8M8 12h8" />
                </svg>
            </button>
        </div>

        <!-- 列表内容 -->
        <div class="cl-content">
            <!-- 空状态 -->
            <div v-if="personas.length === 0" class="cl-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="#D4C8CA" stroke-width="1.2" stroke-linecap="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p>还没有可以聊天的对象</p>
                <p>点击右上角添加一个</p>
            </div>

            <!-- 列表 -->
            <div v-else class="cl-list">
                <div v-for="(persona, idx) in sortedPersonas" :key="persona.id" class="cl-item"
                    :style="{ animationDelay: idx * 0.05 + 's' }"
                    @click.stop="router.push(`/chat/${persona.id}?from=echoes`)">

                    <!-- 头像 -->
                    <div class="cl-avatar">
                        <img v-if="persona.avatarUrl" :src="persona.avatarUrl" />
                        <span v-else>{{ persona.avatar || '💬' }}</span>
                        <div class="cl-online-dot"></div>
                    </div>

                    <!-- 信息 -->
                    <div class="cl-info">
                        <div class="cl-name-row">
                            <span class="cl-name">
                                <span v-if="persona.pinned" class="cl-pin">📌</span>
                                {{ persona.note || persona.name }}
                            </span>
                            <span class="cl-time">刚刚</span>
                        </div>
                        <span class="cl-preview">{{ persona.lastMessage || '还没有对话...' }}</span>
                    </div>

                    <!-- 置顶按钮 -->
                    <button class="cl-pin-btn" @click.stop="togglePin(persona.id)">
                        {{ persona.pinned ? '取消' : '置顶' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- 创建新角色弹窗 -->
        <BlurModal :visible="showAddModal" @close="showAddModal = false">
            <h3>添加新的角色</h3>
            <DreamInput label="名字" v-model="newPersona.name" placeholder="角色名称" />
            <DreamInput label="头像 emoji" v-model="newPersona.avatar" placeholder="💬" />
            <DreamInput label="头像图片 URL" v-model="newPersona.avatarUrl" placeholder="https://..." />
            <div class="file-row">
                <span class="file-label">或上传图片</span>
                <input type="file" accept="image/*" @change="handleAvatarUpload" class="file-input" />
            </div>
            <DreamInput label="角色设定" type="textarea" v-model="newPersona.content" :rows="6"
                placeholder="描述性格、说话方式..." />
            <div class="modal-actions">
                <SoftButton variant="secondary" @click="showAddModal = false">取消</SoftButton>
                <SoftButton variant="primary" @click="createPersona"
                    :disabled="!newPersona.name || !newPersona.content">创建</SoftButton>
            </div>
        </BlurModal>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from '@/utils/api'
import BlurModal from '@/components/ui/BlurModal.vue'
import DreamInput from '@/components/ui/DreamInput.vue'
import SoftButton from '@/components/ui/SoftButton.vue'

const personas = ref([])
const showAddModal = ref(false)
const newPersona = reactive({
    name: '',
    avatar: '💬',
    avatarUrl: '',
    content: ''
})

const sortedPersonas = computed(() => {
    return [...personas.value].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return 0
    })
})

async function togglePin(id) {
    const persona = personas.value.find(p => p.id === id)
    if (!persona) return
    persona.pinned = !persona.pinned
    const pinned = personas.value.filter(p => p.pinned).map(p => p.id)
    localStorage.setItem('pinned_personas', JSON.stringify(pinned))
}

function handleAvatarUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => { newPersona.avatarUrl = e.target.result }
    reader.readAsDataURL(file)
}

async function createPersona() {
    if (!newPersona.name || !newPersona.content) return
    try {
        await api('/api/personas/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newPersona.name,
                avatar: newPersona.avatar,
                avatarUrl: newPersona.avatarUrl,
                content: newPersona.content
            })
        })
        showAddModal.value = false
        Object.assign(newPersona, { name: '', avatar: '💬', avatarUrl: '', content: '' })
        await loadPersonas()
    } catch (e) {
        console.error('创建失败:', e)
    }
}

async function loadPersonas() {
    try {
        const res = await api('/api/prompts/personas')
        const data = await res.json()

        const detailed = await Promise.all(
            data.personas.map(async (p) => {
                let note = '', avatarUrl = '', avatar = p.avatar || '💬', lastMessage = ''
                const [detailRes, msgRes] = await Promise.all([
                    api(`/api/persona/${p.id}`).catch(() => null),
                    api(`/api/messages/${p.id}/last`).catch(() => null),
                ])
                if (detailRes) {
                    try {
                        const detail = await detailRes.json()
                        note = detail.note || ''
                        avatarUrl = detail.avatarUrl || ''
                        avatar = detail.avatar || avatar
                    } catch { }
                }
                if (msgRes) {
                    try {
                        const last = await msgRes.json()
                        if (last) {
                            const prefix = last.role === 'ai' ? '' : '我: '
                            const content = last.content.split('\n')[0]
                            lastMessage = prefix + (content.length > 25 ? content.slice(0, 25) + '...' : content)
                        }
                    } catch { }
                }
                return { ...p, note, avatarUrl, avatar, lastMessage }
            })
        )

        const pinnedList = JSON.parse(localStorage.getItem('pinned_personas') || '[]')
        const hiddenPersonas = JSON.parse(localStorage.getItem('hidden_personas') || '[]')
        personas.value = detailed
            .filter(p => !hiddenPersonas.includes(p.id))
            .map(p => ({ ...p, pinned: pinnedList.includes(p.id) }))
    } catch (e) {
        console.error('加载失败:', e)
    }
}

onMounted(loadPersonas)
</script>

<style scoped>
.chatlist-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
    background: linear-gradient(180deg, #FFFBFA 0%, #FFF0F2 60%, #FFE9ED 100%);
    position: relative;
    overflow: hidden;
}

/* 顶部栏 */
.cl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px 16px;
    flex-shrink: 0;
}

.cl-back {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 240, 242, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(217, 163, 175, 0.08);
}

.cl-back svg {
    width: 16px;
    height: 16px;
    stroke: #D9A3AF;
}

.cl-title-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
}

.cl-title {
    font-size: 17px;
    font-weight: 800;
    color: #4A3F41;
}

.cl-sub {
    font-size: 9px;
    color: #B8A9AC;
    letter-spacing: 2px;
}

.cl-add {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(232, 192, 201, 0.15);
    border: 1px solid rgba(232, 192, 201, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.cl-add svg {
    width: 18px;
    height: 18px;
    stroke: #D9A3AF;
}

/* 内容区 */
.cl-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
}

.cl-content::-webkit-scrollbar {
    display: none;
}

/* 空状态 */
.cl-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 60px 0;
    color: #D4C8CA;
    font-size: 13px;
    text-align: center;
    line-height: 1.6;
}

.cl-empty svg {
    width: 48px;
    height: 48px;
    opacity: 0.4;
    margin-bottom: 8px;
}

/* 列表 */
.cl-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.cl-item {
    display: flex;
    align-items: center;
    gap: 14px;
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-radius: 22px;
    padding: 14px 16px;
    box-shadow: 0 6px 20px rgba(217, 163, 175, 0.08);
    cursor: pointer;
    border: 1px solid rgba(255, 240, 242, 0.5);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    animation: fadeUp 0.4s ease backwards;
}

.cl-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 26px rgba(217, 163, 175, 0.14);
}

.cl-item:active {
    transform: scale(0.98);
}

/* 头像 */
.cl-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(145deg, #FDE4E8, #F8D0D6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
    position: relative;
    overflow: visible;
}

.cl-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.cl-avatar::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(232, 192, 201, 0.35), rgba(216, 205, 234, 0.25), rgba(152, 203, 234, 0.15));
    z-index: -1;
    animation: avatarGlow 3s ease-in-out infinite;
}

@keyframes avatarGlow {

    0%,
    100% {
        opacity: 0.6;
        transform: scale(1);
    }

    50% {
        opacity: 1;
        transform: scale(1.05);
    }
}

.cl-online-dot {
    position: absolute;
    bottom: 1px;
    right: 1px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #8FAA98;
    border: 2px solid #FFFBFA;
    animation: onlinePulse 2.5s ease-in-out infinite;
}

@keyframes onlinePulse {

    0%,
    100% {
        opacity: 1;
        transform: scale(1);
    }

    50% {
        opacity: 0.6;
        transform: scale(0.85);
    }
}

/* 信息 */
.cl-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.cl-name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.cl-name {
    font-size: 14px;
    font-weight: 700;
    color: #4A3F41;
}

.cl-pin {
    font-size: 10px;
    margin-right: 4px;
}

.cl-time {
    font-size: 10px;
    color: #D4C8CA;
}

.cl-preview {
    font-size: 12px;
    color: #B8A9AC;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* 置顶按钮 */
.cl-pin-btn {
    background: none;
    border: none;
    font-size: 10px;
    color: #D4C8CA;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 10px;
    font-family: inherit;
    transition: all 0.2s;
    flex-shrink: 0;
}

.cl-pin-btn:hover {
    background: rgba(232, 192, 201, 0.12);
    color: #D9A3AF;
}

/* 弹窗 */
.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
}

.file-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 8px 0;
}

.file-label {
    font-size: 11px;
    color: #B8A9AC;
}

.file-input {
    font-size: 11px;
    color: #B8A9AC;
}

@keyframes fadeUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
