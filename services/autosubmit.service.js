const { Op } = require('sequelize');
const { DailyReport, DailyWorklog } = require('../models');
const { logAudit } = require('./audit.service');

const TIMEZONE = 'Asia/Kolkata';
const CUTOFF_HOUR = 23;
const CHECK_EVERY_MS = 5 * 60 * 1000;

const istParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  };
};

const previousDay = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

// Drafts up to this date are due. Today's draft is due only after the cutoff hour.
const dueUpTo = (now) => {
  const { date, hour } = istParts(now);
  return hour >= CUTOFF_HOUR ? date : previousDay(date);
};

const isValidEntry = (entry) =>
  entry.description &&
  entry.description.trim().length > 0 &&
  entry.duration_minutes >= 30 &&
  entry.duration_minutes % 30 === 0;

const runAutoSubmit = async (now = new Date()) => {
  const cutoffDate = dueUpTo(now);

  const drafts = await DailyReport.findAll({
    where: {
      status: 'DRAFT',
      report_date: { [Op.lte]: cutoffDate },
    },
    include: [{ model: DailyWorklog, as: 'worklogs' }],
  });

  let submitted = 0;
  let skippedEmpty = 0;
  let skippedInvalid = 0;

  for (const report of drafts) {
    if (!report.worklogs || report.worklogs.length === 0) {
      skippedEmpty++;
      continue;
    }
    if (!report.worklogs.every(isValidEntry)) {
      skippedInvalid++;
      continue;
    }

    const [updated] = await DailyReport.update(
      { status: 'SUBMITTED', submitted_at: now, auto_submitted: true },
      { where: { id: report.id, status: 'DRAFT' } }
    );
    if (updated === 0) continue;

    submitted++;
    await logAudit({
      actor_user_id: null,
      action: 'AUTO_SUBMIT_DAILY_REPORT',
      entity_type: 'DAILY_REPORT',
      entity_id: report.id,
      new_values: {
        employee_id: report.employee_id,
        report_date: report.report_date,
        entries: report.worklogs.length,
        cutoff: `${CUTOFF_HOUR}:00 ${TIMEZONE}`,
      },
    });
  }

  return { cutoffDate, submitted, skippedEmpty, skippedInvalid };
};

const startAutoSubmitJob = () => {
  const tick = async () => {
    try {
      const result = await runAutoSubmit();
      if (result.submitted > 0 || result.skippedInvalid > 0) {
        console.log(
          `[auto-submit] cutoff ${result.cutoffDate}: submitted ${result.submitted}, skipped invalid ${result.skippedInvalid}`
        );
      }
    } catch (err) {
      console.error('[auto-submit] failed:', err.message);
    }
  };

  tick();
  return setInterval(tick, CHECK_EVERY_MS);
};

module.exports = {
  runAutoSubmit,
  startAutoSubmitJob,
  dueUpTo,
  istParts,
  CUTOFF_HOUR,
  TIMEZONE,
};
