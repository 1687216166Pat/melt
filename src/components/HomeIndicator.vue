<template>
    <div class="bottom-bar">
        <div class="home-indicator"></div>
    </div>
</template>

<style scoped>
.bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 8px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 4px);
    background: linear-gradient(to bottom, transparent, rgba(253, 246, 240, 0.85) 40%);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 100;
    pointer-events: none;
}

.home-indicator {
    width: 134px;
    height: 5px;
    background: var(--color-text);
    border-radius: 3px;
    opacity: 0.3;
}
</style>
