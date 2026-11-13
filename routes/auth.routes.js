const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const { loginSchema } = require('../validators/auth.validator');

router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
