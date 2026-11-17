const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const { User, Department, ManagerEmployeeAccess, sequelize } = require('../models');
const { logAudit } = require('./audit.service');

const listUsers = async ({ role, department_id, is_active, search }) => {
  const where = {};
  if (role) where.role = role;
  if (department_id) where.department_id = department_id;
  if (is_active !== undefined) where.is_active = is_active;
  if (search) {
    where[Op.or] = [
      { first_name: { [Op.like]: `%${search}%` } },
      { last_name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  const users = await User.findAll({
    where,
    attributes: { exclude: ['password_hash'] },
    include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
    order: [['first_name', 'ASC']],
  });

  return users;
};

const getUserById = async (id) => {
  const user = await User.findByPk(id, {
    attributes: { exclude: ['password_hash'] },
    include: [
      { model: Department, as: 'department', attributes: ['id', 'name'] },
      { model: User, as: 'managedEmployees', attributes: ['id', 'first_name', 'last_name', 'email'] },
      { model: User, as: 'reportingManagers', attributes: ['id', 'first_name', 'last_name', 'email'] },
    ],
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return user;
};

const createUser = async (data, actorId) => {
  const existing = await User.findOne({ where: { email: data.email.toLowerCase().trim() } });
  if (existing) {
    throw ApiError.badRequest('A user with this email already exists');
  }

  if (data.department_id) {
    const dept = await Department.findByPk(data.department_id);
    if (!dept) throw ApiError.badRequest('Invalid department ID');
  }

  const password_hash = await bcrypt.hash(data.password, 10);
  const user = await User.create({
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email.toLowerCase().trim(),
    password_hash,
    role: data.role,
    department_id: data.department_id || null,
    is_active: true,
  });

  await logAudit({
    actor_user_id: actorId,
    action: 'CREATE_USER',
    entity_type: 'USER',
    entity_id: user.id,
    new_values: { email: user.email, role: user.role },
  });

  const created = user.toJSON();
  delete created.password_hash;
  return created;
};

const updateUser = async (id, data, actorId) => {
  const user = await User.findByPk(id);
  if (!user) throw ApiError.notFound('User not found');

  const old_values = user.toJSON();
  delete old_values.password_hash;

  if (data.email && data.email.toLowerCase().trim() !== user.email) {
    const existing = await User.findOne({ where: { email: data.email.toLowerCase().trim() } });
    if (existing) throw ApiError.badRequest('Email is already in use');
    user.email = data.email.toLowerCase().trim();
  }

  if (data.first_name) user.first_name = data.first_name;
  if (data.last_name) user.last_name = data.last_name;
  if (data.role) user.role = data.role;
  if (data.department_id !== undefined) user.department_id = data.department_id;
  if (data.is_active !== undefined) user.is_active = data.is_active;

  if (data.password) {
    user.password_hash = await bcrypt.hash(data.password, 10);
  }

  await user.save();

  const new_values = user.toJSON();
  delete new_values.password_hash;

  await logAudit({
    actor_user_id: actorId,
    action: 'UPDATE_USER',
    entity_type: 'USER',
    entity_id: user.id,
    old_values,
    new_values,
  });

  return new_values;
};

const toggleUserStatus = async (id, actorId) => {
  const user = await User.findByPk(id);
  if (!user) throw ApiError.notFound('User not found');

  user.is_active = !user.is_active;
  await user.save();

  await logAudit({
    actor_user_id: actorId,
    action: user.is_active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
    entity_type: 'USER',
    entity_id: user.id,
    new_values: { is_active: user.is_active },
  });

  return { id: user.id, is_active: user.is_active };
};

const resetUserPassword = async (id, newPassword, actorId) => {
  const user = await User.findByPk(id);
  if (!user) throw ApiError.notFound('User not found');

  user.password_hash = await bcrypt.hash(newPassword, 10);
  await user.save();

  await logAudit({
    actor_user_id: actorId,
    action: 'RESET_PASSWORD',
    entity_type: 'USER',
    entity_id: user.id,
  });

  return { id: user.id };
};

// Manager Employee Access Mapping
const getManagerTeam = async (managerId) => {
  const manager = await User.findByPk(managerId, {
    include: [
      {
        model: User,
        as: 'managedEmployees',
        attributes: { exclude: ['password_hash'] },
        include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      },
    ],
  });

  if (!manager) throw ApiError.notFound('Manager not found');
  return manager.managedEmployees || [];
};

const setManagerTeam = async (managerId, employeeIds, actorId) => {
  const manager = await User.findByPk(managerId);
  if (!manager) throw ApiError.notFound('Manager not found');
  if (manager.role !== 'MANAGER' && manager.role !== 'ADMIN') {
    throw ApiError.badRequest('User must have MANAGER or ADMIN role to have team members');
  }

  const transaction = await sequelize.transaction();
  try {
    await ManagerEmployeeAccess.destroy({
      where: { manager_id: managerId },
      transaction,
    });

    if (employeeIds && employeeIds.length > 0) {
      const records = employeeIds.map((empId) => ({
        manager_id: managerId,
        employee_id: empId,
      }));
      await ManagerEmployeeAccess.bulkCreate(records, { transaction });
    }

    await logAudit({
      actor_user_id: actorId,
      action: 'SET_MANAGER_TEAM',
      entity_type: 'MANAGER_TEAM',
      entity_id: managerId,
      new_values: { employee_ids: employeeIds },
      transaction,
    });

    await transaction.commit();
    return await getManagerTeam(managerId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Department Services
const listDepartments = async () => {
  return await Department.findAll({
    include: [{ model: User, as: 'users', attributes: ['id', 'first_name', 'last_name', 'role'] }],
    order: [['name', 'ASC']],
  });
};

const createDepartment = async (data, actorId) => {
  const dept = await Department.create(data);
  await logAudit({
    actor_user_id: actorId,
    action: 'CREATE_DEPARTMENT',
    entity_type: 'DEPARTMENT',
    entity_id: dept.id,
    new_values: dept.toJSON(),
  });
  return dept;
};

const updateDepartment = async (id, data, actorId) => {
  const dept = await Department.findByPk(id);
  if (!dept) throw ApiError.notFound('Department not found');

  const old_values = dept.toJSON();
  await dept.update(data);

  await logAudit({
    actor_user_id: actorId,
    action: 'UPDATE_DEPARTMENT',
    entity_type: 'DEPARTMENT',
    entity_id: dept.id,
    old_values,
    new_values: dept.toJSON(),
  });

  return dept;
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  getManagerTeam,
  setManagerTeam,
  listDepartments,
  createDepartment,
  updateDepartment,
};
