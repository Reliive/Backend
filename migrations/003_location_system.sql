-- =========================================
-- MIGRATION 003: Location System (PostGIS)
-- Run this in Supabase SQL Editor
-- =========================================

-- 1. Enable PostGIS extension (available on all Supabase plans)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add structured location columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS location_name         VARCHAR(500),
  ADD COLUMN IF NOT EXISTS location_city         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS location_state        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS location_country      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS location_country_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS location_lat          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_lng          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_point        GEOGRAPHY(Point, 4326);

-- 3. Migrate existing neighborhood data into location_name
UPDATE users
SET location_name = neighborhood
WHERE neighborhood IS NOT NULL
  AND location_name IS NULL;

-- 4. Spatial index (GiST) — makes ST_DWithin use index scan instead of seq scan
CREATE INDEX IF NOT EXISTS idx_users_location_point
  ON users USING GIST (location_point);

-- 5. B-tree indexes for country/city filter queries
CREATE INDEX IF NOT EXISTS idx_users_location_country
  ON users(location_country);

CREATE INDEX IF NOT EXISTS idx_users_location_city
  ON users(location_city);

-- 6. Function: find nearby users within a radius (km)
--    Called via supabaseAdmin.rpc('find_nearby_users', { ... })
CREATE OR REPLACE FUNCTION find_nearby_users(
  user_lat     DOUBLE PRECISION,
  user_lng     DOUBLE PRECISION,
  radius_km    DOUBLE PRECISION DEFAULT 10,
  result_limit INTEGER DEFAULT 50,
  result_offset INTEGER DEFAULT 0,
  exclude_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  name          VARCHAR,
  avatar_url    TEXT,
  location_name VARCHAR,
  location_city VARCHAR,
  distance_km   DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.name,
    u.avatar_url,
    u.location_name,
    u.location_city,
    ROUND(
      (ST_Distance(
        u.location_point,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
      ) / 1000.0)::numeric,
      2
    )::double precision AS distance_km
  FROM users u
  WHERE u.location_point IS NOT NULL
    AND (exclude_user_id IS NULL OR u.id != exclude_user_id)
    AND ST_DWithin(
      u.location_point,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000  -- ST_DWithin uses meters for geography type
    )
  ORDER BY distance_km ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_nearby_users IS 'Find users within a radius (km) of a given lat/lng. Uses PostGIS spatial index for O(log n) performance.';

-- 7. Helper function: update a user's location_point from lat/lng
--    Called via supabaseAdmin.rpc('update_user_location_point', { ... })
CREATE OR REPLACE FUNCTION update_user_location_point(
  p_user_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET location_point = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_user_location_point IS 'Sets the PostGIS geography point for a user from lat/lng coordinates. SECURITY DEFINER allows backend service role to bypass RLS.';
