const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validation.middleware');
const { reportCorrectionSchema } = require('../validators/worklog.validator');

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/dashboard', adminController.getDashboard);
router.get('/submission-timeline', adminController.getSubmissionTimeline);
router.get('/users/:userId/overview', adminController.getUserOverview);
router.get('/worklogs', adminController.getAllWorklogs);
router.post(
  '/worklogs/:reportId/corrections',
  validate(reportCorrectionSchema),
  adminController.correctReport
);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
