const { validationResult } = require('express-validator');

// Handle validation errors
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.error('Validation failed on', req.originalUrl, 'Errors:', errors.array());
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }

    next();
};

module.exports = { validate };
