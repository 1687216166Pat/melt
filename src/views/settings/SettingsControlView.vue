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
            <span class="settings-title">控制中心</span>
            <button class="settings-save-btn" @click="save">保存</button>
        </div>

        <div class="sub-content">

            <!-- AI 输出习惯 -->
            <div class="section-label-sm">AI 输出习惯</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">包含动作描写</div>
                        <div class="sgi-desc">回复中加入 *动作描写*</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="outputPrefs.actionDesc" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">分句输出</div>
                        <div class="sgi-desc">每个短句单独一条气泡</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="outputPrefs.splitSentence" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">回复触发方式</div>
                        <div class="sgi-desc">关闭后需手动点击发送触发 AI 回复</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="outputPrefs.autoReply" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
            </div>

            <!-- 用户偏好 -->
            <div class="section-label-sm">用户偏好</div>
            <div class="settings-group">
                <div class="settings-group-item col-item">
                    <div class="sgi-label">偏好描述</div>
                    <textarea class="sgi-textarea" v-model="userPrompt" :placeholder="templateText" rows="8"></textarea>
                </div>
            </div>
            <div class="btn-row">
                <button class="action-btn primary" @click="save">保存偏好</button>
            </div>

            <Transition name="toast-fade">
                <div v-if="showSaved" class="save-toast">已保存 ✓</div>
            </Transition>

            <!-- 表情包管理 -->
            <div class="section-label-sm">表情包</div>
            <div class="settings-group">
                <div class="settings-group-item col-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">添加表情包</div>
                        <div class="sgi-desc">支持图片文件、URL、GIF 等所有格式</div>
                    </div>
                    <div class="emoji-add-row">
                        <input class="sgi-input-full" v-model="newEmojiUrl" placeholder="输入图片 URL..." />
                        <button class="action-btn-sm primary" @click="addEmojiByUrl">添加</button>
                    </div>
                    <div class="emoji-add-row">
                        <label class="upload-label">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                                stroke-linecap="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            上传文件
                            <input type="file" accept="image/*,video/gif,.gif,.webp,.apng" style="display:none" multiple
                                @change="handleEmojiUpload" />
                        </label>
                    </div>
                </div>
            </div>

            <!-- 表情包列表 -->
            <div v-if="emojiList.length > 0" class="emoji-grid">
                <div v-for="(emoji, idx) in emojiList" :key="idx" class="emoji-item">
                    <img :src="emoji.url" :alt="emoji.name" />
                    <input class="emoji-name-input" v-model="emoji.name" placeholder="名称" @change="saveEmojiList" />
                    <button class="emoji-del-btn" @click="removeEmoji(idx)">×</button>
                </div>
            </div>
            <div v-else class="emoji-empty">还没有表情包，添加一些吧 ✿</div>

            <div v-if="emojiList.length > 0" class="btn-row">
                <button class="action-btn ghost" @click="clearAllEmoji">清空全部</button>
            </div>

            <!-- 生成规则 -->
            <div class="section-label-sm">生成规则</div>

            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label">应用对象</div>
                    <div class="sgi-right">
                        <span class="sgi-value">{{ currentRulePersonaLabel }}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                    <select class="sgi-select-hidden" v-model="currentRulePersona" @change="onRulePersonaChange">
                        <option value="global">全局通用</option>
                        <option v-for="p in personas" :key="p.id" :value="p.id">
                            {{ p.note || p.name }}
                        </option>
                    </select>
                </div>
                <div v-if="currentRulePersona !== 'global'" class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">使用全局规则</div>
                        <div class="sgi-desc">关闭后可为该角色单独设置</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="currentRuleUseGlobal" @change="onUseGlobalChange" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
            </div>

            <div v-if="currentRulePersona === 'global' || !currentRuleUseGlobal" class="settings-group">
                <div class="settings-group-item col-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">每日总结规则</div>
                        <div class="sgi-desc">影响每日日记的生成风格</div>
                    </div>
                    <textarea class="sgi-textarea" v-model="currentSummaryRule"
                        placeholder="例：语气更加内敛克制，不直接表达情感，多用环境细节暗示内心..." rows="4"></textarea>
                </div>
                <div class="settings-group-item col-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">长期洞察规则</div>
                        <div class="sgi-desc">影响每周关系观察的生成风格</div>
                    </div>
                    <textarea class="sgi-textarea" v-model="currentInsightRule" placeholder="例：重点关注情绪距离的变化，而非具体事件..."
                        rows="4"></textarea>
                </div>
            </div>

            <div v-if="currentRulePersona === 'global' || !currentRuleUseGlobal" class="btn-row">
                <button class="action-btn primary" @click="saveRule">保存规则</button>
                <button class="action-btn ghost" @click="clearRule">清除</button>
            </div>

            <Transition name="toast-fade">
                <div v-if="showRuleSaved" class="save-toast">规则已保存 ✓</div>
            </Transition>

        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from '@/utils/api'

