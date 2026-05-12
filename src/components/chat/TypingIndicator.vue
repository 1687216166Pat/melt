<template>
    <div class="bubble-wrapper ai" v-if="visible">
        <div class="bubble typing">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        </div>
    </div>
</template>

<script setup>
defineProps({
    visible: Boolean
})
</script>

<style scoped>
.bubble-wrapper {
    display: flex;
    margin-bottom: 12px;
}

.bubble-wrapper.ai {
    justify-content: flex-start;
}

.bubble.typing {
    background: var(--color-white);
    padding: 12px 16px;
    border-radius: 18px;
    border-bottom-left-radius: 4px;
    display: flex;
    gap: 4px;
    align-items: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-text-light);
    animation: bounce 1.4s infinite ease-in-out;
}

.dot:nth-child(2) {
    animation-delay: 0.2s;
}

.dot:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes bounce {

    0%,
    60%,
    100% {
        transform: translateY(0);
        opacity: 0.4;
    }

    30% {
        transform: translateY(-4px);
        opacity: 1;
    }
}
</style>
