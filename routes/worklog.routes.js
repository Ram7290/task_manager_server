const express = require('express');
const router = express.Router();
const worklogController = require('../controllers/worklog.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const {
  addWorklogEntrySchema,
  updateWorklogEntrySchema,
} = require('../validators/worklog.validator');

router.use(authenticate);

// Worklog Categories
router.get('/categories', worklogController.getCategories);

// Employee worklog draft & reports
router.get('/today', worklogController.getTodayDraft);
router.get('/my-reports', worklogController.getMyReports);
router.get('/reports/:reportId', worklogController.getReportById);

// Draft operations
router.post(
  '/reports/:reportId/entries',
  validate(addWorklogEntrySchema),
  worklogController.addEntry
);
router.patch(
  '/entries/:entryId',
  validate(updateWorklogEntrySchema),
  worklogController.updateEntry
);
router.delete('/entries/:entryId', worklogController.deleteEntry);

// Submit and lock
router.post('/reports/:reportId/submit', worklogController.submitReport);

module.exports = router;
