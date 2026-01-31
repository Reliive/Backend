const { supabaseAdmin } = require('../config/supabase');
const { success, error, paginated } = require('../utils/response');

// List events
exports.listEvents = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = parseInt(req.query.offset) || 0;
        const { club_id, type, upcoming, featured } = req.query;

        let query = supabaseAdmin
            .from('events')
            .select(`
        id, title, description, event_type, status, starts_at, ends_at,
        location_name, location_address, capacity, rsvp_count, price, images, is_featured,
        club:clubs(id, name, slug, icon),
        host:users!host_id(id, name, avatar_url, is_verified)
      `, { count: 'exact' })
            .eq('status', 'published');

        if (club_id) query = query.eq('club_id', club_id);
        if (type === 'free' || type === 'paid') query = query.eq('event_type', type);
        if (upcoming !== 'false') query = query.gte('starts_at', new Date().toISOString());
        if (featured === 'true') query = query.eq('is_featured', true);

        const { data: events, error: dbError, count } = await query
            .order('starts_at', { ascending: upcoming !== 'false' })
            .range(offset, offset + limit - 1);

        if (dbError) {
            return error(res, dbError.message);
        }

        // Check user RSVPs if authenticated
        let eventsWithRsvp = events;
        if (req.user && events?.length) {
            const eventIds = events.map(e => e.id);
            const { data: rsvps } = await supabaseAdmin
                .from('rsvps')
                .select('event_id, status')
                .eq('user_id', req.user.id)
                .in('event_id', eventIds);

            const rsvpMap = new Map(rsvps?.map(r => [r.event_id, r.status]) || []);

            eventsWithRsvp = events.map(event => ({
                ...event,
                user_rsvp_status: rsvpMap.get(event.id) || null
            }));
        }

        return paginated(res, eventsWithRsvp || [], count || 0, limit, offset);
    } catch (err) {
        console.error('List events error:', err);
        return error(res, err.message, 500);
    }
};

// Create event
exports.createEvent = async (req, res) => {
    try {
        const {
            title, description, club_id, event_type, starts_at, ends_at,
            location_name, location_address, location_lat, location_lng,
            capacity, price, images, tags, accessibility_notes, cancellation_policy
        } = req.body;

        // Verify club exists
        const { data: club } = await supabaseAdmin
            .from('clubs')
            .select('id')
            .eq('id', club_id)
            .single();

        if (!club) {
            return error(res, 'Club not found', 404);
        }

        const eventData = {
            host_id: req.user.id,
            club_id,
            title: title.trim(),
            description: description?.trim() || null,
            event_type: event_type || 'free',
            status: 'draft',
            starts_at,
            ends_at: ends_at || null,
            location_name: location_name?.trim() || null,
            location_address: location_address?.trim() || null,
            location_lat: location_lat || null,
            location_lng: location_lng || null,
            capacity: capacity || 20,
            price: event_type === 'paid' ? (price || 0) : 0,
            images: images || [],
            tags: tags || [],
            accessibility_notes: accessibility_notes || null,
            cancellation_policy: cancellation_policy || null
        };

        const { data: event, error: dbError } = await supabaseAdmin
            .from('events')
            .insert(eventData)
            .select()
            .single();

        if (dbError) {
            return error(res, dbError.message);
        }

        // Update user role to host
        await supabaseAdmin
            .from('users')
            .update({ role: 'host' })
            .eq('id', req.user.id)
            .eq('role', 'user');

        return success(res, event, 'Event created', 201);
    } catch (err) {
        console.error('Create event error:', err);
        return error(res, err.message, 500);
    }
};

// Get event details
exports.getEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: event, error: dbError } = await supabaseAdmin
            .from('events')
            .select(`
        *,
        club:clubs(id, name, slug, icon),
        host:users!host_id(id, name, avatar_url, is_verified)
      `)
            .eq('id', id)
            .single();

        if (dbError || !event) {
            return error(res, 'Event not found', 404);
        }

        // Check user RSVP and booking
        let userRsvp = null;
        let userBooking = null;

        if (req.user) {
            const { data: rsvp } = await supabaseAdmin
                .from('rsvps')
                .select('*')
                .eq('event_id', id)
                .eq('user_id', req.user.id)
                .single();
            userRsvp = rsvp;

            if (event.event_type === 'paid') {
                const { data: booking } = await supabaseAdmin
                    .from('bookings')
                    .select('*')
                    .eq('event_id', id)
                    .eq('user_id', req.user.id)
                    .single();
                userBooking = booking;
            }
        }

        // Get host stats
        const { count: hostEventsCount } = await supabaseAdmin
            .from('events')
            .select('id', { count: 'exact' })
            .eq('host_id', event.host_id)
            .eq('status', 'completed');

        return success(res, {
            ...event,
            host: { ...event.host, events_hosted: hostEventsCount || 0 },
            user_rsvp: userRsvp,
            user_booking: userBooking,
            spots_remaining: Math.max(0, event.capacity - event.rsvp_count)
        });
    } catch (err) {
        console.error('Get event error:', err);
        return error(res, err.message, 500);
    }
};

