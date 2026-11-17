const asyncHandler = require('../utils/asyncHandler');
const attendanceService = require('../services/attendance.service');

// Off days
const listOffDays = asyncHandler(async (req, res) => {
  const data = await attendanceService.listOffDays(req.query);
  res.status(200).json({ success: true, data });
});

const addOffDay = asyncHandler(async (req, res) => {
  const offDay = await attendanceService.addOffDay(req.body, req.user.id);
  res.status(201).json({ success: true, data: offDay });
});

const bulkAddOffDays = asyncHandler(async (req, res) => {
  const result = await attendanceService.bulkAddOffDays(req.body.entries, req.user.id);
  res.status(201).json({ success: true, data: result });
});

const removeOffDay = asyncHandler(async (req, res) => {
  const result = await attendanceService.removeOffDay(req.params.id, req.user.id);
  res.status(200).json({ success: true, message: 'Off day removed', data: result });
});

// Attendance exceptions
const listAttendanceExceptions = asyncHandler(async (req, res) => {
  const data = await attendanceService.listAttendanceExceptions(req.query);
  res.status(200).json({ success: true, data });
});

const markAttendanceException = asyncHandler(async (req, res) => {
  const record = await attendanceService.markAttendanceException(req.body, req.user.id);
  res.status(201).json({ success: true, data: record });
});

const removeAttendanceException = asyncHandler(async (req, res) => {
  const result = await attendanceService.removeAttendanceException(req.params.id, req.user.id);
  res.status(200).json({ success: true, message: 'Attendance exception removed', data: result });
});

module.exports = {
  listOffDays,
  addOffDay,
  bulkAddOffDays,
  removeOffDay,
  listAttendanceExceptions,
  markAttendanceException,
  removeAttendanceException,
};
