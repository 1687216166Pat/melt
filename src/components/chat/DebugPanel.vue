<template>
    <div v-if="info" class="debug-panel" :class="{ expanded }">
        <div class="debug-toggle" @click="expanded = !expanded">
            <span class="debug-dot" :class="statusClass"></span>
            <span>Debug</span>
            <span class="toggle-arrow">{{ expanded ? '▼' : '▶' }}</span>
        </div>

        <div v-if="expanded" class="debug-content">
            <!-- 第一层：模型/API -->
            <div class="debug-layer">
                <h4>🤖 Layer 1 - 模型</h4>
                <div class="debug-row">
                    <span class="label">模型</span>
                    <span class="value">{{ info.layer1?.model }}</span>
                </div>
                <div class="debug-row">
                    <span class="label">状态</span>
                    <span class="value" :class="info.layer1?.status === 'success' ? 'success' : 'error'">
                        {{ info.layer1?.status === 'success' ? '✓ 正常' : '✗ 错误' }}
                    </span>
                </div>
                <div v-if="info.layer1?.error" class="debug-row error-row">
                    <span class="label">错误</span>
                    <span class="value error">{{ info.layer1.error }}</span>
                </div>
                <div class="debug-row">
                    <span class="label">耗时</span>
                    <span class="value">{{ info.layer1?.elapsed }}ms</span>
                </div>
                <div class="debug-row">
                    <span class="label">Token(估)</span>
                    <span class="value">{{ info.layer1?.estimatedTokens }}</span>
                </div>
                <div v-if="info.layer1?.actualTokens" class="debug-row">
                    <span class="label">Token(实)</span>
                    <span class="value">
                        P:{{ info.layer1.actualTokens.prompt_tokens }}
                        C:{{ info.layer1.actualTokens.completion_tokens }}
                        T:{{ info.layer1.actualTokens.total_tokens }}
                    </span>
                </div>
            </div>

            <!-- 第二层：人格/情绪/记忆 -->
            <div class="debug-layer">
                <h4>💭 Layer 2 - 状态</h4>
                <div class="debug-row">
                    <span class="label">人格</span>
                    <span class="value">{{ info.layer2?.personaName || info.layer2?.persona }}</span>
                </div>
                <div class="debug-row">
                    <span class="label">用户情绪</span>
                    <span class="value emotion-tag" :class="emotionClass">{{ info.layer2?.emotion }}</span>
                </div>
                <div class="debug-row">
                    <span class="label">记忆长度</span>
                    <span class="value">{{ info.layer2?.memoryLength || 0 }} 字符</span>
                </div>
                <div v-if="info.layer2?.patterns?.length" class="debug-row">
                    <span class="label">行为模式</span>
                    <span class="value patterns">
                        <span v-for="p in info.layer2.patterns" :key="p.pattern_type" class="pattern-tag">
                            {{ p.pattern_type }}({{ p.frequency }})
                        </span>
                    </span>
                </div>
                <div class="debug-row expandable" @click="showMemory = !showMemory">
                    <span class="label">记忆详情 {{ showMemory ? '▼' : '▶' }}</span>
                </div>
                <div v-if="showMemory" class="memory-detail">
                    <pre>{{ info.layer2?.memoryContext }}</pre>
                </div>
            </div>

            <!-- 第三层：系统 -->
            <div class="debug-layer">
                <h4>⚙️ Layer 3 - 系统</h4>
                <div class="debug-row">
                    <span class="label">历史条数</span>
                    <span class="value">{{ info.layer3?.historyCount }}</span>
                </div>
                <div class="debug-row">
                    <span class="label">Prompt长度</span>
                    <span class="value">{{ info.layer3?.systemPromptLength }} 字符</span>
                </div>
                <div class="debug-row">
                    <span class="label">今日消息</span>
                    <span class="value">{{ info.layer3?.todayMessages }}</span>
                </div>
                <div class="debug-row">
                    <span class="label">时间感知</span>
                    <span class="value">{{ info.layer3?.timeContext }}</span>
                </div>
            </div>

            <!-- 第四层：记忆系统 -->
            <div v-if="info.memory" class="debug-layer">
                <h4>🧠 Layer 4 - 记忆</h4>
                <div class="debug-row">
                    <span class="label">距下次总结</span>
                    <span class="value">{{ info.memory?.nextTriggerIn }} 条</span>
                </div>
                <div class="debug-row">
                    <span class="label">本轮已聊</span>
                    <span class="value">{{ info.memory?.messagesSinceSummary }} 条</span>
                </div>
                <div class="debug-row">
                    <span class="label">累计消息</span>
                    <span class="value">{{ info.memory?.totalMessages }} 条</span>
                </div>
                <div class="debug-row">
                    <span class="label">长期印象</span>
                    <span class="value" :class="info.memory?.longTermProfile === '有' ? 'success' : ''">
                        {{ info.memory?.longTermProfile }}
                    </span>
                </div>
                <div class="debug-row">
                    <span class="label">近期印象</span>
                    <span class="value" :class="info.memory?.recentMemories === '有' ? 'success' : ''">
                        {{ info.memory?.recentMemories }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
    info: Object
})

