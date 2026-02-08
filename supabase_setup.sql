
-- ==============================================================================
-- PHASE 4: SCHEMA UPDATE (Setup & Hardening)
-- ==============================================================================

-- 1. Add is_setup_complete column to events if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='is_setup_complete') THEN
        ALTER TABLE public.events ADD COLUMN is_setup_complete BOOLEAN DEFAULT TRUE; -- Default true for existing records
    END IF;
END $$;

-- 2. Update RPC: Verify Organizer Password
-- Now returns isSetupComplete status correctly
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
        'isSetupComplete', v_event.is_setup_complete, -- DYNAMIC
        'organizerId', v_event.organizer_id
      )
    );
  ELSE
    RETURN json_build_object('success', false);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
