const ApiError = require('../utils/ApiError');
const { Project, ProjectMember, User, Task } = require('../models');
const { logAudit } = require('./audit.service');

const listProjects = async (user) => {
  const include = [
    {
      model: User,
      as: 'members',
      attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
      through: { attributes: [] },
    },
    {
      model: User,
      as: 'creator',
      attributes: ['id', 'first_name', 'last_name', 'email'],
    },
  ];

  if (user.role === 'ADMIN') {
    return await Project.findAll({ include, order: [['createdAt', 'DESC']] });
  }

  // Managers and Employees see projects where they are creator or member
  const allProjects = await Project.findAll({ include, order: [['createdAt', 'DESC']] });
  return allProjects.filter(p => p.created_by === user.id || p.members.some(m => m.id === user.id));
};

const getProjectById = async (id, user) => {
  const project = await Project.findByPk(id, {
    include: [
      {
        model: User,
        as: 'members',
        attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
        through: { attributes: [] },
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'first_name', 'last_name', 'email'],
      },
      {
        model: Task,
        as: 'tasks',
      },
    ],
  });

  if (!project) throw ApiError.notFound('Project not found');

  if (user.role !== 'ADMIN' && project.created_by !== user.id && !project.members.some(m => m.id === user.id)) {
    throw ApiError.forbidden('You do not have access to this project');
  }

  return project;
};

const createProject = async (data, user) => {
  const project = await Project.create({
    name: data.name,
    description: data.description,
    status: data.status || 'ACTIVE',
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    created_by: user.id,
  });

  if (data.member_ids && data.member_ids.length > 0) {
    const members = data.member_ids.map(employeeId => ({
      project_id: project.id,
      employee_id: employeeId,
      added_by: user.id,
    }));
    await ProjectMember.bulkCreate(members);
  }

  await logAudit({
    actor_user_id: user.id,
    action: 'CREATE_PROJECT',
    entity_type: 'PROJECT',
    entity_id: project.id,
    new_values: project.toJSON(),
  });

  return await getProjectById(project.id, user);
};

const updateProject = async (id, data, user) => {
  const project = await Project.findByPk(id);
  if (!project) throw ApiError.notFound('Project not found');

  if (user.role !== 'ADMIN' && project.created_by !== user.id) {
    throw ApiError.forbidden('Only admin or project creator can update this project');
  }

  const old_values = project.toJSON();
  await project.update(data);

  await logAudit({
    actor_user_id: user.id,
    action: 'UPDATE_PROJECT',
    entity_type: 'PROJECT',
    entity_id: project.id,
    old_values,
    new_values: project.toJSON(),
  });

  return await getProjectById(project.id, user);
};

const addProjectMember = async (projectId, employeeId, actor) => {
  const project = await Project.findByPk(projectId);
  if (!project) throw ApiError.notFound('Project not found');

  const existing = await ProjectMember.findOne({
    where: { project_id: projectId, employee_id: employeeId },
  });
  if (existing) throw ApiError.conflict('User is already a member of this project');

  await ProjectMember.create({
    project_id: projectId,
    employee_id: employeeId,
    added_by: actor.id,
  });

  await logAudit({
    actor_user_id: actor.id,
    action: 'ADD_PROJECT_MEMBER',
    entity_type: 'PROJECT_MEMBER',
    entity_id: `${projectId}_${employeeId}`,
    new_values: { project_id: projectId, employee_id: employeeId },
  });

  return await getProjectById(projectId, actor);
};

const removeProjectMember = async (projectId, employeeId, actor) => {
  const member = await ProjectMember.findOne({
    where: { project_id: projectId, employee_id: employeeId },
  });
  if (!member) throw ApiError.notFound('Project member not found');

  await member.destroy();

  await logAudit({
    actor_user_id: actor.id,
    action: 'REMOVE_PROJECT_MEMBER',
    entity_type: 'PROJECT_MEMBER',
    entity_id: `${projectId}_${employeeId}`,
  });

  return { success: true, message: 'Member removed from project' };
};

module.exports = {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  addProjectMember,
  removeProjectMember,
};
