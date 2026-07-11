<template>
    <div class="map-canvas-wrap" ref="wrapRef">
        <canvas ref="gridRef" class="map-layer grid-layer"></canvas>
        <canvas ref="pathRef" class="map-layer path-layer"></canvas>
        <canvas ref="interactRef" class="map-layer interact-layer" @mousedown="onDown" @mousemove="onMove"
            @mouseup="onUp" @mouseleave="onUp" @dblclick="onDblClick" @touchstart.prevent="onTouchStart"
            @touchmove.prevent="onTouchMove" @touchend.prevent="onTouchEnd">
        </canvas>
        <div class="pins-layer">
            <div v-for="loc in locations" :key="loc.id" class="map-pin"
                :class="{ active: currentLocation === loc.location_name, dragging: draggingId === loc.id }"
                :style="{ left: (loc.x * canvasW) + 'px', top: (loc.y * canvasH) + 'px' }"
                @mousedown.stop="editMode ? startDrag($event, loc) : null"
                @touchstart.stop.prevent="editMode ? startDragTouch($event, loc) : null"
                @click.stop="!editMode ? emit('location-click', loc) : null">
                <span class="pin-icon">{{ loc.icon || '📍' }}</span>
                <span class="pin-label">{{ loc.location_name }}</span>
            </div>
        </div>
        <div class="path-labels-layer">
            <div v-for="(path, idx) in paths" :key="idx" class="path-label"
                :style="getPathLabelStyle(path, canvasW, canvasH)">
                {{ path.path_name || path.name }}
            </div>
        </div>
        <div v-if="editMode && !drawMode && !placingPin" class="map-hint">长按标记可拖拽</div>
        <div v-if="placingPin" class="map-hint placing">点击放置标记</div>
        <div v-if="drawMode === 'polygon'" class="map-hint drawing">点击绘制，双击结束</div>
        <div v-if="drawMode === 'circle'" class="map-hint drawing">按住拖动画圆，松手完成</div>

        <button class="expand-btn" @click.stop="openFullscreen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
        </button>
    </div>

    <!-- 全屏模式 -->
    <Teleport to="body">
        <div v-if="isExpanded" class="map-fullscreen-overlay">
            <div class="map-fullscreen-wrap" ref="fullWrapRef">
                <canvas ref="fullGridRef" class="map-layer grid-layer"></canvas>
                <canvas ref="fullPathRef" class="map-layer path-layer"></canvas>
                <canvas ref="fullInteractRef" class="map-layer interact-layer" @mousedown="onDownFull"
                    @mousemove="onMoveFull" @mouseup="onUpFull" @mouseleave="onUpFull" @dblclick="onDblClickFull"
                    @touchstart.prevent="onTouchStartFull" @touchmove.prevent="onTouchMoveFull"
                    @touchend.prevent="onTouchEndFull">
                </canvas>
                <div class="pins-layer">
                    <div v-for="loc in locations" :key="loc.id" class="map-pin"
                        :class="{ active: currentLocation === loc.location_name, dragging: draggingId === loc.id }"
                        :style="{ left: (loc.x * fullW) + 'px', top: (loc.y * fullH) + 'px' }"
                        @mousedown.stop="fullEditMode ? startDragFull($event, loc) : null"
                        @touchstart.stop.prevent="fullEditMode ? startDragTouchFull($event, loc) : null"
                        @click.stop="!fullEditMode ? emit('location-click', loc) : null">
                        <span class="pin-icon">{{ loc.icon || '📍' }}</span>
                        <span class="pin-label">{{ loc.location_name }}</span>
                    </div>
                </div>
                <div class="path-labels-layer">
                    <div v-for="(path, idx) in paths" :key="idx" class="path-label"
                        :style="getPathLabelStyle(path, fullW, fullH)">
                        {{ path.path_name || path.name }}
                    </div>
                </div>
                <div v-if="fullEditMode && !fullDrawMode && !fullPlacingPin" class="map-hint">长按标记可拖拽</div>
                <div v-if="fullPlacingPin" class="map-hint placing">点击放置标记</div>
                <div v-if="fullDrawMode === 'polygon'" class="map-hint drawing">点击绘制，双击结束</div>
                <div v-if="fullDrawMode === 'circle'" class="map-hint drawing">按住拖动画圆，松手完成</div>

                <!-- 全屏工具栏 -->
                <div class="full-toolbar">
                    <button class="tool-btn" :class="{ active: fullEditMode }"
                        @click="fullEditMode = !fullEditMode; fullDrawMode = null; fullPlacingPin = false">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        编辑
                    </button>
                    <button v-if="fullEditMode" class="tool-btn" :class="{ active: fullPlacingPin }"
                        @click="fullPlacingPin = !fullPlacingPin; fullDrawMode = null">
                        📍 放置标记
                    </button>
                    <button v-if="fullEditMode" class="tool-btn" :class="{ active: fullDrawMode === 'polygon' }"
                        @click="fullDrawMode = fullDrawMode === 'polygon' ? null : 'polygon'; fullPlacingPin = false">
                        ✏️ 手绘区域
                    </button>
                    <button v-if="fullEditMode" class="tool-btn" :class="{ active: fullDrawMode === 'circle' }"
                        @click="fullDrawMode = fullDrawMode === 'circle' ? null : 'circle'; fullPlacingPin = false">
                        ⭕ 圆形区域
                    </button>
                    <button v-if="fullEditMode" class="tool-btn accent" @click="emit('open-bg-edit')">
                        🖼️ 背景
                    </button>
                </div>

                <!-- 关闭按钮 -->
                <button class="fullscreen-close-btn" @click="isExpanded = false">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path
                            d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
                    </svg>
                    收起
                </button>
            </div>
        </div>
    </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
    map: { type: Object, default: () => ({}) },
    locations: { type: Array, default: () => [] },
    paths: { type: Array, default: () => [] },
    currentLocation: { type: String, default: '' },
    editMode: { type: Boolean, default: false },
    drawMode: { type: String, default: null },
    placingPin: { type: Boolean, default: false },
})

