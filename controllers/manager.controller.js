const asyncHandler = require('../utils/asyncHandler');
const managerService = require('../services/manager.service');
const worklogService = require('../services/worklog.service');

const getTeam = asyncHandler(async (req, res) => {
  const team = await managerService.getTeamMembers(req.user.id);
  res.status(200).json({ success: true, data: team });
});

const getDashboard = asyncHandler(async (req, res) => {
  const stats = await managerService.getTeamDashboard(req.user.id);
  res.status(200).json({ success: true, data: stats });
});

const getSubmittedWorklogs = asyncHandler(async (req, res) => {
  const reports = await managerService.getSubmittedWorklogs(req.user.id, req.query);
  res.status(200).json({ success: true, data: reports });
});

const getSubmittedReportById = asyncHandler(async (req, res) => {
  const report = await worklogService.getReportById(req.params.reportId, req.user);
  res.status(200).json({ success: true, data: report });
});

module.exports = {
  getTeam,
  getDashboard,
  getSubmittedWorklogs,
  getSubmittedReportById,
};
