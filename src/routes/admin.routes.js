const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { uuidParam, paginationQuery } = require('../utils/validators');

// All routes require admin
router.use(authenticate, requireAdmin);

// GET /api/v1/admin/reports
router.get('/reports', paginationQuery, validate, adminController.getReports);

// POST /api/v1/admin/reports/:id/action
router.post('/reports/:id/action', uuidParam('id'), validate, adminController.takeAction);

// GET /api/v1/admin/users
router.get('/users', paginationQuery, validate, adminController.listUsers);

// POST /api/v1/admin/users/:id/suspend
router.post('/users/:id/suspend', uuidParam('id'), validate, adminController.suspendUser);

// POST /api/v1/admin/users/:id/unsuspend
router.post('/users/:id/unsuspend', uuidParam('id'), validate, adminController.unsuspendUser);

// GET /api/v1/admin/partners
router.get('/partners', paginationQuery, validate, adminController.listPartners);

// POST /api/v1/admin/partners/:id/verify
router.post('/partners/:id/verify', uuidParam('id'), validate, adminController.verifyPartner);

// GET /api/v1/admin/analytics
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