// Update event
exports.updateEvent = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const { data: event } = await supabaseAdmin
            .from('events')
            .select('id, host_id')
            .eq('id', id)
            .single();

        if (!event) {
            return error(res, 'Event not found', 404);
        }

        if (event.host_id !== req.user.id) {
            return error(res, 'You can only update your own events', 403);
        }

        const allowedFields = [
            'title', 'description', 'starts_at', 'ends_at',
            'location_name', 'location_address', 'location_lat', 'location_lng',
            'capacity', 'price', 'images', 'tags', 'accessibility_notes',
            'cancellation_policy', 'status'
        ];

        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = typeof req.body[field] === 'string'
                    ? req.body[field].trim()
                    : req.body[field];
            }
        }

        const { data: updated, error: dbError } = await supabaseAdmin
            .from('events')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, updated, 'Event updated');
    } catch (err) {
        console.error('Update event error:', err);
        return error(res, err.message, 500);
    }
};

// Cancel event
exports.cancelEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: event } = await supabaseAdmin
            .from('events')
            .select('id, host_id')
            .eq('id', id)
            .single();

        if (!event) {
            return error(res, 'Event not found', 404);
        }

        if (event.host_id !== req.user.id) {
            return error(res, 'You can only cancel your own events', 403);
        }

        const { error: dbError } = await supabaseAdmin
            .from('events')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, null, 'Event cancelled');
    } catch (err) {
        console.error('Cancel event error:', err);
        return error(res, err.message, 500);
    }
};

// Get event attendees
exports.getAttendees = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;

        const { data: attendees, error: dbError, count } = await supabaseAdmin
            .from('rsvps')
            .select(`
        id, status, checked_in, checked_in_at, created_at,
        user:users(id, name, avatar_url)
      `, { count: 'exact' })
            .eq('event_id', id)
            .eq('status', 'confirmed')
            .order('created_at')
            .range(offset, offset + limit - 1);

        if (dbError) {
            return error(res, dbError.message);
        }

        return paginated(
            res,
            attendees?.map(a => ({
                ...a.user,
                rsvp_id: a.id,
                checked_in: a.checked_in,
                checked_in_at: a.checked_in_at,
                rsvp_at: a.created_at
            })) || [],
            count || 0,
            limit,
            offset
        );
    } catch (err) {
        console.error('Get attendees error:', err);
        return error(res, err.message, 500);
    }
};

// RSVP to event
exports.rsvp = async (req, res) => {
    try {
        const { id } = req.params;

        // Get event
        const { data: event } = await supabaseAdmin
            .from('events')
            .select('id, status, event_type, capacity, rsvp_count, starts_at')
            .eq('id', id)
            .single();

        if (!event) {
            return error(res, 'Event not found', 404);
        }

        if (event.status !== 'published') {
            return error(res, 'Event is not open for RSVPs');
        }

        if (event.event_type === 'paid') {
            return error(res, 'Use /bookings endpoint for paid events');
        }

        if (new Date(event.starts_at) < new Date()) {
            return error(res, 'Event has already started');
        }

        // Check existing RSVP
        const { data: existing } = await supabaseAdmin
            .from('rsvps')
            .select('id, status')
            .eq('event_id', id)
            .eq('user_id', req.user.id)
            .single();

        if (existing && existing.status === 'confirmed') {
            return error(res, 'You have already RSVP\'d');
        }

        const status = event.rsvp_count < event.capacity ? 'confirmed' : 'waitlist';

        if (existing) {
            const { data: rsvp, error: updateError } = await supabaseAdmin
                .from('rsvps')
                .update({ status })
                .eq('id', existing.id)
                .select()
                .single();

            if (updateError) return error(res, updateError.message);
            return success(res, rsvp, status === 'confirmed' ? 'RSVP confirmed!' : 'Added to waitlist');
        }

        const { data: rsvp, error: insertError } = await supabaseAdmin
            .from('rsvps')
            .insert({
                event_id: id,
                user_id: req.user.id,
                status
            })
            .select()
            .single();

        if (insertError) {
            return error(res, insertError.message);
        }

        return success(res, rsvp, status === 'confirmed' ? 'RSVP confirmed!' : 'Added to waitlist', 201);
    } catch (err) {
        console.error('RSVP error:', err);
        return error(res, err.message, 500);
    }
};

