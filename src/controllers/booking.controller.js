const { supabaseAdmin } = require('../config/supabase');
const { success, error, paginated } = require('../utils/response');

const PLATFORM_FEE_PERCENT = 10;
const MIN_PLATFORM_FEE = 50;
const MAX_PLATFORM_FEE = 200;

const calculatePlatformFee = (amount) => {
    const percentFee = (amount * PLATFORM_FEE_PERCENT) / 100;
    return Math.min(Math.max(percentFee, MIN_PLATFORM_FEE), MAX_PLATFORM_FEE);
};

// Create booking
exports.createBooking = async (req, res) => {
    try {
        const { event_id, payment_id, ticket_count = 1 } = req.body;

        // Verify event
        const { data: event } = await supabaseAdmin
            .from('events')
            .select('id, status, event_type, price, capacity, rsvp_count, starts_at')
            .eq('id', event_id)
            .single();

        if (!event) {
            return error(res, 'Event not found', 404);
        }

        if (event.status !== 'published') {
            return error(res, 'Event not available');
        }

        if (event.event_type !== 'paid') {
            return error(res, 'Use /events/:id/rsvp for free events');
        }

        if (new Date(event.starts_at) < new Date()) {
            return error(res, 'Event has started');
        }

        if (event.rsvp_count + ticket_count > event.capacity) {
            return error(res, 'Not enough spots');
        }

        // Verify payment
        const { data: payment } = await supabaseAdmin
            .from('payments')
            .select('id, status, amount')
            .eq('id', payment_id)
            .eq('user_id', req.user.id)
            .single();

        if (!payment || payment.status !== 'completed') {
            return error(res, 'Payment not completed');
        }

        // Check existing booking
        const { data: existing } = await supabaseAdmin
            .from('bookings')
            .select('id')
            .eq('event_id', event_id)
            .eq('user_id', req.user.id)
            .not('status', 'in', '("cancelled","refunded")')
            .single();

        if (existing) {
            return error(res, 'You already have a booking');
        }

        const ticketAmount = event.price * ticket_count;
        const platformFee = calculatePlatformFee(ticketAmount);

        const { data: booking, error: dbError } = await supabaseAdmin
            .from('bookings')
            .insert({
                event_id,
                user_id: req.user.id,
                payment_id,
                status: 'confirmed',
                amount: ticketAmount,
                platform_fee: platformFee,
                ticket_count
            })
            .select()
            .single();

        if (dbError) {
            return error(res, dbError.message);
        }

        // Create RSVP
        await supabaseAdmin
            .from('rsvps')
            .insert({
                event_id,
                user_id: req.user.id,
                status: 'confirmed'
            });

        return success(res, booking, 'Booking confirmed!', 201);
    } catch (err) {
        console.error('Create booking error:', err);
        return error(res, err.message, 500);
    }
};

// Get my bookings
exports.getMyBookings = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = parseInt(req.query.offset) || 0;
        const { status } = req.query;

        let query = supabaseAdmin
            .from('bookings')
            .select(`
        *,
        event:events(
          id, title, starts_at, ends_at, location_name, images,
          club:clubs(id, name, icon)
        )
      `, { count: 'exact' })
            .eq('user_id', req.user.id);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: bookings, error: dbError, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (dbError) {
            return error(res, dbError.message);
        }

        return paginated(res, bookings || [], count || 0, limit, offset);
    } catch (err) {
        console.error('Get bookings error:', err);
        return error(res, err.message, 500);
    }
};

// Get booking details
exports.getBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: booking, error: dbError } = await supabaseAdmin
            .from('bookings')
            .select(`
        *,
        event:events(
          id, title, description, starts_at, ends_at,
          location_name, location_address, images,
          host:users!host_id(id, name, avatar_url),
          club:clubs(id, name, icon)
        ),
        payment:payments(
          id, razorpay_order_id, razorpay_payment_id, amount, status
        )
      `)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (dbError || !booking) {
            return error(res, 'Booking not found', 404);
        }

        return success(res, booking);
    } catch (err) {
        console.error('Get booking error:', err);
        return error(res, err.message, 500);
    }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: booking } = await supabaseAdmin
            .from('bookings')
            .select(`
        *,
        event:events(starts_at, cancellation_policy)
      `)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (!booking) {
            return error(res, 'Booking not found', 404);
        }

        if (booking.status === 'cancelled' || booking.status === 'refunded') {
            return error(res, 'Booking already cancelled');
        }

        const eventStart = new Date(booking.event.starts_at);
        const hoursUntil = (eventStart.getTime() - Date.now()) / (1000 * 60 * 60);

        let refundPercent = 0;
        if (hoursUntil > 24) refundPercent = 100;
        else if (hoursUntil > 0) refundPercent = 50;

        const { error: dbError } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (dbError) {
            return error(res, dbError.message);
        }

        await supabaseAdmin
            .from('rsvps')
            .update({ status: 'cancelled' })
            .eq('event_id', booking.event_id)
            .eq('user_id', req.user.id);

        return success(res, {
            refund_percent: refundPercent,
            refund_amount: (booking.amount * refundPercent) / 100
        }, `Booking cancelled. ${refundPercent}% refund processing.`);
    } catch (err) {
        console.error('Cancel booking error:', err);
        return error(res, err.message, 500);
    }
};
