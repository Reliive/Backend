const { supabaseAdmin, createUserClient } = require('../config/supabase');
const { success, error } = require('../utils/response');

// Signup
exports.signup = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: name || email.split('@')[0]
            }
        });

        if (authError) {
            return error(res, authError.message);
        }

        return success(res, {
            user: data.user
        }, 'Account created successfully', 201);
    } catch (err) {
        console.error('Signup error:', err);
        return error(res, err.message, 500);
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const { data, error: authError } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            return error(res, 'Invalid email or password', 401);
        }

        return success(res, {
            user: data.user,
            session: data.session
        }, 'Login successful');
    } catch (err) {
        console.error('Login error:', err);
        return error(res, err.message, 500);
    }
};

// Google Auth
exports.googleAuth = async (req, res) => {
    try {
        const { id_token, access_token } = req.body;

        if (!id_token) {
            return error(res, 'Google ID token required');
        }

        const { data, error: authError } = await supabaseAdmin.auth.signInWithIdToken({
            provider: 'google',
            token: id_token,
            access_token
        });

        if (authError) {
            return error(res, authError.message);
        }

        return success(res, {
            user: data.user,
            session: data.session
        }, 'Google login successful');
    } catch (err) {
        console.error('Google auth error:', err);
        return error(res, err.message, 500);
    }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const { error: authError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.APP_URL}/reset-password`
        });

        if (authError) {
            return error(res, authError.message);
        }

        return success(res, null, 'Password reset email sent');
    } catch (err) {
        console.error('Forgot password error:', err);
        return error(res, err.message, 500);
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { access_token, refresh_token, new_password } = req.body;

        const client = createUserClient(access_token);

        const { error: sessionError } = await client.auth.setSession({
            access_token,
            refresh_token
        });

        if (sessionError) {
            return error(res, 'Invalid or expired token', 401);
        }

        const { error: updateError } = await client.auth.updateUser({
            password: new_password
        });

        if (updateError) {
            return error(res, updateError.message);
        }

        return success(res, null, 'Password reset successful');
    } catch (err) {
        console.error('Reset password error:', err);
        return error(res, err.message, 500);
    }
};

// Refresh Token
exports.refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return error(res, 'Refresh token required');
        }

        const { data, error: authError } = await supabaseAdmin.auth.refreshSession({
            refresh_token
        });

        if (authError) {
            return error(res, 'Invalid refresh token', 401);
        }

        return success(res, {
            session: data.session
        }, 'Token refreshed');
    } catch (err) {
        console.error('Refresh token error:', err);
        return error(res, err.message, 500);
    }
};

// Logout
exports.logout = async (req, res) => {
    try {
        const client = createUserClient(req.token);

        const { error: authError } = await client.auth.signOut();

        if (authError) {
            return error(res, authError.message);
        }

        return success(res, null, 'Logged out successfully');
    } catch (err) {
        console.error('Logout error:', err);
        return error(res, err.message, 500);
    }
};
