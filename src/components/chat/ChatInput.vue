<template>
    <div class="chat-input-area">
        <textarea ref="inputRef" v-model="text" placeholder="输入消息..." @keydown.enter.exact="sendMessage"
            @input="autoResize" rows="1"></textarea>
        <button @click="sendMessage" :disabled="!text.trim()">
            <span>↑</span>
        </button>
    </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const emit = defineEmits(['send'])
const text = ref('')
const inputRef = ref(null)

function sendMessage(e) {
    if (e && e.type === 'keydown') e.preventDefault()
    if (!text.value.trim()) return
    emit('send', text.value.trim())
    text.value = ''
    nextTick(() => autoResize())
}

function autoResize() {
    const el = inputRef.value
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}
</script>

<style scoped>
.chat-input-area {
    display: flex;
    gap: 8px;
    padding: 10px 0;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
    align-items: flex-end;
    flex-shrink: 0;
}

textarea {
    flex: 1;
    min-height: 36px;
    max-height: 120px;
    border-radius: 18px;
    border: 1px solid var(--color-bg-secondary);
    padding: 8px 16px;
    font-size: 15px;
    font-family: inherit;
    background: var(--color-white);
    outline: none;
    resize: none;
    line-height: 1.4;
    overflow-y: auto;
}

textarea:focus {
    border-color: var(--color-primary);
}

button {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--color-primary);
    color: white;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}
</style>
