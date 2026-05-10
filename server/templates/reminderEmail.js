/**
 * Build a Forge reminder email. All styles are inline because email clients
 * (especially Gmail webmail) strip <style> blocks and most CSS variables.
 */
function escape(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function frequencyLabel(task) {
  switch (task.frequencyType) {
    case 'DAILY': return 'Daily reminder';
    case 'WEEKDAYS_ONLY': return 'Weekdays only';
    case 'WEEKLY': {
      const days = (task.customFrequency && task.customFrequency.daysOfWeek) || [];
      const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days.length ? `Weekly · ${days.map((d) => names[d]).join(', ')}` : 'Weekly';
    }
    case 'MONTHLY': return 'Monthly';
    case 'CUSTOM': {
      const n = (task.customFrequency && task.customFrequency.intervalDays) || 1;
      return `Every ${n} day${n === 1 ? '' : 's'}`;
    }
    default: return task.frequencyType;
  }
}

function buildSubject(task, isOverdue) {
  return isOverdue
    ? `Forge — Overdue: ${task.title}`
    : `Forge Reminder: ${task.title}`;
}

function build({ task, user, dashboardUrl, isOverdue }) {
  const accent = '#6366F1';
  const accent2 = '#06B6D4';
  const bg = '#0B0D14';
  const card = '#11141D';
  const border = '#1F2434';
  const text0 = '#ECEDEF';
  const text1 = '#9BA1AF';
  const text2 = '#6B7280';

  const overdueBanner = isOverdue ? `
    <tr><td style="padding:0 0 16px 0;">
      <div style="background:linear-gradient(180deg,#7f1d1d,#991B1B);color:#FECACA;padding:12px 16px;border-radius:10px;font-size:13.5px;font-weight:600;border:1px solid #B91C1C;">
        ⚠ This is an overdue reminder. The previous one wasn't actioned.
      </div>
    </td></tr>` : '';

  const streakRow = (task.streakCount || 0) > 0 ? `
    <tr><td style="padding-top:8px;">
      <span style="display:inline-block;background:rgba(16,185,129,0.15);color:#34D399;border:1px solid rgba(16,185,129,0.3);padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.04em;">
        🔥 ${task.streakCount}-day streak
      </span>
    </td></tr>` : '';

  const description = task.description ? `
    <tr><td style="padding-top:14px;color:${text1};font-size:14px;line-height:1.6;">
      ${escape(task.description)}
    </td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escape(buildSubject(task, isOverdue))}</title>
</head>
<body style="margin:0;padding:0;background:${bg};font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${text0};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <!-- Brand -->
        <tr><td style="padding:0 0 24px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align:middle;padding-right:10px;">
                <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,${accent},${accent2});color:#fff;font-weight:700;font-family:'JetBrains Mono',monospace;text-align:center;line-height:32px;">F</div>
              </td>
              <td style="vertical-align:middle;font-size:16px;font-weight:600;letter-spacing:0.02em;color:${text0};">
                Forge
              </td>
            </tr>
          </table>
        </td></tr>

        ${overdueBanner}

        <!-- Card -->
        <tr><td style="background:${card};border:1px solid ${border};border-radius:14px;padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:${text2};font-weight:600;">
              ${escape(task.category)} &nbsp;·&nbsp; ${escape(frequencyLabel(task))}
            </td></tr>
            <tr><td style="padding-top:8px;font-size:22px;font-weight:600;color:${text0};line-height:1.3;">
              ${escape(task.title)}
            </td></tr>
            ${description}
            ${streakRow}
            <tr><td style="padding-top:22px;">
              <a href="${escape(dashboardUrl)}"
                 style="display:inline-block;background:${accent};color:#ffffff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.01em;">
                Open in Forge →
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Meta footer -->
        <tr><td style="padding:24px 8px 0 8px;font-size:11px;color:${text2};line-height:1.6;text-align:center;">
          You're receiving this because you set up a recurring reminder in Forge${user && user.name ? `, ${escape(user.name)}` : ''}.<br>
          Manage or pause it from the Tasks page.
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { build, buildSubject, frequencyLabel };
