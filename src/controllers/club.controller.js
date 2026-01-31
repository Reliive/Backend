const { supabaseAdmin } = require('../config/supabase');
const { success, error, paginated } = require('../utils/response');

// List all clubs
exports.listClubs = async (req, res) => {
    try {
        const { data: clubs, error: dbError } = await supabaseAdmin
            .from('clubs')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (dbError) {
            return error(res, dbError.message);
        }

        // Check user membership if authenticated
        if (req.user) {
            const { data: userClubs } = await supabaseAdmin
                .from('user_clubs')
                .select('club_id')
                .eq('user_id', req.user.id);

            const joinedIds = new Set(userClubs?.map(uc => uc.club_id) || []);

            const clubsWithMembership = clubs.map(club => ({
                ...club,
                is_joined: joinedIds.has(club.id)
            }));

            return success(res, clubsWithMembership);
        }

        return success(res, clubs);
    } catch (err) {
        console.error('List clubs error:', err);
        return error(res, err.message, 500);
    }
};

// Get club details
exports.getClub = async (req, res) => {
    try {
        const { id } = req.params;

        // Try UUID first, then slug
        let query = supabaseAdmin.from('clubs').select('*');

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        query = isUUID ? query.eq('id', id) : query.eq('slug', id);

        const { data: club, error: dbError } = await query.single();

        if (dbError || !club) {
            return error(res, 'Club not found', 404);
        }

        // Check membership
        let isMember = false;
        if (req.user) {
            const { data: membership } = await supabaseAdmin
                .from('user_clubs')
                .select('id')
                .eq('user_id', req.user.id)
                .eq('club_id', club.id)
                .single();
            isMember = !!membership;
        }

        // Get upcoming events count
        const { count } = await supabaseAdmin
            .from('events')
            .select('id', { count: 'exact' })
            .eq('club_id', club.id)
            .eq('status', 'published')
            .gte('starts_at', new Date().toISOString());

        return success(res, {
            ...club,
            is_joined: isMember,
            upcoming_events_count: count || 0
        });
    } catch (err) {
        console.error('Get club error:', err);
        return error(res, err.message, 500);
    }
};

// Join club
exports.joinClub = async (req, res) => {
    try {
        const { id } = req.params;

        // Find club
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let query = supabaseAdmin.from('clubs').select('id').eq('is_active', true);
        query = isUUID ? query.eq('id', id) : query.eq('slug', id);

        const { data: club } = await query.single();

        if (!club) {
            return error(res, 'Club not found', 404);
        }

        // Check existing membership
        const { data: existing } = await supabaseAdmin
            .from('user_clubs')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('club_id', club.id)
            .single();

        if (existing) {
            return error(res, 'Already a member');
        }

        // Join
        const { error: insertError } = await supabaseAdmin
            .from('user_clubs')
            .insert({
                user_id: req.user.id,
                club_id: club.id
            });

        if (insertError) {
            return error(res, insertError.message);
        }

        return success(res, { club_id: club.id }, 'Joined club', 201);
    } catch (err) {
        console.error('Join club error:', err);
        return error(res, err.message, 500);
    }
};

// Leave club
exports.leaveClub = async (req, res) => {
    try {
        const { id } = req.params;

        // Find club
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let query = supabaseAdmin.from('clubs').select('id');
        query = isUUID ? query.eq('id', id) : query.eq('slug', id);

        const { data: club } = await query.single();

        if (!club) {
            return error(res, 'Club not found', 404);
        }

        const { error: deleteError } = await supabaseAdmin
            .from('user_clubs')
            .delete()
            .eq('user_id', req.user.id)
            .eq('club_id', club.id);

        if (deleteError) {
            return error(res, deleteError.message);
        }

        return success(res, null, 'Left club');
    } catch (err) {
        console.error('Leave club error:', err);
        return error(res, err.message, 500);
    }
};

// Get club members
exports.getMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = parseInt(req.query.offset) || 0;

        // Find club
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let query = supabaseAdmin.from('clubs').select('id');
        query = isUUID ? query.eq('id', id) : query.eq('slug', id);

        const { data: club } = await query.single();

        if (!club) {
            return error(res, 'Club not found', 404);
        }

        const { data: members, error: dbError, count } = await supabaseAdmin
            .from('user_clubs')
            .select(`
        joined_at,
        user:users(id, name, avatar_url, is_verified)
      `, { count: 'exact' })
            .eq('club_id', club.id)
            .order('joined_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (dbError) {
            return error(res, dbError.message);
        }

        return paginated(
            res,
            members?.map(m => ({ ...m.user, joined_at: m.joined_at })) || [],
            count || 0,
            limit,
            offset
        );
    } catch (err) {
        console.error('Get members error:', err);
        return error(res, err.message, 500);
    }
};

// Get club events
exports.getEvents = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = parseInt(req.query.offset) || 0;
        const upcoming = req.query.upcoming === 'true';

        // Find club
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let clubQuery = supabaseAdmin.from('clubs').select('id');
        clubQuery = isUUID ? clubQuery.eq('id', id) : clubQuery.eq('slug', id);

        const { data: club } = await clubQuery.single();

        if (!club) {
            return error(res, 'Club not found', 404);
        }

        let query = supabaseAdmin
            .from('events')
            .select(`
        id, title, description, event_type, status, starts_at, ends_at,
        location_name, capacity, rsvp_count, price, images, is_featured,
        host:users!host_id(id, name, avatar_url)
      `, { count: 'exact' })
            .eq('club_id', club.id)
            .eq('status', 'published');

        if (upcoming) {
            query = query.gte('starts_at', new Date().toISOString());
        }

        const { data: events, error: dbError, count } = await query
            .order('starts_at', { ascending: upcoming })
            .range(offset, offset + limit - 1);

        if (dbError) {
            return error(res, dbError.message);
        }

        return paginated(res, events || [], count || 0, limit, offset);
    } catch (err) {
        console.error('Get club events error:', err);
        return error(res, err.message, 500);
    }
};
