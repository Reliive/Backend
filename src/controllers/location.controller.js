const { supabaseAdmin } = require('../config/supabase');
const { success, error } = require('../utils/response');

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/**
 * POST /api/v1/location/update
 * Receives lat/lng from the mobile app, reverse-geocodes via Nominatim (free),
 * and stores structured location + PostGIS point in the users table.
 *
 * This is the ONLY endpoint needed for the MVP location flow:
 *   App gets GPS coords → sends to this endpoint → backend resolves + saves everything
 */
exports.updateLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        // 1. Reverse geocode via OpenStreetMap Nominatim (free, no API key)
        let city = null;
        let state = null;
        let country = null;
        let locationName = null;

        try {
            const nominatimUrl = `${NOMINATIM_BASE}/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=14`;

            const response = await fetch(nominatimUrl, {
                headers: {
                    'User-Agent': 'Reliive-App/1.0 (contact@reliive.app)',
                    'Accept-Language': 'en',
                },
            });

            if (!response.ok) {
                console.warn('Nominatim response not OK:', response.status);
            } else {
                const data = await response.json();
                const addr = data.address || {};

                city = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || null;
                state = addr.state || addr.state_district || addr.region || null;
                country = addr.country || null;
                locationName = [city, state, country].filter(Boolean).join(', ');
            }
        } catch (geoErr) {
            console.error('Nominatim reverse geocoding failed:', geoErr.message);
        }

        // 2. Update scalar location fields in the users table
        const updateData = {
            location_lat: latitude,
            location_lng: longitude,
            location_city: city,
            location_state: state,
            location_country: country,
            location_name: locationName,
        };

        const { data: user, error: dbError } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', req.user.id)
            .select()
            .single();

        if (dbError) {
            return error(res, dbError.message);
        }

        // 3. Update PostGIS geography point
        const { error: geoError } = await supabaseAdmin.rpc('update_user_location_point', {
            p_user_id: req.user.id,
            p_lat: parseFloat(latitude),
            p_lng: parseFloat(longitude),
        });

        if (geoError) {
            console.error('PostGIS point update error:', geoError);
        }

        return success(res, {
            location_lat: latitude,
            location_lng: longitude,
            location_city: city,
            location_state: state,
            location_country: country,
            location_name: locationName,
        }, 'Location updated');
    } catch (err) {
        console.error('Update location error:', err);
        return error(res, err.message, 500);
    }
};

/**
 * GET /api/v1/location/nearby?lat=...&lng=...&radius_km=10
 * Queries PostGIS for users within a radius (future use)
 */
exports.getNearbyUsers = async (req, res) => {
    try {
        const {
            lat,
            lng,
            radius_km = 10,
            limit = 50,
            offset = 0,
        } = req.query;

        const { data, error: rpcError } = await supabaseAdmin.rpc('find_nearby_users', {
            user_lat: parseFloat(lat),
            user_lng: parseFloat(lng),
            radius_km: parseFloat(radius_km),
            result_limit: parseInt(limit, 10),
            result_offset: parseInt(offset, 10),
            exclude_user_id: req.user.id,
        });

        if (rpcError) {
            console.error('PostGIS nearby query error:', rpcError);
            return error(res, rpcError.message, 500);
        }

        return success(res, data || []);
    } catch (err) {
        console.error('Nearby users error:', err);
        return error(res, err.message, 500);
    }
};