const outputPrefs = reactive({ actionDesc: false, splitSentence: false })
const userPrompt = ref('')
const templateText = ref('描述你希望 AI 以什么方式陪伴你...')
const showSaved = ref(false)
const showRuleSaved = ref(false)

// 表情包
const emojiList = ref([])
const newEmojiUrl = ref('')

function loadEmojiList() {
    const saved = localStorage.getItem('user_emoji_list')
    if (saved) emojiList.value = JSON.parse(saved)
}

function saveEmojiList() {
    localStorage.setItem('user_emoji_list', JSON.stringify(emojiList.value))
}

function addEmojiByUrl() {
    if (!newEmojiUrl.value.trim()) return
    emojiList.value.push({ url: newEmojiUrl.value.trim(), name: '' })
    newEmojiUrl.value = ''
    saveEmojiList()
}

function handleEmojiUpload(event) {
    const files = Array.from(event.target.files)
    files.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
            emojiList.value.push({
                url: e.target.result,
                name: file.name.replace(/\.[^.]+$/, '')
            })
            saveEmojiList()
        }
        reader.readAsDataURL(file)
    })
    event.target.value = ''
}

function removeEmoji(idx) {
    emojiList.value.splice(idx, 1)
    saveEmojiList()
}

function clearAllEmoji() {
    if (!confirm('确定清空所有表情包？')) return
    emojiList.value = []
    saveEmojiList()
}

// 生成规则
const personas = ref([])
const currentRulePersona = ref('global')
const currentRuleUseGlobal = ref(true)
const currentSummaryRule = ref('')
const currentInsightRule = ref('')

const currentRulePersonaLabel = computed(() => {
    if (currentRulePersona.value === 'global') return '全局通用'
    const p = personas.value.find(p => p.id === currentRulePersona.value)
    return p ? (p.note || p.name) : '全局通用'
})

async function loadPersonas() {
    try {
        const res = await api('/api/prompts/personas')
        const data = await res.json()
        personas.value = data.personas || []
    } catch { }
}

async function onRulePersonaChange() {
    await loadRuleForCurrent()
}

async function onUseGlobalChange() {
    if (currentRuleUseGlobal.value) {
        await api(`/api/sediment-rules/${currentRulePersona.value}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ useGlobal: true, summaryRule: '', insightRule: '' })
        })
        await loadRuleForCurrent()
    }
}

async function loadRuleForCurrent() {
    try {
        const res = await api(`/api/sediment-rules/${currentRulePersona.value}`)
        const data = await res.json()
        currentSummaryRule.value = data.summaryRule || ''
        currentInsightRule.value = data.insightRule || ''
        if (currentRulePersona.value !== 'global') {
            currentRuleUseGlobal.value = data.useGlobal !== false && !data.isSpecific
        }
    } catch { }
}

async function saveRule() {
    await api(`/api/sediment-rules/${currentRulePersona.value}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            summaryRule: currentSummaryRule.value,
            insightRule: currentInsightRule.value,
            useGlobal: false
        })
    })
    showRuleSaved.value = true
    setTimeout(() => { showRuleSaved.value = false }, 1500)
}

async function clearRule() {
    currentSummaryRule.value = ''
    currentInsightRule.value = ''
    await saveRule()
}

function buildPrefText() {
    let text = userPrompt.value || ''
    const lines = []
    if (outputPrefs.actionDesc) lines.push('- 回复中包含动作描写，用*号包裹')
    else lines.push('- 禁止使用动作描写，禁止使用*号包裹的任何内容')
    if (outputPrefs.splitSentence) lines.push('- 必须分句输出，每个短句单独一行')
    else lines.push('- 正常连续输出，不需要刻意分行')
    return text + '\n\n[输出风格 - 必须严格遵守]\n' + lines.join('\n')
}

async function save() {
    localStorage.setItem('output_prefs', JSON.stringify(outputPrefs))
    const prefText = buildPrefText()
    await api('/api/prompts/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: prefText })
    })
    showSaved.value = true
    setTimeout(() => { showSaved.value = false }, 1500)
}

