<template>
    <div class="relationship-page">
        <div class="relationship-header">
            <button class="back-btn" @click="$router.push('/')">‹</button>
            <h2>关系</h2>
        </div>

        <div class="persona-tabs">
            <button v-for="p in personas" :key="p.id" class="tab-btn" :class="{ active: currentPersona === p.id }"
                @click="switchPersona(p.id)">
                {{ p.name }}
            </button>
        </div>

        <div v-if="relationData" class="relationship-content">
            <!-- 五维雷达图 -->
            <div class="radar-container">
                <svg viewBox="0 0 300 300" class="radar-chart">
                    <polygon v-for="i in 4" :key="'grid-' + i" :points="getGridPoints(i * 25)" fill="none"
                        stroke="var(--color-bg-secondary)" stroke-width="1" />
                    <line v-for="(_, idx) in 5" :key="'axis-' + idx" x1="150" y1="150" :x2="getPoint(idx, 100).x"
                        :y2="getPoint(idx, 100).y" stroke="var(--color-bg-secondary)" stroke-width="1" />
                    <polygon :points="dataPoints" fill="rgba(232, 160, 191, 0.2)" stroke="var(--color-primary)"
                        stroke-width="2" />
                    <circle v-for="(dim, idx) in relationData.dimensions" :key="'dot-' + idx"
                        :cx="getPoint(idx, dim.progress * 100).x" :cy="getPoint(idx, dim.progress * 100).y" r="4"
                        fill="var(--color-primary)" />
                    <text v-for="(dim, idx) in relationData.dimensions" :key="'label-' + idx" :x="getPoint(idx, 118).x"
                        :y="getPoint(idx, 118).y" text-anchor="middle" dominant-baseline="middle" font-size="11"
                        fill="var(--color-text)">
                        {{ dim.name }}
                    </text>
                </svg>
            </div>

            <!-- 各维度关系阶段 -->
            <div class="dimension-list">
                <div v-for="dim in relationData.dimensions" :key="dim.dimension" class="dimension-item">
                    <div class="dim-header">
                        <span class="dim-name">{{ dim.name }}</span>
                        <span class="dim-stage">{{ dim.stage }}</span>
                    </div>
                    <div class="dim-bar">
                        <div class="dim-fill" :style="{ width: (dim.progress * 100) + '%' }"></div>
                    </div>
                    <div class="dim-markers">
                        <span v-for="s in stages" :key="s" class="marker" :class="{ active: s === dim.stage }">{{ s
                        }}</span>
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="loading">加载中...</div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/utils/api'

const personas = ref([])
const stages = ["靠近", "停留", "熟悉", "偏爱", "默契", "依恋", "长伴", "归属"]
const currentPersona = ref('')
const relationData = ref(null)

async function loadPersonas() {
    try {
        const res = await api('/api/prompts/personas')
        const data = await res.json()
        personas.value = data.personas.map(p => ({ id: p.id, name: p.name }))
        if (personas.value.length > 0) {
            currentPersona.value = data.active || personas.value[0].id
            await loadData(currentPersona.value)
        }
    } catch (e) {
        console.error('加载人格列表失败:', e)
    }
}

async function loadData(personaId) {
    try {
        const res = await api(`/api/relationship/${personaId}`)
        relationData.value = await res.json()
    } catch (e) {
        console.error('加载关系数据失败:', e)
    }
}

function switchPersona(id) {
    currentPersona.value = id
    loadData(id)
}

function getPoint(index, radius) {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2
    return {
        x: 150 + radius * Math.cos(angle),
        y: 150 + radius * Math.sin(angle),
    }
}

function getGridPoints(radius) {
    return Array.from({ length: 5 }, (_, i) => {
        const p = getPoint(i, radius)
        return `${p.x},${p.y}`
    }).join(" ")
}

const dataPoints = computed(() => {
    if (!relationData.value || !relationData.value.dimensions) return ""
    return relationData.value.dimensions
        .map((dim, idx) => {
            const p = getPoint(idx, dim.progress * 100)
            return `${p.x},${p.y}`
        })
        .join(" ")
})

onMounted(loadPersonas)
</script>


<style scoped>
.relationship-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
}

.relationship-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--color-bg-secondary);
}

.back-btn {
    background: none;
    border: none;
    font-size: 28px;
    color: var(--color-primary);
    cursor: pointer;
    padding: 0 4px;
}

.relationship-header h2 {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
}

.persona-tabs {
    display: flex;
    gap: 8px;
    padding: 12px 0;
}

.tab-btn {
    padding: 6px 16px;
    border-radius: 20px;
    border: 1px solid var(--color-bg-secondary);
    background: var(--color-white);
    font-size: 13px;
    color: var(--color-text);
    cursor: pointer;
}

.tab-btn.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
}

.relationship-content {
    flex: 1;
    overflow-y: auto;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
}

.radar-container {
    display: flex;
    justify-content: center;
    padding: 20px 0;
}

.radar-chart {
    width: 220px;
    height: 220px;
}

.dimension-list {
    padding: 0 4px;
}

.dimension-item {
    padding: 14px 0;
    border-bottom: 1px solid var(--color-bg-secondary);
}

.dim-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.dim-name {
    font-size: 14px;
    color: var(--color-text);
    font-weight: 500;
}

.dim-stage {
    font-size: 13px;
    color: var(--color-primary);
    font-weight: 500;
}

.dim-bar {
    height: 4px;
    background: var(--color-bg-secondary);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 6px;
}

.dim-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
    border-radius: 2px;
    transition: width 0.5s ease;
}

.dim-markers {
    display: flex;
    justify-content: space-between;
}

.marker {
    font-size: 9px;
    color: var(--color-text-light);
    opacity: 0.4;
}

.marker.active {
    color: var(--color-primary);
    opacity: 1;
    font-weight: 600;
}

.loading {
    text-align: center;
    color: var(--color-text-light);
    padding: 40px;
    font-size: 14px;
}
</style>
