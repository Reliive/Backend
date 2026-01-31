-- =========================================
-- RELIIVE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- 1. USERS TABLE
-- =========================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(20),
    neighborhood VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'host', 'partner', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    accessibility_prefs JSONB DEFAULT '{}',
    emergency_contact JSONB,
    fcm_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 2. USER INTERESTS
-- =========================================
CREATE TABLE user_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interest VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, interest)
);

-- =========================================
-- 3. BADGES
-- =========================================
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    criteria JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 4. USER BADGES
-- =========================================
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- =========================================
-- 5. CLUBS
-- =========================================
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    cover_image TEXT,
    color VARCHAR(7),
    member_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 6. USER CLUBS (Memberships)
-- =========================================
CREATE TABLE user_clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, club_id)
);

-- =========================================
-- 7. EVENTS
-- =========================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(20) DEFAULT 'free' CHECK (event_type IN ('free', 'paid')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    location_name VARCHAR(255),
    location_address TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    capacity INTEGER DEFAULT 20,
    rsvp_count INTEGER DEFAULT 0,
    price DECIMAL(10, 2) DEFAULT 0,
    images TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    accessibility_notes TEXT,
    cancellation_policy TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 8. RSVPs
-- =========================================
CREATE TABLE rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
    checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- =========================================
-- 9. EVENT CHATS
-- =========================================
CREATE TABLE event_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    media_url TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 10. PARTNERS
-- =========================================
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100),
    description TEXT,
    logo_url TEXT,
    documents JSONB DEFAULT '{}',
    bank_details JSONB,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 11. PAYMENTS
-- =========================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 12. BOOKINGS
-- =========================================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id),
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'attended', 'cancelled', 'refunded')),
    amount DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) DEFAULT 0,
    ticket_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 13. PAYOUTS
-- =========================================
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    transaction_id VARCHAR(100),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- =========================================
-- 14. NOTIFICATIONS
-- =========================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    type VARCHAR(50),
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 15. NOTIFICATION PREFERENCES
-- =========================================
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    whatsapp_enabled BOOLEAN DEFAULT TRUE,
    reminder_48h BOOLEAN DEFAULT TRUE,
    reminder_2h BOOLEAN DEFAULT TRUE,
    new_events BOOLEAN DEFAULT TRUE,
    club_updates BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 16. REPORTS
