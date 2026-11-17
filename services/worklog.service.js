const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const {
  DailyReport,
  DailyWorklog,
  Task,
  TaskAssignee,
  WorklogCategory,
  Project,
  User,
  ManagerEmployeeAccess,
  Department,
  sequelize,
} = require('../models');
const { logAudit } = require('./audit.service');

const getTodayDateString = (req) => {
  // Prefer the browser's local date (sent as X-Client-Date: YYYY-MM-DD).
  // This handles IST vs GST correctly without any UTC conversion.
  // Falls back to server local date only if the header is absent or malformed.
  const clientDate = req?.headers?.['x-client-date'];
  if (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)) {
    return clientDate;
  }
  // Server-side fallback: build from local clock (not toISOString which is UTC)
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const listCategories = async ({ includeInactive = false } = {}) => {
  return await WorklogCategory.findAll({
    where: includeInactive ? {} : { is_active: true },
    order: [['name', 'ASC']],
  });
};

const createCategory = async (data, actorId) => {
  const name = data.name.trim();
  const existing = await WorklogCategory.findOne({ where: { name } });
  if (existing) throw ApiError.badRequest('A category with this name already exists');

  const category = await WorklogCategory.create({
    name,
    description: data.description || null,
    is_active: true,
  });

  await logAudit({
    actor_user_id: actorId,
    action: 'CREATE_WORKLOG_CATEGORY',
    entity_type: 'WORKLOG_CATEGORY',
    entity_id: category.id,
    new_values: category.toJSON(),
  });

  return category;
};

const updateCategory = async (id, data, actorId) => {
  const category = await WorklogCategory.findByPk(id);
  if (!category) throw ApiError.notFound('Category not found');

  const old_values = category.toJSON();

  if (data.name !== undefined) {
    const name = data.name.trim();
    if (name !== category.name) {
      const existing = await WorklogCategory.findOne({ where: { name } });
      if (existing) throw ApiError.badRequest('A category with this name already exists');
    }
    category.name = name;
  }
  if (data.description !== undefined) category.description = data.description || null;
  if (data.is_active !== undefined) category.is_active = data.is_active;

  await category.save();

  await logAudit({
    actor_user_id: actorId,
    action: category.is_active ? 'UPDATE_WORKLOG_CATEGORY' : 'DEACTIVATE_WORKLOG_CATEGORY',
    entity_type: 'WORKLOG_CATEGORY',
    entity_id: category.id,
    old_values,
    new_values: category.toJSON(),
  });

  return category;
};

const getOrCreateTodayDraft = async (employeeId, req) => {
  const today = getTodayDateString(req);

  let [report, created] = await DailyReport.findOrCreate({
    where: {
      employee_id: employeeId,
      report_date: today,
    },
    defaults: {
      employee_id: employeeId,
      report_date: today,
      status: 'DRAFT',
    },
  });

  return await getReportWithEntries(report.id);
};

const getReportWithEntries = async (reportId) => {
  const report = await DailyReport.findByPk(reportId, {
    include: [
      {
        model: User,
        as: 'employee',
        attributes: ['id', 'first_name', 'last_name', 'email'],
        include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      },
      {
        model: DailyWorklog,
        as: 'worklogs',
        include: [
          { model: WorklogCategory, as: 'category' },
          { model: Project, as: 'project', attributes: ['id', 'name'] },
          { model: Task, as: 'task', attributes: ['id', 'title', 'priority'] },
        ],
      },
    ],
    order: [[{ model: DailyWorklog, as: 'worklogs' }, 'createdAt', 'ASC']],
  });

  if (!report) throw ApiError.notFound('Report not found');
  return report;
};

