/**
 * Galaxy-Swan Email Templates
 * ===========================
 * Dark-mode, mobile-responsive HTML email templates for SwanStudios.
 * Max-width 600px per email client best practices.
 * All colors use Galaxy-Swan design tokens.
 */

/** HTML-escape user input to prevent XSS in email templates */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const COLORS = {
  deepSpace: '#0a0a1a',
  commandNavy: '#0f1629',
  cardSurface: '#141830',
  stellarWhite: '#f0f0ff',
  cyberBlue: '#00d4ff',
  cosmicPurple: '#7851A9',
  swanCyan: '#00FFFF',
  mutedText: '#8892b0',
  successGreen: '#10b981',
  dangerRed: '#ef4444',
  warningAmber: '#f59e0b',
};

/**
 * Wraps content in the Galaxy-Swan email shell.
 * @param {object} opts
 * @param {string} opts.preheader - Preview text shown in inbox
 * @param {string} opts.heading - Main heading
 * @param {string} opts.body - Inner HTML content
 * @param {string} [opts.ctaText] - Call to action button text
 * @param {string} [opts.ctaUrl] - Call to action URL
 * @param {string} [opts.accentColor] - Override accent for heading underline
 */
export function galaxySwanEmail({ preheader = '', heading, body, ctaText, ctaUrl, accentColor }) {
  const accent = accentColor || COLORS.cyberBlue;
  const siteUrl = process.env.FRONTEND_URL || 'https://sswanstudios.com';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="dark"/>
<meta name="supported-color-schemes" content="dark"/>
<title>SwanStudios</title>
<!--[if mso]><style>table,td{font-family:Arial,sans-serif!important}</style><![endif]-->
<style>
  body,table,td{font-family:'Helvetica Neue',Arial,sans-serif}
  @media(max-width:620px){
    .email-container{width:100%!important;padding:12px!important}
    .inner-pad{padding:20px 16px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.deepSpace};color:${COLORS.stellarWhite}">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden">${preheader}</div>` : ''}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.deepSpace}">
<tr><td align="center" style="padding:24px 12px">

  <!-- Main Container -->
  <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0"
    style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;
           background:linear-gradient(180deg,${COLORS.commandNavy} 0%,${COLORS.cardSurface} 100%);
           border:1px solid rgba(0,212,255,0.15)">

    <!-- Logo Bar -->
    <tr>
      <td style="padding:24px 32px 16px;text-align:center;
                 border-bottom:1px solid rgba(255,255,255,0.06)">
        <span style="font-size:22px;font-weight:700;letter-spacing:2px;
                     color:${COLORS.swanCyan}">SWAN</span><span
              style="font-size:22px;font-weight:300;letter-spacing:2px;
                     color:${COLORS.stellarWhite}">STUDIOS</span>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td class="inner-pad" style="padding:32px 32px 24px">
        <!-- Heading -->
        <h1 style="margin:0 0 4px;font-size:22px;font-weight:600;
                   color:${COLORS.stellarWhite}">${heading}</h1>
        <div style="width:48px;height:3px;background:${accent};
                    border-radius:2px;margin-bottom:24px"></div>

        <!-- Body -->
        <div style="font-size:15px;line-height:1.6;color:${COLORS.mutedText}">
          ${body}
        </div>

        ${ctaText && ctaUrl ? `
        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0">
          <tr>
            <td style="border-radius:8px;background:${accent}">
              <a href="${ctaUrl}" target="_blank"
                 style="display:inline-block;padding:14px 32px;
                        font-size:15px;font-weight:600;color:${COLORS.deepSpace};
                        text-decoration:none;border-radius:8px">${ctaText}</a>
            </td>
          </tr>
        </table>` : ''}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:16px 32px 24px;text-align:center;
                 border-top:1px solid rgba(255,255,255,0.06)">
        <p style="margin:0;font-size:12px;color:${COLORS.mutedText}">
          Swan Studios &mdash; Personal Training Reimagined
        </p>
        <p style="margin:4px 0 0;font-size:11px;color:rgba(136,146,176,0.6)">
          <a href="${siteUrl}" style="color:${COLORS.cyberBlue};text-decoration:none">sswanstudios.com</a>
        </p>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

// ---- Session-specific template helpers ----

/**
 * Info card block (date/location/trainer)
 */
function infoRow(label, value, icon) {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:${COLORS.mutedText};width:100px;vertical-align:top">${label}</td>
    <td style="padding:6px 0;font-size:14px;color:${COLORS.stellarWhite};font-weight:500">${value}</td>
  </tr>`;
}

function sessionInfoCard(fields) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
    style="background:rgba(255,255,255,0.04);border-radius:8px;padding:16px;margin:16px 0;
           border:1px solid rgba(0,212,255,0.08)">
    ${fields.map(f => infoRow(f.label, f.value)).join('')}
  </table>`;
}

function alertBox(text, type = 'info') {
  const colors = {
    info: { bg: 'rgba(0,212,255,0.08)', border: COLORS.cyberBlue, text: COLORS.cyberBlue },
    success: { bg: 'rgba(16,185,129,0.08)', border: COLORS.successGreen, text: COLORS.successGreen },
    warning: { bg: 'rgba(245,158,11,0.08)', border: COLORS.warningAmber, text: COLORS.warningAmber },
    danger: { bg: 'rgba(239,68,68,0.08)', border: COLORS.dangerRed, text: COLORS.dangerRed },
  };
  const c = colors[type] || colors.info;
  return `<div style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;
                      padding:14px 16px;margin:16px 0;font-size:14px;color:${c.text}">
    ${text}
  </div>`;
}

// ---- Public template functions ----

export function sessionBookedEmail({ clientName, trainerName, sessionDate, duration, location }) {
  const siteUrl = process.env.FRONTEND_URL || 'https://sswanstudios.com';
  const cn = esc(clientName), tn = esc(trainerName), sd = esc(sessionDate), loc = esc(location);
  const fields = [
    { label: 'Date', value: sd },
    { label: 'Duration', value: `${duration || 60} minutes` },
    { label: 'Trainer', value: tn || 'TBD' },
    { label: 'Location', value: loc || 'Main Studio' },
  ];

  return galaxySwanEmail({
    preheader: `Your session is confirmed for ${sd}`,
    heading: 'Session Confirmed',
    body: `
      <p style="color:${COLORS.stellarWhite};margin:0 0 8px">Hi ${cn},</p>
      <p>Your personal training session has been booked successfully.</p>
      ${sessionInfoCard(fields)}
      <p>Please arrive 10 minutes before your session. We look forward to seeing you!</p>
    `,
    ctaText: 'View My Schedule',
    ctaUrl: `${siteUrl}/schedule`,
    accentColor: COLORS.successGreen,
  });
}

export function sessionCancelledEmail({ clientName, sessionDate, reason, chargeType, chargeAmount, creditRestored }) {
  const cn = esc(clientName), sd = esc(sessionDate), r = esc(reason);
  let chargeBlock = '';
  if (chargeType && chargeType !== 'none' && chargeAmount > 0) {
    const labels = { full: 'Full session charge', partial: 'Partial charge', late_fee: 'Late cancellation fee' };
    chargeBlock = alertBox(`<strong>${esc(labels[chargeType]) || 'Charge'}:</strong> $${Number(chargeAmount).toFixed(2)}`, 'danger');
  } else if (creditRestored) {
    chargeBlock = alertBox('Your session credit has been restored to your account.', 'success');
  }

  return galaxySwanEmail({
    preheader: `Your session on ${sd} has been cancelled`,
    heading: 'Session Cancelled',
    body: `
      <p style="color:${COLORS.stellarWhite};margin:0 0 8px">Hi ${cn},</p>
      <p>Your session scheduled for <strong style="color:${COLORS.stellarWhite}">${sd}</strong> has been cancelled.</p>
      <p><strong style="color:${COLORS.stellarWhite}">Reason:</strong> ${r || 'No reason provided'}</p>
      ${chargeBlock}
      <p>Please contact us if you would like to reschedule.</p>
    `,
    accentColor: COLORS.dangerRed,
  });
}

export function sessionRescheduledEmail({ clientName, oldDate, newDate, location, sessionDeducted }) {
  const siteUrl = process.env.FRONTEND_URL || 'https://sswanstudios.com';
  const cn = esc(clientName), nd = esc(newDate), loc = esc(location);
  return galaxySwanEmail({
    preheader: `Your session has been rescheduled to ${nd}`,
    heading: 'Session Rescheduled',
    body: `
      <p style="color:${COLORS.stellarWhite};margin:0 0 8px">Hi ${cn},</p>
      <p>Your session has been rescheduled to <strong style="color:${COLORS.stellarWhite}">${nd}</strong>.</p>
      ${sessionInfoCard([
        { label: 'New Date', value: nd },
        { label: 'Location', value: loc || 'Main Studio' },
      ])}
      ${sessionDeducted ? alertBox('A session credit was deducted due to late rescheduling (less than 24 hours notice).', 'warning') : ''}
    `,
    ctaText: 'View My Schedule',
    ctaUrl: `${siteUrl}/schedule`,
    accentColor: COLORS.warningAmber,
  });
}

export function recurringBookedEmail({ clientName, trainerName, sessionDates, count, location }) {
  const siteUrl = process.env.FRONTEND_URL || 'https://sswanstudios.com';
  const cn = esc(clientName), tn = esc(trainerName), loc = esc(location);
  const dateList = sessionDates.map(d => `<li style="padding:4px 0;color:${COLORS.stellarWhite}">${esc(d)}</li>`).join('');

  return galaxySwanEmail({
    preheader: `${count} recurring sessions booked`,
    heading: `${count} Recurring Sessions Confirmed`,
    body: `
      <p style="color:${COLORS.stellarWhite};margin:0 0 8px">Hi ${cn},</p>
      <p>Your recurring training sessions have been booked successfully${tn ? ` with <strong style="color:${COLORS.stellarWhite}">${tn}</strong>` : ''}.</p>
      <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:16px;margin:16px 0;border:1px solid rgba(0,212,255,0.08)">
        <p style="margin:0 0 8px;font-size:13px;color:${COLORS.mutedText}">Scheduled Dates</p>
        <ul style="margin:0;padding-left:20px;list-style:none">${dateList}</ul>
      </div>
      <p>Location: <strong style="color:${COLORS.stellarWhite}">${loc || 'Main Studio'}</strong></p>
      <p>Please arrive 10 minutes before each session.</p>
    `,
    ctaText: 'View My Schedule',
    ctaUrl: `${siteUrl}/schedule`,
    accentColor: COLORS.successGreen,
  });
}

export function sessionReminderEmail({ clientName, trainerName, sessionDate, duration, location, hoursUntil }) {
  const siteUrl = process.env.FRONTEND_URL || 'https://sswanstudios.com';
  const cn = esc(clientName), tn = esc(trainerName), sd = esc(sessionDate), loc = esc(location);
  const urgency = hoursUntil <= 1 ? 'Starting Soon' : `In ${hoursUntil} Hours`;

  return galaxySwanEmail({
    preheader: `Reminder: Your session ${urgency.toLowerCase()}`,
    heading: `Session Reminder - ${urgency}`,
    body: `
      <p style="color:${COLORS.stellarWhite};margin:0 0 8px">Hi ${cn},</p>
      <p>This is a friendly reminder about your upcoming session.</p>
      ${sessionInfoCard([
        { label: 'Date', value: sd },
        { label: 'Duration', value: `${duration || 60} minutes` },
        { label: 'Trainer', value: tn || 'Your trainer' },
        { label: 'Location', value: loc || 'Main Studio' },
      ])}
      <p>We look forward to seeing you!</p>
    `,
    ctaText: 'View Session Details',
    ctaUrl: `${siteUrl}/schedule`,
  });
}

export function trainerSessionNotificationEmail({ trainerName, clientName, sessionDate, duration, location, eventType }) {
  const siteUrl = process.env.FRONTEND_URL || 'https://sswanstudios.com';
  const tn = esc(trainerName), cn = esc(clientName), sd = esc(sessionDate), loc = esc(location);
  const headings = {
    booked: 'New Session Assigned',
    cancelled: 'Session Cancelled',
    rescheduled: 'Session Rescheduled',
  };

  return galaxySwanEmail({
    preheader: `${headings[eventType] || 'Session Update'}: ${cn} on ${sd}`,
    heading: headings[eventType] || 'Session Update',
    body: `
      <p style="color:${COLORS.stellarWhite};margin:0 0 8px">Hi ${tn},</p>
      <p>A session with <strong style="color:${COLORS.stellarWhite}">${cn}</strong> has been ${esc(eventType)}.</p>
      ${sessionInfoCard([
        { label: 'Client', value: cn },
        { label: 'Date', value: sd },
        { label: 'Duration', value: `${duration || 60} minutes` },
        { label: 'Location', value: loc || 'Main Studio' },
      ])}
    `,
    ctaText: 'View Dashboard',
    ctaUrl: `${siteUrl}/dashboard`,
  });
}

// SMS templates (max 160 chars)
export const SMS = {
  booked: ({ trainerName, sessionDate }) =>
    `SwanStudios: Session confirmed with ${trainerName || 'your trainer'} on ${sessionDate}. Arrive 10 min early. Manage: sswanstudios.com/schedule`,

  cancelled: ({ sessionDate }) =>
    `SwanStudios: Your session on ${sessionDate} has been cancelled. Contact us to reschedule. sswanstudios.com`,

  rescheduled: ({ newDate }) =>
    `SwanStudios: Session rescheduled to ${newDate}. View details: sswanstudios.com/schedule`,

  reminder24h: ({ trainerName, time }) =>
    `SwanStudios: Reminder - session with ${trainerName || 'your trainer'} tomorrow at ${time}. See you there!`,

  reminder1h: ({ trainerName, time }) =>
    `SwanStudios: Your session with ${trainerName || 'your trainer'} starts in 1 hour at ${time}. Get ready!`,

  trainerBooked: ({ clientName, sessionDate }) =>
    `SwanStudios: New session with ${clientName} on ${sessionDate}. Check your dashboard.`,

  trainerCancelled: ({ clientName, sessionDate }) =>
    `SwanStudios: Session with ${clientName} on ${sessionDate} cancelled.`,
};

export default {
  galaxySwanEmail,
  sessionBookedEmail,
  sessionCancelledEmail,
  sessionRescheduledEmail,
  recurringBookedEmail,
  sessionReminderEmail,
  trainerSessionNotificationEmail,
  SMS,
};
