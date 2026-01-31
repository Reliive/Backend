const { supabaseAdmin } = require('../config/supabase');

// Verify JWT token and attach user to request
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token with Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Attach user to request
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// Check if user is admin
const requireAdmin = async (req, res, next) => {
    try {
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        next();
    } catch (error) {
        res.status(403).json({
            success: false,
            message: 'Admin verification failed'
        });
    }
};

// Check if user is partner
const requirePartner = async (req, res, next) => {
    try {
        const { data: partner } = await supabaseAdmin
            .from('partners')
            .select('id, is_verified')
            .eq('user_id', req.user.id)
            .single();

        if (!partner) {
            return res.status(403).json({
                success: false,
                message: 'Partner access required'
            });
        }

        req.partner = partner;
        next();
    } catch (error) {
        res.status(403).json({
            success: false,
            message: 'Partner verification failed'
        });
    }
};

module.exports = {
    authenticate,
    requireAdmin,
    requirePartner
};
