<template>
    <div class="status-bar">
        <span class="time">{{ timeStr }}</span>
        <div class="status-icons">
            <span class="signal">●●●●○</span>
            <span class="wifi">WiFi</span>
            <span class="battery">🔋</span>
        </div>
    </div>
</template>

<script setup>
import { useTime } from '@/composables/useTime'
const { timeStr } = useTime()
</script>

<style scoped>
.status-bar {
    padding-top: calc(env(safe-area-inset-top, 20px) + 8px);
    padding-left: 24px;
    padding-right: 24px;
    padding-bottom: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
    flex-shrink: 0;
}

.status-icons {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 12px;
}
</style>
