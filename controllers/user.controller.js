const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/user.service');

const listUsers = asyncHandler(async (req, res) => {
  const users = await userService.listUsers(req.query);
  res.status(200).json({ success: true, data: users });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.status(200).json({ success: true, data: user });
});

const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'User created successfully', data: user });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user.id);
  res.status(200).json({ success: true, message: 'User updated successfully', data: user });
});

const toggleUserStatus = asyncHandler(async (req, res) => {
  const result = await userService.toggleUserStatus(req.params.id, req.user.id);
  res.status(200).json({ success: true, message: 'User status updated', data: result });
});

const resetUserPassword = asyncHandler(async (req, res) => {
  await userService.resetUserPassword(req.params.id, req.body.new_password, req.user.id);
  res.status(200).json({ success: true, message: 'Password reset successfully' });
});

const getManagerTeam = asyncHandler(async (req, res) => {
  const team = await userService.getManagerTeam(req.params.id);
  res.status(200).json({ success: true, data: team });
});

const setManagerTeam = asyncHandler(async (req, res) => {
  const team = await userService.setManagerTeam(req.params.id, req.body.employee_ids, req.user.id);
  res.status(200).json({ success: true, message: 'Manager team updated successfully', data: team });
});

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  getManagerTeam,
  setManagerTeam,
};
