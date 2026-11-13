const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const {
  User,
  Department,
  Project,
  Task,
  TaskAssignee,
  DailyReport,
  DailyWorklog,
  WorklogCategory,
  ReportCorrection,
  AuditLog,
  sequelize,
} = require('../models');
const { logAudit } = require('./audit.service');

const getAdminDashboard = async () => {
  const today = new Date().toISOString().split('T')[0];

  const totalEmployees = await User.count({ where: { role: 'EMPLOYEE', is_active: true } });
  const totalManagers = await User.count({ where: { role: 'MANAGER', is_active: true } });
  const activeProjects = await Project.count({ where: { status: 'ACTIVE' } });
  const totalTasks = await Task.count({ where: { is_archived: false } });

  // Tasks by status
  const taskAssignments = await TaskAssignee.findAll({
    attributes: ['status'],
  });

  const taskStatusCounts = {
    TODO: 0,
    IN_PROGRESS: 0,
    ON_HOLD: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  taskAssignments.forEach(a => {
    if (taskStatusCounts[a.status] !== undefined) {
      taskStatusCounts[a.status]++;
    }
  });

  // Daily submissions for today
  const submittedToday = await DailyReport.count({
    where: { report_date: today, status: 'SUBMITTED' },
  });
  const pendingToday = Math.max(0, totalEmployees - submittedToday);

  // Time logged by category and project
  const submittedReports = await DailyReport.findAll({
    where: { status: 'SUBMITTED' },
    include: [
      {
        model: DailyWorklog,
        as: 'worklogs',
        include: [
          { model: Project, as: 'project', attributes: ['id', 'name'] },
          { model: WorklogCategory, as: 'category', attributes: ['id', 'name'] },
        ],
      },
      {
        model: User,
        as: 'employee',
        include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      },
    ],
  });

  const projectHours = {};
  const departmentHours = {};

  submittedReports.forEach(report => {
    const deptName = report.employee?.department?.name || 'Unassigned';
    if (!departmentHours[deptName]) departmentHours[deptName] = 0;

    report.worklogs?.forEach(w => {
      const projName = w.project?.name || 'Unplanned / General';
      if (!projectHours[projName]) projectHours[projName] = 0;
      projectHours[projName] += w.duration_minutes / 60;
      departmentHours[deptName] += w.duration_minutes / 60;
    });
  });

  return {
    total_employees: totalEmployees,
    total_managers: totalManagers,
    active_projects: activeProjects,
    total_tasks: totalTasks,
    task_status_counts: taskStatusCounts,
    submitted_reports_today: submittedToday,
    pending_submissions_today: pendingToday,
    project_hours: projectHours,
    department_hours: departmentHours,
  };
};

const getAllWorklogs = async (query = {}) => {
  const { employee_id, department_id, start_date, end_date, status = 'SUBMITTED' } = query;
  const where = {};
  if (status) where.status = status;

  if (employee_id) where.employee_id = employee_id;

  if (start_date && end_date) {
    where.report_date = { [Op.between]: [start_date, end_date] };
  } else if (start_date) {
    where.report_date = { [Op.gte]: start_date };
  } else if (end_date) {
    where.report_date = { [Op.lte]: end_date };
  }

  const userWhere = {};
  if (department_id) {
    userWhere.department_id = department_id;
  }

  const reports = await DailyReport.findAll({
    where,
    include: [
      {
        model: User,
        as: 'employee',
        where: userWhere,
        attributes: ['id', 'first_name', 'last_name', 'email'],
        include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      },
      {
        model: DailyWorklog,
        as: 'worklogs',
        include: [
          { model: WorklogCategory, as: 'category' },
          { model: Project, as: 'project', attributes: ['id', 'name'] },
          { model: Task, as: 'task', attributes: ['id', 'title'] },
        ],
      },
      {
        model: ReportCorrection,
        as: 'corrections',
        include: [{ model: User, as: 'corrector', attributes: ['id', 'first_name', 'last_name', 'email'] }],
      },
    ],
    order: [['report_date', 'DESC'], ['submitted_at', 'DESC']],
  });

  return reports;
};

const correctReport = async (reportId, { reason, entries }, adminUser) => {
  const report = await DailyReport.findByPk(reportId, {
    include: [{ model: DailyWorklog, as: 'worklogs' }],
  });

  if (!report) throw ApiError.notFound('Report not found');
  if (report.status !== 'SUBMITTED') {
    throw ApiError.badRequest('Can only perform corrections on submitted reports');
  }

  if (!reason || reason.trim().length < 5) {
    throw ApiError.badRequest('A clear reason (at least 5 characters) is required for audited corrections');
  }

  const beforeDataSnapshot = report.worklogs.map(w => w.toJSON());

  const transaction = await sequelize.transaction();
  try {
    // Remove existing worklogs
    await DailyWorklog.destroy({
      where: { daily_report_id: reportId },
      transaction,
    });

    // Create corrected worklogs
    const newWorklogRecords = entries.map(e => ({
      daily_report_id: reportId,
      category_id: e.category_id,
      description: e.description,
      duration_minutes: e.duration_minutes,
      task_id: e.task_id || null,
      project_id: e.project_id || null,
    }));

    await DailyWorklog.bulkCreate(newWorklogRecords, { transaction });

    // Store immutable correction audit record
    const correction = await ReportCorrection.create(
      {
        daily_report_id: reportId,
        corrected_by: adminUser.id,
        reason,
        before_data: beforeDataSnapshot,
        after_data: newWorklogRecords,
      },
      { transaction }
    );

    await logAudit({
      actor_user_id: adminUser.id,
      action: 'CORRECT_SUBMITTED_REPORT',
      entity_type: 'REPORT_CORRECTION',
      entity_id: correction.id,
      old_values: { entries: beforeDataSnapshot },
      new_values: { reason, entries: newWorklogRecords },
      transaction,
    });

    await transaction.commit();

    return await getAllWorklogs({ report_id: reportId });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getAuditLogs = async (query = {}) => {
  const { limit = 100, entity_type, action } = query;
  const where = {};
  if (entity_type) where.entity_type = entity_type;
  if (action) where.action = action;

  return await AuditLog.findAll({
    where,
    include: [{ model: User, as: 'actor', attributes: ['id', 'first_name', 'last_name', 'email', 'role'] }],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit, 10),
  });
};

module.exports = {
  getAdminDashboard,
  getAllWorklogs,
  correctReport,
  getAuditLogs,
};
