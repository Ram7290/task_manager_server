const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const {
  User,
  Department,
  ManagerEmployeeAccess,
  DailyReport,
  DailyWorklog,
  Task,
  TaskAssignee,
  WorklogCategory,
  Project,
} = require('../models');

const getManagerSubordinateIds = async (managerId) => {
  const mappings = await ManagerEmployeeAccess.findAll({
    where: { manager_id: managerId },
    attributes: ['employee_id'],
  });
  return mappings.map(m => m.employee_id);
};

const getTeamMembers = async (managerId) => {
  const employeeIds = await getManagerSubordinateIds(managerId);

  const team = await User.findAll({
    where: {
      id: { [Op.in]: employeeIds },
      is_active: true,
    },
    attributes: { exclude: ['password_hash'] },
    include: [
      { model: Department, as: 'department', attributes: ['id', 'name'] },
      {
        model: TaskAssignee,
        as: 'taskAssignments',
        where: { status: { [Op.in]: ['TODO', 'IN_PROGRESS', 'ON_HOLD'] } },
        required: false,
        attributes: ['id', 'status'],
      },
    ],
  });

  return team;
};

const getTeamDashboard = async (managerId) => {
  const employeeIds = await getManagerSubordinateIds(managerId);
  const today = new Date().toISOString().split('T')[0];

  // 1. Team members count
  const totalTeamMembers = employeeIds.length;

  if (totalTeamMembers === 0) {
    return {
      total_team_members: 0,
      tasks_assigned: 0,
      tasks_in_progress: 0,
      tasks_completed: 0,
      tasks_overdue: 0,
      submitted_reports_today: 0,
      pending_submissions_today: 0,
      total_logged_minutes_today: 0,
    };
  }

  // 2. Task stats for team
  const assignments = await TaskAssignee.findAll({
    where: { employee_id: { [Op.in]: employeeIds } },
    include: [{ model: Task, as: 'task', attributes: ['due_date', 'is_archived'] }],
  });

  const activeAssignments = assignments.filter(a => a.task && !a.task.is_archived);
  const tasksAssigned = activeAssignments.length;
  const tasksInProgress = activeAssignments.filter(a => a.status === 'IN_PROGRESS').length;
  const tasksCompleted = activeAssignments.filter(a => a.status === 'COMPLETED').length;
  const tasksOverdue = activeAssignments.filter(
    a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && a.task.due_date && a.task.due_date < today
  ).length;

  // 3. Submitted reports for today
  const submittedReportsToday = await DailyReport.findAll({
    where: {
      employee_id: { [Op.in]: employeeIds },
      report_date: today,
      status: 'SUBMITTED', // Strictly submitted only
    },
    include: [{ model: DailyWorklog, as: 'worklogs', attributes: ['duration_minutes'] }],
  });

  const submittedCount = submittedReportsToday.length;
  const pendingCount = Math.max(0, totalTeamMembers - submittedCount);

  let totalLoggedMinutes = 0;
  for (const report of submittedReportsToday) {
    if (report.worklogs) {
      totalLoggedMinutes += report.worklogs.reduce((sum, w) => sum + w.duration_minutes, 0);
    }
  }

  return {
    total_team_members: totalTeamMembers,
    tasks_assigned: tasksAssigned,
    tasks_in_progress: tasksInProgress,
    tasks_completed: tasksCompleted,
    tasks_overdue: tasksOverdue,
    submitted_reports_today: submittedCount,
    pending_submissions_today: pendingCount,
    total_logged_minutes_today: totalLoggedMinutes,
  };
};

const getSubmittedWorklogs = async (managerId, query = {}) => {
  const employeeIds = await getManagerSubordinateIds(managerId);

  if (employeeIds.length === 0) {
    return [];
  }

  const { employee_id, start_date, end_date } = query;
  const where = {
    employee_id: { [Op.in]: employeeIds },
    status: 'SUBMITTED', // PRIVACY: Only submitted reports, strictly no drafts!
  };

  if (employee_id) {
    if (!employeeIds.includes(employee_id)) {
      throw ApiError.forbidden('Employee is not in your team');
    }
    where.employee_id = employee_id;
  }

  if (start_date && end_date) {
    where.report_date = { [Op.between]: [start_date, end_date] };
  } else if (start_date) {
    where.report_date = { [Op.gte]: start_date };
  } else if (end_date) {
    where.report_date = { [Op.lte]: end_date };
  }

  const reports = await DailyReport.findAll({
    where,
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
          { model: Task, as: 'task', attributes: ['id', 'title'] },
        ],
      },
    ],
    order: [['report_date', 'DESC'], ['submitted_at', 'DESC']],
  });

  return reports;
};

module.exports = {
  getTeamMembers,
  getTeamDashboard,
  getSubmittedWorklogs,
};