const emit = defineEmits(['location-click', 'location-drag', 'path-drawn', 'pin-placed', 'open-bg-edit'])

// 小地图 canvas
const wrapRef = ref(null)
const gridRef = ref(null)
const pathRef = ref(null)
const interactRef = ref(null)
const canvasW = ref(0)
const canvasH = ref(0)

// 圆形绘制状态
const circleCenter = ref(null)
const circleRadius = ref(0)
const isDrawingCircle = ref(false)

// 全屏 canvas
const isExpanded = ref(false)
const fullWrapRef = ref(null)
const fullGridRef = ref(null)
const fullPathRef = ref(null)
const fullInteractRef = ref(null)
const fullW = ref(0)
const fullH = ref(0)

// 全屏内部独立的编辑状态
const fullEditMode = ref(false)
const fullDrawMode = ref(null)
const fullPlacingPin = ref(false)

// 共享状态
const draggingId = ref(null)
const dragOffset = ref({ x: 0, y: 0 })
const isDrawing = ref(false)
const drawPoints = ref([])
let lastTapTime = 0
let bgImage = null
let resizeObs = null

// ==================== 工具函数 ====================

function getPathLabelStyle(path, w, h) {
    const points = path.points || []
    if (points.length === 0) return { display: 'none' }
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length
    return { left: (cx * w) + 'px', top: (cy * h) + 'px', color: path.color || '#D9A3AF' }
}

function getRelPos(clientX, clientY, canvas, w, h) {
    const rect = canvas.getBoundingClientRect()
    return {
        x: Math.max(0, Math.min(1, (clientX - rect.left) / w)),
        y: Math.max(0, Math.min(1, (clientY - rect.top) / h)),
    }
}

function finishDrawing() {
    const points = [...drawPoints.value]
    isDrawing.value = false
    drawPoints.value = []
    emit('path-drawn', points)
    // 清交互层
    clearInteract(interactRef.value)
    clearInteract(fullInteractRef.value)
}

function clearInteract(canvas) {
    if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
}

// ==================== 绘制函数（通用） ====================

