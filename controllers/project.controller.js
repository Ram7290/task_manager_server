const asyncHandler = require('../utils/asyncHandler');
const projectService = require('../services/project.service');

const listProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.listProjects(req.user);
  res.status(200).json({ success: true, data: projects });
});

const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id, req.user);
  res.status(200).json({ success: true, data: project });
});

const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.body, req.user);
  res.status(201).json({ success: true, message: 'Project created successfully', data: project });
});

const updateProject = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'Project updated successfully', data: project });
});

const addProjectMember = asyncHandler(async (req, res) => {
  const project = await projectService.addProjectMember(req.params.id, req.body.employee_id, req.user);
  res.status(200).json({ success: true, message: 'Member added to project', data: project });
});

const removeProjectMember = asyncHandler(async (req, res) => {
  const result = await projectService.removeProjectMember(req.params.id, req.params.employeeId, req.user);
  res.status(200).json({ success: true, message: result.message });
});

module.exports = {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  addProjectMember,
  removeProjectMember,
};
