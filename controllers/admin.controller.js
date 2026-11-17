const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/admin.service');

const getDashboard = asyncHandler(async (req, res) => {
  const stats = await adminService.getAdminDashboard(req.query);
  res.status(200).json({ success: true, data: stats });
});

const getSubmissionTimeline = asyncHandler(async (req, res) => {
  const data = await adminService.getSubmissionTimeline(req.query);
  res.status(200).json({ success: true, data: data });
});

const getAllWorklogs = asyncHandler(async (req, res) => {
  const reports = await adminService.getAllWorklogs(req.query);
  res.status(200).json({ success: true, data: reports });
});

const correctReport = asyncHandler(async (req, res) => {
  const result = await adminService.correctReport(req.params.reportId, req.body, req.user);
  res.status(200).json({
    success: true,
    message: 'Report correction applied and audited successfully',
    data: result,
  });
});

const getAuditLogs = asyncHandler(async (req, res) => {
  const logs = await adminService.getAuditLogs(req.query);
  res.status(200).json({ success: true, data: logs });
});

const getUserOverview = asyncHandler(async (req, res) => {
  const data = await adminService.getUserOverview(req.params.userId);
  res.status(200).json({ success: true, data });
});

module.exports = {
  getDashboard,
  getSubmissionTimeline,
  getAllWorklogs,
  correctReport,
  getAuditLogs,
  getUserOverview,
};
