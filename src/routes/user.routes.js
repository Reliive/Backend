const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { updateProfileValidator, interestsValidator, uuidParam } = require('../utils/validators');

// GET /api/v1/users/me
router.get('/me', authenticate, userController.getMe);

// PATCH /api/v1/users/me
router.patch('/me', authenticate, updateProfileValidator, validate, userController.updateMe);

// POST /api/v1/users/me/interests
router.post('/me/interests', authenticate, interestsValidator, validate, userController.setInterests);

// DELETE /api/v1/users/me
router.delete('/me', authenticate, userController.deleteMe);

// GET /api/v1/users/:id
router.get('/:id', uuidParam('id'), validate, userController.getProfile);

// GET /api/v1/users/:id/badges
router.get('/:id/badges', uuidParam('id'), validate, userController.getBadges);

module.exports = router;
