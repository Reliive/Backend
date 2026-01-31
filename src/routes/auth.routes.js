const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const {
    signupValidator,
    loginValidator,
    forgotPasswordValidator,
    resetPasswordValidator
} = require('../utils/validators');

// POST /api/v1/auth/signup
router.post('/signup', signupValidator, validate, authController.signup);

// POST /api/v1/auth/login
router.post('/login', loginValidator, validate, authController.login);

// POST /api/v1/auth/google
router.post('/google', authController.googleAuth);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', forgotPasswordValidator, validate, authController.forgotPassword);

// POST /api/v1/auth/reset-password
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);

// POST /api/v1/auth/refresh
router.post('/refresh', authController.refreshToken);

// DELETE /api/v1/auth/logout
router.delete('/logout', authenticate, authController.logout);

module.exports = router;
