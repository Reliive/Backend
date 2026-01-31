const { supabaseAdmin } = require('../config/supabase');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const { success, error } = require('../utils/response');

// Create order
exports.createOrder = async (req, res) => {
    try {
        const { event_id, ticket_count = 1 } = req.body;

        // Get event
        const { data: event } = await supabaseAdmin
            .from('events')
            .select('id, title, price, event_type, status, capacity, rsvp_count')
            .eq('id', event_id)
            .single();

        if (!event) {
            return error(res, 'Event not found', 404);
        }

        if (event.status !== 'published') {
            return error(res, 'Event not available');
        }

        if (event.event_type !== 'paid') {
            return error(res, 'This is a free event');
        }

        if (event.rsvp_count + ticket_count > event.capacity) {
            return error(res, 'Not enough spots');
        }

        // Calculate amount
        const ticketAmount = event.price * ticket_count;
        const platformFee = Math.min(Math.max((ticketAmount * 10) / 100, 50), 200);
        const totalAmount = ticketAmount + platformFee;
        const amountInPaisa = Math.round(totalAmount * 100);

        // Create Razorpay order
        const orderOptions = {
            amount: amountInPaisa,
            currency: 'INR',
            receipt: `evt_${event.id.slice(0, 8)}_${Date.now()}`,
            notes: {
                event_id: event.id,
                user_id: req.user.id,
                ticket_count
            }
        };

        const razorpayOrder = await razorpay.orders.create(orderOptions);

        // Store payment record
        const { data: payment, error: dbError } = await supabaseAdmin
            .from('payments')
            .insert({
                user_id: req.user.id,
                razorpay_order_id: razorpayOrder.id,
                amount: totalAmount,
                currency: 'INR',
                status: 'pending',
                metadata: {
                    event_id: event.id,
                    ticket_count,
                    ticket_amount: ticketAmount,
                    platform_fee: platformFee
                }
            })
            .select()
            .single();

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, {
            payment_id: payment.id,
            razorpay_order_id: razorpayOrder.id,
            razorpay_key_id: process.env.RAZORPAY_KEY_ID,
            amount: totalAmount,
            amount_in_paisa: amountInPaisa,
            currency: 'INR',
            event: { id: event.id, title: event.title },
            breakdown: {
                tickets: ticketAmount,
                platform_fee: platformFee,
                total: totalAmount
            }
        }, 'Order created', 201);
    } catch (err) {
        console.error('Create order error:', err);
        return error(res, err.message, 500);
    }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Find payment
        const { data: payment } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('razorpay_order_id', razorpay_order_id)
            .eq('user_id', req.user.id)
            .single();

        if (!payment) {
            return error(res, 'Payment order not found', 404);
        }

        if (payment.status === 'completed') {
            return success(res, { payment_id: payment.id }, 'Already verified');
        }

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            await supabaseAdmin
                .from('payments')
                .update({ status: 'failed' })
                .eq('id', payment.id);

            return error(res, 'Payment verification failed');
        }

        // Update payment
        const { data: updatedPayment, error: dbError } = await supabaseAdmin
            .from('payments')
            .update({
                razorpay_payment_id,
                razorpay_signature,
                status: 'completed'
            })
            .eq('id', payment.id)
            .select()
            .single();

        if (dbError) {
            return error(res, dbError.message);
        }

        return success(res, {
            payment_id: updatedPayment.id,
            status: 'completed',
            event_id: payment.metadata?.event_id
        }, 'Payment verified');
    } catch (err) {
        console.error('Verify payment error:', err);
        return error(res, err.message, 500);
    }
};

// Get payment status
exports.getPayment = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: payment, error: dbError } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (dbError || !payment) {
            return error(res, 'Payment not found', 404);
        }

        return success(res, payment);
    } catch (err) {
        console.error('Get payment error:', err);
        return error(res, err.message, 500);
    }
};

// Request refund
exports.requestRefund = async (req, res) => {
    try {
        const { booking_id, reason } = req.body;

        // Get booking with payment
        const { data: booking } = await supabaseAdmin
            .from('bookings')
            .select(`
        *,
        payment:payments(*),
        event:events(starts_at)
      `)
            .eq('id', booking_id)
            .eq('user_id', req.user.id)
            .single();

        if (!booking) {
            return error(res, 'Booking not found', 404);
        }

        if (booking.status !== 'cancelled') {
            return error(res, 'Booking must be cancelled first');
        }

        if (!booking.payment || booking.payment.status !== 'completed') {
            return error(res, 'No completed payment found');
        }

        const eventStart = new Date(booking.event.starts_at);
        const bookingCancelled = new Date(booking.updated_at);
        const hoursUntil = (eventStart.getTime() - bookingCancelled.getTime()) / (1000 * 60 * 60);

        let refundPercent = 0;
        if (hoursUntil > 24) refundPercent = 100;
        else if (hoursUntil > 0) refundPercent = 50;

        const refundAmount = (booking.amount * refundPercent) / 100;

        if (refundAmount <= 0) {
            return error(res, 'No refund available');
        }

        // Update payment
        await supabaseAdmin
            .from('payments')
            .update({
                status: 'refunded',
                metadata: {
                    ...booking.payment.metadata,
                    refund_amount: refundAmount,
                    refund_percent: refundPercent,
                    refund_reason: reason || 'Customer cancelled'
                }
            })
            .eq('id', booking.payment.id);

        await supabaseAdmin
            .from('bookings')
            .update({ status: 'refunded' })
            .eq('id', booking_id);

        return success(res, {
            refund_amount: refundAmount,
            refund_percent: refundPercent
        }, `Refund of ₹${refundAmount} initiated`);
    } catch (err) {
        console.error('Request refund error:', err);
        return error(res, err.message, 500);
    }
};
