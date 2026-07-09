<template>
    <div class="sub-page">
        <div class="settings-blob sb-tl"></div>
        <div class="settings-blob sb-br"></div>

        <div class="settings-nav">
            <button class="settings-back" @click="$router.push('/settings/lifestyle')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <span class="settings-title">记忆管理</span>
            <button class="settings-save-btn" @click="save">保存</button>
        </div>

        <div class="sub-content">

            <!-- 模块启用 -->
            <div class="section-label-sm">模块启用</div>
            <div class="settings-group">
                <div class="settings-group-item" v-for="mod in modules" :key="mod.key">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">{{ mod.label }}</div>
                        <div class="sgi-desc">{{ mod.desc }}</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="config[mod.key]" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
            </div>

            <!-- 记忆写入触发 -->
            <div class="section-label-sm">记忆写入频率</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">即时提取间隔</div>
                        <div class="sgi-desc">每 X 条消息提取一次记忆（0 = 关闭）</div>
                    </div>
                    <input class="sgi-num-input" type="number" v-model.number="config.quickExtractEvery" min="0"
                        max="100" />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">短期总结间隔</div>
                        <div class="sgi-desc">每 X 条消息触发一次总结（0 = 关闭）</div>
                    </div>
                    <input class="sgi-num-input" type="number" v-model.number="config.summaryEvery" min="0" max="500" />
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">消息压缩阈值</div>
                        <div class="sgi-desc">超过 X 条时压缩旧消息（0 = 关闭）</div>
                    </div>
                    <input class="sgi-num-input" type="number" v-model.number="config.compressThreshold" min="0"
                        max="200" />
                </div>
            </div>

            <!-- 时间线触发词 -->
            <div class="section-label-sm">时间线触发</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">自动写入时间线</div>
                        <div class="sgi-desc">聊天时检测到重要事件自动记录</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="config.timelineAutoRecord" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
                <div class="settings-group-item col-item" v-if="config.timelineAutoRecord">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">触发情绪词</div>
                        <div class="sgi-desc">检测到这些词时触发时间线记录，用逗号分隔</div>
                    </div>
                    <textarea class="sgi-textarea" v-model="config.timelineTriggerWords" rows="3"
                        placeholder="崩溃,好想哭,太开心了,我爱你,第一次..."></textarea>
                </div>
            </div>

            <!-- 侧写/洞察 -->
            <div class="section-label-sm">侧写与洞察</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">每日沉淀</div>
                        <div class="sgi-desc">每天自动从记忆提炼长期印象</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="config.dailyConsolidate" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">每周洞察</div>
                        <div class="sgi-desc">每周自动生成关系洞察</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="config.weeklyInsight" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">语料库采样</div>
                        <div class="sgi-desc">自动提取对话中的特色语料</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="config.samplerEnabled" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
            </div>

            <!-- 遗忘曲线 -->
            <div class="section-label-sm">遗忘曲线</div>
            <div class="settings-group">
                <div class="settings-group-item">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">启用遗忘曲线</div>
                        <div class="sgi-desc">自动清理过期记忆，防止无限堆积</div>
                    </div>
                    <label class="toggle-sm">
                        <input type="checkbox" v-model="config.forgetCurve" />
                        <span class="slider-sm"></span>
                    </label>
                </div>
                <div class="settings-group-item" v-if="config.forgetCurve">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">7天内</div>
                        <div class="sgi-desc">全部保留</div>
                    </div>
                    <span class="sgi-value">100%</span>
                </div>
                <div class="settings-group-item" v-if="config.forgetCurve">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">7~14天</div>
                        <div class="sgi-desc">保留一半</div>
                    </div>
                    <span class="sgi-value">50%</span>
                </div>
                <div class="settings-group-item" v-if="config.forgetCurve">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">14~30天</div>
                        <div class="sgi-desc">保留四分之一</div>
                    </div>
                    <span class="sgi-value">25%</span>
                </div>
                <div class="settings-group-item" v-if="config.forgetCurve">
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">30天以上</div>
                        <div class="sgi-desc">只保留首尾各2条</div>
                    </div>
                    <span class="sgi-value">首尾</span>
                </div>
            </div>

            <Transition name="toast-fade">
                <div v-if="showSaved" class="save-toast">已保存 ✓</div>
            </Transition>

        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { api } from '@/utils/api'

const showSaved = ref(false)

const modules = [
    { key: 'memoryEnabled', label: '记忆库', desc: '自动提取并存储对话记忆' },
    { key: 'timelineEnabled', label: '时间线', desc: '关于他 → 时间线 tab' },
    { key: 'observeEnabled', label: '侧写', desc: '关于他 → 侧写 tab' },
    { key: 'diaryEnabled', label: '日记', desc: '手记 app 的 AI 日记写入' },
    { key: 'samplerEnabled', label: '语料库', desc: '自动采样对话中的特色语料' },
]

const config = reactive({
    // 模块开关
    memoryEnabled: true,
    timelineEnabled: true,
    observeEnabled: true,
    diaryEnabled: true,
    samplerEnabled: true,
    // 触发频率
    quickExtractEvery: 20,
    summaryEvery: 100,
    compressThreshold: 40,
    // 时间线
    timelineAutoRecord: true,
    timelineTriggerWords: '崩溃,好想哭,受不了,太开心了,我爱你,分手,离开,第一次',
    // 侧写
    dailyConsolidate: true,
    weeklyInsight: true,
    // 遗忘曲线
    forgetCurve: true,
})

async function load() {
    try {
        const res = await api('/api/prompts/user')
        const stored = localStorage.getItem('memory_manage_config')
        if (stored) {
            Object.assign(config, JSON.parse(stored))
        }
        // 也从后端读
        const res2 = await api('/api/settings/memory-config')
        if (res2.ok) {
            const data = await res2.json()
            if (data) Object.assign(config, data)
        }
    } catch { }
}

async function save() {
    // 本地存一份
    localStorage.setItem('memory_manage_config', JSON.stringify(config))
    // 同步到后端
    try {
        await api('/api/settings/memory-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        })
    } catch { }
    showSaved.value = true
    setTimeout(() => { showSaved.value = false }, 1500)
}

onMounted(load)
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

.settings-save-btn {
    background: none;
    border: none;
    font-size: 15px;
    color: #D9A3AF;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
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

.sgi-value {
    font-size: 13px;
    color: #B8A9AC;
}

.sgi-num-input {
    width: 60px;
    height: 32px;
    border: 1px solid rgba(217, 163, 175, 0.3);
    border-radius: 10px;
    padding: 0 10px;
    font-size: 14px;
    color: #4A3F41;
    background: rgba(255, 255, 255, 0.5);
    outline: none;
    text-align: center;
    font-family: inherit;
}

.sgi-textarea {
    width: 100%;
    border: 1px solid rgba(255, 240, 242, 0.5);
    background: rgba(255, 255, 255, 0.5);
    border-radius: 14px;
    padding: 10px 14px;
    font-size: 13px;
    color: #4A3F41;
    font-family: inherit;
    resize: none;
    outline: none;
    line-height: 1.5;
    box-sizing: border-box;
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
