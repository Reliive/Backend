const { body, param, query } = require('express-validator');

// Auth validators
const signupValidator = [
    body('email').isEmail().withMessage('Valid email required'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
    body('name').optional().isString().trim()
];

const loginValidator = [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
];

const forgotPasswordValidator = [
    body('email').isEmail().withMessage('Valid email required')
];

const resetPasswordValidator = [
    body('access_token').notEmpty().withMessage('Access token required'),
    body('refresh_token').notEmpty().withMessage('Refresh token required'),
    body('new_password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
];

// User validators
const updateProfileValidator = [
    body('name').optional().isString().trim(),
    body('avatar_url').optional().isURL().withMessage('Invalid avatar URL'),
    body('neighborhood').optional().isString().trim()
];

const interestsValidator = [
    body('interests')
        .isArray({ max: 20 })
        .withMessage('Interests must be an array (max 20)')
];

// Event validators
const createEventValidator = [
    body('title').notEmpty().withMessage('Title required').trim(),
    body('club_id').isUUID().withMessage('Valid club ID required'),
    body('starts_at').isISO8601().withMessage('Valid start date required'),
    body('ends_at').optional().isISO8601().withMessage('Invalid end date'),
    body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be positive'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be non-negative')
];

const updateEventValidator = [
    body('title').optional().notEmpty().trim(),
    body('description').optional().isString(),
    body('starts_at').optional().isISO8601(),
    body('capacity').optional().isInt({ min: 1 })
];

// Booking validators
const createBookingValidator = [
    body('event_id').isUUID().withMessage('Valid event ID required'),
    body('payment_id').isUUID().withMessage('Valid payment ID required'),
    body('ticket_count').optional().isInt({ min: 1, max: 10 })
];

// Payment validators
const createOrderValidator = [
    body('event_id').isUUID().withMessage('Valid event ID required'),
    body('ticket_count').optional().isInt({ min: 1, max: 10 })
];

const verifyPaymentValidator = [
    body('razorpay_order_id').notEmpty(),
    body('razorpay_payment_id').notEmpty(),
    body('razorpay_signature').notEmpty()
];

// Partner validators
const partnerRegisterValidator = [
    body('business_name').notEmpty().trim(),
    body('business_type').optional().isString(),
    body('description').optional().isString()
];

// Report validators
const createReportValidator = [
    body('reason').notEmpty().withMessage('Reason required'),
    body('reported_user_id').optional().isUUID(),
    body('reported_event_id').optional().isUUID()
];

// Common validators
const uuidParam = (paramName) => [
    param(paramName).isUUID().withMessage(`Invalid ${paramName}`)
];

const paginationQuery = [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
];

module.exports = {
    signupValidator,
    loginValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    updateProfileValidator,
    interestsValidator,
    createEventValidator,
    updateEventValidator,
    createBookingValidator,
    createOrderValidator,
    verifyPaymentValidator,
    partnerRegisterValidator,
    createReportValidator,
    uuidParam,
    paginationQuery
};
