const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { success, error } = require('../utils/response');

// GET /api/v1/config/neighborhoods
// Get all neighborhoods for the current city
router.get('/neighborhoods', async (req, res) => {
    try {
        const city = req.query.city || 'lucknow'; // Default to Lucknow

        const { data: neighborhoods, error: dbError } = await supabaseAdmin
            .from('neighborhoods')
            .select('id, name, slug, city')
            .eq('city', city.toLowerCase())
            .eq('active', true)
            .order('name');

        if (dbError) {
            console.error('DB error:', dbError);
            return error(res, dbError.message);
        }

        return success(res, neighborhoods || []);
    } catch (err) {
        console.error('Get neighborhoods error:', err);
        return error(res, err.message, 500);
    }
});

// GET /api/v1/config/cities
// Get all supported cities
router.get('/cities', async (req, res) => {
    try {
        const { data: cities, error: dbError } = await supabaseAdmin
            .from('cities')
            .select('id, name, slug, state')
            .eq('active', true)
            .order('name');

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, cities || []);
    } catch (err) {
        console.error('Get cities error:', err);
        return error(res, err.message, 500);
    }
});

// GET /api/v1/config/interests
// Get all available interests
router.get('/interests', async (req, res) => {
    try {
        const { data: interests, error: dbError } = await supabaseAdmin
            .from('interests')
            .select('id, name, icon, category')
            .eq('active', true)
            .order('name');

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, interests || []);
    } catch (err) {
        console.error('Get interests error:', err);
        return error(res, err.message, 500);
    }
});

module.exports = router;
