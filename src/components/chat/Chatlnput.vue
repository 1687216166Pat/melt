<!-- src/components/chat/ChatInput.vue -->
<template>
    <div class="chat-input-area">
        <input v-model="text" placeholder="输入消息..." @keyup.enter="sendMessage" />
        <button @click="sendMessage" :disabled="!text.trim()">
            <span>↑</span>
        </button>
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
    display: flex;
    gap: 8px;
    padding: 10px 0;
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
