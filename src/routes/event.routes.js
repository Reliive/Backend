const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createEventValidator, updateEventValidator, uuidParam, paginationQuery } = require('../utils/validators');

// Optional auth middleware
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const { supabaseAdmin } = require('../config/supabase');
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabaseAdmin.auth.getUser(token);
            req.user = user;
        } catch (e) { }
    }
    next();
};

// GET /api/v1/events
router.get('/', optionalAuth, paginationQuery, validate, eventController.listEvents);

// GET /api/v1/events/my - User's events (hosting + RSVPed)
router.get('/my', authenticate, eventController.getMyEvents);

// POST /api/v1/events
router.post('/', authenticate, createEventValidator, validate, eventController.createEvent);

// GET /api/v1/events/:id
router.get('/:id', optionalAuth, uuidParam('id'), validate, eventController.getEvent);

// PATCH /api/v1/events/:id
router.patch('/:id', authenticate, uuidParam('id'), updateEventValidator, validate, eventController.updateEvent);

// DELETE /api/v1/events/:id
router.delete('/:id', authenticate, uuidParam('id'), validate, eventController.cancelEvent);

// GET /api/v1/events/:id/attendees
router.get('/:id/attendees', uuidParam('id'), paginationQuery, validate, eventController.getAttendees);

// POST /api/v1/events/:id/rsvp
router.post('/:id/rsvp', authenticate, uuidParam('id'), validate, eventController.rsvp);

// DELETE /api/v1/events/:id/rsvp
router.delete('/:id/rsvp', authenticate, uuidParam('id'), validate, eventController.cancelRsvp);

// POST /api/v1/events/:id/checkin
router.post('/:id/checkin', authenticate, uuidParam('id'), validate, eventController.checkIn);

// GET /api/v1/events/:id/chat
router.get('/:id/chat', authenticate, uuidParam('id'), validate, eventController.getChat);

// POST /api/v1/events/:id/chat
router.post('/:id/chat', authenticate, uuidParam('id'), validate, eventController.sendMessage);

module.exports = router;
