const express = require('express');
const router = express.Router();
const clubController = require('../controllers/club.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { paginationQuery } = require('../utils/validators');

// Optional auth middleware - sets req.user if token present
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

// GET /api/v1/clubs
router.get('/', optionalAuth, clubController.listClubs);

// GET /api/v1/clubs/:id
router.get('/:id', optionalAuth, clubController.getClub);

// POST /api/v1/clubs/:id/join
router.post('/:id/join', authenticate, clubController.joinClub);

// DELETE /api/v1/clubs/:id/leave
router.delete('/:id/leave', authenticate, clubController.leaveClub);

// GET /api/v1/clubs/:id/members
router.get('/:id/members', paginationQuery, validate, clubController.getMembers);

// GET /api/v1/clubs/:id/events
router.get('/:id/events', paginationQuery, validate, clubController.getEvents);

module.exports = router;
