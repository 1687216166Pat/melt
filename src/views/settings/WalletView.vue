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
            <span class="settings-title">钱包</span>
            <div style="width:36px;"></div>
        </div>

        <!-- 角色切换，加在 settings-nav 和 sub-content 之间 -->
        <div class="persona-scroll">
            <div v-for="p in personas" :key="p.id" class="persona-chip" :class="{ active: currentPersona === p.id }"
                @click="switchPersona(p.id)">
                <div class="persona-chip-avatar">
                    <img v-if="p.avatarUrl" :src="p.avatarUrl" />
                    <span v-else>{{ p.avatar || '💬' }}</span>
                </div>
                <span>{{ p.note || p.name }}</span>
            </div>
        </div>

        <div class="sub-content">

            <!-- 余额卡片 -->
            <div class="wallet-hero">
                <div class="wallet-hero-bg"></div>
                <div class="wallet-balance-label">总余额</div>
                <div class="wallet-balance">
                    <span class="balance-currency">¥</span>
                    <span class="balance-amount">{{ balance.toFixed(2) }}</span>
                </div>
                <div class="wallet-hero-btns">
                    <button class="wallet-btn" @click="showTransferIn = true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                            <path d="M5 21h14" />
                        </svg>
                        收款
                    </button>
                    <button class="wallet-btn" @click="showTransferOut = true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <polyline points="7 16 12 21 17 16" />
                            <line x1="12" y1="21" x2="12" y2="9" />
                            <path d="M5 3h14" />
                        </svg>
                        转出
                    </button>
                </div>
            </div>

            <!-- 礼物收藏 -->
            <div class="section-label-sm">收到的礼物</div>
            <div class="section-label-sm">礼物记录</div>
            <div v-if="gifts.length === 0" class="wallet-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="#D4C8CA" stroke-width="1.2" stroke-linecap="round">
                    <path d="M20 12v10H4V12" />
                    <path d="M22 7H2v5h20V7z" />
                    <path d="M12 22V7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
                <p>还没有收到礼物</p>
                <p>和 char 聊天时，他可能会送你惊喜</p>
            </div>
            <div v-else class="gift-list">
                <div v-for="(gift, idx) in gifts" :key="idx" class="gift-item">
                    <div class="gift-icon">{{ gift.emoji }}</div>
                    <div class="gift-info">
                        <div class="gift-name">{{ gift.name }}</div>
                        <div v-if="gift.content" class="gift-content-text">内含：{{ gift.content }}</div>
                        <div class="gift-from">
                            {{ gift.direction === 'ai_to_user' ? `${gift.from} → 我` : `我 → ${gift.to}` }}
                            · {{ gift.date }}
                        </div>
                    </div>
                    <div v-if="gift.message" class="gift-note">「{{ gift.message }}」</div>
                </div>
            </div>

            <!-- 交易记录 -->
            <div class="section-label-sm">交易记录</div>
            <div v-if="transactions.length === 0" class="wallet-empty small">
                暂无交易记录
            </div>
            <div v-else class="settings-group">
                <div v-for="(tx, idx) in transactions" :key="idx" class="settings-group-item">
                    <div class="tx-icon" :class="tx.type === 'in' ? 'tx-in' : 'tx-out'">
                        <svg v-if="tx.type === 'in'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round">
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <polyline points="7 16 12 21 17 16" />
                            <line x1="12" y1="21" x2="12" y2="9" />
                        </svg>
                    </div>
                    <div class="sgi-label-wrap">
                        <div class="sgi-label">{{ tx.desc }}</div>
                        <div class="sgi-desc">{{ tx.from }} · {{ tx.date }}</div>
                    </div>
                    <div class="tx-amount" :class="tx.type === 'in' ? 'amount-in' : 'amount-out'">
                        {{ tx.type === 'in' ? '+' : '-' }}¥{{ tx.amount.toFixed(2) }}
                    </div>
                </div>
            </div>

        </div>

        <!-- 收款弹窗 -->
        <div v-if="showTransferIn" class="pin-modal-overlay" @click.self="showTransferIn = false">
            <div class="transfer-modal">
                <div class="transfer-modal-title">收款</div>
                <div class="transfer-input-wrap">
                    <span class="transfer-currency">¥</span>
                    <input class="transfer-input" v-model="transferAmount" type="number" placeholder="0.00" />
                </div>
                <input class="transfer-desc-input" v-model="transferDesc" placeholder="备注（可选）" />
                <div class="transfer-btns">
                    <button class="transfer-btn-cancel" @click="showTransferIn = false">取消</button>
                    <button class="transfer-btn-confirm" @click="doTransferIn">确认收款</button>
                </div>
            </div>
        </div>

        <!-- 转出弹窗 -->
        <div v-if="showTransferOut" class="pin-modal-overlay" @click.self="showTransferOut = false">
            <div class="transfer-modal">
                <div class="transfer-modal-title">转出</div>
                <div class="transfer-input-wrap">
                    <span class="transfer-currency">¥</span>
                    <input class="transfer-input" v-model="transferAmount" type="number" placeholder="0.00" />
                </div>
                <input class="transfer-desc-input" v-model="transferDesc" placeholder="备注（可选）" />
                <div class="transfer-btns">
                    <button class="transfer-btn-cancel" @click="showTransferOut = false">取消</button>
                    <button class="transfer-btn-confirm" @click="doTransferOut">确认转出</button>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { api } from '@/utils/api'

