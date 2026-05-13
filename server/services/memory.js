// server/services/memory.js
const { getDB } = require('../db/index')

let messageCount = 0
const EXTRACT_INTERVAL = 3

function shouldExtract() {
  messageCount++
  if (messageCount >= EXTRACT_INTERVAL) {
    messageCount = 0
    return true
  }
  return false
}

async function extractMemoryByAI(userMessage, aiReply) {
  if (!shouldExtract()) return null

  const prompt = `从以下对话提取值得记住的事实信息。用|分隔，格式如：名:xx|住:xx。没有则回复"无"。

用户: ${userMessage}
AI: ${aiReply}

提取：`

  try {
    const response = await fetch(`${process.env.AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${process.env.AI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.AI_MEMORY_MODEL || process.env.AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0
      })
    })

    const data = await response.json()
    if (!data.choices || !data.choices[0]) return null

    const result = data.choices[0].message.content.trim()
    if (result === '无' || result.length < 2) return null

    console.log('记忆提取结果:', result)
    return result
  } catch (e) {
    console.error('记忆提取失败:', e)
    return null
  }
}

async function saveDailyMemory(content) {
  const db = getDB()
  const today = new Date().toISOString().slice(0, 10)

  const { data: existing } = await db.from('memories_recent')
    .select('*')
    .eq('source_session', today)
    .limit(1)

  if (existing && existing.length > 0) {
    const oldItems = existing[0].content.split('|').map(s => s.trim())
    const newItems = content.split('|').map(s => s.trim())
    const merged = [...new Set([...oldItems, ...newItems])].join('|')

    await db.from('memories_recent').update({ content: merged }).eq('id', existing[0].id)
    console.log(`今日记忆更新: ${merged}`)
  } else {
    await db.from('memories_recent').insert({ content, source_session: today })
    console.log(`今日记忆新建: ${content}`)
  }
}

async function consolidateMemories() {
  const db = getDB()

  const { data: dailyMems } = await db.from('memories_recent')
    .select('*')
    .order('created_at', { ascending: true })

  if (!dailyMems || dailyMems.length === 0) return

  const { data: profileRow } = await db.from('user_profile')
    .select('value')
    .eq('key', 'memory_profile')
    .limit(1)

  const currentProfileText = profileRow && profileRow.length > 0 ? profileRow[0].value : '空'
  const allDaily = dailyMems.map(m => `[${m.source_session}] ${m.content}`).join('\n')

  const prompt = `将以下记忆合并成精简档案。用|分隔，200字内，重要信息在前。

当前档案：${currentProfileText}
每日记忆：
${allDaily}

合并后：`

  try {
    const response = await fetch(`${process.env.AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${process.env.AI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.AI_MEMORY_MODEL || process.env.AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0
      })
    })

    const data = await response.json()
    if (!data.choices || !data.choices[0]) return

    const newProfile = data.choices[0].message.content.trim()

    await db.from('user_profile').upsert({
      key: 'memory_profile',
      value: newProfile,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' })

    // 清理 7 天前的
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    await db.from('memories_recent').delete().lt('created_at', sevenDaysAgo)

    console.log(`总档案更新: ${newProfile}`)
  } catch (e) {
    console.error('记忆合并失败:', e)
  }
}

function buildMemoryContext(sessionId, userMessage) {
  // 这个需要改成同步调用不了，改成异步
  // 但为了不大改 ai.js 结构，用缓存方案
}

// 改成异步版本
async function buildMemoryContextAsync(sessionId, userMessage) {
  const db = getDB()
  let context = ''

  const { data: profileRow } = await db.from('user_profile')
    .select('value')
    .eq('key', 'memory_profile')
    .limit(1)

  if (profileRow && profileRow.length > 0 && profileRow[0].value) {
    context += `\n[用户档案] ${profileRow[0].value}\n`
  }

  const { data: recentDays } = await db.from('memories_recent')
    .select('content, source_session')
    .order('created_at', { ascending: false })
    .limit(3)

  if (recentDays && recentDays.length > 0) {
    context += '[近期]\n'
    for (const m of recentDays) {
      context += `${m.source_session}: ${m.content}\n`
    }
  }

  return context
}

async function getSessionMemory(sessionId, limit = 10) {
  const db = getDB()
  const { data } = await db.from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('id', { ascending: false })
    .limit(limit)
  return (data || []).reverse()
}

async function getRecentMemories(limit = 50) {
  const db = getDB()
  const { data } = await db.from('memories_recent')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

async function deleteRecentMemory(id) {
  const db = getDB()
  await db.from('memories_recent').delete().eq('id', id)
}

async function getMemoryProfile() {
  const db = getDB()
  const { data } = await db.from('user_profile')
    .select('value')
    .eq('key', 'memory_profile')
    .limit(1)
  return data && data.length > 0 ? data[0].value : ''
}

async function setMemoryProfile(content) {
  const db = getDB()
  await db.from('user_profile').upsert({
    key: 'memory_profile',
    value: content,
    updated_at: new Date().toISOString()
  }, { onConflict: 'key' })
}

module.exports = {
  extractMemoryByAI,
  saveDailyMemory,
  consolidateMemories,
  buildMemoryContextAsync,
  getSessionMemory,
  getRecentMemories,
  deleteRecentMemory,
  getMemoryProfile,
  setMemoryProfile
}
