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
    if (!ts) return ''
    let d = new Date(ts)

    // 如果时间戳不含时区信息（来自SQLite），当作UTC处理
    if (typeof ts === 'string' && !ts.includes('T') && !ts.includes('Z') && !ts.includes('+')) {
        d = new Date(ts + 'Z')
    }

    // 如果解析失败
    if (isNaN(d.getTime())) return ''

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