const balance = ref(0)
const gifts = ref([])
const transactions = ref([])
const showTransferIn = ref(false)
const showTransferOut = ref(false)
const transferAmount = ref('')
const transferDesc = ref('')
const personas = ref([])
const currentPersona = ref('')

const currentPersonaName = computed(() => {
    const p = personas.value.find(p => p.id === currentPersona.value)
    return p ? (p.note || p.name) : 'TA'
})

async function loadPersonas() {
    try {
        const res = await api('/api/personas/all')
        personas.value = await res.json()
        const pinnedList = JSON.parse(localStorage.getItem('pinned_personas') || '[]')
        personas.value.sort((a, b) => {
            if (pinnedList.includes(a.id) && !pinnedList.includes(b.id)) return -1
            if (!pinnedList.includes(a.id) && pinnedList.includes(b.id)) return 1
            return 0
        })
        try {
            const latestRes = await api('/api/messages/latest-persona')
            const latestData = await latestRes.json()
            currentPersona.value = latestData.personaId || personas.value[0]?.id || ''
        } catch {
            currentPersona.value = personas.value[0]?.id || ''
        }
        await load()
    } catch { }
}

async function load() {
    if (!currentPersona.value) return
    try {
        const res = await api(`/api/wallet/${currentPersona.value}`)
        const data = await res.json()
        balance.value = data.balance || 0

        // 礼物：收到的和送出的都显示
        gifts.value = (data.gifts || []).map(g => ({
            emoji: '🎁',
            name: g.gift_name,
            content: g.gift_content,
            message: g.gift_message,
            direction: g.direction,
            from: g.direction === 'ai_to_user' ? currentPersonaName.value : '我',
            to: g.direction === 'ai_to_user' ? '我' : currentPersonaName.value,
            date: g.created_at?.slice(0, 10),
        }))

        // 交易记录：收到和转出都显示
        transactions.value = (data.transfers || []).map(t => ({
            type: t.direction === 'ai_to_user' ? 'in' : 'out',
            amount: t.amount,
            desc: t.note || (t.direction === 'ai_to_user' ? `${currentPersonaName.value} 转账` : '我转出'),
            from: t.direction === 'ai_to_user' ? currentPersonaName.value : '我',
            date: t.created_at?.slice(0, 10),
        }))
    } catch { }
}

async function doTransferIn() {
    const amount = parseFloat(transferAmount.value)
    if (!amount || amount <= 0) return
    try {
        await api(`/api/transfers/${currentPersona.value}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                direction: 'ai_to_user',
                amount,
                note: transferDesc.value || '收款'
            })
        })
        await load()
    } catch { }
    transferAmount.value = ''
    transferDesc.value = ''
    showTransferIn.value = false
}

async function doTransferOut() {
    const amount = parseFloat(transferAmount.value)
    if (!amount || amount <= 0) return
    try {
        await api(`/api/transfers/${currentPersona.value}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                direction: 'user_to_ai',
                amount,
                note: transferDesc.value || '转出'
            })
        })
        await load()
    } catch { }
    transferAmount.value = ''
    transferDesc.value = ''
    showTransferOut.value = false
}

function switchPersona(id) {
    currentPersona.value = id
    load()
}

onMounted(loadPersonas)

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

/* 余额卡片 */
.wallet-hero {
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #E8C0C9 0%, #D9A3AF 50%, #C88B98 100%);
    border-radius: 24px;
    padding: 24px 20px 20px;
    margin-top: 12px;
    margin-bottom: 4px;
    box-shadow: 0 12px 32px rgba(217, 163, 175, 0.3);
}

.wallet-hero-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15), transparent 60%);
}

.wallet-balance-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 6px;
}

.wallet-balance {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 20px;
}

.balance-currency {
    font-size: 20px;
    color: rgba(255, 255, 255, 0.85);
    font-weight: 600;
}

.balance-amount {
    font-size: 42px;
    font-weight: 800;
    color: white;
    line-height: 1;
    letter-spacing: -1px;
}

.wallet-hero-btns {
    display: flex;
    gap: 10px;
}

.wallet-btn {
    flex: 1;
    height: 40px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    transition: background 0.2s;
}

