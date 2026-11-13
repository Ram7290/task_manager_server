const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/department.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validation.middleware');
const { createDepartmentSchema } = require('../validators/user.validator');

router.use(authenticate);

router.get('/', departmentController.listDepartments);
router.post('/', authorize('ADMIN'), validate(createDepartmentSchema), departmentController.createDepartment);
router.patch('/:id', authorize('ADMIN'), departmentController.updateDepartment);

module.exports = router;
