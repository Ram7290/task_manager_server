const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validation.middleware');
const {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
} = require('../validators/project.validator');

router.use(authenticate);

router.get('/', projectController.listProjects);
router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  validate(createProjectSchema),
  projectController.createProject
);
router.get('/:id', projectController.getProjectById);
router.patch(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate(updateProjectSchema),
  projectController.updateProject
);
router.post(
  '/:id/members',
  authorize('ADMIN', 'MANAGER'),
  validate(addProjectMemberSchema),
  projectController.addProjectMember
);
router.delete(
  '/:id/members/:employeeId',
  authorize('ADMIN', 'MANAGER'),
  projectController.removeProjectMember
);

module.exports = router;
