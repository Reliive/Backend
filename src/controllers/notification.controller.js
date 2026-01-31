const { supabaseAdmin } = require('../config/supabase');
const { success, error, paginated } = require('../utils/response');

// Get notifications
exports.getNotifications = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = parseInt(req.query.offset) || 0;
        const unreadOnly = req.query.unread === 'true';

        let query = supabaseAdmin
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', req.user.id);

        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        const { data: notifications, error: dbError, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (dbError) {
            return error(res, dbError.message);
        }

        const { count: unreadCount } = await supabaseAdmin
            .from('notifications')
            .select('id', { count: 'exact' })
            .eq('user_id', req.user.id)
            .eq('is_read', false);

        return success(res, {
            notifications: notifications || [],
            total: count || 0,
            unread_count: unreadCount || 0,
            limit,
            offset
        });
    } catch (err) {
        console.error('Get notifications error:', err);
        return error(res, err.message, 500);
    }
};

// Mark as read
exports.markRead = async (req, res) => {
    try {
        const { id } = req.params;

        const { error: dbError } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, null, 'Marked as read');
    } catch (err) {
        console.error('Mark read error:', err);
        return error(res, err.message, 500);
    }
};

// Mark all as read
exports.markAllRead = async (req, res) => {
    try {
        const { error: dbError } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', req.user.id)
            .eq('is_read', false);

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, null, 'All marked as read');
    } catch (err) {
        console.error('Mark all read error:', err);
        return error(res, err.message, 500);
    }
};

// Get preferences
exports.getPreferences = async (req, res) => {
    try {
        const { data: prefs, error: dbError } = await supabaseAdmin
            .from('notification_preferences')
            .select('*')
            .eq('user_id', req.user.id)
            .single();

        if (dbError && dbError.code !== 'PGRST116') {
            return error(res, dbError.message);
        }

        return success(res, prefs || {
            push_enabled: true,
            email_enabled: true,
            whatsapp_enabled: true,
            reminder_48h: true,
            reminder_2h: true,
            new_events: true,
            club_updates: true
        });
    } catch (err) {
        console.error('Get preferences error:', err);
        return error(res, err.message, 500);
    }
};

// Update preferences
exports.updatePreferences = async (req, res) => {
    try {
        const { data: prefs, error: dbError } = await supabaseAdmin
            .from('notification_preferences')
            .upsert({
                user_id: req.user.id,
                ...req.body
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, prefs, 'Preferences updated');
    } catch (err) {
        console.error('Update preferences error:', err);
        return error(res, err.message, 500);
    }
};
