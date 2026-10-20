const { createClient } = require('@supabase/supabase-js');

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for backend database operations');
}

// Service client (admin access)
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    serviceRoleKey
);

// Create client with user context from JWT
const createUserClient = (accessToken) => {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        }
    );
};

module.exports = {
    supabaseAdmin,
    createUserClient
};