function drawGridOn(canvas, w, h) {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)

    if (props.map?.background_url) {
        if (!bgImage || bgImage._src !== props.map.background_url) {
            bgImage = new Image()
            bgImage._src = props.map.background_url
            bgImage.crossOrigin = 'anonymous'
            bgImage.onload = () => {
                ctx.clearRect(0, 0, w, h)
                ctx.drawImage(bgImage, 0, 0, w, h)
            }
            bgImage.src = props.map.background_url
        } else if (bgImage.complete) {
            ctx.drawImage(bgImage, 0, 0, w, h)
        }
        return
    }

    ctx.fillStyle = '#FFF8FA'
    ctx.fillRect(0, 0, w, h)
    const step = 28
    ctx.strokeStyle = 'rgba(217, 163, 175, 0.15)'
    ctx.lineWidth = 1
    for (let x = 0; x <= w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let y = 0; y <= h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(217, 163, 175, 0.25)'
    ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke()
    ctx.setLineDash([])
}

function drawPathsOn(canvas, w, h) {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    props.paths.forEach(path => {
        const points = path.points || []
        if (points.length < 2) return
        const color = path.color || '#D9A3AF'
        ctx.beginPath()
        ctx.moveTo(points[0].x * w, points[0].y * h)
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x * w, points[i].y * h)
        ctx.closePath()
        ctx.fillStyle = color + '33'
        ctx.fill()
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.stroke()
    })
}

function drawInteractPreviewOn(canvas, w, h, previewPoint, mode) {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)

    if (mode === 'circle') {
        if (!circleCenter.value) return
        const cx = circleCenter.value.x * w
        const cy = circleCenter.value.y * h
        const r = previewPoint
            ? Math.sqrt(Math.pow((previewPoint.x - circleCenter.value.x) * w, 2) +
                Math.pow((previewPoint.y - circleCenter.value.y) * h, 2))
            : circleRadius.value * Math.min(w, h)

        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(217, 163, 175, 0.15)'
        ctx.fill()
        ctx.strokeStyle = '#D9A3AF'
        ctx.lineWidth = 2.5
        ctx.setLineDash([6, 3])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.arc(cx, cy, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#D9A3AF'
        ctx.fill()
        return
    }

    // polygon 原有逻辑
    const pts = previewPoint ? [...drawPoints.value, previewPoint] : drawPoints.value
    if (pts.length < 1) return
    if (pts.length === 1) {
        ctx.beginPath()
        ctx.arc(pts[0].x * w, pts[0].y * h, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#D9A3AF'
        ctx.fill()
        return
    }
    ctx.beginPath()
    ctx.moveTo(pts[0].x * w, pts[0].y * h)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * w, pts[i].y * h)
    ctx.strokeStyle = '#D9A3AF'
    ctx.lineWidth = 2.5
    ctx.setLineDash([6, 3])
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.arc(pts[0].x * w, pts[0].y * h, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#D9A3AF'
    ctx.fill()
}

function circleToPoints(cx, cy, r, segments = 32) {
    const pts = []
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r })
    }
    return pts
}

// ==================== 初始化 ====================

function initCanvas() {
    const wrap = wrapRef.value
    if (!wrap) return
    canvasW.value = wrap.offsetWidth
    canvasH.value = wrap.offsetHeight
        ;[gridRef, pathRef, interactRef].forEach(r => {
            if (r.value) { r.value.width = canvasW.value; r.value.height = canvasH.value }
        })
    drawGridOn(gridRef.value, canvasW.value, canvasH.value)
    drawPathsOn(pathRef.value, canvasW.value, canvasH.value)
}

function initFullCanvas() {
    const wrap = fullWrapRef.value
    if (!wrap) return
    fullW.value = wrap.offsetWidth
    fullH.value = wrap.offsetHeight
        ;[fullGridRef, fullPathRef, fullInteractRef].forEach(r => {
            if (r.value) { r.value.width = fullW.value; r.value.height = fullH.value }
        })
    drawGridOn(fullGridRef.value, fullW.value, fullH.value)
    drawPathsOn(fullPathRef.value, fullW.value, fullH.value)
}

function openFullscreen() {
    isExpanded.value = true
    nextTick(() => initFullCanvas())
}

// ==================== 小地图事件 ====================

function onDown(e) {
    const pos = getRelPos(e.clientX, e.clientY, interactRef.value, canvasW.value, canvasH.value)
    if (props.placingPin) { emit('pin-placed', pos); return }
    if (props.drawMode === 'polygon') {
        if (!isDrawing.value) { isDrawing.value = true; drawPoints.value = [pos] }
        else drawPoints.value.push(pos)
        drawInteractPreviewOn(interactRef.value, canvasW.value, canvasH.value, null, 'polygon')
    }
    if (props.drawMode === 'circle') {
        circleCenter.value = pos
        isDrawingCircle.value = true
        drawInteractPreviewOn(interactRef.value, canvasW.value, canvasH.value, null, 'circle')
    }
}

