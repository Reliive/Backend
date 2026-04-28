const { supabaseAdmin } = require('../config/supabase');
const { success, error } = require('../utils/response');

// Get current user profile
exports.getMe = async (req, res) => {
    try {
        const { data: profile, error: dbError } = await supabaseAdmin
            .from('users')
            .select(`
        *,
        user_clubs(club:clubs(id, name, slug, icon)),
        user_interests(interest),
        user_badges(badge:badges(id, name, slug, icon))
      `)
            .eq('id', req.user.id)
            .single();

        if (dbError) {
            return error(res, dbError.message);
        }

        // Get stats
        const [eventsAttended, eventsHosted, clubsJoined] = await Promise.all([
            supabaseAdmin
                .from('rsvps')
                .select('id', { count: 'exact' })
                .eq('user_id', req.user.id)
                .eq('status', 'confirmed'),
            supabaseAdmin
                .from('events')
                .select('id', { count: 'exact' })
                .eq('host_id', req.user.id),
            supabaseAdmin
                .from('user_clubs')
                .select('id', { count: 'exact' })
                .eq('user_id', req.user.id)
        ]);

        return success(res, {
            ...profile,
            clubs: profile.user_clubs?.map(uc => uc.club) || [],
            interests: profile.user_interests?.map(ui => ui.interest) || [],
            badges: profile.user_badges?.map(ub => ub.badge) || [],
            stats: {
                events_attended: eventsAttended.count || 0,
                events_hosted: eventsHosted.count || 0,
                clubs_joined: clubsJoined.count || 0
            }
        });
    } catch (err) {
        console.error('Get profile error:', err);
        return error(res, err.message, 500);
    }
};

// Update current user profile
exports.updateMe = async (req, res) => {
    try {
        const {
            name,
            avatar_url,
            neighborhood,
            accessibility_prefs,
            emergency_contact,
            // Location fields
            location_name,
            location_city,
            location_state,
            location_country,
            location_country_code,
            location_lat,
            location_lng,
        } = req.body;

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (avatar_url) updateData.avatar_url = avatar_url;
        if (neighborhood) updateData.neighborhood = neighborhood.trim();
        if (accessibility_prefs) updateData.accessibility_prefs = accessibility_prefs;
        if (emergency_contact) updateData.emergency_contact = emergency_contact;

        // Location fields (allow explicit null to clear)
        if (location_name !== undefined) updateData.location_name = location_name;
        if (location_city !== undefined) updateData.location_city = location_city;
        if (location_state !== undefined) updateData.location_state = location_state;
        if (location_country !== undefined) updateData.location_country = location_country;
        if (location_country_code !== undefined) updateData.location_country_code = location_country_code;
        if (location_lat !== undefined) updateData.location_lat = location_lat;
        if (location_lng !== undefined) updateData.location_lng = location_lng;

        // 1. Update scalar fields
        const { data, error: dbError } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', req.user.id)
            .select()
            .single();

        if (dbError) {
            return error(res, dbError.message);
        }

        // 2. If lat/lng provided, update PostGIS geography point via dedicated SQL function
        if (location_lat != null && location_lng != null) {
            const { error: geoError } = await supabaseAdmin.rpc('update_user_location_point', {
                p_user_id: req.user.id,
                p_lat: parseFloat(location_lat),
                p_lng: parseFloat(location_lng),
            });

            if (geoError) {
                console.error('PostGIS point update error:', geoError);
                // Non-fatal: scalar fields are already saved
            }
        }

        return success(res, data, 'Profile updated');
    } catch (err) {
        console.error('Update profile error:', err);
        return error(res, err.message, 500);
    }
};

// Set user interests
exports.setInterests = async (req, res) => {
    try {
        const { interests } = req.body;

        // Remove existing interests
        await supabaseAdmin
            .from('user_interests')
            .delete()
            .eq('user_id', req.user.id);

        // Add new interests
        if (interests.length > 0) {
            const interestRecords = interests.map(interest => ({
                user_id: req.user.id,
                interest: interest.trim()
            }));

            const { error: insertError } = await supabaseAdmin
                .from('user_interests')
                .insert(interestRecords);

            if (insertError) {
                return error(res, insertError.message);
            }
        }

        // Mark onboarding completed
        await supabaseAdmin
            .from('users')
            .update({ onboarding_completed: true })
            .eq('id', req.user.id);

        return success(res, { interests }, 'Interests updated');
    } catch (err) {
        console.error('Set interests error:', err);
        return error(res, err.message, 500);
    }
};

// Delete account
exports.deleteMe = async (req, res) => {
    try {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);

        if (authError) {
            return error(res, authError.message);
        }

        return success(res, null, 'Account deleted');
    } catch (err) {
        console.error('Delete account error:', err);
        return error(res, err.message, 500);
    }
};

// Get public profile
exports.getProfile = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: profile, error: dbError } = await supabaseAdmin
            .from('users')
            .select(`
        id, name, avatar_url, neighborhood, is_verified, created_at,
        user_badges(badge:badges(id, name, slug, icon))
      `)
            .eq('id', id)
            .single();

        if (dbError || !profile) {
            return error(res, 'User not found', 404);
        }

        // Get public stats
        const [eventsAttended, eventsHosted] = await Promise.all([
            supabaseAdmin
                .from('rsvps')
                .select('id', { count: 'exact' })
                .eq('user_id', id)
                .eq('checked_in', true),
            supabaseAdmin
                .from('events')
                .select('id', { count: 'exact' })
                .eq('host_id', id)
                .eq('status', 'completed')
        ]);

        return success(res, {
            ...profile,
            badges: profile.user_badges?.map(ub => ub.badge) || [],
            stats: {
                events_attended: eventsAttended.count || 0,
                events_hosted: eventsHosted.count || 0
            }
        });
    } catch (err) {
        console.error('Get public profile error:', err);
        return error(res, err.message, 500);
    }
};

// Get user badges
exports.getBadges = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: badges, error: dbError } = await supabaseAdmin
            .from('user_badges')
            .select(`
        earned_at,
        badge:badges(id, name, slug, description, icon)
      `)
            .eq('user_id', id)
            .order('earned_at', { ascending: false });

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, badges?.map(b => ({ ...b.badge, earned_at: b.earned_at })) || []);
    } catch (err) {
        console.error('Get badges error:', err);
        return error(res, err.message, 500);
    }
};
