const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partner.controller');
const { authenticate, requirePartner } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { partnerRegisterValidator, paginationQuery } = require('../utils/validators');

// POST /api/v1/partners/register
router.post('/register', authenticate, partnerRegisterValidator, validate, partnerController.register);

// GET /api/v1/partners/me
router.get('/me', authenticate, requirePartner, partnerController.getProfile);

// PATCH /api/v1/partners/me
router.patch('/me', authenticate, requirePartner, partnerController.updateProfile);

// GET /api/v1/partners/events
router.get('/events', authenticate, requirePartner, paginationQuery, validate, partnerController.getEvents);

// GET /api/v1/partners/bookings
router.get('/bookings', authenticate, requirePartner, paginationQuery, validate, partnerController.getBookings);

// GET /api/v1/partners/analytics
router.get('/analytics', authenticate, requirePartner, partnerController.getAnalytics);

// GET /api/v1/partners/payouts
router.get('/payouts', authenticate, requirePartner, partnerController.getPayouts);

// POST /api/v1/partners/payouts/request
router.post('/payouts/request', authenticate, requirePartner, partnerController.requestPayout);

module.exports = router;