function onMove(e) {
    if (props.drawMode === 'polygon' && isDrawing.value) {
        const pos = getRelPos(e.clientX, e.clientY, interactRef.value, canvasW.value, canvasH.value)
        drawInteractPreviewOn(interactRef.value, canvasW.value, canvasH.value, pos, 'polygon')
    }
    if (props.drawMode === 'circle' && isDrawingCircle.value) {
        const pos = getRelPos(e.clientX, e.clientY, interactRef.value, canvasW.value, canvasH.value)
        drawInteractPreviewOn(interactRef.value, canvasW.value, canvasH.value, pos, 'circle')
    }
}

function onUp(e) {
    if (props.drawMode === 'circle' && isDrawingCircle.value && circleCenter.value) {
        const pos = getRelPos(e.clientX, e.clientY, interactRef.value, canvasW.value, canvasH.value)
        const r = Math.sqrt(
            Math.pow((pos.x - circleCenter.value.x), 2) +
            Math.pow((pos.y - circleCenter.value.y), 2)
        )
        if (r > 0.02) {
            const pts = circleToPoints(circleCenter.value.x, circleCenter.value.y, r)
            clearInteract(interactRef.value)
            isDrawingCircle.value = false
            circleCenter.value = null
            emit('path-drawn', pts)
        }
    }
}

function onDblClick(e) {
    if (props.drawMode === 'polygon' && isDrawing.value && drawPoints.value.length >= 3) finishDrawing()
}

function onTouchStart(e) {
    const touch = e.touches[0]
    const pos = getRelPos(touch.clientX, touch.clientY, interactRef.value, canvasW.value, canvasH.value)
    if (props.placingPin) { emit('pin-placed', pos); return }
    if (props.drawMode === 'polygon') {
        const now = Date.now()
        if (now - lastTapTime < 300 && isDrawing.value && drawPoints.value.length >= 3) {
            finishDrawing(); lastTapTime = 0; return
        }
        lastTapTime = now
        if (!isDrawing.value) { isDrawing.value = true; drawPoints.value = [pos] }
        else drawPoints.value.push(pos)
        drawInteractPreviewOn(interactRef.value, canvasW.value, canvasH.value, null)
    }
}

function onTouchMove(e) {
    const touch = e.touches[0]
    if (props.drawMode === 'polygon' && isDrawing.value) {
        const pos = getRelPos(touch.clientX, touch.clientY, interactRef.value, canvasW.value, canvasH.value)
        drawInteractPreviewOn(interactRef.value, canvasW.value, canvasH.value, pos)
    }
    if (draggingId.value !== null) {
        const pos = getRelPos(touch.clientX, touch.clientY, interactRef.value, canvasW.value, canvasH.value)
        const loc = props.locations.find(l => l.id === draggingId.value)
        if (loc) {
            loc.x = Math.max(0.02, Math.min(0.98, pos.x - dragOffset.value.x))
            loc.y = Math.max(0.02, Math.min(0.98, pos.y - dragOffset.value.y))
        }
    }
}

function onTouchEnd(e) {
    if (props.drawMode === 'circle' && isDrawingCircle.value && circleCenter.value) {
        const touch = e.changedTouches[0]
        const pos = getRelPos(touch.clientX, touch.clientY, interactRef.value, canvasW.value, canvasH.value)
        const r = Math.sqrt(
            Math.pow(pos.x - circleCenter.value.x, 2) + Math.pow(pos.y - circleCenter.value.y, 2)
        )
        if (r > 0.02) {
            const pts = circleToPoints(circleCenter.value.x, circleCenter.value.y, r)
            clearInteract(interactRef.value)
            isDrawingCircle.value = false
            circleCenter.value = null
            emit('path-drawn', pts)
        }
        return
    }
    if (draggingId.value !== null) {
        const loc = props.locations.find(l => l.id === draggingId.value)
        if (loc) emit('location-drag', { id: draggingId.value, x: loc.x, y: loc.y })
        draggingId.value = null
    }
}

