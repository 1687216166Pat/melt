<template>
    <div class="chat-input-area">
        <div class="input-row">
            <input v-model="text" placeholder="输入消息..." @keyup.enter="sendMessage" />
            <button @click="sendMessage" :disabled="!text.trim()">
                <span>↑</span>
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['send'])
const text = ref('')

function sendMessage() {
    if (!text.value.trim()) return
    emit('send', text.value.trim())
    text.value = ''
}
</script>

<style scoped>
.chat-input-area {
    flex-shrink: 0;
    padding: 10px 0;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
    background: rgba(253, 246, 240, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}

.input-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

input {
    flex: 1;
    height: 36px;
    border-radius: 18px;
    border: 1px solid var(--color-bg-secondary);
    padding: 0 16px;
    font-size: 15px;
    background: var(--color-white);
    outline: none;
}

input:focus {
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
}

button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}
</style>
