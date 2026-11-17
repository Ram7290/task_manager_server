const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const result = await authService.login(email, password, ipAddress);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress;
  const result = await authService.changePassword(
    req.user.id,
    req.body.current_password,
    req.body.new_password,
    ipAddress
  );

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

module.exports = {
  login,
  getMe,
  logout,
  changePassword,
};