function startDrag(e, loc) {
    const pos = getRelPos(e.clientX, e.clientY, interactRef.value, canvasW.value, canvasH.value)
    dragOffset.value = { x: pos.x - loc.x, y: pos.y - loc.y }
    draggingId.value = loc.id
    const onMouseMove = (ev) => {
        const p = getRelPos(ev.clientX, ev.clientY, interactRef.value, canvasW.value, canvasH.value)
        loc.x = Math.max(0.02, Math.min(0.98, p.x - dragOffset.value.x))
        loc.y = Math.max(0.02, Math.min(0.98, p.y - dragOffset.value.y))
    }
    const onMouseUp = () => {
        emit('location-drag', { id: loc.id, x: loc.x, y: loc.y })
        draggingId.value = null
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
}

function startDragTouch(e, loc) {
    const touch = e.touches[0]
    const pos = getRelPos(touch.clientX, touch.clientY, interactRef.value, canvasW.value, canvasH.value)
    dragOffset.value = { x: pos.x - loc.x, y: pos.y - loc.y }
    draggingId.value = loc.id
}

// ==================== 全屏事件 ====================

function onDownFull(e) {
    const pos = getRelPos(e.clientX, e.clientY, fullInteractRef.value, fullW.value, fullH.value)
    if (fullPlacingPin.value) { emit('pin-placed', pos); fullPlacingPin.value = false; return }
    if (fullDrawMode.value === 'polygon') {
        if (!isDrawing.value) { isDrawing.value = true; drawPoints.value = [pos] }
        else drawPoints.value.push(pos)
        drawInteractPreviewOn(fullInteractRef.value, fullW.value, fullH.value, null, 'polygon')
    }
    if (fullDrawMode.value === 'circle') {
        circleCenter.value = pos
        isDrawingCircle.value = true
        drawInteractPreviewOn(fullInteractRef.value, fullW.value, fullH.value, null, 'circle')
    }
}

function onMoveFull(e) {
    if (fullDrawMode.value === 'polygon' && isDrawing.value) {
        const pos = getRelPos(e.clientX, e.clientY, fullInteractRef.value, fullW.value, fullH.value)
        drawInteractPreviewOn(fullInteractRef.value, fullW.value, fullH.value, pos, 'polygon')
    }
    if (fullDrawMode.value === 'circle' && isDrawingCircle.value) {
        const pos = getRelPos(e.clientX, e.clientY, fullInteractRef.value, fullW.value, fullH.value)
        drawInteractPreviewOn(fullInteractRef.value, fullW.value, fullH.value, pos, 'circle')
    }
}

function onUpFull(e) {
    if (fullDrawMode.value === 'circle' && isDrawingCircle.value && circleCenter.value) {
        const pos = getRelPos(e.clientX, e.clientY, fullInteractRef.value, fullW.value, fullH.value)
        const r = Math.sqrt(
            Math.pow((pos.x - circleCenter.value.x), 2) +
            Math.pow((pos.y - circleCenter.value.y), 2)
        )
        if (r > 0.02) {
            const pts = circleToPoints(circleCenter.value.x, circleCenter.value.y, r)
            clearInteract(fullInteractRef.value)
            isDrawingCircle.value = false
            circleCenter.value = null
            emit('path-drawn', pts)
            nextTick(() => drawPathsOn(fullPathRef.value, fullW.value, fullH.value))
        }
    }
}

function onDblClickFull() {
    if (fullDrawMode.value === 'polygon' && isDrawing.value && drawPoints.value.length >= 3) {
        finishDrawing()
        nextTick(() => drawPathsOn(fullPathRef.value, fullW.value, fullH.value))
    }
}

function onTouchStartFull(e) {
    const touch = e.touches[0]
    const pos = getRelPos(touch.clientX, touch.clientY, fullInteractRef.value, fullW.value, fullH.value)
    if (fullPlacingPin.value) { emit('pin-placed', pos); fullPlacingPin.value = false; return }
    if (fullDrawMode.value === 'polygon') {
        const now = Date.now()
        if (now - lastTapTime < 300 && isDrawing.value && drawPoints.value.length >= 3) {
            finishDrawing()
            nextTick(() => drawPathsOn(fullPathRef.value, fullW.value, fullH.value))
            lastTapTime = 0; return
        }
        lastTapTime = now
        if (!isDrawing.value) { isDrawing.value = true; drawPoints.value = [pos] }
        else drawPoints.value.push(pos)
        drawInteractPreviewOn(fullInteractRef.value, fullW.value, fullH.value, null)
    }
}

function onTouchMoveFull(e) {
    const touch = e.touches[0]
    if (fullDrawMode.value === 'polygon' && isDrawing.value) {
        const pos = getRelPos(touch.clientX, touch.clientY, fullInteractRef.value, fullW.value, fullH.value)
        drawInteractPreviewOn(fullInteractRef.value, fullW.value, fullH.value, pos)
    }
    if (draggingId.value !== null) {
        const pos = getRelPos(touch.clientX, touch.clientY, fullInteractRef.value, fullW.value, fullH.value)
        const loc = props.locations.find(l => l.id === draggingId.value)
        if (loc) {
            loc.x = Math.max(0.02, Math.min(0.98, pos.x - dragOffset.value.x))
            loc.y = Math.max(0.02, Math.min(0.98, pos.y - dragOffset.value.y))
        }
    }
}

function onTouchEndFull(e) {
    if (fullDrawMode.value === 'circle' && isDrawingCircle.value && circleCenter.value) {
        const touch = e.changedTouches[0]
        const pos = getRelPos(touch.clientX, touch.clientY, fullInteractRef.value, fullW.value, fullH.value)
        const r = Math.sqrt(
            Math.pow((pos.x - circleCenter.value.x), 2) +
            Math.pow((pos.y - circleCenter.value.y), 2)
        )
        if (r > 0.02) {
            const pts = circleToPoints(circleCenter.value.x, circleCenter.value.y, r)
            clearInteract(fullInteractRef.value)
            isDrawingCircle.value = false
            circleCenter.value = null
            emit('path-drawn', pts)
            nextTick(() => drawPathsOn(fullPathRef.value, fullW.value, fullH.value))
        }
        return
    }
    if (draggingId.value !== null) {
        const loc = props.locations.find(l => l.id === draggingId.value)
        if (loc) emit('location-drag', { id: draggingId.value, x: loc.x, y: loc.y })
        draggingId.value = null
    }
}

function startDragFull(e, loc) {
    const pos = getRelPos(e.clientX, e.clientY, fullInteractRef.value, fullW.value, fullH.value)
    dragOffset.value = { x: pos.x - loc.x, y: pos.y - loc.y }
    draggingId.value = loc.id
    const onMouseMove = (ev) => {
        const p = getRelPos(ev.clientX, ev.clientY, fullInteractRef.value, fullW.value, fullH.value)
        loc.x = Math.max(0.02, Math.min(0.98, p.x - dragOffset.value.x))
        loc.y = Math.max(0.02, Math.min(0.98, p.y - dragOffset.value.y))
    }
    const onMouseUp = () => {
        emit('location-drag', { id: loc.id, x: loc.x, y: loc.y })
        draggingId.value = null
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
}

function startDragTouchFull(e, loc) {
    const touch = e.touches[0]
    const pos = getRelPos(touch.clientX, touch.clientY, fullInteractRef.value, fullW.value, fullH.value)
    dragOffset.value = { x: pos.x - loc.x, y: pos.y - loc.y }
    draggingId.value = loc.id
}

// ==================== 监听 ====================

watch(() => props.map?.background_url, () => {
    bgImage = null
    nextTick(() => {
        drawGridOn(gridRef.value, canvasW.value, canvasH.value)
        if (isExpanded.value) drawGridOn(fullGridRef.value, fullW.value, fullH.value)
    })
})

watch(() => props.paths, () => {
    nextTick(() => {
        drawPathsOn(pathRef.value, canvasW.value, canvasH.value)
        if (isExpanded.value) drawPathsOn(fullPathRef.value, fullW.value, fullH.value)
    })
}, { deep: true })

watch(() => props.drawMode, (val) => {
    if (!val) {
        isDrawing.value = false
        drawPoints.value = []
        isDrawingCircle.value = false
        circleCenter.value = null
        clearInteract(interactRef.value)
    }
})

watch(fullDrawMode, (val) => {
    if (!val) {
        isDrawing.value = false
        drawPoints.value = []
        isDrawingCircle.value = false
        circleCenter.value = null
        clearInteract(fullInteractRef.value)
    }
})

// ==================== 生命周期 ====================

onMounted(() => {
    nextTick(() => {
        initCanvas()
        resizeObs = new ResizeObserver(() => nextTick(initCanvas))
        if (wrapRef.value) resizeObs.observe(wrapRef.value)
    })
})

onUnmounted(() => {
    if (resizeObs) resizeObs.disconnect()
})
</script>

<style scoped>
.map-canvas-wrap {
    position: relative;
    width: 100%;
    height: 240px;
    border-radius: 20px 20px 0 0;
    overflow: hidden;
    background: #FFF8FA;
}

.map-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.grid-layer {
    z-index: 1;
}

.path-layer {
    z-index: 2;
}

.interact-layer {
    z-index: 3;
    cursor: default;
}

.pins-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 4;
    pointer-events: none;
}

.map-pin {
    position: absolute;
    transform: translate(-50%, -100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    pointer-events: all;
    cursor: pointer;
    user-select: none;
    transition: transform 0.15s;
}

.map-pin.dragging {
    cursor: grabbing;
    z-index: 10;
    transform: translate(-50%, -100%) scale(1.15);
}

.map-pin.active .pin-icon {
    filter: drop-shadow(0 0 6px rgba(217, 163, 175, 0.9));
    transform: scale(1.1);
}

.pin-icon {
    font-size: 22px;
    line-height: 1;
    display: block;
}

.pin-label {
    font-size: 10px;
    color: #4A3F41;
    background: rgba(255, 255, 255, 0.92);
    padding: 2px 7px;
    border-radius: 8px;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.map-pin.active .pin-label {
    background: rgba(217, 163, 175, 0.92);
    color: white;
}

.path-labels-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 3;
    pointer-events: none;
}

.path-label {
    position: absolute;
    transform: translate(-50%, -50%);
    font-size: 10px;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.85);
    padding: 2px 8px;
    border-radius: 8px;
    white-space: nowrap;
    letter-spacing: 0.5px;
    pointer-events: none;
}

.map-hint {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    color: #B8A9AC;
    background: rgba(255, 255, 255, 0.85);
    padding: 4px 12px;
    border-radius: 12px;
    z-index: 5;
    pointer-events: none;
    white-space: nowrap;
    backdrop-filter: blur(4px);
}

.map-hint.placing {
    color: #D9A3AF;
    background: rgba(255, 233, 237, 0.92);
}

.map-hint.drawing {
    color: #6BA8C8;
    background: rgba(210, 235, 255, 0.92);
}

.expand-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.85);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
    backdrop-filter: blur(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.expand-btn svg {
    width: 16px;
    height: 16px;
    stroke: #D9A3AF;
}

/* 全屏模式 */
.map-fullscreen-overlay {
    position: fixed;
    inset: 0;
    z-index: 500;
    background: #FFF8FA;
    display: flex;
    flex-direction: column;
    padding-top: env(safe-area-inset-top, 44px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
}

.map-fullscreen-wrap {
    position: relative;
    flex: 1;
    width: 100%;
    overflow: hidden;
}

.full-toolbar {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-radius: 20px;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.18);
    border: 1px solid rgba(255, 240, 242, 0.5);
    z-index: 6;
    white-space: nowrap;
}

.tool-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 7px 14px;
    border-radius: 14px;
    border: 1px solid rgba(217, 163, 175, 0.2);
    background: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    color: #B8A9AC;
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
    transition: all 0.2s;
    flex-shrink: 0;
}

.tool-btn svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
}

.tool-btn.active {
    background: rgba(217, 163, 175, 0.15);
    color: #D9A3AF;
    border-color: rgba(217, 163, 175, 0.4);
}

.tool-btn.accent {
    background: linear-gradient(135deg, rgba(232, 192, 201, 0.3), rgba(217, 163, 175, 0.3));
    color: #D9A3AF;
    border-color: rgba(217, 163, 175, 0.3);
}

.fullscreen-close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(217, 163, 175, 0.2);
    font-size: 13px;
    color: #D9A3AF;
    cursor: pointer;
    font-family: inherit;
    z-index: 10;
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 12px rgba(217, 163, 175, 0.15);
}

.fullscreen-close-btn svg {
    width: 16px;
    height: 16px;
    stroke: #D9A3AF;
}
</style>
