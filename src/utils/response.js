// Success response
const success = (res, data, message = null, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

// Error response
const error = (res, message, statusCode = 400) => {
    return res.status(statusCode).json({
        success: false,
        message
    });
};

// Paginated response
const paginated = (res, data, total, limit, offset) => {
    return res.status(200).json({
        success: true,
        data,
        pagination: {
            total,
            limit,
            offset,
            hasMore: offset + data.length < total
        }
    });
};

module.exports = {
    success,
    error,
    paginated
};
