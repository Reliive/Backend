const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { uuidParam, paginationQuery } = require('../utils/validators');

// GET /api/v1/notifications
router.get('/', authenticate, paginationQuery, validate, notificationController.getNotifications);

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', authenticate, uuidParam('id'), validate, notificationController.markRead);

// POST /api/v1/notifications/read-all
router.post('/read-all', authenticate, notificationController.markAllRead);

// GET /api/v1/notifications/preferences
router.get('/preferences', authenticate, notificationController.getPreferences);

// POST /api/v1/notifications/preferences
router.post('/preferences', authenticate, notificationController.updatePreferences);

module.exports = router;
