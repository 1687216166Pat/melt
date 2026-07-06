<template>
    <div class="home-screen">
        <!-- V8 氛围氛围色块 (置于底层) -->
        <div class="blob blob-tl"></div>
        <div class="blob blob-br"></div>
        <div class="blob blob-mid"></div>
        <div class="blob blob-tr"></div>

        <!-- 红线二：动态岛（100% 恢复您的设计与尺寸） -->
        <div class="dynamic-island"></div>

        <!-- V8 三页平移主容器 -->
        <div class="pages-wrapper" id="pagesWrapper" @mousedown="handleMouseDown" @mousemove="handleMouseMove"
            @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
            <div class="pages-inner" :style="{ transform: `translateX(-${currentPage * 33.333}%)` }">

                <!-- 【第一页：共栖空间】 -->
                <div class="page-panel together-page">

                    <!-- 顶部标题 -->
                    <div class="together-header">
                        <div class="together-title-wrap">
                            <svg class="together-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="1.5" stroke-linecap="round">
                                <path d="M12 21c-4.5-4-9-7.5-9-12a9 9 0 0 1 18 0c0 4.5-4.5 8-9 12z" />
                                <circle cx="12" cy="9" r="2.5" />
                            </svg>
                            <span class="together-title">共栖</span>
                            <span class="together-subtitle">Habitat</span>
                        </div>
                        <div class="together-days-badge" @click="showDaysEdit = true">
                            {{ togetherDays }} 天
                        </div>
                    </div>

                    <!-- 情侣卡片 -->
                    <div class="couple-card" @click="openCoupleEdit">
                        <!-- 底层背景 -->
                        <div class="couple-bg">
                            <img v-if="coupleBgImage" :src="coupleBgImage" class="couple-bg-img" />
                            <div v-else class="couple-bg-default">
                                <div class="couple-bg-blob b1"></div>
                                <div class="couple-bg-blob b2"></div>
                                <div class="couple-bg-grid"></div>
                            </div>
                        </div>

                        <!-- 前卡磨砂夹层 -->
                        <div class="couple-front">
                            <!-- 头像区 -->
                            <div class="couple-avatars">
                                <div class="couple-avatar-wrap" @click.stop="openUserEdit">
                                    <div class="couple-avatar ca-user">
                                        <img v-if="userAvatar && (userAvatar.startsWith('http') || userAvatar.startsWith('data'))"
                                            :src="userAvatar" />
                                        <span v-else>{{ userAvatar || '🌙' }}</span>
                                    </div>
                                </div>
                                <div class="couple-heart-mid">
                                    <svg viewBox="0 0 24 24" fill="#E8C0C9"
                                        filter="drop-shadow(0 2px 6px rgba(232,192,201,0.5))">
                                        <path
                                            d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.335 4.08 1 7.5 1c1.8 0 3.5.754 4.5 2 1-1.246 2.7-2 4.5-2C19.92 1 23 3.335 23 7.191c0 4.105-5.37 8.863-11 14.402z" />
                                    </svg>
                                </div>
                                <div class="couple-avatar-wrap" @click.stop="showCharSwitch = true">
                                    <div class="couple-avatar ca-char">
                                        <img v-if="currentAi.avatarUrl" :src="currentAi.avatarUrl" />
                                        <span v-else>{{ currentAi.avatar || '💬' }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- 文案区 -->
                            <div class="couple-texts">
                                <div class="couple-text-main" @click.stop="startEditText('main')"
                                    v-if="!editingTextField || editingTextField !== 'main'">
                                    {{ coupleTextMain || `${userName || '我'} · ${currentAi.note || currentAi.name}` }}
                                </div>
                                <input v-else class="couple-text-input couple-text-input-main"
                                    v-model="editingTextValue" @blur="saveTextEdit('main')"
                                    @keyup.enter="saveTextEdit('main')" autofocus />

                                <div class="couple-text-days" @click.stop="startEditText('days')"
                                    v-if="!editingTextField || editingTextField !== 'days'">
                                    {{ coupleTextDays || `相遇以来的第 ${togetherDays} 天` }}
                                </div>
                                <input v-else class="couple-text-input couple-text-input-days"
                                    v-model="editingTextValue" @blur="saveTextEdit('days')"
                                    @keyup.enter="saveTextEdit('days')" autofocus />

                                <div class="couple-text-tagline" @click.stop="startEditText('tagline')"
                                    v-if="!editingTextField || editingTextField !== 'tagline'">
                                    {{ coupleTagline }}
                                </div>
                                <input v-else class="couple-text-input couple-text-input-tagline"
                                    v-model="editingTextValue" @blur="saveTextEdit('tagline')"
                                    @keyup.enter="saveTextEdit('tagline')" autofocus />
                            </div>
                        </div>
                    </div>

                    <!-- 情侣卡片编辑弹窗 -->
                    <BlurModal :visible="showCoupleEdit" @close="showCoupleEdit = false">
                        <h3>编辑情侣卡片</h3>
                        <div class="couple-bg-upload">
                            <div class="couple-bg-preview">
                                <img v-if="coupleBgImage" :src="coupleBgImage" />
                                <span v-else>背景图片</span>
                            </div>
                            <div class="couple-upload-opts">
                                <DreamInput label="背景图 URL" v-model="editCoupleBg" placeholder="https://..." />
                                <div class="file-row">
                                    <span class="file-label">或上传图片</span>
                                    <label class="avatar-upload-btn">
                                        选择文件
                                        <input type="file" accept="image/*" style="display:none"
                                            @change="handleCoupleBgUpload" />
                                    </label>
                                </div>
                                <button v-if="coupleBgImage" class="couple-clear-btn"
                                    @click="clearCoupleBg">清除背景</button>
                            </div>
                        </div>
                        <DreamInput label="自定义短句" v-model="editTagline" placeholder="你走的每一步，我都在" />
                        <div class="modal-actions">
                            <SoftButton variant="secondary" @click="showCoupleEdit = false">取消</SoftButton>
                            <SoftButton variant="primary" @click="saveCoupleEdit">保存</SoftButton>
                        </div>
                    </BlurModal>

                    <!-- 关系数据横滑 -->
                    <div class="relation-slider">
                        <div class="relation-card rc-days">
                            <span class="rc-label">在一起</span>
                            <div class="rc-value">{{ togetherDays }}</div>
                            <span class="rc-unit">天</span>
                        </div>
                        <div class="relation-card rc-msg">
                            <span class="rc-label">消息总数</span>
                            <div class="rc-value">{{ totalMessages !== null ? totalMessages : '—' }}</div>
                            <span class="rc-unit">条对话</span>
                        </div>
                        <div class="relation-card rc-streak">
                            <span class="rc-label">连续聊天</span>
                            <div class="rc-value">{{ streak !== null ? streak : '—' }}</div>
                            <span class="rc-unit">天</span>
                        </div>
                        <div class="relation-card rc-mood">
                            <span class="rc-label">今日状态</span>
                            <div class="rc-value rc-emoji">{{ todayDayStatus?.emoji || '✿' }}</div>
                            <span class="rc-unit">{{ todayDayStatus?.label || '平静' }}</span>
                        </div>
                    </div>

                    <!-- 收藏入口 -->
                    <div class="section-label">✦ 收藏</div>
                    <div class="bookmark-entry" @click="showBookmarks = true">
                        <div class="bm-icons">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#D9A3AF" stroke-width="1.6"
                                stroke-linecap="round">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#98CBEA" stroke-width="1.6"
                                stroke-linecap="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <path d="M21 15l-5-5L5 21" />
                            </svg>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#D8CDEA" stroke-width="1.6"
                                stroke-linecap="round">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                        </div>
                        <div class="bm-text">
                            <span class="bm-title">收藏记录</span>
                            <span class="bm-sub">聊天、图片、语音</span>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#D4C8CA" stroke-width="2" stroke-linecap="round"
                            class="bm-arrow">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>

                    <!-- 日历区域 -->
                    <div class="calendar-section">
                        <!-- 右上角切换按钮 -->
                        <div class="section-label-row">
                            <span class="section-label" style="margin:0;">✦ 日历</span>
                            <button class="schedule-view-btn" @click="showScheduleView = true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                                    stroke-linecap="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" />
                                    <path d="M16 2v4M8 2v4M3 10h18" />
                                    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
                                </svg>
                                日程
                            </button>
                        </div>

                        <!-- 日历卡片 -->
                        <div class="calendar-card">
                            <div class="cal-header">
                                <button class="cal-nav" @click="prevMonth">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round">
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </button>
                                <span class="cal-title">{{ calYear }}年 {{ calMonth + 1 }}月</span>
                                <button class="cal-nav" @click="nextMonth">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </button>
                            </div>
                            <div class="cal-weekdays">
                                <span v-for="d in ['日', '一', '二', '三', '四', '五', '六']" :key="d">{{ d }}</span>
                            </div>
                            <div class="cal-grid">
                                <div v-for="(day, idx) in calDays" :key="idx" class="cal-day" :class="{
                                    'cal-empty': !day,
                                    'cal-today': day && isToday(day),
                                    'cal-has-event': day && (getDayEvents(day, 'user').length > 0 || getDayEvents(day, 'char').length > 0),
                                    'cal-period': day && isPeriodDay(day)
                                }" @click="day && selectDay(day)">
                                    <span v-if="day">{{ day }}</span>
                                    <div v-if="day && getDayStatusForGrid(day)" class="cal-status-dot"
                                        :style="{ background: getDayStatusForGrid(day).color }"></div>
                                </div>
                            </div>
                            <!-- 状态图例 + 统计 -->
                            <div class="cal-legend">
                                <div v-for="s in calMonthStats" :key="s.key" class="cal-legend-item">
                                    <div class="cal-legend-dot" :style="{ background: s.color }"></div>
                                    <span class="cal-legend-emoji">{{ s.emoji }}</span>
                                    <span class="cal-legend-count">{{ s.count }}</span>
                                </div>
                                <div v-if="calPeriodCount > 0" class="cal-legend-item">
                                    <div class="cal-legend-dot" style="background: rgba(232,192,201,0.6)"></div>
                                    <span class="cal-legend-emoji">🌸</span>
                                    <span class="cal-legend-count">{{ calPeriodCount }}</span>
                                </div>
                                <div v-if="calEventCount > 0" class="cal-legend-item">
                                    <div class="cal-legend-dot" style="background: #D9A3AF"></div>
                                    <span class="cal-legend-emoji">📅</span>
                                    <span class="cal-legend-count">{{ calEventCount }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 日程视图弹窗 -->
                    <div v-if="showScheduleView" class="schedule-overlay" @click.self="showScheduleView = false">
                        <div class="schedule-panel">
                            <!-- 头部 -->
                            <div class="schedule-header">
                                <div class="schedule-range-tabs">
                                    <button class="sr-tab" :class="{ active: scheduleRange === 1 }"
                                        @click="scheduleRange = 1">今天</button>
                                    <button class="sr-tab" :class="{ active: scheduleRange === 7 }"
                                        @click="scheduleRange = 7">7天</button>
                                    <button class="sr-tab" :class="{ active: scheduleRange === 30 }"
                                        @click="scheduleRange = 30">30天</button>
                                </div>
                                <button class="schedule-close" @click="showScheduleView = false">×</button>
                            </div>

                            <!-- 双栏标题 -->
                            <div class="schedule-cols-header">
                                <div class="sch-col-title">
                                    <div class="sch-col-avatar ca-user-sm">
                                        <img v-if="userAvatar && (userAvatar.startsWith('http') || userAvatar.startsWith('data'))"
                                            :src="userAvatar" />
                                        <span v-else>{{ userAvatar || '🌙' }}</span>
                                    </div>
                                    <span>{{ userName || '我' }}</span>
                                </div>
                                <div class="sch-col-divider"></div>
                                <div class="sch-col-title">
                                    <div class="sch-col-avatar ca-char-sm">
                                        <img v-if="currentAi.avatarUrl" :src="currentAi.avatarUrl" />
                                        <span v-else>{{ currentAi.avatar || '💬' }}</span>
                                    </div>
                                    <span>{{ currentAi.note || currentAi.name }}</span>
                                </div>
                            </div>

                            <!-- 内容区 -->
                            <div class="schedule-content">
                                <!-- 1天：时间轴视图 -->
                                <template v-if="scheduleRange === 1">
                                    <div class="schedule-timeline-wrap">
                                        <!-- 左：user -->
                                        <div class="sch-timeline-col">
                                            <template v-if="getScheduleData(1, 'user').length > 0">
                                                <div v-for="(item, idx) in getScheduleData(1, 'user')" :key="idx"
                                                    class="sch-tl-item">
                                                    <div class="sch-tl-dot"></div>
                                                    <div class="sch-tl-card">{{ item.text }}</div>
                                                </div>
                                            </template>
                                            <div v-else class="sch-empty">今天暂无日程</div>
                                        </div>
                                        <!-- 中间轴 -->
                                        <div class="sch-center-axis">
                                            <div class="sch-axis-line"></div>
                                            <div class="sch-axis-date">今天</div>
                                        </div>
                                        <!-- 右：char -->
                                        <div class="sch-timeline-col sch-col-right">
                                            <template v-if="getScheduleData(1, 'char').length > 0">
                                                <div v-for="(item, idx) in getScheduleData(1, 'char')" :key="idx"
                                                    class="sch-tl-item sch-tl-right">
                                                    <div class="sch-tl-card">{{ item.text }}</div>
                                                    <div class="sch-tl-dot sch-dot-char"></div>
                                                </div>
                                            </template>
                                            <div v-else class="sch-empty">今天暂无日程</div>
                                        </div>
                                    </div>
                                </template>

                                <!-- 7天/30天：分组列表 -->
                                <template v-else>
                                    <div class="schedule-list-wrap">
                                        <!-- 左：user -->
                                        <div class="sch-list-col">
                                            <template v-if="getScheduleData(scheduleRange, 'user').length > 0">
                                                <div v-for="group in groupScheduleByDate(getScheduleData(scheduleRange, 'user'))"
                                                    :key="group.date" class="sch-date-group">
                                                    <div class="sch-date-label">{{ group.label }}</div>
                                                    <div v-for="(item, idx) in group.items" :key="idx"
                                                        class="sch-list-item">
                                                        <div class="sch-list-dot"></div>
                                                        <span>{{ item.text }}</span>
                                                    </div>
                                                </div>
                                            </template>
                                            <div v-else class="sch-empty">暂无日程</div>
                                        </div>
                                        <!-- 分隔 -->
                                        <div class="sch-list-divider"></div>
                                        <!-- 右：char -->
                                        <div class="sch-list-col">
                                            <template v-if="getScheduleData(scheduleRange, 'char').length > 0">
                                                <div v-for="group in groupScheduleByDate(getScheduleData(scheduleRange, 'char'))"
                                                    :key="group.date" class="sch-date-group">
                                                    <div class="sch-date-label">{{ group.label }}</div>
                                                    <div v-for="(item, idx) in group.items" :key="idx"
                                                        class="sch-list-item sch-list-item-char">
                                                        <div class="sch-list-dot sch-dot-char"></div>
                                                        <span>{{ item.text }}</span>
                                                    </div>
                                                </div>
                                            </template>
                                            <div v-else class="sch-empty">暂无日程</div>
                                        </div>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </div>

                    <!-- AI 画像洞察时间线 -->
                    <div class="section-label" style="margin-top:16px;">
                        ✦ 他了解你的
                        <button class="section-add-btn" @click="showAddInsight = true">+ 手动添加</button>
                    </div>
                    <div class="insights-wrap">
                        <div v-if="personaInsights.length === 0" class="insights-empty">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#D4C8CA" stroke-width="1.2"
                                stroke-linecap="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v4l3 3" />
                            </svg>
                            <p>还没有记录</p>
                            <p>聊得越多，他越了解你</p>
                        </div>
                        <div v-else class="insights-list">
                            <div v-for="(group, gkey) in groupedInsights" :key="gkey" class="insight-group">
                                <div class="insight-group-title">{{ gkey }}</div>
                                <div class="insight-item" v-for="(item, idx) in group" :key="idx"
                                    :style="{ animationDelay: idx * 0.05 + 's' }">
                                    <div class="insight-dot"></div>
                                    <div class="insight-card">
                                        <p v-if="editingInsightId !== item.id" class="insight-text">{{ item.content }}
                                        </p>
                                        <textarea v-else v-model="editingInsightText"
                                            class="insight-edit-input"></textarea>
                                        <div class="insight-actions">
                                            <span class="insight-date">{{ formatInsightDate(item.created_at) }}</span>
                                            <div class="insight-btns">
                                                <button v-if="editingInsightId !== item.id" class="insight-btn"
                                                    @click="startEditInsight(item)">编辑</button>
                                                <button v-else class="insight-btn insight-btn-save"
                                                    @click="saveEditInsight(item)">保存</button>
                                                <button class="insight-btn insight-btn-del"
                                                    @click="deleteInsight(item.id)">删除</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 时间轨迹 -->
                    <div class="section-label" style="margin-top:16px;">✦ 时间轨迹</div>
                    <div class="timeline-wrap">
                        <div v-if="timelineEvents.length === 0" class="timeline-empty">
                            <div style="font-size:11px;color:red;">{{ timelineEvents.length }}</div>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#D4C8CA" stroke-width="1.2"
                                stroke-linecap="round">
                                <path
                                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <p>还没有时间轴记录</p>
                            <p>每次聊天都会自动留下痕迹</p>
                        </div>
                        <div class="timeline-list" v-else>
                            <div class="timeline-item" v-for="(event, idx) in timelineEvents" :key="idx"
                                :style="{ animationDelay: idx * 0.06 + 's' }">
                                <div class="tl-dot"></div>
                                <div class="tl-content">
                                    <span class="tl-date">{{ event.period }}</span>
                                    <p v-if="editingTimelineId !== event.id" class="tl-text">{{ event.content }}</p>
                                    <textarea v-else v-model="editingTimelineText" class="tl-edit-input"></textarea>
                                    <div class="tl-actions">
                                        <button v-if="editingTimelineId !== event.id" class="tl-btn"
                                            @click="startEditTimeline(event)">编辑</button>
                                        <button v-else class="tl-btn tl-btn-save"
                                            @click="saveEditTimeline(event)">保存</button>
                                        <button class="tl-btn tl-btn-del"
                                            @click="deleteTimelineEvent(event.id)">删除</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button class="timeline-add-btn" @click="showTimelineAdd = true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v8M8 12h8" />
                            </svg>
                            添加记录
                        </button>
                        <BlurModal :visible="showAddInsight" @close="showAddInsight = false">
                            <h3>手动添加洞察</h3>
                            <DreamInput type="textarea" v-model="newInsightText" :rows="3"
                                placeholder="他了解的一件关于你的事..." />
                            <div class="modal-actions">
                                <SoftButton variant="secondary" @click="showAddInsight = false">取消</SoftButton>
                                <SoftButton variant="primary" @click="addInsight">保存</SoftButton>
                            </div>
                        </BlurModal>
                    </div>

                    <!-- 收藏弹窗 -->
                    <BlurModal :visible="showBookmarks" @close="showBookmarks = false">
                        <h3>收藏记录</h3>
                        <div v-if="bookmarks.length === 0"
                            style="text-align:center;color:#B8A9AC;padding:20px;font-size:13px;">
                            还没有收藏，在聊天中长按消息可以收藏
                        </div>
                        <div v-else class="bookmark-list">
                            <div v-for="(bm, idx) in bookmarks" :key="idx" class="bookmark-item">
                                <span class="bm-type-tag">{{ bm.type === 'message' ? '消息' : bm.type }}</span>
                                <p class="bm-content">{{ bm.content }}</p>
                                <span class="bm-time">{{ bm.created_at?.slice(0, 10) }}</span>
                            </div>
                        </div>
                    </BlurModal>

                    <!-- 添加时间轴弹窗 -->
                    <BlurModal :visible="showTimelineAdd" @close="showTimelineAdd = false">
                        <h3>添加时间轨迹</h3>
                        <DreamInput label="记录内容" v-model="newTimelineText" placeholder="发生了什么..." />
                        <DreamInput label="时间标记" v-model="newTimelinePeriod" placeholder="例：2024年春天" />
                        <div class="modal-actions">
                            <SoftButton variant="secondary" @click="showTimelineAdd = false">取消</SoftButton>
                            <SoftButton variant="primary" @click="addTimelineEvent">保存</SoftButton>
                        </div>
                    </BlurModal>

                    <!-- user 编辑弹窗 -->
                    <BlurModal :visible="showUserEdit" @close="showUserEdit = false">
                        <h3>编辑我的信息</h3>
                        <DreamInput label="备注名" v-model="editUserName" placeholder="你的名字..." />

                        <div class="avatar-edit-section">
                            <div class="avatar-preview">
                                <img v-if="editUserAvatar && editUserAvatar.startsWith('http')" :src="editUserAvatar" />
                                <span v-else-if="editUserAvatar">{{ editUserAvatar }}</span>
                                <span v-else>🌙</span>
                            </div>
                            <div class="avatar-options">
                                <!-- URL 输入 -->
                                <DreamInput label="图片 URL" v-model="editUserAvatar" placeholder="https://..." />
                                <!-- 文件上传 -->
                                <div class="avatar-upload-row">
                                    <span class="avatar-upload-label">或者上传图片</span>
                                    <label class="avatar-upload-btn">
                                        选择文件
                                        <input type="file" accept="image/*" style="display:none"
                                            @change="handleUserAvatarUpload" />
                                    </label>
                                </div>
                                <!-- emoji 输入 -->
                                <DreamInput label="或者用 emoji" v-model="editUserAvatarEmoji" placeholder="🌙" />
                            </div>
                        </div>

                        <div class="modal-actions">
                            <SoftButton variant="secondary" @click="showUserEdit = false">取消</SoftButton>
                            <SoftButton variant="primary" @click="saveUserEdit">保存</SoftButton>
                        </div>
                    </BlurModal>

                    <!-- 换 char 弹窗 -->
                    <BlurModal :visible="showCharSwitch" @close="showCharSwitch = false">
                        <h3>切换共栖伙伴</h3>
                        <div class="char-switch-list">
                            <div v-for="p in allPersonas" :key="p.id" class="char-switch-item"
                                :class="{ active: p.id === currentAi.personaId }" @click="switchChar(p)">
                                <div class="cs-avatar">
                                    <img v-if="p.avatarUrl" :src="p.avatarUrl" />
                                    <span v-else>{{ p.avatar || '💬' }}</span>
                                </div>
                                <div class="cs-info">
                                    <span class="cs-name">{{ p.note || p.name }}</span>
                                    <span class="cs-desc">{{ p.description || '' }}</span>
                                </div>
                                <div v-if="p.id === currentAi.personaId" class="cs-check">✓</div>
                            </div>
                        </div>
                    </BlurModal>

                </div>

                <!-- 【第二页：小窝主页】 -->
                <div class="page-panel home-main-page">

                    <!-- Hero大卡片：独立聚焦 -->
                    <div class="hero-card-v8 focusable-card" @click="showDaysEdit = true">
                        <div class="hero-texture"></div>
                        <div class="hero-tag-v8">纪念日</div>
                        <div class="hero-main-content">
                            <div class="hero-daisy-icon">
                                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <circle cx="16" cy="16" r="4" />
                                    <path
                                        d="M16 4v4m0 16v4M4 16h4m16 0h4m-18.4-8.5l2.8 2.8m11.2 11.4l2.8 2.8m0-17l-2.8 2.8M7.6 24.4l-2.8 2.8" />
                                </svg>
                            </div>
                            <div class="hero-number-wrap">
                                <span class="hero-num">{{ togetherDays }}</span>
                                <span class="hero-unit">天 ✿</span>
                            </div>
                        </div>
                        <div class="hero-label-bottom">在一起的每一天都值得珍藏 ✿</div>
                    </div>

                    <!-- 横滑信息条：每张卡片独立聚焦 -->
                    <div class="section-label">✦ 今日概览</div>
                    <div class="overview-slider">
                        <div class="slider-card-v8 countdown focusable-card">
                            <span class="s-title">纪念日倒计时</span>
                            <div class="s-value">45</div>
                            <span class="s-sub">距离下一个纪念日</span>
                        </div>
                        <div class="slider-card-v8 stats-card focusable-card" @click="toggleChatStatLocal">
                            <span class="s-title">聊天统计</span>
                            <div class="s-value">{{ chatStatDisplay.v }}</div>
                            <span class="s-sub">{{ chatStatDisplay.l }}</span>
                            <div class="s-dots">
                                <i :class="{ active: chatStatMode === 0 }"></i>
                                <i :class="{ active: chatStatMode === 1 }"></i>
                                <i :class="{ active: chatStatMode === 2 }"></i>
                            </div>
                        </div>
                        <div class="slider-card-v8 tokens focusable-card">
                            <span class="s-title">本月 Tokens</span>
                            <div class="token-ring-wrap">
                                <div class="token-ring">60%</div>
                                <span class="token-text">聊了不少呢～</span>
                            </div>
                        </div>
                    </div>

                    <!-- Bento：每个子卡片独立聚焦 -->
                    <div class="bento-container-v8">
                        <div class="bento-item bento-note focusable-card" @click="showCardEditor = true">
                            <div class="bento-header">✦ 今日小纸条</div>
                            <div class="bento-quote">{{ todayCard }}</div>
                            <div class="bento-note-footer">
                                <span>{{ currentAi.note || currentAi.name }}今天选了这张 · 🍵</span>
                                <span class="bento-tag">第{{ cards.length }}张</span>
                            </div>
                        </div>
                        <div class="bento-item bento-about bg-gauze focusable-card" @click="$router.push('/about')">
                            <div class="b-icon">
                                <img v-if="customIcons.about" :src="customIcons.about" class="custom-icon-bento" />
                                <svg v-else viewBox="0 0 24 24" fill="none" stroke="#D9A3AF" stroke-width="1.8"
                                    stroke-linecap="round">
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                                </svg>
                            </div>
                            <span class="b-label">关于他</span>
                        </div>

                        <!-- Bento 手记卡片改成语料库 -->
                        <div class="bento-item bento-logs bg-mist focusable-card" @click="$router.push('/logs')">
                            <div class="b-icon">
                                <img v-if="customIcons.logs" :src="customIcons.logs" class="custom-icon-bento" />
                                <svg v-else viewBox="0 0 24 24" fill="none" stroke="#B8A8C8" stroke-width="1.8"
                                    stroke-linecap="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <path d="M7 8h10M7 12h10M7 16h6" />
                                </svg>
                            </div>
                            <span class="b-label">语料库</span>
                        </div>

                        <div class="bento-item bento-beauty bg-apricot focusable-card"
                            @click="$router.push('/customize')">
                            <div class="b-icon">
                                <img v-if="customIcons.customize" :src="customIcons.customize"
                                    class="custom-icon-bento" />
                                <svg v-else viewBox="0 0 24 24" fill="none" stroke="#D4B896" stroke-width="1.8"
                                    stroke-linecap="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path
                                        d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                                </svg>
                            </div>
                            <span class="b-label">美化</span>
                        </div>
                        <div class="bento-item bento-memory bg-rose-light focusable-card"
                            @click="$router.push('/memory')">
                            <div class="b-icon">
                                <img v-if="customIcons.brain" :src="customIcons.brain" class="custom-icon-bento" />
                                <svg v-else viewBox="0 0 24 24" fill="none" stroke="#E8C0C9" stroke-width="1.8"
                                    stroke-linecap="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <path d="M3 9h18M9 21V9" />
                                </svg>
                            </div>
                            <span class="b-label">记忆库</span>
                        </div>
                    </div>

                    <!-- 次级图标条：每个胶囊独立聚焦 -->
                    <div class="secondary-bar-v8" style="position: relative; overflow: visible;">
                        <div class="sec-item focusable-card" @click="$router.push('/worldbook')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                                stroke-linecap="round">
                                <circle cx="12" cy="12" r="8" />
                                <path d="M12 4c2 2 3.5 5 3.5 8s-1.5 6-3.5 8" />
                                <path d="M12 4c-2 2-3.5 5-3.5 8s1.5 6 3.5 8" />
                                <path d="M4 12h16" />
                            </svg>
                            <span>世界书</span>
                        </div>
                        <div class="sec-item focusable-card" @click="$router.push('/diary')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                                stroke-linecap="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                            <span>日记</span>
                        </div>
                        <div class="sec-item focusable-card" @click="$router.push('/presence')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                                stroke-linecap="round">
                                <circle cx="9" cy="7" r="3" />
                                <circle cx="15" cy="7" r="3" />
                                <path d="M3 20c0-3 2.7-5 6-5h6c3.3 0 6 2 6 5" />
                            </svg>
                            <span>相遇</span>
                        </div>
                        <div class="sec-item focusable-card" @click="$router.push('/settings')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                                stroke-linecap="round">
                                <circle cx="12" cy="12" r="3" />
                                <path
                                    d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
                            </svg>
                            <span>设置</span>
                        </div>

                        <!-- 更多按钮：只有加号图标，无文字 -->
                        <div class="sec-item sec-more focusable-card" @click.stop="showMoreApps = !showMoreApps">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                                stroke-linecap="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v8M8 12h8" />
                            </svg>
                        </div>

                        <!-- 遮罩 -->
                        <div v-if="showMoreApps" class="more-apps-overlay" @click="showMoreApps = false"></div>

                        <!-- 更多卡片 -->
                        <Transition name="more-pop">
                            <div v-if="showMoreApps" class="more-apps-card">
                                <div class="more-apps-row">
                                    <div class="sec-item more-app-sec"
                                        @click="$router.push('/about'); showMoreApps = false">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                                            stroke-linecap="round">
                                            <circle cx="12" cy="8" r="4" />
                                            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                                        </svg>
                                        <span>镜中</span>
                                    </div>
                                    <div class="sec-item more-app-sec" @click="openPhone(); showMoreApps = false">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                                            stroke-linecap="round">
                                            <path
                                                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                        </svg>
                                        <span>电话</span>
                                    </div>
                                    <div class="sec-item more-app-sec"
                                        @click="$router.push('/memory'); showMoreApps = false">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                                            stroke-linecap="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                            <path d="M3 9h18M9 21V9" />
                                        </svg>
                                        <span>记忆</span>
                                    </div>
                                    <div class="sec-item more-app-sec"
                                        @click="$router.push('/logs'); showMoreApps = false">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                                            stroke-linecap="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                            <path d="M7 8h10M7 12h10M7 16h6" />
                                        </svg>
                                        <span>语料库</span>
                                    </div>
                                </div>
                            </div>
                        </Transition>
                    </div>

                    <!-- 聊天预览条：独立聚焦 -->
                    <div class="chat-preview-v8 focusable-card" @click="openChat">
                        <div class="p-avatar">
                            <img v-if="currentAi.avatarUrl" :src="currentAi.avatarUrl" />
                            <span v-else>💬</span>
                        </div>
                        <div class="p-content">
                            <span class="p-name">{{ currentAi.name }}</span>
                            <span class="p-msg">{{ leftBubbleText }}</span>
                        </div>
                        <span class="p-time">刚刚</span>
                    </div>
                </div>

                <!-- 【第三页：共语列表】 -->
                <div class="page-panel chat-list-page">

                    <!-- 1. 顶部图标 + Echoes 文案 -->
                    <div class="echoes-header">
                        <div class="echoes-icon-wrap">
                            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4"
                                stroke-linecap="round">
                                <path d="M6 10c0-3.3 2.7-6 6-6s6 2.7 6 6c0 4-6 10-6 10S6 14 6 10z" />
                                <circle cx="12" cy="10" r="2" />
                                <path d="M20 14c0-2.2 1.8-4 4-4s4 1.8 4 4c0 2.8-4 7-4 7s-4-4.2-4-7z" />
                                <circle cx="24" cy="14" r="1.5" />
                            </svg>
                        </div>
                        <div class="echoes-title-wrap">
                            <span class="echoes-title">共语</span>
                            <span class="echoes-sub">Echoes</span>
                        </div>
                        <div class="echoes-header-right">
                            <div class="echoes-count">{{ allPersonas.length }}</div>
                            <button class="cl-add-btn" @click="showAddPersonaModal = true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                    stroke-linecap="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 8v8M8 12h8" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- 2. 搜索栏 -->
                    <div class="chat-search-v8">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <circle cx="11" cy="11" r="6" />
                            <path d="M20 20l-3-3" />
                        </svg>
                        <input v-model="chatSearchQuery" type="text" placeholder="搜索对话..." />
                    </div>

                    <!-- 3. 连接卡片：user ←→ char -->
                    <div class="echoes-connect-card">
                        <!-- user 侧 -->
                        <div class="ec-side ec-user" @click="openUserEdit">
                            <div class="ec-avatar ec-avatar-user">
                                <img v-if="userAvatar && userAvatar.startsWith('http')" :src="userAvatar" />
                                <img v-else-if="userAvatar && userAvatar.startsWith('data')" :src="userAvatar" />
                                <span v-else>{{ userAvatar || '🌙' }}</span>
                            </div>
                            <span class="ec-name">{{ userName || '我' }}</span>
                            <span class="ec-hint">点击编辑</span>
                        </div>

                        <!-- 中间心率线 + 爱心 -->
                        <div class="ec-line-wrap" @click="showCharSwitch = true">
                            <svg class="ec-line-svg" viewBox="0 0 100 36" fill="none" preserveAspectRatio="none">
                                <path class="ec-path"
                                    d="M0 18 L16 18 L22 6 L28 30 L34 2 L40 34 L46 18 L60 18 L80 18 L100 18"
                                    stroke="url(#ecGrad)" stroke-width="1.8" stroke-linecap="round"
                                    stroke-linejoin="round" />
                                <defs>
                                    <linearGradient id="ecGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stop-color="#E8C0C9" stop-opacity="0.3" />
                                        <stop offset="40%" stop-color="#E8C0C9" />
                                        <stop offset="60%" stop-color="#D9A3AF" />
                                        <stop offset="100%" stop-color="#D8CDEA" stop-opacity="0.3" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div class="ec-heart">
                                <svg viewBox="0 0 24 24" fill="#E8C0C9">
                                    <path
                                        d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.335 4.08 1 7.5 1c1.8 0 3.5.754 4.5 2 1-1.246 2.7-2 4.5-2C19.92 1 23 3.335 23 7.191c0 4.105-5.37 8.863-11 14.402z" />
                                </svg>
                            </div>
                            <span class="ec-switch-hint">换一个</span>
                        </div>

                        <!-- char 侧 -->
                        <div class="ec-side ec-char">
                            <div class="ec-avatar ec-avatar-char">
                                <img v-if="currentAi.avatarUrl" :src="currentAi.avatarUrl" />
                                <span v-else>{{ currentAi.avatar || '💬' }}</span>
                            </div>
                            <span class="ec-name">{{ currentAi.note || currentAi.name }}</span>
                            <span class="ec-hint">当前伙伴</span>
                        </div>
                    </div>

                    <!-- 4. 分组 + 联系人列表 -->
                    <div class="echoes-group-tabs" v-if="contactGroups.length > 0">
                        <div class="eg-tab" :class="{ active: activeGroup === null }" @click="activeGroup = null">全部
                        </div>
                        <div class="eg-tab" v-for="g in contactGroups" :key="g.id"
                            :class="{ active: activeGroup === g.id }" @click="activeGroup = g.id">{{ g.name }}</div>
                    </div>

                    <div class="chat-conv-list" @click="hideContextMenu">
                        <div v-for="(p, idx) in filteredPersonas" :key="p.id" class="conv-item-v8"
                            :class="{ 'conv-pinned': p.pinned }" :style="{ animationDelay: idx * 0.06 + 's' }"
                            @click="router.push(`/chat/${p.id}`)" @contextmenu.prevent="showContextMenu($event, p)"
                            @touchstart="handleConvTouchStart($event, p)" @touchend="handleConvTouchEnd">

                            <div class="conv-avatar-v8 conv-avatar-glow">
                                <img v-if="p.avatarUrl" :src="p.avatarUrl" />
                                <span v-else>{{ p.avatar || '💬' }}</span>
                                <div class="conv-online-dot"></div>
                            </div>

                            <div class="conv-info-v8">
                                <div class="conv-name-row">
                                    <span class="conv-name">{{ p.note || p.name }}</span>
                                    <span class="conv-time-v8">{{ formatLastTime(p) }}</span>
                                </div>
                                <div class="conv-preview-v8">{{ p.lastMessage || '还没有对话...' }}</div>
                            </div>

                            <!-- 置顶标识 -->
                            <div v-if="p.pinned" class="conv-pin-badge">置顶</div>
                        </div>

                        <div v-if="filteredPersonas.length === 0" class="conv-empty">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#D4C8CA" stroke-width="1.2"
                                stroke-linecap="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <p>没有找到对话</p>
                        </div>
                    </div>

                    <!-- 长按菜单 -->
                    <Teleport to="body">
                        <div v-if="contextMenu.visible" class="ctx-overlay" @click="hideContextMenu">
                            <div class="ctx-menu" :style="{ top: ctxMenuPos.top, left: ctxMenuPos.left }">
                                <div class="ctx-persona-info">
                                    <div class="ctx-avatar">
                                        <img v-if="contextMenu.persona?.avatarUrl"
                                            :src="contextMenu.persona.avatarUrl" />
                                        <span v-else>{{ contextMenu.persona?.avatar || '💬' }}</span>
                                    </div>
                                    <span class="ctx-name">{{ contextMenu.persona?.note || contextMenu.persona?.name
                                        }}</span>
                                </div>
                                <div class="ctx-divider"></div>
                                <button class="ctx-item" @click="pinFromMenu(contextMenu.persona?.id)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round">
                                        <path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z" />
                                    </svg>
                                    {{ contextMenu.persona?.pinned ? '取消置顶' : '置顶' }}
                                </button>
                                <button class="ctx-item ctx-danger-light"
                                    @click="resetConversation(contextMenu.persona?.id)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round">
                                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                        <path d="M3 3v5h5" />
                                    </svg>
                                    重置对话
                                </button>
                                <button class="ctx-item ctx-danger-light"
                                    @click="deleteConversation(contextMenu.persona?.id)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6l-1 14H6L5 6" />
                                        <path d="M10 11v6M14 11v6" />
                                    </svg>
                                    删除对话
                                </button>
                                <button class="ctx-item ctx-danger" @click="deletePersona(contextMenu.persona?.id)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round">
                                        <circle cx="12" cy="8" r="4" />
                                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                                        <line x1="18" y1="4" x2="22" y2="8" />
                                        <line x1="22" y1="4" x2="18" y2="8" />
                                    </svg>
                                    删除角色
                                </button>
                            </div>
                        </div>
                    </Teleport>
                </div>
            </div>
        </div>

        <!-- 分页圆点 -->
        <div class="page-dots-v8">
            <span :class="{ active: currentPage === 0 }"></span>
            <span :class="{ active: currentPage === 1 }"></span>
            <span :class="{ active: currentPage === 2 }"></span>
        </div>

        <!-- 底部 Dock：100% 水平对齐与安全区适配 -->
        <!-- 底部悬浮 Dock -->
        <div class="dock-bar-v8">
            <div class="dock-item-v8" :class="{ active: currentPage === 0 }" @click="currentPage = 0">
                <div class="dock-icon-box">
                    <svg v-if="currentPage === 0" viewBox="0 0 24 24" fill="none" stroke="#D9A3AF" stroke-width="1.8"
                        stroke-linecap="round">
                        <path d="M12 21c-4.5-4-9-7.5-9-12a9 9 0 0 1 18 0c0 4.5-4.5 8-9 12z"
                            fill="rgba(217,163,175,0.15)" />
                        <circle cx="12" cy="9" r="2.5" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="#B8A9AC" stroke-width="1.8"
                        stroke-linecap="round">
                        <path d="M12 21c-4.5-4-9-7.5-9-12a9 9 0 0 1 18 0c0 4.5-4.5 8-9 12z" />
                        <circle cx="12" cy="9" r="2.5" />
                    </svg>
                </div>
                <span>共栖</span>
            </div>
            <div class="dock-item-v8" :class="{ active: currentPage === 1 }" @click="currentPage = 1">
                <div class="dock-icon-box">
                    <svg v-if="currentPage === 1" viewBox="0 0 24 24" fill="#D9A3AF">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" fill="white" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="#B8A9AC" stroke-width="1.8"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                </div>
                <span>小窝</span>
            </div>
            <div class="dock-item-v8" :class="{ active: currentPage === 2 }" @click="currentPage = 2">
                <div class="dock-icon-box">
                    <svg v-if="currentPage === 2" viewBox="0 0 24 24" fill="#D9A3AF">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="#B8A9AC" stroke-width="1.8"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </div>
                <span>共语</span>
            </div>
        </div>


        <!-- 复原：所有弹窗组件 -->
        <BlurModal :visible="showDaysEdit" @close="showDaysEdit = false">
            <h3>设置纪念日</h3>
            <DreamInput label="开始日期" type="date" v-model="startDate" />
            <div class="modal-actions">
                <SoftButton variant="secondary" @click="showDaysEdit = false">取消</SoftButton>
                <SoftButton variant="primary" @click="saveDaysDate">保存</SoftButton>
            </div>
        </BlurModal>
        <BlurModal :visible="showCardEditor" @close="showCardEditor = false">
            <h3>字卡管理</h3>
            <div class="card-input-row">
                <DreamInput type="textarea" v-model="newCard" :rows="3" placeholder="写字卡...用换行或 ；/ 分隔可批量添加" />
                <SoftButton variant="primary" size="sm" @click="addCard" :disabled="!newCard.trim()">添加</SoftButton>
            </div>
            <div class="card-list">
                <div v-for="(card, idx) in cards" :key="idx" class="card-item">
                    <span class="card-text">{{ card }}</span>
                    <button class="card-delete" @click="removeCard(idx)">×</button>
                </div>
            </div>
        </BlurModal>

        <!-- 日期弹窗：必须是 home-screen 的直接子元素，避免被 overflow:hidden 裁掉 -->
        <div v-if="selectedDay && showDayPanel" class="day-panel-overlay" @click.self="showDayPanel = false">
            <div class="day-panel">
                <div class="day-panel-header">
                    <span class="day-panel-date">{{ calYear }}年{{ calMonth + 1 }}月{{ selectedDay }}日</span>
                    <button class="day-panel-close" @click="showDayPanel = false">×</button>
                </div>

                <!-- 视角切换 -->
                <div class="dp-view-tabs">
                    <div class="dp-tab" :class="{ active: calViewMode === 'user' }" @click="calViewMode = 'user'">
                        <div class="dp-tab-avatar">
                            <img v-if="userAvatar && userAvatar.startsWith('http')" :src="userAvatar" />
                            <span v-else>{{ userAvatar || '🌙' }}</span>
                        </div>
                        <span>{{ userName || '我' }}</span>
                    </div>
                    <div class="dp-tab" :class="{ active: calViewMode === 'char' }" @click="calViewMode = 'char'">
                        <div class="dp-tab-avatar">
                            <img v-if="currentAi.avatarUrl" :src="currentAi.avatarUrl" />
                            <span v-else>{{ currentAi.avatar || '💬' }}</span>
                        </div>
                        <span>{{ currentAi.note || currentAi.name }}</span>
                    </div>
                </div>

                <!-- 状态选择 -->
                <div class="day-status-row">
                    <span class="dp-label">状态（可不填）</span>
                    <div class="status-options">
                        <div v-for="s in statusOptions" :key="s.key" class="status-opt"
                            :class="{ active: getDayStatusKey(selectedDay) === s.key }"
                            @click="setDayStatus(selectedDay, s)">
                            <span>{{ s.emoji }}</span>
                        </div>
                        <div v-if="calViewMode === 'user'" class="status-opt"
                            :class="{ active: isPeriodDay(selectedDay) }" @click="togglePeriod(selectedDay)">
                            <span>🌸</span>
                        </div>
                    </div>
                </div>

                <!-- 日程列表 -->
                <div class="dp-events">
                    <template v-if="getDayEvents(selectedDay).length > 0">
                        <div v-for="(ev, i) in getDayEvents(selectedDay)" :key="ev.id || i" class="dp-event-item">
                            <div class="dp-event-dot"></div>
                            <input v-if="editingEventIdx === i" v-model="editingEventText"
                                class="dp-input dp-edit-input" @blur="saveEditEvent(selectedDay, i)"
                                @keyup.enter="saveEditEvent(selectedDay, i)" />
                            <span v-else class="dp-event-text" @click="startEditEvent(i, ev.text)">{{ ev.text }}</span>
                            <button class="dp-event-del" @click="removeEvent(selectedDay, i)">×</button>
                        </div>
                    </template>
                    <div v-else class="dp-empty">暂无日程，可不填</div>
                </div>

                <!-- 添加日程 -->
                <div class="dp-add-row">
                    <input v-model="newEventText" class="dp-input" placeholder="添加日程（可选）..." @keyup.enter="addEvent" />
                    <button class="dp-add-btn" @click="addEvent">+</button>
                </div>

                <div v-if="showSaveToast" class="save-toast">已保存 ✓</div>

            </div>
        </div>

        <BlurModal :visible="showAddPersonaModal" @close="showAddPersonaModal = false">
            <h3>添加新的角色</h3>
            <DreamInput label="名字" v-model="newPersona.name" placeholder="角色名称" />
            <DreamInput label="头像 emoji" v-model="newPersona.avatar" placeholder="💬" />
            <DreamInput label="头像图片 URL" v-model="newPersona.avatarUrl" placeholder="https://..." />
            <div class="file-row">
                <span class="file-label">或上传图片</span>
                <input type="file" accept="image/*" @change="handleNewPersonaAvatarUpload" class="file-input" />
            </div>
            <DreamInput label="角色设定" type="textarea" v-model="newPersona.content" :rows="6"
                placeholder="描述性格、说话方式..." />
            <div class="modal-actions">
                <SoftButton variant="secondary" @click="showAddPersonaModal = false">取消</SoftButton>
                <SoftButton variant="primary" @click="createPersona"
                    :disabled="!newPersona.name || !newPersona.content">创建
                </SoftButton>
            </div>
        </BlurModal>

        <p class="version-text">v1.1.1</p>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/utils/api'
import BlurModal from '@/components/ui/BlurModal.vue'
import DreamInput from '@/components/ui/DreamInput.vue'
import SoftButton from '@/components/ui/SoftButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const router = useRouter()

// ===== 全部状态声明 =====
const currentPage = ref(1)
const currentAi = ref({ name: '哥哥', note: '', avatar: '💬', avatarUrl: '', personaId: '' })
const togetherDays = ref(1)
const todayCard = ref('加载中...')
const cards = ref([])
const newCard = ref('')
const leftBubbleText = ref('在想你')
const rightBubbleText = ref('我也是')
const chatStatMode = ref(0)
const showDaysEdit = ref(false)
const showCardEditor = ref(false)
const startDate = ref('')
const customIcons = ref({})
const allPersonas = ref([])
const focusedCard = ref(null)
const coupleTextMain = ref(localStorage.getItem('couple_text_main') || '')
const coupleTextDays = ref(localStorage.getItem('couple_text_days') || '')
const editingTextField = ref(null)
const editingTextValue = ref('')
const showSaveToast = ref(false)
const showScheduleView = ref(false)
const scheduleRange = ref(7)


// 共栖空间
const userAvatar = ref(localStorage.getItem('home_user_avatar') || '')
const userName = ref(localStorage.getItem('user_name') || '我')
const totalMessages = ref(null)
const streak = ref(null)
const timelineEvents = ref([])
const showTimelineAdd = ref(false)
const newTimelineText = ref('')
const newTimelinePeriod = ref('')

// 情侣卡片
const coupleTagline = ref(localStorage.getItem('couple_tagline') || '你走的每一步，我都在')
const coupleBgImage = ref(localStorage.getItem('couple_bg') || '')
const showCoupleEdit = ref(false)
const editCoupleBg = ref('')
const editTagline = ref('')

function startEditText(field) {
    editingTextField.value = field
    if (field === 'main') editingTextValue.value = coupleTextMain.value || `${userName.value || '我'} · ${currentAi.value.note || currentAi.value.name}`
    if (field === 'days') editingTextValue.value = coupleTextDays.value || `相遇以来的第 ${togetherDays.value} 天`
    if (field === 'tagline') editingTextValue.value = coupleTagline.value
}

function saveTextEdit(field) {
    if (field === 'main') { coupleTextMain.value = editingTextValue.value; localStorage.setItem('couple_text_main', editingTextValue.value) }
    if (field === 'days') { coupleTextDays.value = editingTextValue.value; localStorage.setItem('couple_text_days', editingTextValue.value) }
    if (field === 'tagline') { coupleTagline.value = editingTextValue.value; localStorage.setItem('couple_tagline', editingTextValue.value) }
    editingTextField.value = null
    editingTextValue.value = ''
}

// 收藏
const showBookmarks = ref(false)
const bookmarks = ref([])

// 日历
const now = new Date()
const calYear = ref(now.getFullYear())
const calMonth = ref(now.getMonth())
const selectedDay = ref(null)
const showDayPanel = ref(false)
const newEventText = ref('')
const calViewMode = ref('user')
const calendarData = ref(JSON.parse(localStorage.getItem('calendar_data') || '{}'))
const periodData = ref(JSON.parse(localStorage.getItem('period_data') || '[]'))

function getScheduleData(days, role) {
    const result = []
    const today = new Date()
    for (let i = 0; i < days; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() + i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const events = calendarData.value[key]?.[role]?.events || []
        events.forEach(ev => result.push({ ...ev, date: key, dateObj: d }))
    }
    return result
}

function groupScheduleByDate(items) {
    const groups = {}
    items.forEach(item => {
        const key = item.date
        if (!groups[key]) {
            const d = new Date(key)
            const today = new Date()
            const diff = Math.round((d - today) / 86400000)
            let label
            if (diff === 0) label = '今天'
            else if (diff === 1) label = '明天'
            else label = `${d.getMonth() + 1}/${d.getDate()}`
            groups[key] = { date: key, label, items: [] }
        }
        groups[key].items.push(item)
    })
    return Object.values(groups)
}

// 事件编辑
const editingEventIdx = ref(-1)
const editingEventText = ref('')

// AI 画像
const personaInsights = ref([])
const showAddInsight = ref(false)
const newInsightText = ref('')
const editingInsightId = ref(null)
const editingInsightText = ref('')

// 时间轴编辑
const editingTimelineId = ref(null)
const editingTimelineText = ref('')

// user/char 编辑
const showUserEdit = ref(false)
const showCharSwitch = ref(false)
const editUserName = ref('')
const editUserAvatar = ref('')

const editUserAvatarEmoji = ref('')

function handleCoupleBgUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
        coupleBgImage.value = ev.target.result
        localStorage.setItem('couple_bg', ev.target.result)
    }
    reader.readAsDataURL(file)
}