// Cancel RSVP
exports.cancelRsvp = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: rsvp } = await supabaseAdmin
            .from('rsvps')
            .select('id')
            .eq('event_id', id)
            .eq('user_id', req.user.id)
            .single();

        if (!rsvp) {
            return error(res, 'RSVP not found', 404);
        }

        const { error: dbError } = await supabaseAdmin
            .from('rsvps')
            .update({ status: 'cancelled' })
            .eq('id', rsvp.id);

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, null, 'RSVP cancelled');
    } catch (err) {
        console.error('Cancel RSVP error:', err);
        return error(res, err.message, 500);
    }
};

// Check-in
exports.checkIn = async (req, res) => {
    try {
        const { id } = req.params;

        // Get event
        const { data: event } = await supabaseAdmin
            .from('events')
            .select('id, starts_at')
            .eq('id', id)
            .single();

        if (!event) {
            return error(res, 'Event not found', 404);
        }

        // Allow check-in 30 min before
        const eventStart = new Date(event.starts_at);
        const checkInWindow = new Date(eventStart.getTime() - 30 * 60 * 1000);

        if (new Date() < checkInWindow) {
            return error(res, 'Check-in not yet available');
        }

        // Find RSVP
        const { data: rsvp } = await supabaseAdmin
            .from('rsvps')
            .select('id, checked_in')
            .eq('event_id', id)
            .eq('user_id', req.user.id)
            .eq('status', 'confirmed')
            .single();

        if (!rsvp) {
            return error(res, 'No confirmed RSVP found', 404);
        }

        if (rsvp.checked_in) {
            return error(res, 'Already checked in');
        }

        const { error: dbError } = await supabaseAdmin
            .from('rsvps')
            .update({
                checked_in: true,
                checked_in_at: new Date().toISOString()
            })
            .eq('id', rsvp.id);

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, { checked_in: true }, 'Checked in!');
    } catch (err) {
        console.error('Check-in error:', err);
        return error(res, err.message, 500);
    }
};

// Get event chat
exports.getChat = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const before = req.query.before;

        let query = supabaseAdmin
            .from('event_chats')
            .select(`
        id, message, message_type, media_url, is_pinned, created_at,
        user:users(id, name, avatar_url)
      `)
            .eq('event_id', id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (before) {
            query = query.lt('created_at', before);
        }

        const { data: messages, error: dbError } = await query;

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, {
            messages: messages?.reverse() || [],
            has_more: messages?.length === limit
        });
    } catch (err) {
        console.error('Get chat error:', err);
        return error(res, err.message, 500);
    }
};

// Send chat message
exports.sendMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, message_type, media_url } = req.body;

        if (!message?.trim()) {
            return error(res, 'Message required');
        }

        // Verify user is attendee or host
        const { data: event } = await supabaseAdmin
            .from('events')
            .select('id, host_id')
            .eq('id', id)
            .single();

        if (!event) {
            return error(res, 'Event not found', 404);
        }

        const isHost = event.host_id === req.user.id;

        if (!isHost) {
            const { data: rsvp } = await supabaseAdmin
                .from('rsvps')
                .select('id')
                .eq('event_id', id)
                .eq('user_id', req.user.id)
                .eq('status', 'confirmed')
                .single();

            if (!rsvp) {
                return error(res, 'You must RSVP to chat', 403);
            }
        }

        const { data: chatMessage, error: dbError } = await supabaseAdmin
            .from('event_chats')
            .insert({
                event_id: id,
                user_id: req.user.id,
                message: message.trim(),
                message_type: message_type || 'text',
                media_url: media_url || null
            })
            .select(`
        id, message, message_type, media_url, is_pinned, created_at,
        user:users(id, name, avatar_url)
      `)
            .single();

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, chatMessage, null, 201);
    } catch (err) {
        console.error('Send message error:', err);
        return error(res, err.message, 500);
    }
};
