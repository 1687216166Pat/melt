<template>
    <div class="home-indicator-area">
        <div class="home-indicator"></div>
    </div>
</template>

<style scoped>
.home-indicator-area {
    padding-bottom: 8px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    flex-shrink: 0;
}

.home-indicator {
    width: 134px;
    height: 5px;
    background: var(--color-text);
    border-radius: 3px;
    opacity: 0.3;
}
</style>
