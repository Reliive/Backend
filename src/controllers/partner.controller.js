const { supabaseAdmin } = require('../config/supabase');
const { success, error, paginated } = require('../utils/response');

// Register
exports.register = async (req, res) => {
    try {
        const { business_name, business_type, description, logo_url, documents, bank_details } = req.body;

        const { data: existing } = await supabaseAdmin
            .from('partners')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (existing) {
            return error(res, 'Partner account already exists');
        }

        const { data: partner, error: dbError } = await supabaseAdmin
            .from('partners')
            .insert({
                user_id: req.user.id,
                business_name: business_name.trim(),
                business_type: business_type || null,
                description: description?.trim() || null,
                logo_url: logo_url || null,
                documents: documents || {},
                bank_details: bank_details || null,
                is_verified: false
            })
            .select()
            .single();

        if (dbError) {
            return error(res, dbError.message);
        }

        await supabaseAdmin
            .from('users')
            .update({ role: 'partner' })
            .eq('id', req.user.id);

        return success(res, partner, 'Partner registration submitted', 201);
    } catch (err) {
        console.error('Register partner error:', err);
        return error(res, err.message, 500);
    }
};

// Get profile
exports.getProfile = async (req, res) => {
    try {
        const { data: partner, error: dbError } = await supabaseAdmin
            .from('partners')
            .select('*')
            .eq('user_id', req.user.id)
            .single();

        if (dbError || !partner) {
            return error(res, 'Partner profile not found', 404);
        }

        return success(res, partner);
    } catch (err) {
        console.error('Get partner profile error:', err);
        return error(res, err.message, 500);
    }
};

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const allowedFields = ['business_name', 'business_type', 'description', 'logo_url', 'documents', 'bank_details'];
        const updateData = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = typeof req.body[field] === 'string'
                    ? req.body[field].trim()
                    : req.body[field];
            }
        }

        const { data: partner, error: dbError } = await supabaseAdmin
            .from('partners')
            .update(updateData)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, partner, 'Profile updated');
    } catch (err) {
        console.error('Update partner profile error:', err);
        return error(res, err.message, 500);
    }
};

// Get events
exports.getEvents = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = parseInt(req.query.offset) || 0;
        const { status } = req.query;

        let query = supabaseAdmin
            .from('events')
            .select(`
        *,
        club:clubs(id, name, icon)
      `, { count: 'exact' })
            .eq('host_id', req.user.id);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: events, error: dbError, count } = await query
            .order('starts_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (dbError) {
            return error(res, dbError.message);
        }

        return paginated(res, events || [], count || 0, limit, offset);
    } catch (err) {
        console.error('Get partner events error:', err);
        return error(res, err.message, 500);
    }
};

// Get bookings
exports.getBookings = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = parseInt(req.query.offset) || 0;

        // Get partner's event IDs
        const { data: events } = await supabaseAdmin
            .from('events')
            .select('id')
            .eq('host_id', req.user.id);

        const eventIds = events?.map(e => e.id) || [];

        if (eventIds.length === 0) {
            return paginated(res, [], 0, limit, offset);
        }

        const { data: bookings, error: dbError, count } = await supabaseAdmin
            .from('bookings')
            .select(`
        *,
        user:users(id, name, email, avatar_url),
        event:events(id, title, starts_at)
      `, { count: 'exact' })
            .in('event_id', eventIds)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (dbError) {
            return error(res, dbError.message);
        }

        return paginated(res, bookings || [], count || 0, limit, offset);
    } catch (err) {
        console.error('Get partner bookings error:', err);
        return error(res, err.message, 500);
    }
};

// Get analytics
exports.getAnalytics = async (req, res) => {
    try {
        const { data: events } = await supabaseAdmin
            .from('events')
            .select('id, status, event_type, price, rsvp_count')
            .eq('host_id', req.user.id);

        const eventIds = events?.map(e => e.id) || [];

        const { data: bookings } = await supabaseAdmin
            .from('bookings')
            .select('id, amount, platform_fee, status')
            .in('event_id', eventIds);

        const confirmedBookings = bookings?.filter(b =>
            b.status === 'confirmed' || b.status === 'attended'
        ) || [];

        const totalRevenue = confirmedBookings.reduce((sum, b) =>
            sum + (b.amount - b.platform_fee), 0
        );

        return success(res, {
            events: {
                total: events?.length || 0,
                completed: events?.filter(e => e.status === 'completed').length || 0,
                upcoming: events?.filter(e => e.status === 'published').length || 0
            },
            bookings: {
                total: bookings?.length || 0,
                confirmed: confirmedBookings.length,
                cancelled: bookings?.filter(b => b.status === 'cancelled').length || 0
            },
            revenue: {
                total: totalRevenue,
                pending_payout: totalRevenue
            }
        });
    } catch (err) {
        console.error('Get analytics error:', err);
        return error(res, err.message, 500);
    }
};

// Get payouts
exports.getPayouts = async (req, res) => {
    try {
        const { data: partner } = await supabaseAdmin
            .from('partners')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!partner) {
            return error(res, 'Partner not found', 404);
        }

        const { data: payouts, error: dbError } = await supabaseAdmin
            .from('payouts')
            .select('*')
            .eq('partner_id', partner.id)
            .order('requested_at', { ascending: false });

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, payouts || []);
    } catch (err) {
        console.error('Get payouts error:', err);
        return error(res, err.message, 500);
    }
};

// Request payout
exports.requestPayout = async (req, res) => {
    try {
        const { data: partner } = await supabaseAdmin
            .from('partners')
            .select('id, bank_details, is_verified')
            .eq('user_id', req.user.id)
            .single();

        if (!partner) {
            return error(res, 'Partner not found', 404);
        }

        if (!partner.is_verified) {
            return error(res, 'Partner must be verified');
        }

        if (!partner.bank_details) {
            return error(res, 'Bank details required');
        }

        // Get events
        const { data: events } = await supabaseAdmin
            .from('events')
            .select('id')
            .eq('host_id', req.user.id);

        const eventIds = events?.map(e => e.id) || [];

        const { data: bookings } = await supabaseAdmin
            .from('bookings')
            .select('amount, platform_fee')
            .eq('status', 'attended')
            .in('event_id', eventIds);

        const availableAmount = bookings?.reduce((sum, b) =>
            sum + (b.amount - b.platform_fee), 0
        ) || 0;

        if (availableAmount < 100) {
            return error(res, 'Minimum payout is ₹100');
        }

        const { data: payout, error: dbError } = await supabaseAdmin
            .from('payouts')
            .insert({
                partner_id: partner.id,
                amount: availableAmount,
                status: 'pending'
            })
            .select()
            .single();

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, payout, 'Payout request submitted', 201);
    } catch (err) {
        console.error('Request payout error:', err);
        return error(res, err.message, 500);
    }
};