const getReportById = async (reportId, user) => {
  const report = await getReportWithEntries(reportId);

  // Privacy Rule check (Section 8 of Specification):
  if (user.role === 'EMPLOYEE') {
    if (report.employee_id !== user.id) {
      throw ApiError.forbidden('You cannot view another employee’s report');
    }
  } else if (user.role === 'MANAGER') {
    // Managers also file their own daily worklogs — viewing/editing their OWN report
    // (draft or submitted) is always allowed. Restrictions apply only to OTHERS' reports.
    if (report.employee_id !== user.id) {
      // Managers must NEVER see another employee's draft report contents
      if (report.status === 'DRAFT') {
        throw ApiError.forbidden('Managers are not permitted to view another employee’s draft report');
      }

      // Must be in manager's scope
      const access = await ManagerEmployeeAccess.findOne({
        where: { manager_id: user.id, employee_id: report.employee_id },
      });
      if (!access) {
        throw ApiError.forbidden('You do not have access to this employee’s reports');
      }
    }
  }

  return report;
};

const getMyReports = async (employeeId, query = {}) => {
  const { status, start_date, end_date } = query;
  const where = { employee_id: employeeId };

  if (status) where.status = status;
  if (start_date && end_date) {
    where.report_date = { [Op.between]: [start_date, end_date] };
  } else if (start_date) {
    where.report_date = { [Op.gte]: start_date };
  } else if (end_date) {
    where.report_date = { [Op.lte]: end_date };
  }

  return await DailyReport.findAll({
    where,
    include: [
      {
        model: DailyWorklog,
        as: 'worklogs',
        include: [
          { model: WorklogCategory, as: 'category' },
          { model: Project, as: 'project', attributes: ['id', 'name'] },
          { model: Task, as: 'task', attributes: ['id', 'title'] },
        ],
      },
    ],
    order: [['report_date', 'DESC']],
  });
};

const addEntry = async (reportId, entryData, user) => {
  const report = await DailyReport.findByPk(reportId);
  if (!report) throw ApiError.notFound('Report not found');

  // Must be own report
  if (report.employee_id !== user.id) {
    throw ApiError.forbidden('You cannot add entries to another employee’s report');
  }

  // Must be in DRAFT status
  if (report.status !== 'DRAFT') {
    throw ApiError.badRequest('Cannot add entries to a submitted report. Submitted reports are locked.');
  }

  // Validate duration
  const duration = entryData.duration_minutes;
  if (!duration || duration < 30 || duration % 30 !== 0) {
    throw ApiError.badRequest('Duration must be at least 30 minutes and a multiple of 30');
  }

  // Validate category
  const category = await WorklogCategory.findByPk(entryData.category_id);
  if (!category || !category.is_active) {
    throw ApiError.badRequest('Invalid or inactive worklog category');
  }

  let taskAssigneeId = null;
  let projectId = entryData.project_id || null;

  // If task_id provided, verify employee is assigned to that task
  if (entryData.task_id) {
    const assignee = await TaskAssignee.findOne({
      where: {
        task_id: entryData.task_id,
        employee_id: user.id,
      },
      include: [{ model: Task, as: 'task' }],
    });

    if (!assignee) {
      throw ApiError.badRequest('You can only log work against tasks assigned to you');
    }

    taskAssigneeId = assignee.id;
    if (!projectId && assignee.task && assignee.task.project_id) {
      projectId = assignee.task.project_id;
    }
  }

  const worklog = await DailyWorklog.create({
    daily_report_id: reportId,
    task_id: entryData.task_id || null,
    task_assignee_id: taskAssigneeId,
    category_id: entryData.category_id,
    project_id: projectId,
    description: entryData.description,
    duration_minutes: duration,
  });

  return await DailyWorklog.findByPk(worklog.id, {
    include: [
      { model: WorklogCategory, as: 'category' },
      { model: Project, as: 'project', attributes: ['id', 'name'] },
      { model: Task, as: 'task', attributes: ['id', 'title'] },
    ],
  });
};