function clearCoupleBg() {
    coupleBgImage.value = ''
    localStorage.removeItem('couple_bg')
    editCoupleBg.value = ''
}

function saveCoupleEdit() {
    if (editCoupleBg.value.trim()) {
        coupleBgImage.value = editCoupleBg.value.trim()
        localStorage.setItem('couple_bg', coupleBgImage.value)
    }
    if (editTagline.value.trim()) {
        coupleTagline.value = editTagline.value.trim()
        localStorage.setItem('couple_tagline', coupleTagline.value)
    }
    showCoupleEdit.value = false
}

// openUserEdit 在弹窗里打开，点头像也触发

function openUserEdit() {
    editUserName.value = userName.value
    // 判断当前是 url 还是 emoji
    if (userAvatar.value.startsWith('http') || userAvatar.value.startsWith('data:')) {
        editUserAvatar.value = userAvatar.value
        editUserAvatarEmoji.value = ''
    } else {
        editUserAvatar.value = ''
        editUserAvatarEmoji.value = userAvatar.value
    }
    showUserEdit.value = true
}

function saveUserEdit() {
    userName.value = editUserName.value
    // URL 优先，其次 emoji，其次保持原样
    if (editUserAvatar.value.trim()) {
        userAvatar.value = editUserAvatar.value.trim()
    } else if (editUserAvatarEmoji.value.trim()) {
        userAvatar.value = editUserAvatarEmoji.value.trim()
    }
    localStorage.setItem('user_name', userName.value)
    localStorage.setItem('home_user_avatar', userAvatar.value)
    showUserEdit.value = false
}

function handleUserAvatarUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
        editUserAvatar.value = ev.target.result // base64
        editUserAvatarEmoji.value = ''
    }
    reader.readAsDataURL(file)
}

// 状态选项
const statusOptions = [
    { key: 'happy', emoji: '😊', label: '开心', color: '#F5EAD0' },
    { key: 'calm', emoji: '😌', label: '平静', color: '#D8CDEA' },
    { key: 'tired', emoji: '😴', label: '疲惫', color: '#98CBEA' },
    { key: 'sad', emoji: '🥺', label: '低落', color: '#E8C0C9' },
    { key: 'anxious', emoji: '😰', label: '焦虑', color: '#F1DADD' },
    { key: 'excited', emoji: '🥳', label: '兴奋', color: '#FCE4E8' },
]

// ===== computed =====
const chatStatDisplay = computed(() => {
    const stats = [
        { v: togetherDays.value, l: `已经聊了${togetherDays.value}天` },
        { v: '5842', l: '共条消息' },
        { v: '23', l: '今天聊了' }
    ]
    return stats[chatStatMode.value]
})

const calDays = computed(() => {
    const firstDay = new Date(calYear.value, calMonth.value, 1).getDay()
    const daysInMonth = new Date(calYear.value, calMonth.value + 1, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    return days
})

const todayDayStatus = computed(() => {
    const t = new Date()
    const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    const statusKey = calendarData.value[key]?.user?.status
    return statusOptions.find(s => s.key === statusKey) || { emoji: '✿', label: '平静' }
})

const groupedInsights = computed(() => {
    const groups = {}
    personaInsights.value.forEach(item => {
        const key = item.week || item.created_at?.slice(0, 7) || '未知时间'
        if (!groups[key]) groups[key] = []
        groups[key].push(item)
    })
    return groups
})

// ===== 基础交互 =====
const toggleChatStatLocal = () => { chatStatMode.value = (chatStatMode.value + 1) % 3 }

let isDragging = false, startX = 0
const handleMouseDown = (e) => { isDragging = true; startX = e.pageX }
const handleMouseMove = (e) => {
    if (!isDragging) return
    if (Math.abs(e.pageX - startX) > 50) {
        if (e.pageX > startX && currentPage.value > 0) { currentPage.value--; isDragging = false }
        else if (e.pageX < startX && currentPage.value < 2) { currentPage.value++; isDragging = false }
    }
}
const handleMouseUp = () => { isDragging = false }

// ===== 数据加载 =====
async function loadHomeData() {
    try {
        // 优先用 user 自定义选择的角色
        const savedCharId = localStorage.getItem('home_char_id')

        let pid
        if (savedCharId) {
            pid = savedCharId
        } else {
            const res = await api('/api/messages/latest-persona')
            const d = await res.json()
            pid = d.personaId || 'xiaorou'
        }

        const detail = await api(`/api/persona/${pid}`)
        const ai = await detail.json()
        Object.assign(currentAi.value, { ...ai, personaId: pid })

        // 读取这个角色的最新消息作为信息条预览
        try {
            const msgRes = await api(`/api/messages/${pid}/last`)
            const lastMsg = await msgRes.json()
            if (lastMsg) {
                const content = lastMsg.content.split('|||')[0].replace(/\n/g, ' ')
                leftBubbleText.value = content.length > 30 ? content.slice(0, 30) + '...' : content
            } else {
                const savedLeft = localStorage.getItem('home_bubble_left')
                if (savedLeft) leftBubbleText.value = savedLeft
            }
        } catch { }

    } catch { }
}

const calMonthStats = computed(() => {
    const counts = {}
    statusOptions.forEach(s => { counts[s.key] = 0 })
    const daysInMonth = new Date(calYear.value, calMonth.value + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${calYear.value}-${String(calMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const userStatus = calendarData.value[key]?.user?.status
        const charStatus = calendarData.value[key]?.char?.status
        if (userStatus && counts[userStatus] !== undefined) counts[userStatus]++
        if (charStatus && charStatus !== userStatus && counts[charStatus] !== undefined) counts[charStatus]++
    }
    return statusOptions.filter(s => counts[s.key] > 0).map(s => ({ ...s, count: counts[s.key] }))
})

const calPeriodCount = computed(() => {
    return periodData.value.filter(k => {
        const [y, m] = k.split('-')
        return parseInt(y) === calYear.value && parseInt(m) === calMonth.value + 1
    }).length
})

const calEventCount = computed(() => {
    let count = 0
    const daysInMonth = new Date(calYear.value, calMonth.value + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${calYear.value}-${String(calMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        count += (calendarData.value[key]?.user?.events?.length || 0) + (calendarData.value[key]?.char?.events?.length || 0)
    }
    return count
})

async function loadAllPersonas() {
    try {
        const res = await api('/api/prompts/personas')
        const data = await res.json()

        const detailed = await Promise.all(
            data.personas.map(async (p) => {
                let note = '', avatarUrl = '', avatar = p.avatar || '💬', lastMessage = ''
                const [detailRes, msgRes] = await Promise.all([
                    api(`/api/persona/${p.id}`).catch(() => null),
                    api(`/api/messages/${p.id}/last`).catch(() => null),
                ])
                if (detailRes) {
                    try {
                        const detail = await detailRes.json()
                        note = detail.note || ''
                        avatarUrl = detail.avatarUrl || ''
                        avatar = detail.avatar || avatar
                    } catch { }
                }
                if (msgRes) {
                    try {
                        const last = await msgRes.json()
                        if (last) {
                            const prefix = last.role === 'ai' ? '' : '我: '
                            const content = last.content.split('|||')[0].replace(/\n/g, ' ')
                            lastMessage = prefix + (content.length > 20 ? content.slice(0, 20) + '...' : content)
                            // 存时间戳
                            p.lastMessageTime = last.timestamp || null
                        }
                    } catch { }
                }
                return { ...p, note, avatarUrl, avatar, lastMessage, lastMessageTime: p.lastMessageTime || null }
            })
        )

        const pinnedList = JSON.parse(localStorage.getItem('pinned_personas') || '[]')
        const hiddenList = JSON.parse(localStorage.getItem('hidden_personas') || '[]')
        allPersonas.value = detailed
            .filter(p => !hiddenList.includes(p.id))
            .map(p => ({ ...p, pinned: pinnedList.includes(p.id) }))
    } catch { }
}

async function loadTogetherData() {
    try {
        const pid = currentAi.value.personaId || 'xiaorou'
        const tlRes = await api(`/api/timeline/${pid}`)
        const tlData = await tlRes.json()
        if (Array.isArray(tlData)) {
            const flat = []
            tlData.forEach(group => {
                if (Array.isArray(group.events)) {
                    group.events.forEach(ev => {
                        flat.push({
                            id: ev.id,
                            content: ev.content,
                            period: group.dateLabel || group.date,
                            created_at: ev.createdAt
                        })
                    })
                }
            })
            timelineEvents.value = flat.slice(0, 15)
        }
    } catch { }

    // 统计消息总数
    try {
        const pid = currentAi.value.personaId || 'xiaorou'
        const res = await api(`/api/messages/${pid}`)
        const msgs = await res.json()
        totalMessages.value = Array.isArray(msgs) ? msgs.length : 0

        // 计算连续聊天天数
        if (Array.isArray(msgs)) {
            const days = new Set(msgs.map(m => m.timestamp?.slice(0, 10)).filter(Boolean))
            const sortedDays = [...days].sort().reverse()
            let s = 0
            const today = new Date().toISOString().slice(0, 10)
            let check = today
            for (const d of sortedDays) {
                if (d === check) {
                    s++
                    const prev = new Date(check)
                    prev.setDate(prev.getDate() - 1)
                    check = prev.toISOString().slice(0, 10)
                } else break
            }
            streak.value = s
        }
    } catch { }
}

async function loadPersonaInsights() {
    try {
        const pid = currentAi.value.personaId || 'xiaorou'
        const res = await api(`/api/sediment/${pid}/insights`)
        const data = await res.json()
        personaInsights.value = Array.isArray(data) ? data : []
    } catch { }
}

async function loadBookmarks() {
    try {
        const pid = currentAi.value.personaId || 'xiaorou'
        const res = await api(`/api/bookmarks/${pid}`)
        const data = await res.json()
        bookmarks.value = Array.isArray(data) ? data : []
    } catch { }
}

// ===== 纪念日 =====
function calculateDays() {
    const saved = localStorage.getItem('together_start_date')
    if (saved) togetherDays.value = Math.max(1, Math.floor((new Date() - new Date(saved)) / 86400000))
}

function saveDaysDate() {
    localStorage.setItem('together_start_date', startDate.value)
    calculateDays()
    showDaysEdit.value = false
}

// ===== 小纸条 =====
function loadCards() {
    const saved = localStorage.getItem('word_cards')
    if (saved) { cards.value = JSON.parse(saved); pickTodayCard() }
}

function pickTodayCard() {
    if (!cards.value.length) { todayCard.value = '写下第一张纸条吧'; return }
    const hash = new Date().toISOString().slice(0, 10).split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)
    todayCard.value = cards.value[Math.abs(hash) % cards.value.length]
}

function addCard() {
    if (!newCard.value.trim()) return
    newCard.value.split(/[\n;；/、]/).map(s => s.trim()).filter(Boolean).forEach(i => {
        if (!cards.value.includes(i)) cards.value.push(i)
    })
    localStorage.setItem('word_cards', JSON.stringify(cards.value))
    newCard.value = ''
    pickTodayCard()
}

function removeCard(idx) {
    cards.value.splice(idx, 1)
    localStorage.setItem('word_cards', JSON.stringify(cards.value))
    pickTodayCard()
}

// ===== 路由 =====
function openChat() { router.push(`/chat/${currentAi.value.personaId || 'xiaorou'}`) }
function openCompanionSpace() { router.push('/about') }
function openPhone() { alert('正在呼叫...') }

// ===== 日历 =====
function prevMonth() {
    if (calMonth.value === 0) { calMonth.value = 11; calYear.value-- }
    else calMonth.value--
}

function nextMonth() {
    if (calMonth.value === 11) { calMonth.value = 0; calYear.value++ }
    else calMonth.value++
}

function isToday(day) {
    const t = new Date()
    return day === t.getDate() && calMonth.value === t.getMonth() && calYear.value === t.getFullYear()
}

function getDayKey(day) {
    return `${calYear.value}-${String(calMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getDayData(day, role) {
    const key = getDayKey(day)
    return calendarData.value[key]?.[role] || { events: [], status: null }
}

function getDayEvents(day, role) {
    return getDayData(day, role || calViewMode.value).events || []
}

function getDayStatus(day, role) {
    const statusKey = getDayData(day, role || calViewMode.value).status
    return statusOptions.find(s => s.key === statusKey) || null
}

function getDayStatusKey(day, role) {
    return getDayData(day, role || calViewMode.value).status || null
}

function getDayStatusForGrid(day) {
    const userStatus = getDayData(day, 'user').status
    const charStatus = getDayData(day, 'char').status
    if (userStatus) return statusOptions.find(s => s.key === userStatus) || null
    if (charStatus) return statusOptions.find(s => s.key === charStatus) || null
    return null
}

function setDayStatus(day, status) {
    const key = getDayKey(day)
    const r = calViewMode.value
    if (!calendarData.value[key]) calendarData.value[key] = {}
    if (!calendarData.value[key][r]) calendarData.value[key][r] = { events: [], status: null }
    calendarData.value[key][r].status = calendarData.value[key][r].status === status.key ? null : status.key
    localStorage.setItem('calendar_data', JSON.stringify(calendarData.value))

    // 保存提示
    showSaveToast.value = true
    setTimeout(() => { showSaveToast.value = false }, 1500)
}

function addEvent() {
    if (!newEventText.value.trim() || !selectedDay.value) return
    const key = getDayKey(selectedDay.value)
    const r = calViewMode.value
    if (!calendarData.value[key]) calendarData.value[key] = {}
    if (!calendarData.value[key][r]) calendarData.value[key][r] = { events: [], status: null }
    calendarData.value[key][r].events.push({ id: Date.now(), text: newEventText.value.trim() })
    localStorage.setItem('calendar_data', JSON.stringify(calendarData.value))
    newEventText.value = ''

    // 保存提示
    showSaveToast.value = true
    setTimeout(() => { showSaveToast.value = false }, 1500)
}

function selectDay(day) {
    selectedDay.value = day
    showDayPanel.value = true
    newEventText.value = ''
    editingEventIdx.value = -1
    calViewMode.value = 'user'
}


function removeEvent(day, idx) {
    const key = getDayKey(day)
    const r = calViewMode.value
    calendarData.value[key]?.[r]?.events.splice(idx, 1)
    localStorage.setItem('calendar_data', JSON.stringify(calendarData.value))
}

function startEditEvent(idx, text) {
    editingEventIdx.value = idx
    editingEventText.value = text
}

function saveEditEvent(day, idx) {
    if (editingEventText.value.trim()) {
        const key = getDayKey(day)
        const r = calViewMode.value
        if (calendarData.value[key]?.[r]?.events[idx]) {
            calendarData.value[key][r].events[idx].text = editingEventText.value.trim()
            localStorage.setItem('calendar_data', JSON.stringify(calendarData.value))
        }
    }
    editingEventIdx.value = -1
    editingEventText.value = ''
}

// ===== 经期 =====
function isPeriodDay(day) {
    const key = getDayKey(day)
    return periodData.value.includes(key)
}

function togglePeriod(day) {
    const key = getDayKey(day)
    const idx = periodData.value.indexOf(key)
    if (idx > -1) periodData.value.splice(idx, 1)
    else periodData.value.push(key)
    localStorage.setItem('period_data', JSON.stringify(periodData.value))
}

// ===== user/char 编辑 =====
async function switchChar(persona) {
    Object.assign(currentAi.value, persona)
    localStorage.setItem('home_char_id', persona.id)
    showCharSwitch.value = false

    // 重新加载这个 char 的数据
    await loadTogetherData()
    await loadPersonaInsights()
    await loadBookmarks()

    // 更新信息条最新消息
    try {
        const msgRes = await api(`/api/messages/${persona.id}/last`)
        const lastMsg = await msgRes.json()
        if (lastMsg) {
            const content = lastMsg.content.split('|||')[0].replace(/\n/g, ' ')
            leftBubbleText.value = content.length > 30 ? content.slice(0, 30) + '...' : content
        }
    } catch { }
}

// ===== AI 画像 =====
function formatInsightDate(dateStr) {
    if (!dateStr) return ''
    return dateStr.slice(0, 10)
}

function startEditInsight(item) {
    editingInsightId.value = item.id
    editingInsightText.value = item.content
}

async function saveEditInsight(item) {
    try {
        await api(`/api/sediment/insight/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: editingInsightText.value })
        })
        item.content = editingInsightText.value
    } catch { }
    editingInsightId.value = null
}

