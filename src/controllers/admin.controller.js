const { supabaseAdmin } = require('../config/supabase');
const { success, error, paginated } = require('../utils/response');

// Get reports
exports.getReports = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = parseInt(req.query.offset) || 0;
        const status = req.query.status || 'pending';

        const { data: reports, error: dbError, count } = await supabaseAdmin
            .from('reports')
            .select(`
        *,
        reporter:users!reporter_id(id, name, email),
        reported_user:users!reported_user_id(id, name, email),
        reported_event:events(id, title)
      `, { count: 'exact' })
            .eq('status', status)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (dbError) {
            return error(res, dbError.message);
        }

        return paginated(res, reports || [], count || 0, limit, offset);
    } catch (err) {
        console.error('Get reports error:', err);
        return error(res, err.message, 500);
    }
};

// Take action on report
exports.takeAction = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, notes } = req.body;

        const { data: report } = await supabaseAdmin
            .from('reports')
            .select('*')
            .eq('id', id)
            .single();

        if (!report) {
            return error(res, 'Report not found', 404);
        }

        const { error: updateError } = await supabaseAdmin
            .from('reports')
            .update({
                status: action === 'dismiss' ? 'dismissed' : 'resolved',
                admin_notes: notes?.trim() || null,
                reviewed_by: req.user.id,
                resolved_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) {
            return error(res, updateError.message);
        }

        if (action === 'suspend' && report.reported_user_id) {
            await supabaseAdmin.auth.admin.updateUserById(report.reported_user_id, {
                ban_duration: '720h'
            });
        }

        return success(res, null, `Report ${action}ed`);
    } catch (err) {
        console.error('Take action error:', err);
        return error(res, err.message, 500);
    }
};

// List users
exports.listUsers = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = parseInt(req.query.offset) || 0;
        const { role, search } = req.query;

        let query = supabaseAdmin
            .from('users')
            .select('id, email, name, avatar_url, role, is_verified, created_at', { count: 'exact' });

        if (role) {
            query = query.eq('role', role);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data: users, error: dbError, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (dbError) {
            return error(res, dbError.message);
        }

        return paginated(res, users || [], count || 0, limit, offset);
    } catch (err) {
        console.error('List users error:', err);
        return error(res, err.message, 500);
    }
};

// Suspend user
exports.suspendUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { duration_hours } = req.body;

        const duration = duration_hours || 720;

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
            ban_duration: `${duration}h`
        });

        if (authError) {
            return error(res, authError.message);
        }

        return success(res, null, 'User suspended');
    } catch (err) {
        console.error('Suspend user error:', err);
        return error(res, err.message, 500);
    }
};

// Unsuspend user
exports.unsuspendUser = async (req, res) => {
    try {
        const { id } = req.params;

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
            ban_duration: 'none'
        });

        if (authError) {
            return error(res, authError.message);
        }

        return success(res, null, 'User unsuspended');
    } catch (err) {
        console.error('Unsuspend user error:', err);
        return error(res, err.message, 500);
    }
};

// List partners
exports.listPartners = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = parseInt(req.query.offset) || 0;
        const { verified } = req.query;

        let query = supabaseAdmin
            .from('partners')
            .select(`
        *,
        user:users(id, name, email)
      `, { count: 'exact' });

        if (verified === 'true') {
            query = query.eq('is_verified', true);
        } else if (verified === 'false') {
            query = query.eq('is_verified', false);
        }

        const { data: partners, error: dbError, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (dbError) {
            return error(res, dbError.message);
        }

        return paginated(res, partners || [], count || 0, limit, offset);
    } catch (err) {
        console.error('List partners error:', err);
        return error(res, err.message, 500);
    }
};

// Verify partner
exports.verifyPartner = async (req, res) => {
    try {
        const { id } = req.params;

        const { error: dbError } = await supabaseAdmin
            .from('partners')
            .update({
                is_verified: true,
                verified_at: new Date().toISOString()
            })
            .eq('id', id);

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, null, 'Partner verified');
    } catch (err) {
        console.error('Verify partner error:', err);
        return error(res, err.message, 500);
    }
};

// Platform analytics
exports.getAnalytics = async (req, res) => {
    try {
        const [users, events, bookings, partners] = await Promise.all([
            supabaseAdmin.from('users').select('id', { count: 'exact' }),
            supabaseAdmin.from('events').select('id, status'),
            supabaseAdmin.from('bookings').select('id, amount, platform_fee, status'),
            supabaseAdmin.from('partners').select('id, is_verified')
        ]);

        const confirmedBookings = bookings.data?.filter(b =>
            b.status === 'confirmed' || b.status === 'attended'
        ) || [];

        const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.amount, 0);
        const platformRevenue = confirmedBookings.reduce((sum, b) => sum + (b.platform_fee || 0), 0);

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { count: newUsers } = await supabaseAdmin
            .from('users')
            .select('id', { count: 'exact' })
            .gte('created_at', weekAgo.toISOString());

        return success(res, {
            users: {
                total: users.count || 0,
                new_this_week: newUsers || 0
            },
            events: {
                total: events.data?.length || 0,
                published: events.data?.filter(e => e.status === 'published').length || 0,
                completed: events.data?.filter(e => e.status === 'completed').length || 0
            },
            bookings: {
                total: bookings.data?.length || 0,
                confirmed: confirmedBookings.length
            },
            partners: {
                total: partners.data?.length || 0,
                verified: partners.data?.filter(p => p.is_verified).length || 0
            },
            revenue: {
                total: totalRevenue,
                platform_fees: platformRevenue
            }
        });
    } catch (err) {
        console.error('Get analytics error:', err);
        return error(res, err.message, 500);
    }
};
