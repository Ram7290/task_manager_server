const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/user.service');

const listDepartments = asyncHandler(async (req, res) => {
  const departments = await userService.listDepartments();
  res.status(200).json({ success: true, data: departments });
});

const createDepartment = asyncHandler(async (req, res) => {
  const department = await userService.createDepartment(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Department created', data: department });
});

const updateDepartment = asyncHandler(async (req, res) => {
  const department = await userService.updateDepartment(req.params.id, req.body, req.user.id);
  res.status(200).json({ success: true, message: 'Department updated', data: department });
});

module.exports = {
  listDepartments,
  createDepartment,
  updateDepartment,
};
