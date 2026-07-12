const { getDB } = require("../db/index");

// 检查今天这个时间点有没有需要触发的日程
async function checkPersonaSchedules() {
  const db = getDB();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay(); // 0=周日

  try {
    const { data: schedules } = await db
      .from("persona_schedules")
      .select("*")
      .eq("enabled", true);

    if (!schedules || schedules.length === 0) return;

    for (const schedule of schedules) {
      // 检查星期
      if (schedule.days_of_week && !schedule.days_of_week.includes(currentDay))
        continue;

      // 检查时间（精确到5分钟窗口）
      if (schedule.cron_hour !== currentHour) continue;
      if (Math.abs(schedule.cron_minute - currentMinute) > 2) continue;

      // 检查今天是否已触发过
      const todayStr = now.toISOString().slice(0, 10);
      const { data: existing } = await db
        .from("scheduled_messages")
        .select("id")
        .eq("persona_id", schedule.persona_id)
        .eq("content", `[日程:${schedule.id}]`)
        .gte("trigger_at", todayStr + "T00:00:00Z")
        .eq("triggered", true)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // 触发
      await triggerScheduleEvent(schedule, db);
    }
  } catch (e) {
    console.error("[日程] 检查失败:", e.message);
  }
}

async function triggerScheduleEvent(schedule, db) {
  const { handleProactiveMessage } = require("./proactive");
  const now = new Date();

  try {
    // 记录今日生活事件
    const todayStr = now.toISOString().slice(0, 10);
    const { data: logRow } = await db
      .from("persona_daily_log")
      .select("*")
      .eq("persona_id", schedule.persona_id)
      .eq("log_date", todayStr)
      .limit(1);

    const event = {
      time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`,
      label: schedule.label,
      hint: schedule.prompt_hint,
    };

    if (logRow && logRow.length > 0) {
      const events = logRow[0].events || [];
      events.push(event);
      await db
        .from("persona_daily_log")
        .update({ events })
        .eq("persona_id", schedule.persona_id)
        .eq("log_date", todayStr);
    } else {
      await db.from("persona_daily_log").insert({
        persona_id: schedule.persona_id,
        log_date: todayStr,
        events: [event],
      });
    }

    // 标记已触发
    await db.from("scheduled_messages").insert({
      persona_id: schedule.persona_id,
      content: `[日程:${schedule.id}]`,
      trigger_at: now.toISOString(),
      triggered: true,
    });

    // 构建主动消息的 prompt hint
    const hint = `[日程触发] 现在是${event.time}，你的日程是：${schedule.label}。${schedule.prompt_hint}。根据你的人设自然地决定要不要给用户发消息，发什么，或者不发（输出[SKIP]跳过）。`;

    await handleProactiveMessage(schedule.persona_id, hint);

    console.log(`[日程] ${schedule.persona_id} 触发: ${schedule.label}`);
  } catch (e) {
    console.error("[日程] 触发失败:", e.message);
  }
}

// 获取今日生活记录（供 AI 在对话中使用）
async function getTodayLog(personaId) {
  const db = getDB();
  const todayStr = new Date().toISOString().slice(0, 10);
  try {
    const { data } = await db
      .from("persona_daily_log")
      .select("events")
      .eq("persona_id", personaId)
      .eq("log_date", todayStr)
      .limit(1);

    if (!data || data.length === 0) return null;
    return data[0].events || [];
  } catch {
    return null;
  }
}

module.exports = { checkPersonaSchedules, getTodayLog };
