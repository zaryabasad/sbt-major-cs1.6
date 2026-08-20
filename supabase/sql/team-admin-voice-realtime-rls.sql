-- Private Realtime authorization for the shared Team Admin voice room.
-- Run once in Supabase SQL Editor.

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
  )
  OR EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) = lower(coalesce(
        current_setting('request.jwt.claims', true)::json ->> 'email',
        u.email
      ))
  );
$$;

DROP POLICY IF EXISTS "team admins can receive voice room" ON realtime.messages;
DROP POLICY IF EXISTS "team admins can send voice room" ON realtime.messages;

CREATE POLICY "team admins can receive voice room"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (select realtime.topic()) = 'sbt-major-team-admin-voice'
  AND realtime.messages.extension IN ('broadcast', 'presence')
  AND public.is_tournament_admin()
);

CREATE POLICY "team admins can send voice room"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (select realtime.topic()) = 'sbt-major-team-admin-voice'
  AND realtime.messages.extension IN ('broadcast', 'presence')
  AND public.is_tournament_admin()
);

NOTIFY pgrst, 'reload schema';
