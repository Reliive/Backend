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
        const [eventsAttended, eventsHosted] = await Promise.all([
            supabaseAdmin
                .from('rsvps')
                .select('id', { count: 'exact' })
                .eq('user_id', req.user.id)
                .eq('checked_in', true),
            supabaseAdmin
                .from('events')
                .select('id', { count: 'exact' })
                .eq('host_id', req.user.id)
                .eq('status', 'completed')
        ]);

        return success(res, {
            ...profile,
            clubs: profile.user_clubs?.map(uc => uc.club) || [],
            interests: profile.user_interests?.map(ui => ui.interest) || [],
            badges: profile.user_badges?.map(ub => ub.badge) || [],
            stats: {
                events_attended: eventsAttended.count || 0,
                events_hosted: eventsHosted.count || 0
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
        const { name, avatar_url, neighborhood, accessibility_prefs, emergency_contact } = req.body;

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (avatar_url) updateData.avatar_url = avatar_url;
        if (neighborhood) updateData.neighborhood = neighborhood.trim();
        if (accessibility_prefs) updateData.accessibility_prefs = accessibility_prefs;
        if (emergency_contact) updateData.emergency_contact = emergency_contact;

        const { data, error: dbError } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', req.user.id)
            .select()
            .single();

        if (dbError) {
            return error(res, dbError.message);
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
