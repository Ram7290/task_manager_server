const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/admin.service');

const getDashboard = asyncHandler(async (req, res) => {
  const stats = await adminService.getAdminDashboard();
  res.status(200).json({ success: true, data: stats });
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

module.exports = {
  getDashboard,
  getAllWorklogs,
  correctReport,
  getAuditLogs,
};
