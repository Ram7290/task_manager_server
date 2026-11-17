const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const { CompanyOffDay, AttendanceException, User, Department } = require('../models');
const { logAudit } = require('./audit.service');

// ─── Company Off Days ────────────────────────────────────────────────────────

const listOffDays = async (query = {}) => {
  const { start_date, end_date, type } = query;
  const where = {};
  if (type) where.type = type;
  if (start_date && end_date) {
    where.date = { [Op.between]: [start_date, end_date] };
  } else if (start_date) {
    where.date = { [Op.gte]: start_date };
  } else if (end_date) {
    where.date = { [Op.lte]: end_date };
  }
  return await CompanyOffDay.findAll({
    where,
    include: [{ model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }],
    order: [['date', 'ASC']],
  });
};

const addOffDay = async ({ date, type, reason }, actorId) => {
  const existing = await CompanyOffDay.findOne({ where: { date } });
  if (existing) throw ApiError.badRequest(`${date} is already marked as an off day`);

  const offDay = await CompanyOffDay.create({
    date,
    type: type || 'OTHER',
    reason: reason || null,
    created_by: actorId,
  });

  await logAudit({
    actor_user_id: actorId,
    action: 'ADD_COMPANY_OFF_DAY',
    entity_type: 'COMPANY_OFF_DAY',
    entity_id: offDay.id,
    new_values: { date, type, reason },
  });

  return offDay;
};

// Bulk-add a list of dates at once (used by "mark all Sundays in month" helper)
const bulkAddOffDays = async (entries, actorId) => {
  const dates = entries.map(e => e.date);

  // Skip dates that already exist instead of erroring
  const existing = await CompanyOffDay.findAll({ where: { date: { [Op.in]: dates } } });
  const existingDates = new Set(existing.map(e => e.date));
  const toCreate = entries
    .filter(e => !existingDates.has(e.date))
    .map(e => ({ date: e.date, type: e.type || 'OTHER', reason: e.reason || null, created_by: actorId }));

  if (toCreate.length === 0) return { added: 0, skipped: existing.length };

  await CompanyOffDay.bulkCreate(toCreate);

  await logAudit({
    actor_user_id: actorId,
    action: 'BULK_ADD_COMPANY_OFF_DAYS',
    entity_type: 'COMPANY_OFF_DAY',
    entity_id: actorId,
    new_values: { dates: toCreate.map(e => e.date), count: toCreate.length },
  });

  return { added: toCreate.length, skipped: existing.length };
};

const removeOffDay = async (offDayId, actorId) => {
  const offDay = await CompanyOffDay.findByPk(offDayId);
  if (!offDay) throw ApiError.notFound('Off day record not found');

  await offDay.destroy();

  await logAudit({
    actor_user_id: actorId,
    action: 'REMOVE_COMPANY_OFF_DAY',
    entity_type: 'COMPANY_OFF_DAY',
    entity_id: offDayId,
    old_values: { date: offDay.date, type: offDay.type },
  });

  return { success: true };
};

// ─── Attendance Exceptions ───────────────────────────────────────────────────

const listAttendanceExceptions = async (query = {}) => {
  const { employee_id, start_date, end_date, type } = query;
  const where = {};
  if (employee_id) where.employee_id = employee_id;
  if (type) where.type = type;
  if (start_date && end_date) {
    where.date = { [Op.between]: [start_date, end_date] };
  } else if (start_date) {
    where.date = { [Op.gte]: start_date };
  } else if (end_date) {
    where.date = { [Op.lte]: end_date };
  }

  return await AttendanceException.findAll({
    where,
    include: [
      {
        model: User,
        as: 'employee',
        attributes: ['id', 'first_name', 'last_name', 'email'],
        include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      },
      { model: User, as: 'marker', attributes: ['id', 'first_name', 'last_name'] },
    ],
    order: [['date', 'DESC']],
  });
};

const markAttendanceException = async ({ employee_id, date, type, reason }, actorId) => {
  const employee = await User.findByPk(employee_id);
  if (!employee) throw ApiError.notFound('Employee not found');

  // Upsert: if a record already exists for this person+date, update it
  const [record, created] = await AttendanceException.findOrCreate({
    where: { employee_id, date },
    defaults: {
      employee_id,
      date,
      type: type || 'ABSENT',
      reason: reason || null,
      marked_by: actorId,
    },
  });

  if (!created) {
    record.type = type || record.type;
    record.reason = reason !== undefined ? reason : record.reason;
    record.marked_by = actorId;
    await record.save();
  }

  await logAudit({
    actor_user_id: actorId,
    action: created ? 'MARK_ATTENDANCE_EXCEPTION' : 'UPDATE_ATTENDANCE_EXCEPTION',
    entity_type: 'ATTENDANCE_EXCEPTION',
    entity_id: record.id,
    new_values: { employee_id, date, type, reason },
  });

  return record;
};

const removeAttendanceException = async (exceptionId, actorId) => {
  const record = await AttendanceException.findByPk(exceptionId);
  if (!record) throw ApiError.notFound('Attendance exception not found');

  await record.destroy();

  await logAudit({
    actor_user_id: actorId,
    action: 'REMOVE_ATTENDANCE_EXCEPTION',
    entity_type: 'ATTENDANCE_EXCEPTION',
    entity_id: exceptionId,
    old_values: { employee_id: record.employee_id, date: record.date, type: record.type },
  });

  return { success: true };
};

// ─── Helpers used by timeline ────────────────────────────────────────────────

// Returns a Set of off-day date strings and a map of employee_id → Set<date>
// for a given date range (used by admin.service.getSubmissionTimeline)
const loadCalendarData = async (start, end) => {
  const [offDays, exceptions] = await Promise.all([
    CompanyOffDay.findAll({ where: { date: { [Op.between]: [start, end] } }, attributes: ['date'] }),
    AttendanceException.findAll({
      where: { date: { [Op.between]: [start, end] } },
      attributes: ['employee_id', 'date', 'type'],
    }),
  ]);

  const offDaySet = new Set(offDays.map(d => d.date));

  // map: employee_id → { date → type }
  const exceptionMap = {};
  exceptions.forEach(e => {
    if (!exceptionMap[e.employee_id]) exceptionMap[e.employee_id] = {};
    exceptionMap[e.employee_id][e.date] = e.type;
  });

  return { offDaySet, exceptionMap };
};

module.exports = {
  listOffDays,
  addOffDay,
  bulkAddOffDays,
  removeOffDay,
  listAttendanceExceptions,
  markAttendanceException,
  removeAttendanceException,
  loadCalendarData,
};