onMounted(async () => {
    const savedPrefs = localStorage.getItem('output_prefs')
    if (savedPrefs) Object.assign(outputPrefs, JSON.parse(savedPrefs))
    try {
        const res = await api('/api/prompts/user')
        const data = await res.json()
        const content = data.content || ''
        const idx = content.indexOf('\n\n[输出风格')
        userPrompt.value = idx > -1 ? content.slice(0, idx) : content
        templateText.value = data.template || templateText.value
    } catch { }

    loadEmojiList()
    await loadPersonas()
    await loadRuleForCurrent()
})
</script>

<style scoped>
/* 原有样式全部保留，只加新的 */
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

.settings-save-btn {
    background: none;
    border: none;
    font-size: 15px;
    color: #D9A3AF;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    padding: 4px 0;
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
}

.settings-group-item:last-child {
    border-bottom: none;
}

.col-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
}

.sgi-label {
    font-size: 14px;
    color: #4A3F41;
    flex-shrink: 0;
}

.sgi-label-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.sgi-desc {
    font-size: 11px;
    color: #B8A9AC;
}

.sgi-right {
    display: flex;
    align-items: center;
    gap: 4px;
}

.sgi-value {
    font-size: 13px;
    color: #B8A9AC;
}

.sgi-arrow {
    width: 14px;
    height: 14px;
    stroke: #D4C8CA;
}

.sgi-select-hidden {
    position: absolute;
    opacity: 0;
    right: 16px;
    width: 80px;
    height: 44px;
    cursor: pointer;
}

.sgi-textarea {
    width: 100%;
    border: 1px solid rgba(255, 240, 242, 0.5);
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 14px;
    padding: 12px 14px;
    font-size: 13px;
    color: #4A3F41;
    font-family: inherit;
    resize: none;
    outline: none;
    line-height: 1.5;
    box-shadow: 0 4px 12px rgba(217, 163, 175, 0.06);
    box-sizing: border-box;
}

.sgi-textarea::placeholder {
    color: #D4C8CA;
}

.sgi-input-full {
    flex: 1;
    border: 1px solid rgba(255, 240, 242, 0.5);
    background: rgba(255, 255, 255, 0.5);
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 13px;
    color: #4A3F41;
    outline: none;
    font-family: inherit;
}

.sgi-input-full::placeholder {
    color: #D4C8CA;
}

.toggle-sm {
    position: relative;
    width: 44px;
    height: 26px;
    flex-shrink: 0;
}

.toggle-sm input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider-sm {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(217, 163, 175, 0.2);
    border-radius: 13px;
    transition: 0.28s ease;
}

.slider-sm:before {
    position: absolute;
    content: "";
    height: 22px;
    width: 22px;
    left: 2px;
    bottom: 2px;
    background: white;
    border-radius: 50%;
    transition: 0.28s ease;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.toggle-sm input:checked+.slider-sm {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
}

.toggle-sm input:checked+.slider-sm:before {
    transform: translateX(18px);
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
    color: #6B5B5E;
    border: 1px solid rgba(255, 240, 242, 0.5);
    box-shadow: 0 4px 12px rgba(217, 163, 175, 0.08);
}

.action-btn.ghost:active {
    transform: scale(0.97);
}

.action-btn-sm {
    height: 34px;
    padding: 0 14px;
    border-radius: 10px;
    border: none;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    flex-shrink: 0;
}

.action-btn-sm.primary {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
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

/* 表情包相关 */
.emoji-add-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin-top: 4px;
}

.upload-label {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 10px;
    border: 1px solid rgba(217, 163, 175, 0.3);
    background: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    color: #6B5B5E;
    cursor: pointer;
}

.upload-label svg {
    width: 14px;
    height: 14px;
}

.emoji-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 10px;
}

.emoji-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.45);
    border-radius: 16px;
    padding: 10px 8px;
    position: relative;
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.emoji-item img {
    width: 60px;
    height: 60px;
    object-fit: contain;
    border-radius: 8px;
}

.emoji-name-input {
    width: 100%;
    border: none;
    background: transparent;
    font-size: 11px;
    color: #6B5B5E;
    text-align: center;
    outline: none;
    font-family: inherit;
}

.emoji-name-input::placeholder {
    color: #D4C8CA;
}

.emoji-del-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: none;
    background: rgba(217, 163, 175, 0.3);
    color: white;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

.emoji-empty {
    text-align: center;
    font-size: 12px;
    color: #B8A9AC;
    padding: 16px 0;
    margin-bottom: 10px;
}
</style>
