-- Migration: Create neighborhoods and cities tables
-- Run this in Supabase SQL Editor

-- Create cities table
CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    state TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create neighborhoods table
CREATE TABLE IF NOT EXISTS neighborhoods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    city TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(slug, city)
);

-- Create interests table if not exists
CREATE TABLE IF NOT EXISTS interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    category TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Lucknow city
INSERT INTO cities (name, slug, state, active) VALUES 
    ('Lucknow', 'lucknow', 'Uttar Pradesh', true)
ON CONFLICT (slug) DO NOTHING;

-- Insert Lucknow neighborhoods
INSERT INTO neighborhoods (name, slug, city, active) VALUES 
    ('Hazratganj', 'hazratganj', 'lucknow', true),
    ('Gomti Nagar', 'gomti-nagar', 'lucknow', true),
    ('Aliganj', 'aliganj', 'lucknow', true),
    ('Indira Nagar', 'indira-nagar', 'lucknow', true),
    ('Aminabad', 'aminabad', 'lucknow', true),
    ('Chowk', 'chowk', 'lucknow', true),
    ('Alambagh', 'alambagh', 'lucknow', true),
    ('Mahanagar', 'mahanagar', 'lucknow', true),
    ('Rajajipuram', 'rajajipuram', 'lucknow', true),
    ('Vikas Nagar', 'vikas-nagar', 'lucknow', true),
    ('Jankipuram', 'jankipuram', 'lucknow', true),
    ('Ashiyana', 'ashiyana', 'lucknow', true),
    ('Charbagh', 'charbagh', 'lucknow', true),
    ('Hussainganj', 'hussainganj', 'lucknow', true),
    ('Kaiserbagh', 'kaiserbagh', 'lucknow', true),
    ('Nirala Nagar', 'nirala-nagar', 'lucknow', true),
    ('Lalbagh', 'lalbagh', 'lucknow', true),
    ('Nawabganj', 'nawabganj', 'lucknow', true),
    ('Talkatora', 'talkatora', 'lucknow', true),
    ('Chinhat', 'chinhat', 'lucknow', true),
    ('Kakori', 'kakori', 'lucknow', true),
    ('Lucknow Cantt', 'cantt', 'lucknow', true),
    ('Faizabad Road', 'faizabad-road', 'lucknow', true),
    ('Sitapur Road', 'sitapur-road', 'lucknow', true),
    ('Kanpur Road', 'kanpur-road', 'lucknow', true)
ON CONFLICT (slug, city) DO NOTHING;

-- Insert interests
INSERT INTO interests (name, icon, category, active) VALUES 
    ('Reading', '📚', 'hobbies', true),
    ('Travel', '✈️', 'hobbies', true),
    ('Music', '🎵', 'hobbies', true),
    ('Art', '🎨', 'hobbies', true),
    ('Photography', '📷', 'hobbies', true),
    ('Cooking', '🍳', 'hobbies', true),
    ('Fitness', '💪', 'health', true),
    ('Yoga', '🧘', 'health', true),
    ('Dancing', '💃', 'hobbies', true),
    ('Movies', '🎬', 'entertainment', true),
    ('Gaming', '🎮', 'entertainment', true),
    ('Nature', '🌿', 'outdoors', true),
    ('Walking', '🚶', 'outdoors', true),
    ('Gardening', '🌻', 'outdoors', true),
    ('Technology', '💻', 'learning', true),
    ('Spirituality', '🕉️', 'wellness', true),
    ('History', '🏛️', 'learning', true),
    ('Food', '🍜', 'social', true),
    ('Volunteering', '🤝', 'social', true),
    ('Crafts', '🧶', 'hobbies', true)
ON CONFLICT (name) DO NOTHING;

-- Create RLS policies (if needed)
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on cities" ON cities FOR SELECT USING (true);
CREATE POLICY "Allow public read access on neighborhoods" ON neighborhoods FOR SELECT USING (true);
CREATE POLICY "Allow public read access on interests" ON interests FOR SELECT USING (true);
