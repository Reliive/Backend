require('dotenv').config();
const { supabaseAdmin } = require('../src/config/supabase');

async function seed() {
    console.log('🌱 Seeding database...');

    try {
        // 1. Get or Create a Host User
        // Note: In Supabase, creating an auth user also triggers the handle_new_user function 
        // which creates the public.users record.
        const hostEmail = 'host@reliive.in';
        let hostId;

        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
        const existingHost = userData?.users?.find(u => u.email === hostEmail);

        if (existingHost) {
            hostId = existingHost.id;
            console.log('✅ Host user already exists');
        } else {
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: hostEmail,
                password: 'password123',
                email_confirm: true,
                user_metadata: { full_name: 'Reliive Host' }
            });

            if (createError) throw createError;
            hostId = newUser.user.id;
            console.log('✅ Host user created');
        }

        // Update host user to be a 'host' role
        await supabaseAdmin.from('users').update({ role: 'host', onboarding_completed: true }).eq('id', hostId);

        // 2. Seed Clubs
        const clubs = [
            { name: 'Travel Explorers', slug: 'travel-explorers', description: 'Discover hidden gems and travel together', icon: '✈️', color: '#3B82F6' },
            { name: 'Photography Club', slug: 'photography-club', description: 'Capture moments, share techniques', icon: '📸', color: '#8B5CF6' },
            { name: 'Book Lovers', slug: 'book-lovers', description: 'Read, discuss, and connect over books', icon: '📚', color: '#EC4899' },
            { name: 'Fitness Warriors', slug: 'fitness-warriors', description: 'Stay fit together, run, yoga, workouts', icon: '💪', color: '#10B981' },
            { name: 'Foodies United', slug: 'foodies-united', description: 'Explore restaurants and cook together', icon: '🍕', color: '#F59E0B' }
        ];

        const { data: seededClubs, error: clubError } = await supabaseAdmin
            .from('clubs')
            .upsert(clubs, { onConflict: 'slug' })
            .select();

        if (clubError) throw clubError;
        console.log(`✅ Seeded ${seededClubs.length} clubs`);

        // 3. Seed Events
        const clubMap = seededClubs.reduce((acc, club) => {
            acc[club.slug] = club.id;
            return acc;
        }, {});

        const now = new Date();
        const events = [
            {
                club_id: clubMap['travel-explorers'],
                host_id: hostId,
                title: 'Weekend Heritage Walk',
                description: 'Explore the historical monuments of Lucknow followed by a local breakfast.',
                event_type: 'free',
                status: 'published',
                starts_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
                location_name: 'Bara Imambara',
                location_address: 'Husainabad, Lucknow, Uttar Pradesh 226003',
                capacity: 15,
                tags: ['heritage', 'walking', 'social'],
                is_featured: true
            },
            {
                club_id: clubMap['photography-club'],
                host_id: hostId,
                title: 'Sunset Photography Workshop',
                description: 'Learn the basics of landscape photography during the golden hour at Gomti Riverfront.',
                event_type: 'free',
                status: 'published',
                starts_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                location_name: 'Gomti Riverfront Park',
                location_address: 'Gomti Nagar, Lucknow, Uttar Pradesh 226010',
                capacity: 10,
                tags: ['photography', 'workshop', 'nature']
            },
            {
                club_id: clubMap['book-lovers'],
                host_id: hostId,
                title: 'Monthly Book Exchange',
                description: 'Bring a book you love and exchange it with someone else. Discussions over coffee.',
                event_type: 'free',
                status: 'published',
                starts_at: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                location_name: 'Cappuccino Blast',
                location_address: 'Mall Avenue, Lucknow, Uttar Pradesh 226001',
                capacity: 20,
                tags: ['books', 'social', 'coffee']
            },
            {
                club_id: clubMap['fitness-warriors'],
                host_id: hostId,
                title: 'Morning Yoga in the Park',
                description: 'Start your day with a refreshing yoga session in the lush greenery of Janeshwar Mishra Park.',
                event_type: 'free',
                status: 'published',
                starts_at: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
                location_name: 'Janeshwar Mishra Park',
                location_address: 'Gomti Nagar Extension, Lucknow, Uttar Pradesh 226010',
                capacity: 30,
                tags: ['yoga', 'fitness', 'wellness']
            }
        ];

        const { error: eventError } = await supabaseAdmin
            .from('events')
            .insert(events);

        if (eventError) throw eventError;
        console.log(`✅ Seeded ${events.length} events`);

        console.log('✨ Seeding completed successfully!');
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
    }
}

seed();
