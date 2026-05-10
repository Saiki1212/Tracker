/**
 * Nodemailer wrapper using Gmail SMTP. Transporter is cached on the global
 * object so warm serverless invocations reuse it (avoids re-doing TLS).
 */
const nodemailer = require('nodemailer');
const { build, buildSubject } = require('../templates/reminderEmail');

function getTransporter() {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP_EMAIL and SMTP_PASSWORD must be set');
  }
  if (global._forgeMailer) return global._forgeMailer;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    pool: true,
    maxConnections: 1,
  });
  global._forgeMailer = transporter;
  return transporter;
}

/**
 * Send a reminder email for `task` to `user` (or, if user has no email,
 * to the configured SMTP_EMAIL — useful for the single-operator setup).
 */
async function sendReminder({ task, user, isOverdue }) {
  const dashboardUrl =
    process.env.FRONTEND_URL ||
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}/app.html` ||
    '/app.html';

  const html = build({ task, user, dashboardUrl, isOverdue });
  const subject = buildSubject(task, isOverdue);
  const to = (user && user.email) || process.env.SMTP_EMAIL;

  await getTransporter().sendMail({
    from: `"Forge" <${process.env.SMTP_EMAIL}>`,
    to,
    subject,
    html,
  });
}

module.exports = { sendReminder, getTransporter };
