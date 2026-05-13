<template>
    <div class="debug-wrapper">
        <div class="debug-toggle" @click="expanded = !expanded">
            <span class="debug-icon">⚙</span>
            <span class="debug-label">Debug</span>
            <span class="debug-brief" v-if="!expanded && info">
                {{ info.systemLength }}字 | ~{{ info.estimatedTokens }}tk | {{ info.elapsed }}ms
            </span>
            <span class="debug-arrow">{{ expanded ? '▼' : '▲' }}</span>
        </div>

        <div class="debug-content" v-if="expanded">
            <div class="debug-section" v-if="info">
                <h4>📊 Token / 长度</h4>
                <div class="debug-grid">
                    <span>System Prompt</span><span>{{ info.systemLength }} 字符</span>
                    <span>会话消息数</span><span>{{ info.historyCount }} 条</span>
                    <span>估算 Tokens</span><span>~{{ info.estimatedTokens }}</span>
                    <span v-if="info.actualTokens">实际 Tokens</span>
                    <span v-if="info.actualTokens">{{ info.actualTokens.total_tokens }}</span>
                    <span>响应耗时</span><span>{{ info.elapsed }}ms</span>
                    <span>模型</span><span>{{ info.model }}</span>
                </div>
            </div>


            <div class="debug-section" v-if="info && info.time">
                <h4>🕐 时间上下文</h4>
                <pre class="debug-pre">{{ info.time }}</pre>
            </div>


            <div class="debug-section">
                <h4>🧠 注入记忆</h4>
                <pre class="debug-pre">{{ info ? info.memory : '等待回复...' }}</pre>
            </div>

            <div class="debug-section">
                <div class="debug-section-header">
                    <h4>📝 当前 Prompt</h4>
                    <button class="copy-btn" @click="copyPrompt">复制</button>
                </div>
                <pre class="debug-pre prompt-pre">{{ info ? info.prompt : '等待回复...' }}</pre>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
    info: Object
})

const expanded = ref(false)

function copyPrompt() {
    if (props.info && props.info.prompt) {
        navigator.clipboard.writeText(props.info.prompt)
    }
}
</script>

<style scoped>
.debug-wrapper {
    border-top: 1px solid var(--color-bg-secondary);
}

.debug-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 4px;
    cursor: pointer;
    user-select: none;
}

.debug-icon {
    font-size: 12px;
    opacity: 0.6;
}

.debug-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-light);
}

.debug-brief {
    flex: 1;
    font-size: 11px;
    color: var(--color-text-light);
    text-align: right;
    font-family: monospace;
}

.debug-arrow {
    font-size: 10px;
    color: var(--color-text-light);
}

.debug-content {
    max-height: 300px;
    overflow-y: auto;
    padding: 8px 4px;
    background: var(--color-white);
    border-radius: 8px;
    margin-bottom: 6px;
}

.debug-section {
    margin-bottom: 12px;
}

.debug-section h4 {
    font-size: 12px;
    color: var(--color-text);
    margin-bottom: 6px;
}

.debug-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.copy-btn {
    font-size: 11px;
    padding: 2px 8px;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 4px;
    background: none;
    color: var(--color-text-light);
    cursor: pointer;
}

.debug-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 12px;
    font-size: 12px;
    font-family: monospace;
    color: var(--color-text-light);
}

.debug-pre {
    font-size: 11px;
    font-family: monospace;
    background: var(--color-bg);
    padding: 8px;
    border-radius: 6px;
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--color-text-light);
    max-height: 120px;
    overflow-y: auto;
    line-height: 1.4;
}

.prompt-pre {
    max-height: 150px;
}
</style>
