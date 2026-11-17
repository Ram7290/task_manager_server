const asyncHandler = require('../utils/asyncHandler');
const worklogService = require('../services/worklog.service');

const getCategories = asyncHandler(async (req, res) => {
  const includeInactive = req.user.role === 'ADMIN' && req.query.include_inactive === 'true';
  const categories = await worklogService.listCategories({ includeInactive });
  res.status(200).json({ success: true, data: categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await worklogService.createCategory(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Category created', data: category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await worklogService.updateCategory(req.params.id, req.body, req.user.id);
  res.status(200).json({ success: true, message: 'Category updated', data: category });
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
  createCategory,
  updateCategory,
  getTodayDraft,
  getMyReports,
  getReportById,
  addEntry,
  updateEntry,
  deleteEntry,
  submitReport,
};
