/**
 * Reminder schedule math.
 * All times are computed in UTC. The reminderTime string is treated as HH:MM
 * in UTC for predictable behaviour across server cold starts and the Vercel
 * Cron runtime (which fires in UTC).
 */

function parseTime(t) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(t || '09:00');
  return { h: m ? +m[1] : 9, m: m ? +m[2] : 0 };
}

function atTime(date, h, m) {
  const d = new Date(date);
  d.setUTCHours(h, m, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function isWeekday(d) {
  const dow = d.getUTCDay();
  return dow !== 0 && dow !== 6;
}

/**
 * Compute the *next* reminder time after a task has just been sent / completed.
 * `from` defaults to "now". The result is always strictly in the future.
 */
function computeNext(task, from = new Date()) {
  const { h, m } = parseTime(task.reminderTime);
  switch (task.frequencyType) {
    case 'DAILY': {
      const next = atTime(addDays(from, 1), h, m);
      return next;
    }
    case 'WEEKDAYS_ONLY': {
      let d = addDays(from, 1);
      while (!isWeekday(d)) d = addDays(d, 1);
      return atTime(d, h, m);
    }
    case 'WEEKLY': {
      const target = (task.customFrequency && task.customFrequency.daysOfWeek) || [];
      const days = target.length ? target : [from.getUTCDay()];
      for (let i = 1; i <= 7; i++) {
        const d = addDays(from, i);
        if (days.includes(d.getUTCDay())) return atTime(d, h, m);
      }
      return atTime(addDays(from, 7), h, m);
    }
    case 'MONTHLY': {
      const d = new Date(from);
      d.setUTCMonth(d.getUTCMonth() + 1);
      return atTime(d, h, m);
    }
    case 'CUSTOM': {
      const interval = Math.max(1, (task.customFrequency && task.customFrequency.intervalDays) || 1);
      return atTime(addDays(from, interval), h, m);
    }
    default:
      return atTime(addDays(from, 1), h, m);
  }
}

/**
 * The very first reminder time after a task is created.
 * - If the configured time today is still in the future, fire today.
 * - Otherwise, schedule for the next valid day per frequency.
 */
function computeFirstNext(task, now = new Date()) {
  const { h, m } = parseTime(task.reminderTime);
  const todayAtTime = atTime(now, h, m);

  switch (task.frequencyType) {
    case 'DAILY':
      return todayAtTime > now ? todayAtTime : atTime(addDays(now, 1), h, m);
    case 'WEEKDAYS_ONLY': {
      if (todayAtTime > now && isWeekday(now)) return todayAtTime;
      let d = addDays(now, 1);
      while (!isWeekday(d)) d = addDays(d, 1);
      return atTime(d, h, m);
    }
    case 'WEEKLY': {
      const target = (task.customFrequency && task.customFrequency.daysOfWeek) || [];
      const days = target.length ? target : [now.getUTCDay()];
      for (let i = 0; i <= 7; i++) {
        const d = addDays(now, i);
        const candidate = atTime(d, h, m);
        if (days.includes(d.getUTCDay()) && candidate > now) return candidate;
      }
      return atTime(addDays(now, 7), h, m);
    }
    case 'MONTHLY':
      return todayAtTime > now ? todayAtTime : computeNext(task, now);
    case 'CUSTOM':
      return todayAtTime > now ? todayAtTime : computeNext(task, now);
    default:
      return computeNext(task, now);
  }
}

/**
 * Should we count the previous reminder as "missed" / "ignored"?
 * Heuristic: the last reminder was sent, but no completion has happened since.
 */
function wasPreviousIgnored(task) {
  if (!task.lastReminderSentAt) return false;
  if (!task.lastCompletionAt) return true;
  return new Date(task.lastCompletionAt) < new Date(task.lastReminderSentAt);
}

module.exports = { computeNext, computeFirstNext, wasPreviousIgnored, parseTime };
