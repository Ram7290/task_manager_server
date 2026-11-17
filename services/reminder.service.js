const { DailyReport, DailyWorklog, CompanyOffDay } = require('../models');
const { istParts, CUTOFF_HOUR } = require('./autosubmit.service');

const REMIND_HOUR = 17;
const REMIND_MINUTE = 30;

const getSubmitReminder = async (user, now = new Date()) => {
  const none = { show: false };
  if (user.role === 'ADMIN') return none;

  const { date, hour, minute } = istParts(now);
  const beforeReminder = hour < REMIND_HOUR || (hour === REMIND_HOUR && minute < REMIND_MINUTE);
  const afterCutoff = hour >= CUTOFF_HOUR;
  if (beforeReminder || afterCutoff) return none;

  const offDay = await CompanyOffDay.findOne({ where: { date } });
  if (offDay) return none;

  const report = await DailyReport.findOne({
    where: { employee_id: user.id, report_date: date },
    include: [{ model: DailyWorklog, as: 'worklogs', attributes: ['id'] }],
  });
  if (report && report.status === 'SUBMITTED') return none;

  const entryCount = report?.worklogs?.length || 0;
  return {
    show: true,
    date,
    entry_count: entryCount,
    cutoff: '11:00 PM',
  };
};

module.exports = { getSubmitReminder };