const expanded = ref(false)
const showMemory = ref(false)

const statusClass = computed(() => {
    if (!props.info?.layer1) return ''
    return props.info.layer1.status === 'success' ? 'dot-success' : 'dot-error'
})

const emotionClass = computed(() => {
    const emotion = props.info?.layer2?.emotion
    if (emotion === '积极') return 'emotion-positive'
    if (emotion === '低落') return 'emotion-negative'
    return 'emotion-neutral'
})
</script>

<style scoped>
.debug-panel {
    border-top: 1px solid var(--color-bg-secondary);
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    flex-shrink: 0;
}

.debug-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    font-size: 11px;
    color: var(--color-text-light);
    cursor: pointer;
    user-select: none;
}

.debug-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ccc;
}

.dot-success {
    background: #4caf50;
}

.dot-error {
    background: #f44336;
}

.toggle-arrow {
    margin-left: auto;
    font-size: 9px;
}

.debug-content {
    padding: 0 8px 8px;
    max-height: 300px;
    overflow-y: auto;
}

.debug-layer {
    margin-bottom: 12px;
    padding: 8px;
    background: var(--color-bg);
    border-radius: 8px;
}

.debug-layer h4 {
    font-size: 11px;
    color: var(--color-text);
    margin-bottom: 6px;
    font-weight: 600;
}

.debug-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 3px 0;
    font-size: 11px;
}

.label {
    color: var(--color-text-light);
}

.value {
    color: var(--color-text);
    font-weight: 500;
    text-align: right;
    max-width: 60%;
    word-break: break-all;
}

.value.success {
    color: #4caf50;
}

.value.error {
    color: #f44336;
    font-size: 10px;
}

.error-row {
    background: rgba(244, 67, 54, 0.05);
    padding: 4px;
    border-radius: 4px;
}

.emotion-tag {
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 10px;
}

.emotion-positive {
    background: rgba(76, 175, 80, 0.15);
    color: #4caf50;
}

.emotion-negative {
    background: rgba(244, 67, 54, 0.15);
    color: #f44336;
}

.emotion-neutral {
    background: rgba(158, 158, 158, 0.15);
    color: #9e9e9e;
}

.patterns {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.pattern-tag {
    font-size: 10px;
    padding: 1px 5px;
    background: rgba(232, 160, 191, 0.15);
    border-radius: 6px;
    color: var(--color-primary);
}

.expandable {
    cursor: pointer;
    color: var(--color-primary);
}

.expandable .label {
    color: var(--color-primary);
}

.memory-detail {
    margin-top: 4px;
    padding: 6px;
    background: var(--color-white);
    border-radius: 6px;
    max-height: 120px;
    overflow-y: auto;
}

.memory-detail pre {
    font-size: 10px;
    color: var(--color-text);
    white-space: pre-wrap;
    word-break: break-all;
    font-family: inherit;
    margin: 0;
}
</style>
