<template>
    <div class="sub-page">
        <div class="settings-blob sb-tl"></div>
        <div class="settings-blob sb-br"></div>

        <div class="settings-nav">
            <button class="settings-back" @click="$router.push('/settings')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <span class="settings-title">存储空间</span>
            <div style="width:36px;"></div>
        </div>

        <div class="sub-content">

            <!-- 存储统计卡片 -->
            <div class="section-label-sm" style="margin-top:12px;">存储使用情况</div>
            <div class="storage-card">
                <!-- 总量 -->
                <div class="storage-total">
                    <span class="storage-used">{{ totalUsed }}</span>
                    <span class="storage-unit">KB 已使用</span>
                </div>

                <!-- 圆饼图 -->
                <div class="pie-wrap">
                    <svg viewBox="0 0 100 100" class="pie-svg">
                        <template v-for="(seg, idx) in pieSegments" :key="idx">
                            <circle cx="50" cy="50" r="38" fill="none" :stroke="seg.color" stroke-width="18"
                                :stroke-dasharray="`${seg.dash} ${seg.gap}`" :stroke-dashoffset="seg.offset"
                                style="transition: stroke-dasharray 0.6s ease;" />
                        </template>
                        <circle cx="50" cy="50" r="28" fill="rgba(255,251,250,0.9)" />
                        <svg viewBox="0 0 100 100" class="pie-svg">
                            <template v-for="(seg, idx) in pieSegments" :key="idx">
                                <circle cx="50" cy="50" r="38" fill="none" :stroke="seg.color" stroke-width="18"
                                    :stroke-dasharray="`${seg.dash} ${seg.gap}`" :stroke-dashoffset="seg.offset"
                                    style="transition: stroke-dasharray 0.6s ease;" />
                            </template>
                            <circle cx="50" cy="50" r="28" fill="rgba(255,251,250,0.9)" />
                            <g class="pie-text-group">
                                <text x="50" y="52" text-anchor="middle" font-size="10" fill="#4A3F41" font-weight="700"
                                    dy="-0.3em">总计</text>
                                <text x="50" y="52" text-anchor="middle" font-size="8" fill="#B8A9AC" dy="0.8em">{{
                                    totalUsed }}KB</text>
                            </g>
                        </svg>
                    </svg>

                    <!-- 图例 -->
                    <div class="pie-legend">
                        <div v-for="item in storageItems" :key="item.key" class="legend-item">
                            <div class="legend-dot" :style="{ background: item.color }"></div>
                            <span class="legend-label">{{ item.label }}</span>
                            <span class="legend-val">{{ item.size }}KB</span>
                        </div>
                    </div>
                </div>

                <!-- 分段条 -->
                <div class="storage-bar">
                    <div v-for="item in storageItems" :key="item.key" class="storage-bar-seg"
                        :style="{ width: item.percent + '%', background: item.color }" :title="item.label">
                    </div>
                </div>
                <div class="storage-bar-labels">
                    <template v-for="item in storageItems" :key="item.key">
                        <span v-if="item.percent > 5" class="bar-label" :style="{ color: item.color }">
                            {{ item.label }}
                        </span>
                    </template>
                </div>
            </div>

            <!-- 推荐操作 -->
            <div class="section-label-sm">推荐操作</div>
            <div class="settings-group">
                <div v-if="recommendations.length === 0" class="rec-empty">
                    存储空间使用正常，无需清理 ✓
                </div>
                <div v-for="rec in recommendations" :key="rec.key" class="settings-group-item action-item rec-item"
                    @click="rec.action">
                    <div class="rec-icon" :style="{ background: rec.color + '22' }">
                        <span style="font-size:16px;">{{ rec.emoji }}</span>
                    </div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">{{ rec.title }}</div>
                        <div class="sgi-desc">{{ rec.desc }}</div>
                    </div>
                    <div class="rec-badge" :style="{ background: rec.color + '22', color: rec.color }">
                        {{ rec.badge }}
                    </div>
                </div>
            </div>

            <!-- 数据管理 -->
            <div class="section-label-sm">数据管理</div>
            <div class="settings-group">
                <div class="settings-group-item action-item" @click="showExportPanel = !showExportPanel">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #98CBEA, #70b0d8);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </div>
                    <div class="sgi-label">导出数据</div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        class="sgi-arrow" :style="{ transform: showExportPanel ? 'rotate(90deg)' : '' }">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>

                <!-- 导出选项面板 -->
                <template v-if="showExportPanel">
                    <div class="export-options">
                        <div class="export-option" v-for="opt in exportOptions" :key="opt.key">
                            <label class="export-check">
                                <input type="checkbox" v-model="opt.checked" />
                                <span class="export-check-box"></span>
                            </label>
                            <div class="export-opt-info">
                                <span class="export-opt-label">{{ opt.label }}</span>
                                <span class="export-opt-desc">{{ opt.desc }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="settings-group-item action-item" @click="exportData">
                        <div class="sgi-label" style="color:#6BAF7A;">确认导出选中项</div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#6BAF7A" stroke-width="2" stroke-linecap="round"
                            class="sgi-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </template>

                <div class="settings-group-item action-item" @click="triggerImport">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #D8CDEA, #b8a8d8);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                    </div>
                    <div class="sgi-label">导入数据</div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        class="sgi-arrow">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
                <input type="file" ref="importInput" accept=".json" style="display:none" @change="importData" />
            </div>

            <!-- 云端同步 -->
            <div class="section-label-sm">云端</div>
            <div class="settings-group">
                <div class="settings-group-item action-item" @click="syncToCloud">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #7ed6a0, #5bc280);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <polyline points="16 16 12 12 8 16" />
                            <line x1="12" y1="12" x2="12" y2="21" />
                            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                        </svg>
                    </div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">上传至云端</div>
                        <div class="sgi-desc">清除旧缓存，重新同步最新数据</div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        class="sgi-arrow">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
                <div class="settings-group-item action-item" @click="forceSync">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #F5EAD0, #e8d5a8);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                    </div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">强制同步</div>
                        <div class="sgi-desc">从云端读取最新数据，覆盖本地缓存</div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        class="sgi-arrow">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
            </div>

            <!-- 恢复 -->
            <div class="section-label-sm">恢复</div>
            <div class="settings-group">
                <div class="settings-group-item action-item" @click="restoreBuiltinPersonas">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #E8C0C9, #d4899e);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                    </div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">恢复内置人格</div>
                        <div class="sgi-desc">恢复被隐藏的系统内置角色</div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        class="sgi-arrow">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
            </div>

            <!-- 在你的 <template> 中，找到你刚才加的两个 setting-item，用下面的代码块替换 -->

            <!-- 数据迁移 -->
            <div class="section-label-sm">数据迁移 (Beta)</div>
            <div class="settings-group">
                <!-- 单独迁移 -->
                <div class="settings-group-item action-item">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #88abda, #6f94c9);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <path d="M4 12h16M4 12l6 6M4 12l6-6" />
                        </svg>
                    </div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">迁移当前助手</div>
                        <div class="sgi-desc">仅将云端数据导入到【{{ personaNameForDisplay }}】</div>
                    </div>
                    <button class="action-btn primary" @click="handleSingleMigration">迁移当前</button>
                </div>

                <!-- 全量迁移 -->
                <div class="settings-group-item action-item">
                    <div class="sgi-icon-wrap" style="background: linear-gradient(135deg, #c98888, #b86f6f);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">迁移所有助手</div>
                        <div class="sgi-desc danger-text">【高风险】一次性导入所有数据</div>
                    </div>
                    <button class="action-btn danger" @click="handleFullMigration">全量迁移</button>
                </div>
            </div>

            <Transition name="toast-fade">
                <div v-if="resultMsg" class="result-bar" :class="resultSuccess ? 'success' : 'error'">
                    {{ resultMsg }}
                </div>
            </Transition>

        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '@/utils/api';
import { useRoute } from 'vue-router';
// 导入我们的迁移函数
import { startSingleMigration, startFullMigration } from '@/utils/migrate.js';

// --- 你原有的 State 和 Refs ---
const importInput = ref(null);
const resultMsg = ref('');
const resultSuccess = ref(true);
const showExportPanel = ref(false);
const storageItems = ref([
    { key: 'messages', label: '聊天记录', color: '#E8C0C9', size: 0, percent: 0 },
    { key: 'personas', label: '角色人设', color: '#D8CDEA', size: 0, percent: 0 },
    { key: 'userProfile', label: '用户人设', color: '#98CBEA', size: 0, percent: 0 },
    { key: 'memories', label: '记忆', color: '#F5EAD0', size: 0, percent: 0 },
    { key: 'worldBooks', label: '世界书', color: '#B8D4C8', size: 0, percent: 0 },
    { key: 'calendar', label: '日历', color: '#F1DADD', size: 0, percent: 0 },
    { key: 'media', label: '媒体/头像', color: '#C8C8E8', size: 0, percent: 0 },
    { key: 'other', label: '其他', color: '#D4C8CA', size: 0, percent: 0 },
]);
const exportOptions = ref([
    { key: 'messages', label: '聊天记录', desc: '所有角色的对话数据', checked: true },
    { key: 'memories', label: '记忆库', desc: '长期印象、碎片、弧线', checked: true },
    { key: 'worldbooks', label: '世界书', desc: '所有世界书内容', checked: true },
    { key: 'personas', label: '角色设定', desc: '自定义角色和配置', checked: true },
    { key: 'timeline', label: '时间线', desc: '时间线事件记录', checked: true },
    { key: 'settings', label: '本地设置', desc: '主题、壁纸、API配置等', checked: false },
]);

// --- 新增的 State，用于数据迁移 ---
const route = useRoute();
const personaIdFromRoute = computed(() => route.params.personaId);
const personaName = ref('未知助手'); // 给一个默认值

// --- 你原有的 Computed Properties ---
const totalUsed = computed(() => storageItems.value.reduce((a, b) => a + b.size, 0));

const pieSegments = computed(() => {
    const total = totalUsed.value || 1;
    const circumference = 2 * Math.PI * 38;
    let offset = 0;
    return storageItems.value.map(item => {
        const dash = (item.size / total) * circumference;
        const seg = { color: item.color, dash, gap: circumference - dash, offset: circumference - offset };
        offset += dash;
        return seg;
    });
});

const recommendations = computed(() => {
    const recs = [];
    const msgs = storageItems.value.find(i => i.key === 'messages');
    const mems = storageItems.value.find(i => i.key === 'memories');
    const media = storageItems.value.find(i => i.key === 'media');

    if (msgs && msgs.size > 500) {
        recs.push({ key: 'clear_messages', emoji: '💬', title: '清理旧聊天记录', desc: `聊天记录占用 ${msgs.size}KB，可清理早期记录`, badge: `${msgs.size}KB`, color: '#E8C0C9', action: () => { } });
    }
    if (mems && mems.size > 200) {
        recs.push({ key: 'compress_memory', emoji: '🧠', title: '压缩记忆数据', desc: `记忆占用 ${mems.size}KB，建议触发一次记忆整理`, badge: `${mems.size}KB`, color: '#F5EAD0', action: () => { } });
    }
    if (media && media.size > 300) {
        recs.push({ key: 'clear_media', emoji: '🖼️', title: '清理媒体缓存', desc: `媒体文件占用 ${media.size}KB，可清理头像缓存`, badge: `${media.size}KB`, color: '#C8C8E8', action: () => { } });
    }
    return recs;
});

// --- 新增的 Computed Property，用于模板安全显示 ---
const personaNameForDisplay = computed(() => {
    return personaName.value !== '未知助手' ? personaName.value : (personaIdFromRoute.value || '当前助手');
});


// --- 你原有的 Methods ---
function calcSize(str) {
    if (!str) return 0;
    return Math.round(new Blob([str]).size / 1024 * 10) / 10;
}

function loadStorageStats() {
    const keys = Object.keys(localStorage);
    let messages = 0, personas = 0, userProfile = 0, memories = 0, worldBooks = 0, calendar = 0, media = 0, other = 0;

    keys.forEach(key => {
        const val = localStorage.getItem(key) || '';
        const size = calcSize(val);
        if (['messages', 'messages_beta'].some(k => key.includes(k))) messages += size;
        else if (['api_config', 'api_configs', 'sub_api', 'custom_personas'].some(k => key.includes(k))) personas += size;
        else if (['user_name', 'user_phone', 'user_bio', 'user_background', 'user_relation', 'user_masks', 'user_identity', 'user_gender', 'user_nickname'].some(k => key.includes(k))) userProfile += size;
        else if (['word_cards', 'memories', 'memory'].some(k => key.includes(k))) memories += size;
        else if (key.includes('world_book')) worldBooks += size;
        else if (['calendar_data', 'period_data', 'together_start_date'].some(k => key.includes(k))) calendar += size;
        else if (['wallpaper', 'avatar', 'font', 'icon'].some(k => key.includes(k))) media += size;
        else other += size;
    });

    storageItems.value[0].size = Math.round(messages);
    storageItems.value[1].size = Math.round(personas);
    storageItems.value[2].size = Math.round(userProfile);
    storageItems.value[3].size = Math.round(memories);
    storageItems.value[4].size = Math.round(worldBooks);
    storageItems.value[5].size = Math.round(calendar);
    storageItems.value[6].size = Math.round(media);
    storageItems.value[7].size = Math.round(other);

    const total = storageItems.value.reduce((a, b) => a + b.size, 0) || 1;
    storageItems.value.forEach(item => {
        item.percent = Math.round((item.size / total) * 100);
    });
}

function showResult(msg, success = true) {
    resultMsg.value = msg;
    resultSuccess.value = success;
    setTimeout(() => { resultMsg.value = ''; }, 3000);
}

async function exportData() {
    try {
        const selected = exportOptions.value.filter(o => o.checked).map(o => o.key);
        if (selected.length === 0) { showResult('请至少选择一项', false); return; }

        const res = await api('/api/export?modules=' + selected.join(','));
        const serverData = await res.json();

        const exportPayload = {};
        if (selected.includes('messages') && serverData.messages) exportPayload.messages = serverData.messages;
        if (selected.includes('memories') && serverData.memories) exportPayload.memories = serverData.memories;
        if (selected.includes('worldbooks') && serverData.worldbooks) exportPayload.worldbooks = serverData.worldbooks;
        if (selected.includes('personas') && serverData.personas) exportPayload.personas = serverData.personas;
        if (selected.includes('timeline') && serverData.timeline) exportPayload.timeline = serverData.timeline;

        if (selected.includes('settings')) {
            const localData = {};
            Object.keys(localStorage).forEach(k => { localData[k] = localStorage.getItem(k); });
            exportPayload.localSettings = localData;
        }

        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const modules = selected.length === exportOptions.value.length ? 'full' : selected.join('+');
        a.download = `melt-${modules}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showExportPanel.value = false;
        showResult('导出成功 ✓');
    } catch (e) { showResult('导出失败: ' + e.message, false); }
}

function triggerImport() {
    importInput.value?.click();
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.localSettings) {
            Object.entries(data.localSettings).forEach(([k, v]) => { if (v) localStorage.setItem(k, v); });
        }

        const serverData = { ...data };
        delete serverData.localSettings;
        if (Object.keys(serverData).length > 0) {
            await api('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serverData)
            });
        }
        showResult('导入成功，刷新页面生效 ✓');
    } catch (e) { showResult('导入失败: ' + e.message, false); }
}

async function syncToCloud() {
    if (!confirm('上传至云端会清除旧缓存并重新同步最新数据，确定继续？')) return;
    showResult('正在同步...');
    try {
        sessionStorage.clear();
        const keysToRemove = Object.keys(localStorage).filter(k =>
            k.startsWith('melt_cache_') || k === 'home_data_loaded' || k === 'personas_loaded' ||
            k === 'cached_current_ai' || k === 'cached_left_bubble' || k === 'cached_personas' ||
            k === 'cached_timeline' || k === 'cached_insights' || k === 'cached_total_messages' ||
            k === 'cached_streak'
        );
        keysToRemove.forEach(k => localStorage.removeItem(k));

        const [personasRes, latestRes] = await Promise.all([
            api('/api/prompts/personas'),
            api('/api/messages/latest-persona')
        ]);
        const personasData = await personasRes.json();
        const latestData = await latestRes.json();
        const pid = latestData.personaId;

        if (pid) {
            const [msgRes, timelineRes, insightRes, heatmapRes] = await Promise.all([
                api(`/api/messages/${pid}/last`),
                api(`/api/timeline/${pid}`),
                api(`/api/sediment/${pid}/insights`),
                api(`/api/memories/${pid}/heatmap`)
            ]);
            const lastMsg = await msgRes.json();
            const timeline = await timelineRes.json();
            const insights = await insightRes.json();
            const heatmap = await heatmapRes.json();
            if (lastMsg) {
                const content = lastMsg.content.split('|||')[0].replace(/\n/g, ' ');
                localStorage.setItem('cached_left_bubble', content.length > 30 ? content.slice(0, 30) + '...' : content);
            }
            localStorage.setItem('cached_timeline', JSON.stringify(timeline));
            localStorage.setItem('cached_insights', JSON.stringify(insights));
            if (heatmap) {
                const total = Object.values(heatmap).reduce((a, b) => a + b, 0);
                localStorage.setItem('cached_total_messages', String(total));
            }
        }
        showResult('已同步最新数据至本地缓存 ✓');
    } catch (e) {
        showResult('同步失败: ' + e.message, false);
    }
}

async function forceSync() {
    if (!confirm('强制同步会清除所有本地缓存并从云端重新读取，确定？')) return;
    showResult('正在从云端读取...');
    try {
        sessionStorage.clear();
        Object.keys(localStorage).forEach(key => {
            if (
                key.startsWith('melt_cache_') || key.startsWith('cached_') || key.startsWith('together_loaded_') ||
                key.startsWith('insights_loaded_') || key.startsWith('bookmarks_loaded_') ||
                key === 'home_data_loaded' || key === 'personas_loaded'
            ) {
                localStorage.removeItem(key);
            }
        });
        showResult('缓存已清除，正在刷新...');
        setTimeout(() => { location.reload(); }, 1200);
    } catch (e) {
        showResult('同步失败: ' + e.message, false);
    }
}

async function restoreBuiltinPersonas() {
    try {
        for (const id of ['xiaorou', 'cool', 'assistant']) {
            await api(`/api/personas/builtin/${id}/restore`, { method: 'POST' });
        }
        localStorage.removeItem('hidden_personas');
        showResult('已恢复所有内置人格 ✓');
    } catch (e) { showResult('恢复失败: ' + e.message, false); }
}

// --- 新增的 Methods，用于数据迁移 ---
async function handleSingleMigration() {
    const pid = personaIdFromRoute.value;
    if (!pid) {
        alert('无法获取当前人格 ID，请从具体的人格详情页进入此功能，或选择“全量迁移”。');
        return;
    }
    await startSingleMigration(pid);
}

async function handleFullMigration() {
    await startFullMigration();
}

// --- onMounted 生命周期钩子 ---
onMounted(() => {
    // 你原有的 onMounted 逻辑
    loadStorageStats();

    // 新增的逻辑，用于获取当前 persona 的名称
    if (personaIdFromRoute.value) {
        api(`/api/persona/${personaIdFromRoute.value}`)
            .then(res => res.json())
            .then(data => {
                // 假设你的 persona API 返回的对象中有 name 字段
                if (data && data.name) {
                    personaName.value = data.name;
                } else if (personaIdFromRoute.value) {
                    // 如果没有 name 字段，就用 ID 代替
                    personaName.value = personaIdFromRoute.value;
                }
            })
            .catch(err => {
                console.error("Failed to fetch persona name:", err);
                // 如果请求失败，也用 ID 代替
                if (personaIdFromRoute.value) {
                    personaName.value = personaIdFromRoute.value;
                }
            });
    }
});
</script>

<style scoped>
.sub-page {
    width: 100%;
    height: 100%;
    padding-top: env(safe-area-inset-top, 44px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background: linear-gradient(180deg, #FFFBFA 0%, #FFF0F2 60%, #FFE9ED 100%);
    box-sizing: border-box;
}

.settings-blob {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    filter: blur(60px);
}

.sb-tl {
    top: -40px;
    left: -50px;
    width: 220px;
    height: 220px;
    background: #F1DADD;
    opacity: 0.45;
}

.sb-br {
    bottom: 40px;
    right: -60px;
    width: 200px;
    height: 200px;
    background: #98CBEA;
    opacity: 0.2;
}

.settings-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px 4px;
    flex-shrink: 0;
    position: relative;
    z-index: 2;
}

.settings-back {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: saturate(180%) blur(12px);
    -webkit-backdrop-filter: saturate(180%) blur(12px);
    border: 1px solid rgba(255, 240, 242, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(217, 163, 175, 0.08);
}

.settings-back svg {
    width: 16px;
    height: 16px;
    stroke: #D9A3AF;
}

.settings-title {
    font-size: 17px;
    font-weight: 800;
    color: #4A3F41;
}

.sub-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 32px);
    position: relative;
    z-index: 1;
}

.sub-content::-webkit-scrollbar {
    display: none;
}

.section-label-sm {
    font-size: 11px;
    font-weight: 700;
    color: #B8A9AC;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    padding: 0 4px 8px;
    margin-top: 20px;
    display: block;
}

/* 存储卡片 */
.storage-card {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 22px;
    padding: 18px 16px;
    margin-bottom: 10px;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.storage-total {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 16px;
}

.storage-used {
    font-size: 28px;
    font-weight: 800;
    color: #4A3F41;
}

.storage-unit {
    font-size: 13px;
    color: #B8A9AC;
}

/* 圆饼图 */
.pie-wrap {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-bottom: 16px;
}

.pie-svg {
    width: 100px;
    height: 100px;
    flex-shrink: 0;
    transform: rotate(-90deg);
}

.pie-text-group {
    transform: rotate(90deg);
    transform-origin: 50px 50px;
}

.pie-legend {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
}

.legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.legend-label {
    font-size: 11px;
    color: #6B5B5E;
    flex: 1;
}

.legend-val {
    font-size: 11px;
    color: #B8A9AC;
    font-weight: 600;
}

/* 分段条 */
.storage-bar {
    display: flex;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 4px;
}

.storage-bar-seg {
    height: 100%;
    transition: width 0.6s ease;
}

.storage-bar-labels {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
}

.bar-label {
    font-size: 9px;
    font-weight: 600;
}

/* 推荐操作 */
.settings-group {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 22px;
    overflow: hidden;
    margin-bottom: 10px;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.settings-group-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
}

.settings-group-item:last-child {
    border-bottom: none;
}

.action-item {
    cursor: pointer;
    transition: background 0.15s;
}

.action-item:active {
    background: rgba(217, 163, 175, 0.06);
}

.sgi-icon-wrap {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.sgi-icon-wrap svg {
    width: 16px;
    height: 16px;
}

.sgi-label {
    font-size: 14px;
    color: #4A3F41;
    flex-shrink: 0;
}

.sgi-label-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.sgi-desc {
    font-size: 11px;
    color: #B8A9AC;
}

.sgi-arrow {
    width: 14px;
    height: 14px;
    stroke: #D4C8CA;
    flex-shrink: 0;
}

.rec-empty {
    padding: 16px;
    font-size: 13px;
    color: #6BAF7A;
    text-align: center;
}

.rec-item {
    align-items: flex-start;
}

.rec-icon {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.rec-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 10px;
    flex-shrink: 0;
}

.result-bar {
    padding: 10px 14px;
    border-radius: 14px;
    font-size: 12px;
    margin-top: 8px;
}

.result-bar.success {
    color: #6BAF7A;
    background: rgba(107, 175, 122, 0.1);
}

.result-bar.error {
    color: #C07070;
    background: rgba(192, 112, 112, 0.1);
}

.toast-fade-enter-active {
    transition: opacity 0.3s;
}

.toast-fade-leave-active {
    transition: opacity 0.5s;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
    opacity: 0;
}

/* 危险操作 */
.danger-item:active {
    background: rgba(208, 96, 96, 0.06);
}

.danger-label {
    color: #C06060;
}

.export-options {
    padding: 8px 16px 12px;
    border-bottom: 1px solid rgba(217, 163, 175, 0.08);
}

.export-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
}

.export-check {
    position: relative;
    display: flex;
    align-items: center;
}

.export-check input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
}

.export-check-box {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 1.5px solid rgba(217, 163, 175, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    cursor: pointer;
}

.export-check input:checked+.export-check-box {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    border-color: transparent;
}

.export-check input:checked+.export-check-box::after {
    content: '✓';
    color: white;
    font-size: 12px;
    font-weight: 700;
}

.export-opt-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.export-opt-label {
    font-size: 13px;
    color: #4A3F41;
}

.export-opt-desc {
    font-size: 10px;
    color: #B8A9AC;
}

/* 你可以把这些样式加到 Storage.vue 的 style 标签里 */
.sgi-label-wrap .danger-text {
    color: #ff4d4f;
    font-weight: 500;
}

.action-btn {
    border: none;
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    flex-shrink: 0;
    transition: background-color 0.2s;
}

.action-btn.primary {
    background-color: #1890ff;
    color: white;
}

.action-btn.primary:active {
    background-color: #096dd9;
}

.action-btn.danger {
    background-color: #ff4d4f;
    color: white;
}

.action-btn.danger:active {
    background-color: #d9363e;
}
</style>
