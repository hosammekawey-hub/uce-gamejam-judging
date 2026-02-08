
-- ==============================================================================
-- PHASE 4: SCHEMA UPDATE (Setup & Hardening)
-- ==============================================================================

-- 1. Add is_setup_complete column to events if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='is_setup_complete') THEN
        ALTER TABLE public.events ADD COLUMN is_setup_complete BOOLEAN DEFAULT TRUE; 
    END IF;
END $$;

-- 2. Update RPC: Verify Organizer Password
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
        'isSetupComplete', v_event.is_setup_complete,
        'organizerId', v_event.organizer_id
      )
    );
  ELSE
    RETURN json_build_object('success', false);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. SYSTEM ADMINS TABLE (New Architecture)
CREATE TABLE IF NOT EXISTS public.system_admins (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by TEXT -- Optional: email of who added them
);

-- PHASE 5: MASTER ADMIN UPGRADE
-- Add role column if it doesn't exist
ALTER TABLE public.system_admins ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';

-- 4. HELPER FUNCTIONS TO PREVENT RLS RECURSION
-- These must be SECURITY DEFINER to bypass RLS when called within the policy

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.system_admins
    WHERE lower(email) = lower(auth.email())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_is_master()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.system_admins
    WHERE lower(email) = lower(auth.email())
    AND role = 'master'
  );
END;
$$;

-- 5. ENABLE RLS & POLICIES
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;

-- DROP OLD POLICIES TO REFRESH LOGIC
DROP POLICY IF EXISTS "Admins can view admin list" ON public.system_admins;
DROP POLICY IF EXISTS "Admins can add admins" ON public.system_admins;
DROP POLICY IF EXISTS "Admins can remove admins" ON public.system_admins;
DROP POLICY IF EXISTS "Only Master can add admins" ON public.system_admins;
DROP POLICY IF EXISTS "Only Master can remove admins" ON public.system_admins;

-- Policy: Allow ANY listed admin to VIEW the table
-- Uses helper function to avoid infinite recursion
CREATE POLICY "Admins can view admin list"
ON public.system_admins
FOR SELECT
TO authenticated
USING (
  public.check_is_admin()
);

-- Policy: Only MASTER can ADD new admins
CREATE POLICY "Only Master can add admins"
ON public.system_admins
FOR INSERT
TO authenticated
WITH CHECK (
  public.check_is_master()
);

-- Policy: Only MASTER can REMOVE admins
CREATE POLICY "Only Master can remove admins"
ON public.system_admins
FOR DELETE
TO authenticated
USING (
  public.check_is_master()
  AND role != 'master' -- Prevent accidental self-deletion
);

-- 6. SEED MASTER ADMIN (Idempotent)
-- Ensure Hosam is Master. If he exists as admin, upgrade him.
INSERT INTO public.system_admins (email, added_by, role)
VALUES ('hosam.mekawey@gmail.com', 'system_seed', 'master')
ON CONFLICT (email) DO UPDATE SET role = 'master';

-- 7. RPC: TRANSFER MASTER ROLE
CREATE OR REPLACE FUNCTION transfer_master_role(new_master_email TEXT)
RETURNS VOID AS $$
DECLARE
  current_user_email TEXT;
BEGIN
  current_user_email := lower(auth.email());

  -- Security Check: Executing user MUST be the current master
  IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE lower(email) = current_user_email AND role = 'master') THEN
    RAISE EXCEPTION 'Access Denied: Only the Master SysAdmin can transfer ownership.';
  END IF;

  -- 1. Demote current master
  UPDATE public.system_admins SET role = 'admin' WHERE lower(email) = current_user_email;
  
  -- 2. Promote new master (Insert if not exists, Update if exists)
  INSERT INTO public.system_admins (email, role) VALUES (lower(new_master_email), 'master')
  ON CONFLICT (email) DO UPDATE SET role = 'master';
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
