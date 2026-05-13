<template>
    <div class="settings-page">
        <div class="settings-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>设置</h2>
        </div>

        <div class="settings-content">
            <!-- 主动消息设置 -->
            <div class="section">
                <h3>💬 主动消息</h3>
                <div class="setting-row">
                    <span>启用主动消息</span>
                    <label class="toggle">
                        <input type="checkbox" v-model="proactive.enabled" @change="saveProactive" />
                        <span class="slider"></span>
                    </label>
                </div>

                <div v-if="proactive.enabled">
                    <div class="setting-row">
                        <span>未互动提醒</span>
                        <select v-model="proactive.idleHours" @change="saveProactive">
                            <option :value="6">6 小时</option>
                            <option :value="12">12 小时</option>
                            <option :value="24">24 小时</option>
                        </select>
                    </div>
                    <div class="setting-row">
                        <span>每日最多主动</span>
                        <select v-model="proactive.maxPerDay" @change="saveProactive">
                            <option :value="1">1 次</option>
                            <option :value="2">2 次</option>
                            <option :value="3">3 次</option>
                            <option :value="5">5 次</option>
                        </select>
                    </div>
                    <div class="setting-row">
                        <span>最小间隔</span>
                        <select v-model="proactive.minInterval" @change="saveProactive">
                            <option :value="2">2 小时</option>
                            <option :value="4">4 小时</option>
                            <option :value="6">6 小时</option>
                            <option :value="8">8 小时</option>
                        </select>
                    </div>
                    <div class="setting-row">
                        <span>深夜提醒</span>
                        <label class="toggle">
                            <input type="checkbox" v-model="proactive.nightReminder" @change="saveProactive" />
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="setting-row">
                        <span>记忆提醒</span>
                        <label class="toggle">
                            <input type="checkbox" v-model="proactive.memoryReminder" @change="saveProactive" />
                            <span class="slider"></span>
                        </label>
                    </div>
                    <button class="test-btn" @click="testProactive">测试发送一条</button>
                </div>
            </div>

            <!-- 人格切换 -->
            <div class="section">
                <h3>人格选择（第二层）</h3>
                <div v-for="p in personas" :key="p.id" class="persona-card" :class="{ active: p.id === activePersona }"
                    @click="switchPersona(p.id)">
                    <span class="persona-name">{{ p.name }}</span>
                    <span class="persona-desc">{{ p.description }}</span>
                    <span class="check" v-if="p.id === activePersona">✓</span>
                </div>
            </div>

            <!-- 用户偏好 -->
            <div class="section">
                <h3>我的偏好（第三层）</h3>
                <p class="section-tip">这里的设定会叠加在人格之上，不会覆盖核心性格</p>
                <textarea v-model="userPrompt" :placeholder="template" rows="10"></textarea>
                <button class="save-btn" @click="saveUserPrompt">保存偏好</button>
                <p class="save-tip" v-if="saved">已保存 ✓</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const personas = ref([])
const activePersona = ref('')
const userPrompt = ref('')
const template = ref('')
const saved = ref(false)

const proactive = reactive({
    enabled: true,
    idleHours: 12,
    nightReminder: true,
    memoryReminder: true,
    maxPerDay: 3,
    minInterval: 4
})


async function loadData() {
    const pRes = await fetch('/api/prompts/personas')
    const pData = await pRes.json()
    personas.value = pData.personas
    activePersona.value = pData.active

    const uRes = await fetch('/api/prompts/user')
    const uData = await uRes.json()
    userPrompt.value = uData.content
    template.value = uData.template

    const proRes = await fetch('/api/proactive/settings')
    const proData = await proRes.json()
    Object.assign(proactive, proData)
}

async function switchPersona(id) {
    await fetch(`/api/prompts/personas/${id}/activate`, { method: 'POST' })
    activePersona.value = id
}

async function saveUserPrompt() {
    await fetch('/api/prompts/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userPrompt.value })
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
}

async function saveProactive() {
    await fetch('/api/proactive/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proactive)
    })
}

async function testProactive() {
    await fetch('/api/proactive/trigger', { method: 'POST' })
}

onMounted(loadData)
</script>

<style scoped>
.settings-page {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.settings-header {
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

.settings-header h2 {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
}

.settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 0;
}

.section {
    margin-bottom: 28px;
}

.section h3 {
    font-size: 13px;
    color: var(--color-text-light);
    margin-bottom: 10px;
}

.section-tip {
    font-size: 12px;
    color: var(--color-text-light);
    margin-bottom: 10px;
}

.setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    background: var(--color-white);
    border-radius: 10px;
    margin-bottom: 6px;
    font-size: 14px;
    color: var(--color-text);
}

.setting-row select {
    padding: 4px 8px;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 6px;
    font-size: 13px;
    background: var(--color-bg);
    outline: none;
}

/* Toggle 开关 */
.toggle {
    position: relative;
    width: 44px;
    height: 24px;
}

.toggle input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-bg-secondary);
    border-radius: 24px;
    transition: 0.3s;
}

.slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: 0.3s;
}

.toggle input:checked+.slider {
    background: var(--color-primary);
}

.toggle input:checked+.slider:before {
    transform: translateX(20px);
}

.test-btn {
    width: 100%;
    padding: 10px;
    margin-top: 8px;
    border: 1px dashed var(--color-primary);
    background: none;
    color: var(--color-primary);
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
}

.persona-card {
    background: var(--color-white);
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.persona-card.active {
    border-color: var(--color-primary);
}

.persona-card:active {
    transform: scale(0.98);
}

.persona-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
}

.persona-desc {
    flex: 1;
    font-size: 13px;
    color: var(--color-text-light);
}

.check {
    color: var(--color-primary);
    font-weight: bold;
}

textarea {
    width: 100%;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 12px;
    padding: 12px;
    font-size: 14px;
    font-family: inherit;
    background: var(--color-white);
    outline: none;
    resize: none;
    line-height: 1.5;
}

textarea:focus {
    border-color: var(--color-primary);
}

.save-btn {
    margin-top: 10px;
    padding: 10px 20px;
    border-radius: 10px;
    border: none;
    background: var(--color-primary);
    color: white;
    font-size: 14px;
    cursor: pointer;
    width: 100%;
}

.save-tip {
    text-align: center;
    color: var(--color-primary);
    font-size: 13px;
    margin-top: 8px;
}
</style>