const updateEntry = async (entryId, entryData, user) => {
  const worklog = await DailyWorklog.findByPk(entryId, {
    include: [{ model: DailyReport, as: 'dailyReport' }],
  });

  if (!worklog) throw ApiError.notFound('Worklog entry not found');

  const report = worklog.dailyReport;
  if (report.employee_id !== user.id) {
    throw ApiError.forbidden('You cannot modify another employee’s worklog');
  }

  if (report.status !== 'DRAFT') {
    throw ApiError.badRequest('Cannot edit entries in a submitted report. The report is locked.');
  }

  if (entryData.duration_minutes !== undefined) {
    const duration = entryData.duration_minutes;
    if (duration < 30 || duration % 30 !== 0) {
      throw ApiError.badRequest('Duration must be at least 30 minutes and a multiple of 30');
    }
    worklog.duration_minutes = duration;
  }

  if (entryData.category_id) {
    const category = await WorklogCategory.findByPk(entryData.category_id);
    if (!category) throw ApiError.badRequest('Invalid category');
    worklog.category_id = entryData.category_id;
  }

  if (entryData.description) {
    worklog.description = entryData.description;
  }

  if (entryData.task_id !== undefined) {
    if (entryData.task_id) {
      const assignee = await TaskAssignee.findOne({
        where: { task_id: entryData.task_id, employee_id: user.id },
      });
      if (!assignee) throw ApiError.badRequest('You can only log work against tasks assigned to you');
      worklog.task_id = entryData.task_id;
      worklog.task_assignee_id = assignee.id;
    } else {
      worklog.task_id = null;
      worklog.task_assignee_id = null;
    }
  }

  if (entryData.project_id !== undefined) {
    worklog.project_id = entryData.project_id;
  }

  await worklog.save();

  return await DailyWorklog.findByPk(worklog.id, {
    include: [
      { model: WorklogCategory, as: 'category' },
      { model: Project, as: 'project', attributes: ['id', 'name'] },
      { model: Task, as: 'task', attributes: ['id', 'title'] },
    ],
  });
};

const deleteEntry = async (entryId, user) => {
  const worklog = await DailyWorklog.findByPk(entryId, {
    include: [{ model: DailyReport, as: 'dailyReport' }],
  });

  if (!worklog) throw ApiError.notFound('Worklog entry not found');

  const report = worklog.dailyReport;
  if (report.employee_id !== user.id) {
    throw ApiError.forbidden('You cannot delete another employee’s worklog');
  }

  if (report.status !== 'DRAFT') {
    throw ApiError.badRequest('Cannot delete entries from a submitted report');
  }

  await worklog.destroy();
  return { success: true, message: 'Worklog entry deleted successfully' };
};

const submitReport = async (reportId, user) => {
  const transaction = await sequelize.transaction();

  try {
    const report = await DailyReport.findByPk(reportId, {
      include: [{ model: DailyWorklog, as: 'worklogs' }],
      transaction,
    });

    if (!report) throw ApiError.notFound('Report not found');

    if (report.employee_id !== user.id) {
      throw ApiError.forbidden('You cannot submit another employee’s report');
    }

    if (report.status === 'SUBMITTED') {
      throw ApiError.badRequest('This report has already been submitted');
    }

    // Validation rules from section 7.5:
    // 1. At least one worklog entry exists
    if (!report.worklogs || report.worklogs.length === 0) {
      throw ApiError.badRequest('Cannot submit an empty report. Please add at least one worklog entry.');
    }

    // 2. Every entry must have valid description and duration divisible by 30
    for (const entry of report.worklogs) {
      if (!entry.description || entry.description.trim().length === 0) {
        throw ApiError.badRequest('All entries must have a valid description before submitting');
      }
      if (!entry.duration_minutes || entry.duration_minutes < 30 || entry.duration_minutes % 30 !== 0) {
        throw ApiError.badRequest('All durations must be at least 30 minutes and a multiple of 30');
      }
    }

    report.status = 'SUBMITTED';
    report.submitted_at = new Date();
    await report.save({ transaction });

    await logAudit({
      actor_user_id: user.id,
      action: 'SUBMIT_DAILY_REPORT',
      entity_type: 'DAILY_REPORT',
      entity_id: report.id,
      new_values: {
        report_date: report.report_date,
        total_entries: report.worklogs.length,
        total_minutes: report.worklogs.reduce((sum, w) => sum + w.duration_minutes, 0),
      },
      transaction,
    });

    await transaction.commit();

    return await getReportWithEntries(report.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  getOrCreateTodayDraft,
  getReportWithEntries,
  getReportById,
  getMyReports,
  addEntry,
  updateEntry,
  deleteEntry,
  submitReport,
};
