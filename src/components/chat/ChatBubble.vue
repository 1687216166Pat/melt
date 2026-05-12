<template>
    <div class="bubble-wrapper" :class="msg.role" v-if="msg.content">
        <div class="bubble">
            <p>{{ msg.content }}</p>
            <span class="time">{{ formatTime(msg.timestamp) }}</span>
        </div>
    </div>
</template>

<script setup>
defineProps({
    msg: Object
})

function formatTime(ts) {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.bubble-wrapper {
    display: flex;
    margin-bottom: 12px;
}

.bubble-wrapper.user {
    justify-content: flex-end;
}

.bubble-wrapper.ai {
    justify-content: flex-start;
}

.bubble {
    max-width: 70%;
    padding: 10px 14px;
    border-radius: 18px;
    font-size: 15px;
    line-height: 1.4;
    color: var(--color-text);
}

.user .bubble {
    background: var(--color-primary);
    color: white;
    border-bottom-right-radius: 4px;
}

.ai .bubble {
    background: var(--color-white);
    border-bottom-left-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.time {
    display: block;
    font-size: 11px;
    margin-top: 4px;
    opacity: 0.6;
}
</style>
