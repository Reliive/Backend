const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { locationUpdateValidator, locationNearbyValidator } = require('../utils/validators');

// POST /api/v1/location/update — save user's GPS location (reverse geocodes server-side)
router.post('/update', authenticate, locationUpdateValidator, validate, locationController.updateLocation);

// GET /api/v1/location/nearby?lat=...&lng=...&radius_km=10 — find nearby users (future)
router.get('/nearby', authenticate, locationNearbyValidator, validate, locationController.getNearbyUsers);

module.exports = router;