async function deleteInsight(id) {
    try {
        await api(`/api/sediment/insight/${id}`, { method: 'DELETE' })
        personaInsights.value = personaInsights.value.filter(i => i.id !== id)
    } catch { }
}

async function addInsight() {
    if (!newInsightText.value.trim()) return
    try {
        const pid = currentAi.value.personaId || 'xiaorou'
        await api(`/api/sediment/${pid}/insights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: newInsightText.value.trim() })
        })
        newInsightText.value = ''
        showAddInsight.value = false
        await loadPersonaInsights()
    } catch { }
}

// ===== 时间轴 =====
async function addTimelineEvent() {
    if (!newTimelineText.value.trim()) return
    try {
        const pid = currentAi.value.personaId || 'xiaorou'
        await api(`/api/timeline/${pid}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: newTimelineText.value.trim(),
                period: newTimelinePeriod.value.trim() || '最近',
                event_type: 'moment'
            })
        })
        newTimelineText.value = ''
        newTimelinePeriod.value = ''
        showTimelineAdd.value = false
        await loadTogetherData()
    } catch { }
}

function startEditTimeline(event) {
    editingTimelineId.value = event.id
    editingTimelineText.value = event.content
}

async function saveEditTimeline(event) {
    try {
        await api(`/api/timeline/event/${event.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: editingTimelineText.value })
        })
        event.content = editingTimelineText.value
    } catch { }
    editingTimelineId.value = null
}

async function deleteTimelineEvent(id) {
    try {
        await api(`/api/timeline/event/${id}`, { method: 'DELETE' })
        timelineEvents.value = timelineEvents.value.filter(e => e.id !== id)
    } catch { }
}

// ===== 滚动聚焦 =====
function setupScrollFocus() {
    const panels = document.querySelectorAll('.page-panel')
    panels.forEach(panel => {
        let ticking = false
        let lastFocused = null

        function updateFocus() {
            const cards = Array.from(panel.querySelectorAll('.focusable-card'))
            if (!cards.length) return
            const panelRect = panel.getBoundingClientRect()
            const readLine = panelRect.top + panelRect.height * 0.15
            let target = null
            for (let i = cards.length - 1; i >= 0; i--) {
                const rect = cards[i].getBoundingClientRect()
                if (rect.top <= readLine) { target = cards[i]; break }
            }
            if (!target) target = cards[0]
            if (target === lastFocused) return
            lastFocused = target
            cards.forEach(c => c.classList.remove('card-focused'))
            panel.classList.remove('has-focus')
            target.classList.add('card-focused')
            panel.classList.add('has-focus')
            focusedCard.value = target
        }

        updateFocus()
        panel.addEventListener('scroll', () => {
            if (ticking) return
            ticking = true
            requestAnimationFrame(() => { updateFocus(); ticking = false })
        }, { passive: true })
    })
}

const chatSearchQuery = ref('')
const activeGroup = ref(null)
const contactGroups = ref([])
const showAddPersonaModal = ref(false)
const newPersona = reactive({
    name: '',
    avatar: '💬',
    avatarUrl: '',
    content: ''
})
const contextMenu = ref({ visible: false, persona: null, x: 0, y: 0 })
const showMoreApps = ref(false)


async function togglePin(id) {
    const persona = allPersonas.value.find(p => p.id === id)
    if (!persona) return
    persona.pinned = !persona.pinned
    const pinned = allPersonas.value.filter(p => p.pinned).map(p => p.id)
    localStorage.setItem('pinned_personas', JSON.stringify(pinned))
}

function handleNewPersonaAvatarUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => { newPersona.avatarUrl = e.target.result }
    reader.readAsDataURL(file)
}
function showContextMenu(e, persona) {
    e.preventDefault()
    contextMenu.value = { visible: true, persona, x: e.clientX, y: e.clientY }
}

function hideContextMenu() {
    contextMenu.value.visible = false
}

async function deletePersona(id) {
    try {
        await api(`/api/personas/custom/${id}`, { method: 'DELETE' })
        allPersonas.value = allPersonas.value.filter(p => p.id !== id)
    } catch { }
    hideContextMenu()
}

async function resetConversation(id) {
    try {
        await api(`/api/messages/${id}`, { method: 'DELETE' })
    } catch { }
    hideContextMenu()
}

async function deleteConversation(id) {
    try {
        await api(`/api/messages/${id}`, { method: 'DELETE' })
        const persona = allPersonas.value.find(p => p.id === id)
        if (persona) persona.lastMessage = '还没有对话...'
    } catch { }
    hideContextMenu()
}

function pinFromMenu(id) {
    togglePin(id)
    hideContextMenu()
}

function formatLastTime(persona) {
    if (!persona.lastMessageTime) return ''
    const now = new Date()
    const t = new Date(persona.lastMessageTime)
    const diff = now - t
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return `${t.getMonth() + 1}/${t.getDate()}`
}
let touchTimer = null

function handleConvTouchStart(e, persona) {
    touchTimer = setTimeout(() => {
        showContextMenu(e.touches[0], persona)
    }, 500)
}

function handleConvTouchEnd() {
    if (touchTimer) { clearTimeout(touchTimer); touchTimer = null }
}

const ctxMenuPos = computed(() => {
    const x = contextMenu.value.x
    const y = contextMenu.value.y
    const menuW = 200
    const menuH = 240
    const winW = window.innerWidth
    const winH = window.innerHeight
    return {
        left: (x + menuW > winW ? x - menuW : x) + 'px',
        top: (y + menuH > winH ? y - menuH : y) + 'px'
    }
})

async function createPersona() {
    if (!newPersona.name || !newPersona.content) return
    try {
        await api('/api/personas/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newPersona.name,
                avatar: newPersona.avatar,
                avatarUrl: newPersona.avatarUrl,
                content: newPersona.content
            })
        })
        showAddPersonaModal.value = false
        Object.assign(newPersona, { name: '', avatar: '💬', avatarUrl: '', content: '' })
        await loadAllPersonas()
    } catch { }
}


async function loadContactGroups() {
    try {
        const res = await api('/api/contact-groups')
        const data = await res.json()
        contactGroups.value = Array.isArray(data) ? data : []
    } catch { }
}


const filteredPersonas = computed(() => {
    let list = [...allPersonas.value]
    if (chatSearchQuery.value.trim()) {
        const q = chatSearchQuery.value.trim().toLowerCase()
        list = list.filter(p =>
            (p.name || '').toLowerCase().includes(q) ||
            (p.note || '').toLowerCase().includes(q)
        )
    }
    return list.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return 0
    })
})

function getUnread(personaId) {
    const lastRead = localStorage.getItem(`last_read_${personaId}`)
    if (!lastRead) return 0
    // 用 localStorage 模拟，后续换真实接口
    return 0
}

// ===== onMounted =====
onMounted(async () => {
    loadCards()
    calculateDays()
    await loadHomeData()
    await loadAllPersonas()
    await loadTogetherData()
    await loadPersonaInsights()
    await loadBookmarks()
    await loadContactGroups()
    const icons = localStorage.getItem('custom_app_icons')
    if (icons) customIcons.value = JSON.parse(icons)

    const savedWallpaper = localStorage.getItem('custom_wallpaper')
    if (savedWallpaper) {
        document.querySelector('.home-screen').style.backgroundImage = `url(${savedWallpaper})`
    }

    setTimeout(setupScrollFocus, 300)
})
</script>

<style scoped>
/* ==========================================================================
   1. 核心容器与 iOS PWA 安全适配
   ========================================================================== */
.home-screen {
    width: 100%;
    height: 100%;
    /* 去掉 padding-top，让内容直接从屏幕最顶部开始 */
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background: linear-gradient(180deg, #FFFBFA 0%, #FFF0F2 60%, #FFE9ED 100%);
    box-sizing: border-box;
    background-size: cover;
    background-position: center;
}

.dynamic-island {
    width: 100px;
    height: 28px;
    background: #1a1418;
    border-radius: 20px;
    /* 用绝对定位贴到最顶部 */
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 4px;
    opacity: 0.85;
    z-index: 10;
}

/* ==========================================================================
   幻彩光斑
   ========================================================================== */
.blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    z-index: 0;
    pointer-events: none;
}

.blob-tl {
    top: -40px;
    left: -50px;
    width: 250px;
    height: 250px;
    background: #F1DADD;
    opacity: 0.5;
}

.blob-br {
    bottom: 60px;
    right: -60px;
    width: 280px;
    height: 280px;
    background: #98CBEA;
    opacity: 0.25;
}

.blob-mid {
    top: 50%;
    left: -30px;
    width: 140px;
    height: 140px;
    background: #F5EAD0;
    opacity: 0.18;
}

.blob-tr {
    top: 25%;
    right: -40px;
    width: 120px;
    height: 120px;
    background: #D8CDEA;
    opacity: 0.16;
}

/* ==========================================================================
   2. 三页平移系统
   ========================================================================== */
.pages-wrapper {
    flex: 1;
    position: relative;
    z-index: 2;
    overflow: hidden;
    margin: 0;
    border-radius: 0;
}

.pages-inner {
    display: flex;
    width: 300%;
    height: 100%;
    transition: transform 0.45s cubic-bezier(0.35, 0, 0.2, 1);
    will-change: transform;
}

.page-panel {
    width: 33.333%;
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 4px 16px 100px;
    box-sizing: border-box;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.page-panel::-webkit-scrollbar {
    display: none;
}

/* ==========================================================================
   3. Bento 功能网格
   ========================================================================== */
.bento-container-v8 {
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    grid-template-rows: auto auto auto;
    grid-template-areas:
        "note about"
        "note logs"
        "beauty memory";
    gap: 12px;
    margin-bottom: 16px;
}

.bento-note {
    grid-area: note;
    min-height: 190px;
    position: relative;
}

.bento-about {
    grid-area: about;
}

.bento-logs {
    grid-area: logs;
}

.bento-beauty {
    grid-area: beauty;
}

.bento-memory {
    grid-area: memory;
}

.bento-item {
    background: #FFFFFF;
    border-radius: 22px;
    padding: 14px 13px;
    box-shadow: 0 8px 20px rgba(217, 163, 175, 0.1), 0 2px 6px rgba(217, 163, 175, 0.06);
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1),
        box-shadow 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.bento-item:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 32px rgba(217, 163, 175, 0.16), 0 4px 10px rgba(217, 163, 175, 0.08);
}

.bento-item:active {
    transform: translateY(-1px) scale(0.99);
    box-shadow: 0 6px 16px rgba(217, 163, 175, 0.1), 0 2px 6px rgba(217, 163, 175, 0.06);
}

.bento-note {
    background: #FDF8F5;
    background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(245, 234, 220, 0.4) 2px, rgba(245, 234, 220, 0.4) 3px);
    border-radius: 26px;
    justify-content: space-between;
}

.bento-note::before {
    content: '';
    position: absolute;
    top: -4px;
    left: 16px;
    width: 20px;
    height: 12px;
    background: #D9A3AF;
    border-radius: 6px 6px 0 0;
    opacity: 0.4;
}

.bento-header {
    font-size: 10px;
    color: #D9A3AF;
    font-weight: 700;
    letter-spacing: 1px;
}

.bento-quote {
    font-size: 16px;
    color: #4A3F41;
    line-height: 1.6;
    margin: 10px 0;
    flex: 1;
}

.bento-note-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    color: #B8A9AC;
    border-top: 1px dashed rgba(217, 163, 175, 0.3);
    padding-top: 8px;
}

.bento-tag {
    background: #F5EAD0;
    color: #C88B98;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 9px;
}

.bg-gauze {
    background: #FDF5F6;
}

.bg-mist {
    background: #F6F2FA;
}

.bg-apricot {
    background: #FDF9F2;
}

.bg-rose-light {
    background: #FDF0F3;
}

.b-icon {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 6px;
}

.b-icon svg {
    width: 22px;
    height: 22px;
}

.custom-icon-bento {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 12px;
}

.b-label {
    font-size: 11px;
    font-weight: 700;
    color: #6B5B5E;
}

/* ==========================================================================
   4. Hero 纪念日大卡片 + 流动光影
   ========================================================================== */
.hero-card-v8 {
    background: linear-gradient(155deg, #FFFBFB 0%, #FFF6F7 30%, #FDF0F3 60%, #FEF5F6 100%);
    border-radius: 28px;
    padding: 24px;
    box-shadow:
        0 16px 48px rgba(217, 163, 175, 0.22),
        0 6px 16px rgba(217, 163, 175, 0.14),
        0 2px 4px rgba(217, 163, 175, 0.08);
    margin-bottom: 18px;
    position: relative;
    overflow: hidden;
    min-height: 190px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    transition: box-shadow 0.5s ease, transform 0.5s ease;
}

.hero-texture {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.3;
    background: radial-gradient(circle at 70% 20%, rgba(232, 192, 201, 0.3), transparent);
}

/* 流动高光扫过效果 */
.hero-card-v8::after {
    content: '';
    position: absolute;
    top: -60%;
    left: -80%;
    width: 60%;
    height: 220%;
    background: linear-gradient(105deg, transparent 30%, rgba(255, 255, 255, 0.18) 50%, transparent 70%);
    transform: skewX(-15deg);
    animation: heroShine 5s ease-in-out infinite;
    pointer-events: none;
    z-index: 1;
}

@keyframes heroShine {
    0% {
        left: -80%;
        opacity: 0;
    }

    10% {
        opacity: 1;
    }

    50% {
        left: 120%;
        opacity: 1;
    }

    60% {
        opacity: 0;
    }

    100% {
        left: 120%;
        opacity: 0;
    }
}

.hero-tag-v8 {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(255, 255, 255, 0.7);
    padding: 5px 14px;
    border-radius: 20px;
    font-size: 10px;
    color: #D9A3AF;
    font-weight: 700;
}

.hero-main-content {
    display: flex;
    align-items: flex-end;
    gap: 8px;
}

.hero-daisy-icon {
    width: 32px;
    height: 32px;
    color: #D9A3AF;
    margin-bottom: 8px;
}

.hero-num {
    font-size: 64px;
    font-weight: 700;
    color: #D9A3AF;
    line-height: 0.85;
    letter-spacing: -2px;
}

.hero-unit {
    font-size: 18px;
    color: #D9A3AF;
    font-weight: 700;
    margin-left: 4px;
    margin-bottom: 6px;
}

.hero-footer-text {
    font-size: 11px;
    color: #B8A9AC;
    margin-top: 10px;
}

/* ==========================================================================
   5. 概览横滑条
   ========================================================================== */
.section-label {
    font-size: 11px;
    font-weight: 700;
    color: #B8A9AC;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin: 8px 0 10px 2px;
}

.overview-slider {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 12px;
    scroll-snap-type: x mandatory;
    margin-bottom: 4px;
}

.overview-slider::-webkit-scrollbar {
    display: none;
}

.slider-card-v8 {
    flex-shrink: 0;
    width: 78%;
    border-radius: 26px;
    padding: 18px 20px;
    background: #FFFFFF;
    scroll-snap-align: start;
    min-height: 110px;
    box-shadow: 0 10px 28px rgba(217, 163, 175, 0.14), 0 4px 10px rgba(217, 163, 175, 0.08);
    position: relative;
}

.slider-card-v8.countdown {
    background: linear-gradient(135deg, #FEF0F3, #FCE4E8);
}

.slider-card-v8.stats-card {
    background: linear-gradient(135deg, #F1EFF8, #E8DFF2);
    cursor: pointer;
}

.slider-card-v8.tokens {
    background: linear-gradient(135deg, #FDF6F0, #F8EADB);
}

.s-title {
    font-size: 10px;
    color: #B8A9AC;
    font-weight: 700;
    letter-spacing: 0.5px;
}

.s-value {
    font-size: 32px;
    font-weight: 700;
    color: #4A3F41;
    margin: 4px 0;
}

.s-sub {
    font-size: 11px;
    color: #6B5B5E;
}

.s-dots {
    position: absolute;
    bottom: 14px;
    right: 16px;
    display: flex;
    gap: 4px;
}

.s-dots i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #D4C8CA;
    font-style: normal;
}

.s-dots i.active {
    background: #D9A3AF;
    width: 10px;
    border-radius: 2px;
}

.token-ring-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 6px;
}

.token-ring {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 3px solid #E8C0C9;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 800;
    color: #D9A3AF;
}

/* ==========================================================================
   6. 次级功能条（横向胶囊，图标左+文字右，增强悬浮感）
   ========================================================================== */
.secondary-bar-v8 {
    display: flex;
    flex-direction: row;
    gap: 8px;
    margin-bottom: 16px;
    overflow-x: auto;
    padding: 2px 0;
}

.secondary-bar-v8::-webkit-scrollbar {
    display: none;
}

.sec-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
    background: #F8F3F4;
    border-radius: 20px;
    padding: 7px 13px 7px 10px;
    cursor: pointer;
    flex-shrink: 0;
    border: none;
    font-family: inherit;
    box-shadow: 0 2px 6px rgba(217, 163, 175, 0.06);
    transition: background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}

.sec-item:hover {
    transform: translateY(-2px);
    background: #F5EEF0;
    box-shadow: 0 6px 16px rgba(217, 163, 175, 0.14);
}

.sec-item:active {
    transform: translateY(0) scale(0.97);
    background: #F0E8EA;
    box-shadow: 0 2px 6px rgba(217, 163, 175, 0.08);
}

.sec-item svg {
    width: 14px;
    height: 14px;
    stroke: #B8A9AC;
    fill: none;
    flex-shrink: 0;
}

.sec-item span {
    font-size: 11px;
    color: #9A8A8E;
    font-weight: 500;
    white-space: nowrap;
}

/* ==========================================================================
   7. 聊天预览条
   ========================================================================== */
.chat-preview-v8 {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #FFFFFF;
    border-radius: 22px;
    padding: 12px 16px;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.1), 0 2px 8px rgba(217, 163, 175, 0.06);
    border: 1px solid rgba(249, 200, 212, 0.2);
    cursor: pointer;
    margin-bottom: 6px;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.chat-preview-v8:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(217, 163, 175, 0.14), 0 4px 10px rgba(217, 163, 175, 0.08);
}

.chat-preview-v8:active {
    transform: scale(0.99);
}

.p-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: linear-gradient(145deg, #FDE4E8, #F8D0D6);
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
}

.p-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.p-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.p-name {
    font-size: 13px;
    font-weight: 700;
    color: #4A3F41;
}

.p-msg {
    font-size: 11px;
    color: #B8A9AC;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.p-time {
    font-size: 10px;
    color: #D4C8CA;
    flex-shrink: 0;
}

/* ==========================================================================
   8. 电话页
   ========================================================================== */
.page-title {
    font-size: 24px;
    font-weight: 800;
    color: #4A3F41;
    margin: 10px 0 16px;
}

.search-box-v8 {
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 20px;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    box-shadow: 0 4px 14px rgba(217, 163, 175, 0.06);
}

.search-box-v8 svg {
    width: 16px;
    height: 16px;
    stroke: #B8A9AC;
    flex-shrink: 0;
}

.search-box-v8 input {
    border: none;
    background: transparent;
    outline: none;
    font-size: 14px;
    color: #4A3F41;
    flex: 1;
    font-family: inherit;
}

.search-box-v8 input::placeholder {
    color: #D4C8CA;
}

.quick-access-row {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 14px;
}

.quick-access-row::-webkit-scrollbar {
    display: none;
}

.quick-card {
    flex-shrink: 0;
    width: 72px;
    height: 96px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(8px);
    border-radius: 18px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 7px;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(217, 163, 175, 0.1), 0 2px 6px rgba(217, 163, 175, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.5);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.quick-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(217, 163, 175, 0.14);
}

.quick-card:active {
    transform: scale(0.95);
}

.quick-avatar-wrap {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: linear-gradient(145deg, #FDE4E8, #F8D0D6);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    border: 2px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 2px 8px rgba(200, 160, 170, 0.15);
}

.quick-avatar-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.quick-name {
    font-size: 10px;
    font-weight: 600;
    color: #6B5B5E;
}

.contact-list-v8 {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.contact-item-card {
    background: #FFFFFF;
    border-radius: 20px;
    padding: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.1), 0 2px 8px rgba(217, 163, 175, 0.06);
    cursor: pointer;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.contact-item-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(217, 163, 175, 0.14);
}

.contact-item-card:active {
    transform: scale(0.98);
}

.contact-avatar-v8 {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: linear-gradient(145deg, #FDE4E8, #F8D0D6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 3px 10px rgba(217, 163, 175, 0.12);
}

.contact-avatar-v8 img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.contact-info-v8 {
    flex: 1;
}

.contact-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.c-name {
    font-size: 14px;
    font-weight: 700;
    color: #4A3F41;
}

.status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #8FAA98;
}

.c-bio {
    font-size: 11px;
    color: #B8A9AC;
    margin-top: 3px;
}

.call-btn-v8 {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    border: none;
    cursor: pointer;
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(217, 163, 175, 0.3);
    transition: transform 0.2s;
}

.call-btn-v8:active {
    transform: scale(0.9);
}

.call-btn-v8 svg {
    width: 16px;
    height: 16px;
}

/* ==========================================================================
   9. 共语列表页
   ========================================================================== */
.conversation-item-v8 {
    background: #FFFFFF;
    border-radius: 20px;
    padding: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.1), 0 2px 8px rgba(217, 163, 175, 0.06);
    cursor: pointer;
    margin-bottom: 10px;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.conversation-item-v8:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(217, 163, 175, 0.14);
}

.conversation-item-v8:active {
    transform: scale(0.98);
}

.conv-avatar-v8 {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: linear-gradient(145deg, #FDE4E8, #F8D0D6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    overflow: hidden;
    flex-shrink: 0;
}

.conv-avatar-v8 img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.conv-info-v8 {
    flex: 1;
    min-width: 0;
}

.conv-name {
    font-size: 14px;
    font-weight: 700;
    color: #4A3F41;
}

.conv-preview {
    font-size: 11px;
    color: #B8A9AC;
    margin-top: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.conv-meta-v8 {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
    flex-shrink: 0;
}

.conv-time {
    font-size: 10px;
    color: #D4C8CA;
}

.conv-badge {
    background: #E8C0C9;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 10px;
}

/* ==========================================================================
   10. 底部悬浮 Dock
   ========================================================================== */
.dock-bar-v8 {
    position: absolute;
    /* 直接贴底，不加任何余量 */
    bottom: 0;
    left: 16px;
    right: 16px;
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 28px;
    padding: 8px 6px 12px;
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
    box-shadow: 0 8px 32px rgba(180, 140, 150, 0.22), 0 2px 8px rgba(255, 255, 255, 0.8) inset;
    z-index: 100;
    border: 1px solid rgba(255, 255, 255, 0.6);
}

.dock-item-v8 {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    cursor: pointer;
    padding: 5px 14px;
    border-radius: 16px;
    transition: all 0.25s ease;
    min-width: 56px;
}

.dock-item-v8.active {
    background: rgba(232, 192, 201, 0.22);
}

.dock-icon-box {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.dock-icon-box svg {
    width: 22px;
    height: 22px;
}

.dock-item-v8 span {
    font-size: 9px;
    font-weight: 500;
    color: #B8A9AC;
}

.dock-item-v8.active span {
    color: #D9A3AF;
    font-weight: 600;
}

/* ==========================================================================
   11. 分页指示点与弹窗
   ========================================================================== */
.page-dots-v8 {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 10px 0;
}

.page-dots-v8 span {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #D9A3AF;
    opacity: 0.2;
}

.page-dots-v8 span.active {
    opacity: 0.6;
    width: 12px;
    border-radius: 2px;
}

.version-text {
    position: absolute;
    top: calc(env(safe-area-inset-top, 44px) + 2px);
    right: 14px;
    font-size: 9px;
    color: #B8A9AC;
    opacity: 0.2;
}

.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
}

.card-input-row {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
}

.card-list {
    max-height: 200px;
    overflow-y: auto;
}

.card-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid rgba(217, 163, 175, 0.1);
}

/* ==========================================================================
   12. 滚动聚焦特效
   ========================================================================== */
.focusable-card {
    transition:
        transform 0.55s cubic-bezier(0.22, 0.61, 0.36, 1),
        box-shadow 0.55s cubic-bezier(0.22, 0.61, 0.36, 1),
        opacity 0.55s ease,
        filter 0.55s ease;
    will-change: transform, opacity;
}

.page-panel.has-focus .focusable-card:not(.card-focused) {
    transform: scale(0.988);
    opacity: 0.82;
    filter: brightness(0.98);
}

.card-focused {
    transform: translateY(-3px) scale(1.012) !important;
    box-shadow:
        0 18px 44px rgba(217, 163, 175, 0.24),
        0 6px 16px rgba(217, 163, 175, 0.14),
        0 2px 4px rgba(217, 163, 175, 0.06) !important;
    opacity: 1 !important;
    filter: brightness(1.01) !important;
    z-index: 3;
    position: relative;
}

.sec-item.card-focused {
    transform: translateY(-2px) scale(1.04) !important;
    background: #F5EEF0 !important;
    box-shadow: 0 8px 20px rgba(217, 163, 175, 0.18), 0 2px 6px rgba(217, 163, 175, 0.1) !important;
}

/* ==========================================================================
   共栖空间
   ========================================================================== */
.together-page {
    padding-top: 8px;
}

.together-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding: 4px 0;
}

.together-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
}

.together-icon {
    width: 20px;
    height: 20px;
    color: #D9A3AF;
}

.together-title {
    font-size: 22px;
    font-weight: 800;
    color: #4A3F41;
    letter-spacing: 0.3px;
}

.together-subtitle {
    font-size: 11px;
    color: #B8A9AC;
    font-weight: 400;
    letter-spacing: 1.5px;
    margin-top: 2px;
}

.together-days-badge {
    background: linear-gradient(135deg, #FEF0F3, #FCE4E8);
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 700;
    color: #D9A3AF;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(217, 163, 175, 0.12);
}

@keyframes avatarGlow {

    0%,
    100% {
        opacity: 0.6;
        transform: scale(1);
    }

    50% {
        opacity: 1;
        transform: scale(1.05);
    }
}

@keyframes heartbeat {

    0%,
    100% {
        transform: translate(-50%, -50%) scale(1);
    }

    14% {
        transform: translate(-50%, -50%) scale(1.2);
    }

    28% {
        transform: translate(-50%, -50%) scale(1);
    }

    42% {
        transform: translate(-50%, -50%) scale(1.15);
    }

    70% {
        transform: translate(-50%, -50%) scale(1);
    }
}

/* 关系数据横滑 */
.relation-slider {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 12px;
    scroll-snap-type: x mandatory;
    margin-bottom: 4px;
}

.relation-slider::-webkit-scrollbar {
    display: none;
}

.relation-card {
    flex-shrink: 0;
    width: 100px;
    border-radius: 22px;
    padding: 16px 14px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    scroll-snap-align: start;
    box-shadow: 0 6px 20px rgba(217, 163, 175, 0.1);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.5);
}

.relation-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(217, 163, 175, 0.16);
}

.rc-days {
    background: linear-gradient(135deg, #FEF0F3, #FCE4E8);
}

.rc-msg {
    background: linear-gradient(135deg, #F1EFF8, #E8DFF2);
}

.rc-streak {
    background: linear-gradient(135deg, #FDF9F2, #F5EAD0);
}

.rc-mood {
    background: linear-gradient(135deg, #EDF6FB, #D8EDF7);
}

.rc-label {
    font-size: 9px;
    color: #B8A9AC;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

.rc-value {
    font-size: 28px;
    font-weight: 800;
    color: #4A3F41;
    line-height: 1;
}

.rc-emoji {
    font-size: 26px;
    font-weight: 400;
}

.rc-unit {
    font-size: 10px;
    color: #6B5B5E;
}

/* 时间轴 */
.timeline-wrap {
    padding-bottom: 8px;
}

.timeline-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 32px 0 20px;
    color: #D4C8CA;
    font-size: 12px;
    text-align: center;
    line-height: 1.6;
}

.timeline-empty svg {
    width: 32px;
    height: 32px;
    margin-bottom: 4px;
    opacity: 0.5;
}

.timeline-list {
    position: relative;
    padding-left: 16px;
}

.timeline-list::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 6px;
    bottom: 6px;
    width: 1px;
    background: linear-gradient(180deg, #E8C0C9, transparent);
}

.timeline-item {
    display: flex;
    gap: 12px;
    margin-bottom: 14px;
    position: relative;
    animation: fadeUp 0.4s ease backwards;
}

.tl-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #E8C0C9;
    flex-shrink: 0;
    margin-top: 4px;
    position: relative;
    left: -19px;
    box-shadow: 0 0 0 3px rgba(232, 192, 201, 0.2);
}

.tl-content {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-left: -8px;
}

.tl-date {
    font-size: 10px;
    color: #B8A9AC;
    font-weight: 600;
    letter-spacing: 0.3px;
}

.tl-text {
    font-size: 13px;
    color: #4A3F41;
    line-height: 1.5;
}

.timeline-add-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(232, 192, 201, 0.1);
    border: 1px dashed rgba(232, 192, 201, 0.4);
    border-radius: 16px;
    padding: 10px 16px;
    font-size: 12px;
    color: #D9A3AF;
    cursor: pointer;
    width: 100%;
    justify-content: center;
    font-family: inherit;
    transition: background 0.2s;
    margin-top: 4px;
}

.timeline-add-btn:active {
    background: rgba(232, 192, 201, 0.2);
}

.timeline-add-btn svg {
    width: 16px;
    height: 16px;
}

/* 收藏入口 */
.bookmark-entry {
    display: flex;
    align-items: center;
    gap: 14px;
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-radius: 20px;
    padding: 14px 16px;
    box-shadow: 0 6px 20px rgba(217, 163, 175, 0.08);
    cursor: pointer;
    margin-bottom: 4px;
    border: 1px solid rgba(255, 240, 242, 0.5);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.bookmark-entry:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(217, 163, 175, 0.14);
}

.bm-icons {
    display: flex;
    gap: 6px;
}

.bm-icons svg {
    width: 20px;
    height: 20px;
}

.bm-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.bm-title {
    font-size: 13px;
    font-weight: 700;
    color: #4A3F41;
}

.bm-sub {
    font-size: 11px;
    color: #B8A9AC;
}

.bm-arrow {
    width: 16px;
    height: 16px;
}

/* 月日历 */
.calendar-card {
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-radius: 24px;
    padding: 18px 16px;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.1);
    margin-bottom: 4px;
    border: 1px solid rgba(255, 240, 242, 0.5);
}

.cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
}

.cal-nav {
    width: 28px;
    height: 28px;
    border: none;
    background: rgba(232, 192, 201, 0.12);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.cal-nav svg {
    width: 14px;
    height: 14px;
    stroke: #D9A3AF;
}

.cal-title {
    font-size: 14px;
    font-weight: 700;
    color: #4A3F41;
}

.cal-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-bottom: 8px;
}

.cal-weekdays span {
    text-align: center;
    font-size: 10px;
    color: #B8A9AC;
    font-weight: 600;
    padding: 4px 0;
}

.cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
}

.cal-day {
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    font-size: 12px;
    color: #4A3F41;
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
    gap: 2px;
}

.cal-day:hover {
    background: rgba(232, 192, 201, 0.12);
}

.cal-empty {
    pointer-events: none;
}

/* 今天 */
.cal-today {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    font-weight: 700;
}

.cal-today:hover {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
}

/* 经期 */
.cal-period {
    background: rgba(232, 192, 201, 0.18);
}

/* 有记录：最明显的视觉变化 */
.cal-has-event {
    background: rgba(232, 192, 201, 0.15);
    font-weight: 700;
    color: #D9A3AF;
}

/* 有记录的格子：只加底部小线 */
.cal-has-event::after {
    content: '';
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #D9A3AF;
}

.cal-today.cal-has-event::after {
    background: rgba(255, 255, 255, 0.8);
}

/* 状态点：更大更深，放在右上角 */
.cal-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    right: 2px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

/* 日期弹窗 */
.day-panel-overlay {
    position: fixed;
    inset: 0;
    background: rgba(74, 63, 65, 0.25);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 20px;
}

.day-panel {
    background: rgba(255, 252, 252, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 28px;
    padding: 22px 20px;
    width: 100%;
    max-width: 340px;
    box-shadow: 0 20px 60px rgba(217, 163, 175, 0.22);
    border: 1px solid rgba(255, 240, 242, 0.6);
    animation: slideUp 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
    max-height: 80vh;
    overflow-y: auto;
}

@keyframes slideUp {
    from {
        transform: translateY(40px);
        opacity: 0;
    }

    to {
        transform: translateY(0);
        opacity: 1;
    }
}


.day-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.day-panel-date {
    font-size: 15px;
    font-weight: 700;
    color: #4A3F41;
}

.day-panel-close {
    width: 28px;
    height: 28px;
    border: none;
    background: rgba(232, 192, 201, 0.15);
    border-radius: 50%;
    font-size: 16px;
    color: #B8A9AC;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.dp-label {
    font-size: 11px;
    color: #B8A9AC;
    font-weight: 600;
    margin-bottom: 8px;
    display: block;
}

.day-status-row {
    margin-bottom: 16px;
}

.status-options {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.status-opt {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: #F8F3F4;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
}

.status-opt:active {
    transform: scale(0.92);
}

.status-opt.active {
    border-color: #E8C0C9;
    background: rgba(232, 192, 201, 0.15);
}

.dp-events {
    margin-bottom: 12px;
    min-height: 32px;
}

.dp-event-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(217, 163, 175, 0.1);
    font-size: 13px;
    color: #4A3F41;
}

.dp-event-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #E8C0C9;
    flex-shrink: 0;
}

.dp-event-del {
    margin-left: auto;
    background: none;
    border: none;
    color: #D4C8CA;
    font-size: 16px;
    cursor: pointer;
}

.dp-empty {
    font-size: 12px;
    color: #D4C8CA;
    text-align: center;
    padding: 8px 0;
}

.dp-add-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.dp-input {
    flex: 1;
    height: 36px;
    border: 1px solid rgba(232, 192, 201, 0.3);
    border-radius: 12px;
    padding: 0 12px;
    font-size: 13px;
    background: #FFF8F9;
    outline: none;
    color: #4A3F41;
    font-family: inherit;
}

.dp-input::placeholder {
    color: #D4C8CA;
}

.dp-add-btn {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* AI 画像洞察 */
.insights-wrap {
    padding-bottom: 8px;
}

.insights-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 32px 0 20px;
    color: #D4C8CA;
    font-size: 12px;
    text-align: center;
    line-height: 1.6;
}

.insights-empty svg {
    width: 32px;
    height: 32px;
    margin-bottom: 4px;
    opacity: 0.5;
}

.insights-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.insight-group-title {
    font-size: 10px;
    color: #B8A9AC;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 10px;
    padding-left: 4px;
}

.insight-item {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
    animation: fadeUp 0.4s ease backwards;
}

.insight-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: linear-gradient(135deg, #E8C0C9, #D8CDEA);
    flex-shrink: 0;
    margin-top: 8px;
    box-shadow: 0 0 0 3px rgba(232, 192, 201, 0.2);
}

.insight-card {
    flex: 1;
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-radius: 16px;
    padding: 12px 14px;
    box-shadow: 0 4px 14px rgba(217, 163, 175, 0.08);
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.insight-text {
    font-size: 13px;
    color: #4A3F41;
    line-height: 1.6;
    margin-bottom: 4px;
}

.insight-date {
    font-size: 10px;
    color: #B8A9AC;
}

/* 收藏弹窗内容 */
.bookmark-list {
    max-height: 300px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
}

.bookmark-item {
    background: #FFF8F9;
    border-radius: 14px;
    padding: 12px 14px;
    border: 1px solid rgba(232, 192, 201, 0.2);
}

.bm-type-tag {
    font-size: 9px;
    color: #D9A3AF;
    font-weight: 700;
    background: rgba(232, 192, 201, 0.15);
    padding: 2px 8px;
    border-radius: 8px;
    margin-bottom: 6px;
    display: inline-block;
}

.bm-content {
    font-size: 13px;
    color: #4A3F41;
    line-height: 1.5;
    margin: 6px 0 4px;
}

.bm-time {
    font-size: 10px;
    color: #B8A9AC;
}

/* 洞察操作 */
.insight-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
}

.insight-btns {
    display: flex;
    gap: 6px;
}

.insight-btn {
    background: none;
    border: none;
    font-size: 11px;
    color: #D4C8CA;
    cursor: pointer;
    padding: 3px 8px;
    border-radius: 8px;
    font-family: inherit;
    transition: all 0.2s ease;
}

.insight-btn:hover {
    background: #F8F3F4;
    color: #B8A9AC;
}

.insight-btn-save {
    color: #D9A3AF;
}

.insight-btn-save:hover {
    background: rgba(232, 192, 201, 0.12);
    color: #D9A3AF;
}

.insight-btn-del:hover {
    background: rgba(232, 192, 201, 0.1);
    color: #E8C0C9;
}

.insight-edit-input {
    width: 100%;
    border: 1px solid rgba(232, 192, 201, 0.35);
    border-radius: 12px;
    padding: 8px 10px;
    font-size: 13px;
    font-family: inherit;
    resize: none;
    min-height: 60px;
    outline: none;
    color: #4A3F41;
    background: #FFF8F9;
    transition: border-color 0.2s;
    line-height: 1.5;
}

.insight-edit-input:focus {
    border-color: rgba(232, 192, 201, 0.6);
}

/* 时间轴操作 */
.tl-actions {
    display: flex;
    gap: 6px;
    margin-top: 5px;
}

.tl-btn {
    background: none;
    border: none;
    font-size: 11px;
    color: #D4C8CA;
    cursor: pointer;
    padding: 3px 8px;
    border-radius: 8px;
    font-family: inherit;
    transition: all 0.2s ease;
}

.tl-btn:hover {
    background: #F8F3F4;
    color: #B8A9AC;
}

.tl-btn-save {
    color: #D9A3AF;
}

.tl-btn-save:hover {
    background: rgba(232, 192, 201, 0.12);
    color: #D9A3AF;
}

.tl-btn-del:hover {
    background: rgba(232, 192, 201, 0.1);
    color: #E8C0C9;
}

.tl-edit-input {
    width: 100%;
    border: 1px solid rgba(232, 192, 201, 0.35);
    border-radius: 12px;
    padding: 8px 10px;
    font-size: 13px;
    font-family: inherit;
    resize: none;
    min-height: 60px;
    outline: none;
    color: #4A3F41;
    background: #FFF8F9;
    transition: border-color 0.2s;
    line-height: 1.5;
    margin-top: 4px;
}

.tl-edit-input:focus {
    border-color: rgba(232, 192, 201, 0.6);
}

.tl-text {
    font-size: 13px;
    color: #4A3F41;
    line-height: 1.5;
}

/* section 标题手动添加按钮 */
.section-add-btn {
    float: right;
    background: none;
    border: none;
    font-size: 10px;
    color: #D9A3AF;
    cursor: pointer;
    font-family: inherit;
    font-weight: 600;
    letter-spacing: 0.3px;
    padding: 2px 6px;
    border-radius: 8px;
    transition: background 0.2s;
}

.section-add-btn:hover {
    background: rgba(232, 192, 201, 0.12);
}

/* 换 char 弹窗 */
.char-switch-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;
    margin-top: 12px;
}

.char-switch-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 18px;
    cursor: pointer;
    border: 1.5px solid transparent;
    transition: all 0.25s ease;
}

.char-switch-item:hover {
    background: #FFF8F9;
}

.char-switch-item.active {
    border-color: rgba(232, 192, 201, 0.4);
    background: rgba(232, 192, 201, 0.06);
}

.cs-avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: linear-gradient(145deg, #FDE4E8, #F8D0D6);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(217, 163, 175, 0.12);
}

.cs-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.cs-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.cs-name {
    font-size: 13px;
    font-weight: 700;
    color: #4A3F41;
}

.cs-desc {
    font-size: 11px;
    color: #B8A9AC;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.cs-check {
    color: #D9A3AF;
    font-weight: 700;
    font-size: 15px;
    flex-shrink: 0;
}

/* 双人视角切换 */
.dp-view-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 16px;
    background: #F8F3F4;
    border-radius: 16px;
    padding: 4px;
}

.dp-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 12px;
    color: #B8A9AC;
    transition: all 0.25s ease;
}

.dp-tab.active {
    background: #FFFFFF;
    color: #4A3F41;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(217, 163, 175, 0.1);
}

.dp-tab-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #FDE4E8;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
}

.dp-tab-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* 日程事件编辑 */
.dp-event-text {
    flex: 1;
    font-size: 13px;
    color: #4A3F41;
    cursor: pointer;
    line-height: 1.4;
    transition: color 0.2s;
}

.dp-event-text:hover {
    color: #D9A3AF;
}

.dp-edit-input {
    flex: 1;
    border: 1px solid rgba(232, 192, 201, 0.35);
    border-radius: 8px;
    padding: 4px 8px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    background: #FFF8F9;
    color: #4A3F41;
}

.avatar-edit-section {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    margin: 12px 0;
}

.avatar-preview {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(145deg, #EDF6FB, #D8CDEA);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    overflow: hidden;
    flex-shrink: 0;
    border: 2px solid rgba(232, 192, 201, 0.3);
}

.avatar-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-options {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.avatar-upload-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.avatar-upload-label {
    font-size: 11px;
    color: #B8A9AC;
}

.avatar-upload-btn {
    background: rgba(232, 192, 201, 0.15);
    border: 1px solid rgba(232, 192, 201, 0.3);
    border-radius: 12px;
    padding: 6px 14px;
    font-size: 11px;
    color: #D9A3AF;
    cursor: pointer;
    font-weight: 600;
}

.avatar-upload-btn:hover {
    background: rgba(232, 192, 201, 0.25);
}

/* ===== 共语页 Echoes ===== */
.echoes-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
    padding: 4px 0;
}

.echoes-icon-wrap {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: rgba(232, 192, 201, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #D9A3AF;
}

.echoes-icon-wrap svg {
    width: 20px;
    height: 20px;
}

.echoes-title-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.echoes-title {
    font-size: 22px;
    font-weight: 800;
    color: #4A3F41;
    line-height: 1.1;
}

.echoes-sub {
    font-size: 10px;
    color: #B8A9AC;
    letter-spacing: 2px;
}

.echoes-count {
    background: rgba(232, 192, 201, 0.15);
    color: #D9A3AF;
    font-size: 12px;
    font-weight: 700;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 连接卡片 */
.echoes-connect-card {
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-radius: 26px;
    padding: 20px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 16px;
    box-shadow: 0 8px 24px rgba(217, 163, 175, 0.1);
    border: 1px solid rgba(255, 240, 242, 0.6);
    position: relative;
    overflow: hidden;
}

.echoes-connect-card::after {
    content: '';
    position: absolute;
    top: -60%;
    left: -80%;
    width: 60%;
    height: 220%;
    background: linear-gradient(105deg, transparent 30%, rgba(255, 255, 255, 0.15) 50%, transparent 70%);
    transform: skewX(-15deg);
    animation: heroShine 6s ease-in-out infinite;
    pointer-events: none;
}

.ec-side {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    cursor: pointer;
}

.ec-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    overflow: hidden;
    position: relative;
}

.ec-avatar::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: linear-gradient(135deg, #E8C0C9, #D8CDEA, #98CBEA);
    z-index: -1;
    animation: avatarGlow 3s ease-in-out infinite;
}

.ec-avatar-user {
    background: linear-gradient(145deg, #EDF6FB, #D8CDEA);
}

.ec-avatar-char {
    background: linear-gradient(145deg, #FDE4E8, #F8D0D6);
}

.ec-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.ec-name {
    font-size: 11px;
    font-weight: 700;
    color: #4A3F41;
}

.ec-hint {
    font-size: 9px;
    color: #D4C8CA;
}

/* 心率线 */
.ec-line-wrap {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 60px;
    cursor: pointer;
    gap: 6px;
}

.ec-line-svg {
    width: 100%;
    height: 36px;
}

.ec-path {
    stroke-dasharray: 180;
    stroke-dashoffset: 180;
    animation: drawLine 2.2s ease-in-out infinite;
}

.ec-heart {
    position: absolute;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -60%);
    width: 20px;
    height: 20px;
    animation: heartbeat 1.4s ease-in-out infinite;
    filter: drop-shadow(0 2px 4px rgba(232, 192, 201, 0.5));
}

.ec-heart svg {
    width: 100%;
    height: 100%;
}

.ec-switch-hint {
    font-size: 9px;
    color: #D4C8CA;
    margin-top: 2px;
}

/* 分组 tabs */
.echoes-group-tabs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 2px 0 12px;
    margin-bottom: 4px;
}

.echoes-group-tabs::-webkit-scrollbar {
    display: none;
}

.eg-tab {
    flex-shrink: 0;
    padding: 5px 14px;
    border-radius: 16px;
    font-size: 11px;
    color: #B8A9AC;
    font-weight: 600;
    background: #F8F3F4;
    cursor: pointer;
    transition: all 0.2s;
}

.eg-tab.active {
    background: rgba(232, 192, 201, 0.2);
    color: #D9A3AF;
}

/* 对话列表 */
.chat-conv-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.conv-item-v8 {
    display: flex;
    align-items: center;
    gap: 14px;
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-radius: 22px;
    padding: 14px 16px;
    box-shadow: 0 6px 20px rgba(217, 163, 175, 0.08);
    cursor: pointer;
    border: 1px solid rgba(255, 240, 242, 0.5);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    animation: fadeUp 0.4s ease backwards;
}

.conv-item-v8:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 26px rgba(217, 163, 175, 0.14);
}

.conv-item-v8:active {
    transform: scale(0.98);
}

.conv-avatar-v8 {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(145deg, #FDE4E8, #F8D0D6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    overflow: visible;
    flex-shrink: 0;
    position: relative;
}

.conv-avatar-v8 img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.conv-avatar-glow::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(232, 192, 201, 0.4), rgba(216, 205, 234, 0.3), rgba(152, 203, 234, 0.2));
    z-index: -1;
    animation: avatarGlow 3s ease-in-out infinite;
}

.conv-online-dot {
    position: absolute;
    bottom: 1px;
    right: 1px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #8FAA98;
    border: 2px solid #FFFBFA;
    animation: onlinePulse 2.5s ease-in-out infinite;
}

@keyframes onlinePulse {

    0%,
    100% {
        opacity: 1;
        transform: scale(1);
    }

    50% {
        opacity: 0.6;
        transform: scale(0.85);
    }
}

.conv-info-v8 {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.conv-name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.conv-name {
    font-size: 14px;
    font-weight: 700;
    color: #4A3F41;
}

.conv-time-v8 {
    font-size: 10px;
    color: #D4C8CA;
}

.conv-preview-v8 {
    font-size: 12px;
    color: #B8A9AC;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.conv-unread {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
    box-shadow: 0 2px 6px rgba(217, 163, 175, 0.3);
    flex-shrink: 0;
}

.conv-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 40px 0;
    color: #D4C8CA;
    font-size: 12px;
}

.conv-empty svg {
    width: 36px;
    height: 36px;
    opacity: 0.5;
}

/* 入场动画 */
.conv-fade-enter-active {
    transition: all 0.4s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.conv-fade-enter-from {
    opacity: 0;
    transform: translateY(12px);
}

/* 搜索栏 */
.chat-search-v8 {
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 18px;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    box-shadow: 0 4px 14px rgba(217, 163, 175, 0.06);
    border: 1px solid rgba(255, 240, 242, 0.5);
}

.chat-search-v8 svg {
    width: 16px;
    height: 16px;
    stroke: #B8A9AC;
    flex-shrink: 0;
}

.chat-search-v8 input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 14px;
    color: #4A3F41;
    font-family: inherit;
}

.chat-search-v8 input::placeholder {
    color: #D4C8CA;
}

.conv-pin-btn {
    background: none;
    border: none;
    font-size: 10px;
    color: #D4C8CA;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 10px;
    font-family: inherit;
    transition: all 0.2s;
    flex-shrink: 0;
}

.conv-pin-btn:hover {
    background: rgba(232, 192, 201, 0.12);
    color: #D9A3AF;
}

.cl-add-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(232, 192, 201, 0.15);
    border: 1px solid rgba(232, 192, 201, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.cl-add-btn svg {
    width: 16px;
    height: 16px;
    stroke: #D9A3AF;
}

.file-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 8px 0;
}

.file-label {
    font-size: 11px;
    color: #B8A9AC;
}

.file-input {
    font-size: 11px;
    color: #B8A9AC;
}

.echoes-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

.cl-add-btn {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(232, 192, 201, 0.15);
    border: 1px solid rgba(232, 192, 201, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;
}

.cl-add-btn:hover {
    background: rgba(232, 192, 201, 0.25);
}

.cl-add-btn svg {
    width: 15px;
    height: 15px;
    stroke: #D9A3AF;
}

.file-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 8px 0;
}

.file-label {
    font-size: 11px;
    color: #B8A9AC;
}

.file-input {
    font-size: 11px;
    color: #B8A9AC;
}

/* 置顶卡片样式 */
.conv-item-v8.conv-pinned {
    background: rgba(255, 248, 250, 0.8);
    border-color: rgba(232, 192, 201, 0.3);
    box-shadow: 0 6px 20px rgba(217, 163, 175, 0.14);
}

.conv-pin-badge {
    font-size: 9px;
    font-weight: 700;
    color: #D9A3AF;
    background: rgba(232, 192, 201, 0.18);
    border: 1px solid rgba(232, 192, 201, 0.3);
    padding: 3px 8px;
    border-radius: 10px;
    flex-shrink: 0;
    letter-spacing: 0.3px;
}

/* 长按菜单 */
.ctx-overlay {
    position: fixed;
    inset: 0;
    z-index: 500;
    background: rgba(74, 63, 65, 0.15);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
}

.ctx-menu {
    position: fixed;
    background: rgba(255, 252, 252, 0.96);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 22px;
    padding: 8px;
    min-width: 200px;
    box-shadow:
        0 20px 60px rgba(74, 63, 65, 0.18),
        0 4px 12px rgba(74, 63, 65, 0.08);
    border: 1px solid rgba(255, 240, 242, 0.6);
    animation: ctxAppear 0.2s cubic-bezier(0.22, 0.61, 0.36, 1);
    z-index: 501;
}

@keyframes ctxAppear {
    from {
        opacity: 0;
        transform: scale(0.92);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.ctx-persona-info {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px 8px;
}

.ctx-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(145deg, #FDE4E8, #F8D0D6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    overflow: hidden;
    flex-shrink: 0;
}

.ctx-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.ctx-name {
    font-size: 13px;
    font-weight: 700;
    color: #4A3F41;
}

.ctx-divider {
    height: 1px;
    background: rgba(217, 163, 175, 0.15);
    margin: 4px 8px;
}

.ctx-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 11px 14px;
    border: none;
    background: none;
    font-size: 13px;
    color: #4A3F41;
    cursor: pointer;
    border-radius: 14px;
    font-family: inherit;
    transition: background 0.2s;
    text-align: left;
}

.ctx-item:hover {
    background: rgba(232, 192, 201, 0.1);
}

.ctx-item svg {
    width: 16px;
    height: 16px;
    stroke: #B8A9AC;
    flex-shrink: 0;
}

.ctx-item:hover svg {
    stroke: #D9A3AF;
}

.ctx-danger-light {
    color: #C88B98;
}

.ctx-danger-light svg {
    stroke: #E8C0C9;
}

.ctx-danger-light:hover {
    background: rgba(232, 192, 201, 0.12);
}

.ctx-danger {
    color: #C07070;
}

.ctx-danger svg {
    stroke: #E0A0A0;
}

.ctx-danger:hover {
    background: rgba(192, 112, 112, 0.08);
}

/* 更多按钮 */
.sec-more {
    background: rgba(232, 192, 201, 0.1);
    border: 1px dashed rgba(232, 192, 201, 0.4);
    padding: 7px 10px;
}

.sec-more:hover {
    background: rgba(232, 192, 201, 0.18);
}

.sec-more svg {
    stroke: #D9A3AF;
}

.more-apps-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: transparent;
}

.more-apps-card {
    position: absolute;
    bottom: calc(100% + 10px);
    right: 0;
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 28px;
    padding: 8px 10px;
    box-shadow:
        0 8px 32px rgba(180, 140, 150, 0.22),
        0 2px 8px rgba(255, 255, 255, 0.8) inset;
    border: 1px solid rgba(255, 255, 255, 0.6);
    z-index: 51;
}

.more-apps-row {
    display: flex;
    flex-direction: row;
    gap: 8px;
}

.more-app-sec {
    flex-shrink: 0;
}

.more-pop-enter-active {
    transition: all 0.25s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.more-pop-leave-active {
    transition: all 0.18s ease;
}

.more-pop-enter-from {
    opacity: 0;
    transform: translateY(8px) scale(0.95);
}

.more-pop-leave-to {
    opacity: 0;
    transform: translateY(4px) scale(0.97);
}

.more-apps-title {
    font-size: 10px;
    color: #B8A9AC;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 12px;
    padding: 0 2px;
}

.more-apps-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.more-app-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 8px;
    border-radius: 16px;
    cursor: pointer;
    transition: background 0.2s;
    background: rgba(248, 243, 244, 0.6);
}

.more-app-item:hover {
    background: rgba(232, 192, 201, 0.12);
}

.more-app-item:active {
    transform: scale(0.95);
}

.more-app-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.more-app-icon svg {
    width: 20px;
    height: 20px;
}

.more-app-item span {
    font-size: 11px;
    font-weight: 600;
    color: #6B5B5E;
}

/* 弹出动画 */
.more-pop-enter-active {
    transition: all 0.25s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.more-pop-leave-active {
    transition: all 0.18s ease;
}

.more-pop-enter-from {
    opacity: 0;
    transform: translateY(8px) scale(0.95);
}

.more-pop-leave-to {
    opacity: 0;
    transform: translateY(4px) scale(0.97);
}

.secondary-bar-v8 {
    position: relative;
    display: flex;
    flex-direction: row;
    gap: 8px;
    margin-bottom: 16px;
    overflow-x: visible;
    /* 改成 visible 让浮层不被裁剪 */
    padding: 2px 0;
}

/* 情侣卡片 */
.couple-card {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 28px;
    overflow: hidden;
    margin-bottom: 20px;
    box-shadow:
        0 16px 48px rgba(217, 163, 175, 0.22),
        0 6px 16px rgba(217, 163, 175, 0.12);
    cursor: pointer;
}

/* 底层背景 */
.couple-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
}

.couple-bg-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.couple-bg-default {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #FDE4E8 0%, #EDD5EA 40%, #D8CDEA 100%);
    position: relative;
    overflow: hidden;
}

.couple-bg-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(40px);
}

.couple-bg-blob.b1 {
    width: 180px;
    height: 180px;
    background: rgba(255, 200, 210, 0.6);
    top: -40px;
    left: -40px;
}

.couple-bg-blob.b2 {
    width: 160px;
    height: 160px;
    background: rgba(200, 185, 230, 0.5);
    bottom: -30px;
    right: -30px;
}

.couple-bg-grid {
    position: absolute;
    inset: 0;
    background-image:
        repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(255, 255, 255, 0.08) 28px, rgba(255, 255, 255, 0.08) 29px),
        repeating-linear-gradient(90deg, transparent, transparent 28px, rgba(255, 255, 255, 0.08) 28px, rgba(255, 255, 255, 0.08) 29px);
}

/* 前卡磨砂夹层，占下半部分 */
.couple-front {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 58%;
    background: rgba(255, 255, 255, 0.52);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-top: 1px solid rgba(255, 255, 255, 0.7);
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px 20px 20px;
}

/* 头像区 */
.couple-avatars {
    display: flex;
    align-items: center;
    gap: 16px;
}

.couple-avatar-wrap {
    position: relative;
}

.couple-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(217, 163, 175, 0.25);
    border: 2.5px solid rgba(255, 255, 255, 0.9);
}

.ca-user {
    background: linear-gradient(145deg, #EDF6FB, #D8CDEA);
}

.ca-char {
    background: linear-gradient(145deg, #FDE4E8, #F8D0D6);
}

.couple-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.couple-avatar-wrap::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(232, 192, 201, 0.5), rgba(216, 205, 234, 0.4), rgba(152, 203, 234, 0.3));
    z-index: -1;
    animation: avatarGlow 3s ease-in-out infinite;
}

.couple-heart-mid {
    display: flex;
    align-items: center;
    justify-content: center;
    animation: heartbeat 1.6s ease-in-out infinite;
}

.couple-heart-mid svg {
    width: 20px;
    height: 20px;
}

/* 文案区 */
.couple-texts {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-align: center;
}

.couple-text-main {
    font-size: 15px;
    font-weight: 700;
    color: #4A3F41;
    letter-spacing: 0.5px;
}

.couple-text-days {
    font-size: 11px;
    color: #B8A9AC;
    letter-spacing: 0.3px;
}

.couple-days-num {
    color: #D9A3AF;
    font-weight: 700;
}

.couple-text-tagline {
    font-size: 11px;
    color: #C8B8BB;
    font-style: italic;
    letter-spacing: 0.5px;
    margin-top: 2px;
}

/* 编辑弹窗内容 */
.couple-bg-upload {
    display: flex;
    gap: 14px;
    margin-bottom: 14px;
    align-items: flex-start;
}

.couple-bg-preview {
    width: 72px;
    height: 72px;
    border-radius: 16px;
    background: linear-gradient(135deg, #FDE4E8, #D8CDEA);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: #B8A9AC;
    flex-shrink: 0;
}

.couple-bg-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.couple-upload-opts {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.couple-clear-btn {
    background: none;
    border: none;
    font-size: 11px;
    color: #E8C0C9;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    padding: 0;
}

/* 情侣卡片 */
.couple-card {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 28px;
    overflow: hidden;
    margin-bottom: 20px;
    box-shadow:
        0 16px 48px rgba(217, 163, 175, 0.22),
        0 6px 16px rgba(217, 163, 175, 0.12);
    cursor: pointer;
}

/* 底层背景 */
.couple-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
}

.couple-bg-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* 默认背景：更浅更透亮 */
.couple-bg-default {
    width: 100%;
    height: 100%;
    background: linear-gradient(145deg, #FFF0F3 0%, #F8EBF5 35%, #EDE8F8 65%, #E8F3FB 100%);
    position: relative;
    overflow: hidden;
}

.couple-bg-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(50px);
}

.couple-bg-blob.b1 {
    width: 200px;
    height: 200px;
    background: rgba(255, 210, 220, 0.45);
    top: -60px;
    left: -40px;
}

.couple-bg-blob.b2 {
    width: 180px;
    height: 180px;
    background: rgba(210, 200, 240, 0.35);
    bottom: -40px;
    right: -40px;
}

.couple-bg-grid {
    position: absolute;
    inset: 0;
    background-image:
        repeating-linear-gradient(0deg, transparent, transparent 32px, rgba(255, 255, 255, 0.12) 32px, rgba(255, 255, 255, 0.12) 33px),
        repeating-linear-gradient(90deg, transparent, transparent 32px, rgba(255, 255, 255, 0.12) 32px, rgba(255, 255, 255, 0.12) 33px);
}

/* 前卡：真正的玻璃质感，占下 48% */
.couple-front {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 48%;
    background: rgba(255, 255, 255, 0.28);
    backdrop-filter: saturate(180%) blur(22px);
    -webkit-backdrop-filter: saturate(180%) blur(22px);
    border-top: 1px solid rgba(255, 255, 255, 0.55);
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 20px 18px;
}

/* 头像区 */
.couple-avatars {
    display: flex;
    align-items: center;
    gap: 20px;
}

.couple-avatar-wrap {
    position: relative;
}

.couple-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    overflow: hidden;
    box-shadow:
        0 4px 16px rgba(217, 163, 175, 0.2),
        0 0 0 2.5px rgba(255, 255, 255, 0.85);
}

.ca-user {
    background: linear-gradient(145deg, #EDF6FB, #D8CDEA);
}

.ca-char {
    background: linear-gradient(145deg, #FDE4E8, #F8D0D6);
}

.couple-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.couple-avatar-wrap::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(232, 192, 201, 0.45), rgba(216, 205, 234, 0.35), rgba(152, 203, 234, 0.25));
    z-index: -1;
    animation: avatarGlow 3s ease-in-out infinite;
}

/* 中间爱心完全删掉，两个头像直接靠近 */
.couple-heart-mid {
    display: none;
}

/* 文案区 */
.couple-texts {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    text-align: center;
}

.couple-text-main {
    font-size: 14px;
    font-weight: 700;
    color: rgba(74, 63, 65, 0.9);
    letter-spacing: 0.8px;
}

.couple-text-days {
    font-size: 11px;
    color: rgba(184, 169, 172, 0.9);
    letter-spacing: 0.3px;
}

.couple-days-num {
    color: #D9A3AF;
    font-weight: 700;
}

.couple-text-tagline {
    font-size: 10px;
    color: rgba(200, 184, 187, 0.85);
    font-style: italic;
    letter-spacing: 0.8px;
    margin-top: 1px;
}

/* 编辑弹窗 */
.couple-bg-upload {
    display: flex;
    gap: 14px;
    margin-bottom: 14px;
    align-items: flex-start;
}

.couple-bg-preview {
    width: 72px;
    height: 72px;
    border-radius: 16px;
    background: linear-gradient(135deg, #FDE4E8, #D8CDEA);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: #B8A9AC;
    flex-shrink: 0;
}

.couple-bg-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.couple-upload-opts {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.couple-clear-btn {
    background: none;
    border: none;
    font-size: 11px;
    color: #E8C0C9;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    padding: 0;
}

.couple-text-input {
    border: none;
    background: transparent;
    outline: none;
    font-family: inherit;
    text-align: center;
    width: 100%;
    color: inherit;
    padding: 0;
}

.couple-text-input-main {
    font-size: 14px;
    font-weight: 700;
    color: rgba(74, 63, 65, 0.9);
    letter-spacing: 0.8px;
}

.couple-text-input-days {
    font-size: 11px;
    color: rgba(184, 169, 172, 0.9);
}

.couple-text-input-tagline {
    font-size: 10px;
    font-style: italic;
    color: rgba(200, 184, 187, 0.85);
    letter-spacing: 0.8px;
}

.save-toast {
    position: absolute;
    bottom: -40px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(232, 192, 201, 0.95);
    color: white;
    font-size: 12px;
    padding: 8px 16px;
    border-radius: 20px;
    box-shadow: 0 4px 12px rgba(217, 163, 175, 0.3);
    animation: toastFadeIn 0.3s ease;
}

@keyframes toastFadeIn {
    from {
        opacity: 0;
        transform: translateX(-50%) translateY(8px);
    }

    to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
}

/* 日历区域标题行 */
.calendar-section {
    margin-top: 16px;
}

.section-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.schedule-view-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    background: rgba(232, 192, 201, 0.12);
    border: 1px solid rgba(232, 192, 201, 0.3);
    border-radius: 14px;
    padding: 5px 12px;
    font-size: 11px;
    color: #D9A3AF;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
}

.schedule-view-btn svg {
    width: 13px;
    height: 13px;
    stroke: #D9A3AF;
}

/* 日程视图弹窗 */
.schedule-overlay {
    position: fixed;
    inset: 0;
    background: rgba(74, 63, 65, 0.25);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 200;
    display: flex;
    align-items: flex-end;
    padding: 0 12px 32px;
}

.schedule-panel {
    background: rgba(255, 252, 252, 0.96);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 28px;
    width: 100%;
    max-height: 72vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(217, 163, 175, 0.25);
    border: 1px solid rgba(255, 240, 242, 0.6);
    animation: slideUp 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
    overflow: hidden;
}

/* 头部 */
.schedule-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px 12px;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(217, 163, 175, 0.1);
}

.schedule-range-tabs {
    display: flex;
    gap: 6px;
    background: #F8F3F4;
    border-radius: 16px;
    padding: 3px;
}

.sr-tab {
    padding: 6px 14px;
    border-radius: 13px;
    border: none;
    background: none;
    font-size: 12px;
    font-weight: 600;
    color: #B8A9AC;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
}

.sr-tab.active {
    background: #FFFFFF;
    color: #D9A3AF;
    box-shadow: 0 2px 8px rgba(217, 163, 175, 0.12);
}

.schedule-close {
    width: 28px;
    height: 28px;
    border: none;
    background: rgba(232, 192, 201, 0.15);
    border-radius: 50%;
    font-size: 16px;
    color: #B8A9AC;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 双栏标题 */
.schedule-cols-header {
    display: flex;
    align-items: center;
    padding: 10px 18px;
    flex-shrink: 0;
}

.sch-col-title {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    font-weight: 700;
    color: #4A3F41;
}

.sch-col-title:last-child {
    justify-content: flex-end;
}

.sch-col-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    overflow: hidden;
}

.ca-user-sm {
    background: linear-gradient(145deg, #EDF6FB, #D8CDEA);
}

.ca-char-sm {
    background: linear-gradient(145deg, #FDE4E8, #F8D0D6);
}

.sch-col-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.sch-col-divider {
    width: 1px;
    height: 24px;
    background: rgba(217, 163, 175, 0.2);
    margin: 0 12px;
    flex-shrink: 0;
}

/* 内容区 */
.schedule-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 14px 20px;
}

.schedule-content::-webkit-scrollbar {
    display: none;
}

/* 1天时间轴 */
.schedule-timeline-wrap {
    display: flex;
    gap: 0;
    min-height: 200px;
}

.sch-timeline-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 8px 8px 0;
}

.sch-col-right {
    padding: 8px 0 8px 8px;
    align-items: flex-end;
}

.sch-center-axis {
    width: 40px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    padding-top: 8px;
}

.sch-axis-line {
    flex: 1;
    width: 1.5px;
    background: linear-gradient(180deg, #E8C0C9, rgba(232, 192, 201, 0.1));
    border-radius: 1px;
}

.sch-axis-date {
    font-size: 9px;
    color: #D9A3AF;
    font-weight: 700;
    writing-mode: vertical-rl;
    letter-spacing: 1px;
    padding: 8px 0;
}

.sch-tl-item {
    display: flex;
    align-items: center;
    gap: 6px;
}

.sch-tl-right {
    flex-direction: row-reverse;
}

.sch-tl-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #E8C0C9;
    flex-shrink: 0;
}

.sch-dot-char {
    background: #D8CDEA;
}

.sch-tl-card {
    background: rgba(232, 192, 201, 0.1);
    border-radius: 10px;
    padding: 6px 10px;
    font-size: 11px;
    color: #4A3F41;
    line-height: 1.4;
    flex: 1;
}

.sch-tl-right .sch-tl-card {
    background: rgba(216, 205, 234, 0.12);
    text-align: right;
}

/* 7天/30天列表 */
.schedule-list-wrap {
    display: flex;
    gap: 0;
}

.sch-list-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 8px 4px 0;
}

.sch-list-col:last-child {
    padding: 4px 0 4px 8px;
}

.sch-list-divider {
    width: 1px;
    background: rgba(217, 163, 175, 0.15);
    flex-shrink: 0;
    margin: 4px 0;
}

.sch-date-group {
    margin-bottom: 10px;
}

.sch-date-label {
    font-size: 9px;
    font-weight: 700;
    color: #B8A9AC;
    letter-spacing: 0.5px;
    margin-bottom: 5px;
    padding-left: 2px;
}

.sch-list-item {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    padding: 5px 8px;
    border-radius: 10px;
    background: rgba(232, 192, 201, 0.08);
    font-size: 11px;
    color: #4A3F41;
    line-height: 1.4;
    margin-bottom: 3px;
}

.sch-list-item-char {
    background: rgba(216, 205, 234, 0.1);
}

.sch-list-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #E8C0C9;
    flex-shrink: 0;
    margin-top: 3px;
}

.sch-empty {
    font-size: 11px;
    color: #D4C8CA;
    text-align: center;
    padding: 24px 0;
}

.cal-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 4px 2px;
    border-top: 1px solid rgba(217, 163, 175, 0.1);
    margin-top: 8px;
}

.cal-legend-item {
    display: flex;
    align-items: center;
    gap: 3px;
    background: #F8F3F4;
    border-radius: 10px;
    padding: 3px 8px;
}

.cal-legend-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
}

.cal-legend-emoji {
    font-size: 11px;
}

.cal-legend-count {
    font-size: 10px;
    color: #B8A9AC;
    font-weight: 700;
}
</style>
