-- SBT MAJOR
-- PRIVATE REALTIME VOICE ROOM
-- Team Admin + Super Admin only
--
-- IMPORTANT:
-- Supabase manages realtime.messages. Do NOT ALTER/ENABLE RLS on it.
-- RLS is already enabled; this file only creates authorization policies.

CREATE OR REPLACE FUNCTION public.is_tournament_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users a
    WHERE a.user_id = auth.uid()
      AND a.role IN ('team_admin', 'super_admin')
  );
$$;

DROP POLICY IF EXISTS "team admins can receive voice room" ON realtime.messages;
DROP POLICY IF EXISTS "team admins can send voice room" ON realtime.messages;

CREATE POLICY "team admins can receive voice room"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (SELECT realtime.topic()) = 'sbt-major-team-admin-voice'
  AND realtime.messages.extension IN ('broadcast', 'presence')
  AND public.is_tournament_admin()
);

CREATE POLICY "team admins can send voice room"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT realtime.topic()) = 'sbt-major-team-admin-voice'
  AND realtime.messages.extension IN ('broadcast', 'presence')
  AND public.is_tournament_admin()
);

-- No ALTER TABLE realtime.messages is needed.
-- No NOTIFY is required for Realtime Authorization policies.
