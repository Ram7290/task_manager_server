const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);
router.use(authorize('ADMIN'));

// Company off days
router.get('/off-days', attendanceController.listOffDays);
router.post('/off-days', attendanceController.addOffDay);
router.post('/off-days/bulk', attendanceController.bulkAddOffDays);
router.delete('/off-days/:id', attendanceController.removeOffDay);

// Attendance exceptions (per-person absences)
router.get('/exceptions', attendanceController.listAttendanceExceptions);
router.post('/exceptions', attendanceController.markAttendanceException);
router.delete('/exceptions/:id', attendanceController.removeAttendanceException);

module.exports = router;
