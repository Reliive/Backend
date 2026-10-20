-- =========================================
-- MIGRATION 005: RSVP Row-Level Security
-- =========================================

ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RSVPs viewable by event host and attendee" ON rsvps;
DROP POLICY IF EXISTS "Users can create RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Users can update own RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Users can delete own RSVPs" ON rsvps;

CREATE POLICY "RSVPs viewable by event host and attendee"
ON rsvps
FOR SELECT
USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT host_id FROM events WHERE events.id = rsvps.event_id
  )
);

CREATE POLICY "Users can create RSVPs"
ON rsvps
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RSVPs"
ON rsvps
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own RSVPs"
ON rsvps
FOR DELETE
USING (auth.uid() = user_id);
