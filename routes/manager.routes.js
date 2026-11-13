const express = require('express');
const router = express.Router();
const managerController = require('../controllers/manager.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);
router.use(authorize('MANAGER', 'ADMIN'));

router.get('/team', managerController.getTeam);
router.get('/dashboard', managerController.getDashboard);
router.get('/worklogs', managerController.getSubmittedWorklogs);
router.get('/worklogs/:reportId', managerController.getSubmittedReportById);

module.exports = router;