-- =========================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reported_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- INDEXES
-- =========================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_interests_user ON user_interests(user_id);
CREATE INDEX idx_user_clubs_user ON user_clubs(user_id);
CREATE INDEX idx_user_clubs_club ON user_clubs(club_id);
CREATE INDEX idx_events_club ON events(club_id);
CREATE INDEX idx_events_host ON events(host_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_starts ON events(starts_at);
CREATE INDEX idx_rsvps_event ON rsvps(event_id);
CREATE INDEX idx_rsvps_user ON rsvps(user_id);
CREATE INDEX idx_bookings_event ON bookings(event_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_payments_user ON payments(user_id);

-- =========================================
-- TRIGGERS: Auto-update timestamps
-- =========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER clubs_updated_at BEFORE UPDATE ON clubs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER partners_updated_at BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========================================
-- TRIGGERS: Auto user profile on signup
-- =========================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =========================================
-- TRIGGERS: Update RSVP count on events
-- =========================================
CREATE OR REPLACE FUNCTION update_rsvp_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        UPDATE events SET rsvp_count = rsvp_count + 1 WHERE id = NEW.event_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
            UPDATE events SET rsvp_count = rsvp_count + 1 WHERE id = NEW.event_id;
        ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
            UPDATE events SET rsvp_count = GREATEST(rsvp_count - 1, 0) WHERE id = NEW.event_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
        UPDATE events SET rsvp_count = GREATEST(rsvp_count - 1, 0) WHERE id = OLD.event_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rsvp_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON rsvps
FOR EACH ROW EXECUTE FUNCTION update_rsvp_count();

-- =========================================
-- TRIGGERS: Update club member count
-- =========================================
CREATE OR REPLACE FUNCTION update_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE clubs SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.club_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER member_count_trigger
AFTER INSERT OR DELETE ON user_clubs
FOR EACH ROW EXECUTE FUNCTION update_member_count();

-- =========================================
-- SEED DATA: Badges
-- =========================================
INSERT INTO badges (name, slug, description, icon) VALUES
('First Steps', 'first-steps', 'Attended your first event', '👣'),
('Social Butterfly', 'social-butterfly', 'Attended 10 events', '🦋'),
('Event Master', 'event-master', 'Hosted 5 events', '🎯'),
('Explorer', 'explorer', 'Joined 5 different clubs', '🧭'),
('Early Bird', 'early-bird', 'First to RSVP to 3 events', '🐦'),
('Reliable One', 'reliable-one', 'Checked in to 10 events', '✅'),
('Community Star', 'community-star', 'Received 5 positive reviews', '⭐');

-- =========================================
-- SEED DATA: Clubs
-- =========================================
INSERT INTO clubs (name, slug, description, icon, color) VALUES
('Travel Explorers', 'travel-explorers', 'Discover hidden gems and travel together', '✈️', '#3B82F6'),
('Photography Club', 'photography-club', 'Capture moments, share techniques', '📸', '#8B5CF6'),
('Book Lovers', 'book-lovers', 'Read, discuss, and connect over books', '📚', '#EC4899'),
('Fitness Warriors', 'fitness-warriors', 'Stay fit together, run, yoga, workouts', '💪', '#10B981'),
('Foodies United', 'foodies-united', 'Explore restaurants and cook together', '🍕', '#F59E0B'),
('Tech Enthusiasts', 'tech-enthusiasts', 'Gadgets, coding, and tech discussions', '💻', '#6366F1'),
('Art & Craft', 'art-craft', 'Create, paint, and express yourself', '🎨', '#F43F5E'),
('Music Lovers', 'music-lovers', 'Jam sessions, concerts, and music talks', '🎵', '#14B8A6'),
('Pet Parents', 'pet-parents', 'Pet meetups and care tips', '🐕', '#A855F7'),
('Wellness Circle', 'wellness-circle', 'Meditation, mental health, and self-care', '🧘', '#22C55E');

-- =========================================
-- RLS POLICIES (Row Level Security)
-- =========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users: Read public, update own
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Clubs: Public read
CREATE POLICY "Clubs are viewable by everyone" ON clubs FOR SELECT USING (true);

-- User clubs: Users can manage own
CREATE POLICY "User clubs viewable by all" ON user_clubs FOR SELECT USING (true);
CREATE POLICY "Users can join clubs" ON user_clubs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave clubs" ON user_clubs FOR DELETE USING (auth.uid() = user_id);

-- Events: Public read published
CREATE POLICY "Published events viewable by all" ON events FOR SELECT USING (status = 'published' OR host_id = auth.uid());
CREATE POLICY "Hosts can create events" ON events FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update own events" ON events FOR UPDATE USING (auth.uid() = host_id);

-- RSVPs: User manages own
CREATE POLICY "RSVPs viewable by event host and attendee" ON rsvps FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT host_id FROM events WHERE id = event_id));
CREATE POLICY "Users can create RSVPs" ON rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own RSVPs" ON rsvps FOR UPDATE USING (auth.uid() = user_id);

-- Notifications: User sees own
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Payments: User sees own
CREATE POLICY "Users see own payments" ON payments FOR SELECT USING (auth.uid() = user_id);

-- Bookings: User sees own
CREATE POLICY "Users see own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);

-- Badges: Public
CREATE POLICY "Badges viewable by all" ON badges FOR SELECT USING (true);
CREATE POLICY "User badges viewable by all" ON user_badges FOR SELECT USING (true);

-- User interests: User manages own
CREATE POLICY "Interests viewable by all" ON user_interests FOR SELECT USING (true);
CREATE POLICY "Users manage own interests" ON user_interests FOR ALL USING (auth.uid() = user_id);

-- Event chats: Attendees
CREATE POLICY "Event chats viewable by attendees" ON event_chats FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM rsvps WHERE event_id = event_chats.event_id AND status = 'confirmed')
    OR auth.uid() IN (SELECT host_id FROM events WHERE id = event_chats.event_id)
);
CREATE POLICY "Attendees can send messages" ON event_chats FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
        auth.uid() IN (SELECT user_id FROM rsvps WHERE event_id = event_chats.event_id AND status = 'confirmed')
        OR auth.uid() IN (SELECT host_id FROM events WHERE id = event_chats.event_id)
    )
);

-- Partners: Own profile
CREATE POLICY "Partners see own profile" ON partners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Partners update own profile" ON partners FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can register as partner" ON partners FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notification preferences: Own
CREATE POLICY "Users manage own notification prefs" ON notification_preferences FOR ALL USING (auth.uid() = user_id);

-- Reports: Own reports
CREATE POLICY "Users see own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Service role bypass (for backend)
-- Note: Service role key bypasses RLS by default

COMMENT ON SCHEMA public IS 'Reliive database schema - all tables created successfully';
