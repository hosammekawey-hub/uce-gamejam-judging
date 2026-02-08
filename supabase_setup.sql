
-- ==============================================================================
-- PHASE 2: DATABASE HARDENING (Schema Verified)
-- Run this script in your Supabase SQL Editor to secure your application.
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) on all tables
-- These commands are safe to run multiple times
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- 2. Create Secure Remote Procedure Calls (RPCs)
-- "CREATE OR REPLACE" allows these to be updated without error

-- RPC: Verify Organizer Password
CREATE OR REPLACE FUNCTION verify_organizer_password(p_event_id TEXT, p_password TEXT)
RETURNS JSON AS $$
DECLARE
  v_event RECORD;
BEGIN
  SELECT * INTO v_event FROM public.events
  WHERE id = p_event_id AND organizer_pass = p_password;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'config', json_build_object(
        'competitionId', v_event.id,
        'title', v_event.title,
        'typeDescription', v_event.description,
        'rubric', v_event.rubric,
        'tieBreakers', v_event.tie_breakers,
        'visibility', v_event.visibility,
        'registration', v_event.registration,
        'viewPass', v_event.view_pass,
        'isSetupComplete', true,
        'organizerId', v_event.organizer_id
      )
    );
  ELSE
    RETURN json_build_object('success', false);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Verify Judge Password
CREATE OR REPLACE FUNCTION verify_judge_password(p_event_id TEXT, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.events
    WHERE id = p_event_id AND judge_pass = p_password
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get Public Event Metadata
CREATE OR REPLACE FUNCTION get_event_public_metadata(p_event_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_event RECORD;
BEGIN
  SELECT id, title, description, visibility, registration, view_pass, organizer_id
  INTO v_event 
  FROM public.events 
  WHERE id = p_event_id;
  
  IF FOUND THEN
    RETURN json_build_object(
      'competitionId', v_event.id,
      'title', v_event.title,
      'typeDescription', v_event.description,
      'visibility', v_event.visibility,
      'registration', v_event.registration,
      'viewPass', v_event.view_pass,
      'organizerId', v_event.organizer_id
    );
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Atomic Delete Competition
-- Allows deletion if caller is the Organizer (via Auth ID) OR provides the correct Organizer Password
CREATE OR REPLACE FUNCTION delete_competition(p_event_id TEXT, p_secret TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_organizer_id UUID;
  v_organizer_pass TEXT;
BEGIN
  -- 1. Get the organizer info for the requested event
  SELECT organizer_id, organizer_pass INTO v_organizer_id, v_organizer_pass 
  FROM public.events 
  WHERE id = p_event_id;

  -- 2. If event doesn't exist, return false
  IF v_organizer_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 3. Authorization Check
  -- Allow if:
  -- A) The user is authenticated and matches the organizer_id
  -- B) OR The provided secret matches the organizer_pass
  IF (auth.uid() IS NOT NULL AND v_organizer_id = auth.uid()) OR 
     (p_secret IS NOT NULL AND v_organizer_pass = p_secret) THEN
     
      -- 4. Perform Cascading Delete
      DELETE FROM public.ratings WHERE event_id = p_event_id;
      DELETE FROM public.judges WHERE event_id = p_event_id;
      DELETE FROM public.contestants WHERE event_id = p_event_id;
      DELETE FROM public.events WHERE id = p_event_id;

      RETURN TRUE;
  ELSE
      RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Define Row Level Security (RLS) Policies
-- We drop policies first to prevent "policy already exists" errors when re-running the script.

-- EVENTS POLICIES
DROP POLICY IF EXISTS "Public Read Events" ON public.events;
CREATE POLICY "Public Read Events" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizer Update Events" ON public.events;
CREATE POLICY "Organizer Update Events" ON public.events FOR UPDATE USING (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizer Insert Events" ON public.events;
CREATE POLICY "Organizer Insert Events" ON public.events FOR INSERT WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizer Delete Events" ON public.events;
CREATE POLICY "Organizer Delete Events" ON public.events FOR DELETE USING (auth.uid() = organizer_id);

-- CONTESTANTS POLICIES
DROP POLICY IF EXISTS "Public Read Contestants" ON public.contestants;
CREATE POLICY "Public Read Contestants" ON public.contestants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizer Manage Contestants" ON public.contestants;
CREATE POLICY "Organizer Manage Contestants" ON public.contestants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid())
);

DROP POLICY IF EXISTS "User Manage Own Entry" ON public.contestants;
CREATE POLICY "User Manage Own Entry" ON public.contestants FOR ALL USING (auth.uid() = user_id);

-- JUDGES POLICIES
DROP POLICY IF EXISTS "Public Read Judges" ON public.judges;
CREATE POLICY "Public Read Judges" ON public.judges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizer Manage Judges" ON public.judges;
CREATE POLICY "Organizer Manage Judges" ON public.judges FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid())
);

DROP POLICY IF EXISTS "User Join As Judge" ON public.judges;
CREATE POLICY "User Join As Judge" ON public.judges FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User Leave As Judge" ON public.judges;
CREATE POLICY "User Leave As Judge" ON public.judges FOR DELETE USING (auth.uid() = user_id);

-- RATINGS POLICIES
DROP POLICY IF EXISTS "Public Read Ratings" ON public.ratings;
CREATE POLICY "Public Read Ratings" ON public.ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Judge Manage Ratings" ON public.ratings;
CREATE POLICY "Judge Manage Ratings" ON public.ratings FOR ALL USING (
  judge_id = auth.uid()::text
);

DROP POLICY IF EXISTS "Organizer Delete Ratings" ON public.ratings;
CREATE POLICY "Organizer Delete Ratings" ON public.ratings FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid())
);

-- ==============================================================================
-- PHASE 3: STORAGE & DATABASE OPTIMIZATION
-- ==============================================================================

-- 4. Create Storage Bucket for Thumbnails
-- Safe insert to create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow public read access to thumbnails
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'thumbnails' );

-- Allow uploads (We allow public insert for Guest Organizers/Users for this app's context)
-- In a stricter prod environment, you would use Authenticated only.
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'thumbnails' );

-- 5. Create Server-Side Leaderboard View
-- This aggregates data to avoid fetching all ratings to the client
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
    c.id AS contestant_id,
    c.event_id,
    c.name AS contestant_name,
    c.title AS project_title,
    c.thumbnail,
    COUNT(r.team_id) AS judge_count,
    -- Check if any judge disqualified them
    BOOL_OR(r.is_disqualified) AS is_disqualified,
    -- Last updated time for the team's data or ratings
    MAX(GREATEST(c.created_at, r.updated_at)) as last_activity
FROM 
    public.contestants c
LEFT JOIN 
    public.ratings r ON c.id = r.team_id
GROUP BY 
    c.id;

