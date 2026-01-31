const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createBookingValidator, uuidParam, paginationQuery } = require('../utils/validators');

// POST /api/v1/bookings
router.post('/', authenticate, createBookingValidator, validate, bookingController.createBooking);

// GET /api/v1/bookings/my
router.get('/my', authenticate, paginationQuery, validate, bookingController.getMyBookings);

// GET /api/v1/bookings/:id
router.get('/:id', authenticate, uuidParam('id'), validate, bookingController.getBooking);

// POST /api/v1/bookings/:id/cancel
router.post('/:id/cancel', authenticate, uuidParam('id'), validate, bookingController.cancelBooking);

module.exports = router;
