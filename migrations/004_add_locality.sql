-- =========================================
-- MIGRATION 004: Add Locality Column
-- Run this in Supabase SQL Editor
-- =========================================

-- 1. Add locality column (stores suburb/neighbourhood from Nominatim)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS location_locality VARCHAR(255);

-- 2. Index for locality-based matching queries
CREATE INDEX IF NOT EXISTS idx_users_location_locality
  ON users(location_locality);

-- 3. Drop old function first (return type changed — Postgres requires this)
DROP FUNCTION IF EXISTS find_nearby_users(double precision, double precision, double precision, integer, integer, uuid);

-- 4. Recreate find_nearby_users with locality in the return type
CREATE OR REPLACE FUNCTION find_nearby_users(
  user_lat     DOUBLE PRECISION,
  user_lng     DOUBLE PRECISION,
  radius_km    DOUBLE PRECISION DEFAULT 10,
  result_limit INTEGER DEFAULT 50,
  result_offset INTEGER DEFAULT 0,
  exclude_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id               UUID,
  name             VARCHAR,
  avatar_url       TEXT,
  location_name    VARCHAR,
  location_city    VARCHAR,
  location_locality VARCHAR,
  distance_km      DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.name,
    u.avatar_url,
    u.location_name,
    u.location_city,
    u.location_locality,
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
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql STABLE;
