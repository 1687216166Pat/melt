<template>
    <div class="phone-screen">
        <StatusBar />
        <main class="screen-content">
            <RouterView />
        </main>
        <HomeIndicator />
    </div>
</template>

<script setup>
import StatusBar from '@/components/StatusBar.vue'
import HomeIndicator from '@/components/HomeIndicator.vue'
</script>

<style scoped>
.phone-screen {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
}

.screen-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 20px;
}
</style>
