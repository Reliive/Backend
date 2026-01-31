const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createOrderValidator, verifyPaymentValidator, uuidParam } = require('../utils/validators');

// POST /api/v1/payments/create-order
router.post('/create-order', authenticate, createOrderValidator, validate, paymentController.createOrder);

// POST /api/v1/payments/verify
router.post('/verify', authenticate, verifyPaymentValidator, validate, paymentController.verifyPayment);

// GET /api/v1/payments/:id
router.get('/:id', authenticate, uuidParam('id'), validate, paymentController.getPayment);

// POST /api/v1/payments/refund
router.post('/refund', authenticate, paymentController.requestRefund);

module.exports = router;