.wallet-btn:active {
    background: rgba(255, 255, 255, 0.3);
}

.wallet-btn svg {
    width: 14px;
    height: 14px;
}

/* 礼物 */
.wallet-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 32px 0;
    color: #D4C8CA;
    font-size: 12px;
    text-align: center;
    line-height: 1.6;
}

.wallet-empty.small {
    padding: 16px 0;
}

.wallet-empty svg {
    width: 36px;
    height: 36px;
    opacity: 0.5;
    margin-bottom: 4px;
}

.gift-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 4px;
}

.gift-item {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(16px);
    -webkit-backdrop-filter: saturate(180%) blur(16px);
    border-radius: 18px;
    padding: 14px 16px;
    box-shadow: 0 6px 20px rgba(217, 163, 175, 0.08);
    border: 1px solid rgba(255, 240, 242, 0.4);
}

.gift-icon {
    font-size: 28px;
    flex-shrink: 0;
}

.gift-info {
    flex: 1;
}

.gift-name {
    font-size: 14px;
    font-weight: 600;
    color: #4A3F41;
}

.gift-from {
    font-size: 11px;
    color: #B8A9AC;
    margin-top: 2px;
}

.gift-note {
    font-size: 11px;
    color: #D9A3AF;
    font-style: italic;
    flex-shrink: 0;
    max-width: 80px;
    text-align: right;
}

/* 交易记录 */
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

.sgi-label {
    font-size: 14px;
    color: #4A3F41;
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

.tx-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.tx-in {
    background: rgba(107, 175, 122, 0.12);
}

.tx-in svg {
    stroke: #6BAF7A;
    width: 16px;
    height: 16px;
}

.tx-out {
    background: rgba(192, 112, 112, 0.1);
}

.tx-out svg {
    stroke: #C07070;
    width: 16px;
    height: 16px;
}

.tx-amount {
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
}

.amount-in {
    color: #6BAF7A;
}

.amount-out {
    color: #C07070;
}

/* 转账弹窗 */
.pin-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: rgba(74, 63, 65, 0.25);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-end;
    padding: 0 16px 32px;
}

.transfer-modal {
    background: rgba(255, 252, 252, 0.96);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 28px;
    padding: 24px 20px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(217, 163, 175, 0.2);
    border: 1px solid rgba(255, 240, 242, 0.5);
    animation: slideUp 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
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

.transfer-modal-title {
    font-size: 17px;
    font-weight: 800;
    color: #4A3F41;
    margin-bottom: 20px;
    text-align: center;
}

.transfer-input-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 240, 242, 0.6);
    border-radius: 16px;
    padding: 12px 16px;
    margin-bottom: 10px;
}

.transfer-currency {
    font-size: 20px;
    color: #D9A3AF;
    font-weight: 700;
}

.transfer-input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 24px;
    font-weight: 700;
    color: #4A3F41;
    font-family: inherit;
}

.transfer-input::placeholder {
    color: #D4C8CA;
}

.transfer-desc-input {
    width: 100%;
    border: 1px solid rgba(255, 240, 242, 0.6);
    background: rgba(255, 255, 255, 0.6);
    border-radius: 14px;
    padding: 12px 16px;
    font-size: 14px;
    color: #4A3F41;
    font-family: inherit;
    outline: none;
    margin-bottom: 16px;
}

.transfer-desc-input::placeholder {
    color: #D4C8CA;
}

.transfer-btns {
    display: flex;
    gap: 10px;
}

.transfer-btn-cancel {
    flex: 1;
    height: 46px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 240, 242, 0.5);
    font-size: 15px;
    color: #6B5B5E;
    cursor: pointer;
    font-family: inherit;
}

.transfer-btn-confirm {
    flex: 1;
    height: 46px;
    border-radius: 16px;
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    border: none;
    font-size: 15px;
    color: white;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 6px 16px rgba(217, 163, 175, 0.3);
}

.persona-scroll {
    display: flex;
    gap: 8px;
    padding: 8px 16px 4px;
    overflow-x: auto;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}

.persona-scroll::-webkit-scrollbar {
    display: none;
}

.persona-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px 6px 6px;
    border-radius: 20px;
    border: 1px solid rgba(255, 240, 242, 0.4);
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: saturate(180%) blur(16px);
    -webkit-backdrop-filter: saturate(180%) blur(16px);
    cursor: pointer;
    white-space: nowrap;
    font-size: 12px;
    color: #6B5B5E;
    transition: all 0.2s;
}

.persona-chip.active {
    background: linear-gradient(135deg, #E8C0C9, #D9A3AF);
    color: white;
    border-color: transparent;
}

.persona-chip-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 233, 237, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    overflow: hidden;
    flex-shrink: 0;
}

.persona-chip-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.gift-content-text {
    font-size: 11px;
    color: #D9A3AF;
    margin-top: 1px;
}
</style>
