const asyncHandler = require('../utils/asyncHandler');
const worklogService = require('../services/worklog.service');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await worklogService.listCategories();
  res.status(200).json({ success: true, data: categories });
});

const getTodayDraft = asyncHandler(async (req, res) => {
  const report = await worklogService.getOrCreateTodayDraft(req.user.id, req);
  res.status(200).json({ success: true, data: report });
});

const getMyReports = asyncHandler(async (req, res) => {
  const reports = await worklogService.getMyReports(req.user.id, req.query);
  res.status(200).json({ success: true, data: reports });
});

const getReportById = asyncHandler(async (req, res) => {
  const report = await worklogService.getReportById(req.params.reportId, req.user);
  res.status(200).json({ success: true, data: report });
});

const addEntry = asyncHandler(async (req, res) => {
  const entry = await worklogService.addEntry(req.params.reportId, req.body, req.user);
  res.status(201).json({ success: true, message: 'Worklog entry added', data: entry });
});

const updateEntry = asyncHandler(async (req, res) => {
  const entry = await worklogService.updateEntry(req.params.entryId, req.body, req.user);
  res.status(200).json({ success: true, message: 'Worklog entry updated', data: entry });
});

const deleteEntry = asyncHandler(async (req, res) => {
  const result = await worklogService.deleteEntry(req.params.entryId, req.user);
  res.status(200).json({ success: true, message: result.message });
});

const submitReport = asyncHandler(async (req, res) => {
  const report = await worklogService.submitReport(req.params.reportId, req.user);
  res.status(200).json({
    success: true,
    message: 'Daily report submitted successfully and locked',
    data: report,
  });
});

module.exports = {
  getCategories,
  getTodayDraft,
  getMyReports,
  getReportById,
  addEntry,
  updateEntry,
  deleteEntry,
  submitReport,
};
