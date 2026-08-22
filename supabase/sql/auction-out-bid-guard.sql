-- Prevent a team that has clicked OUT from bidding again on the same player.
-- The auction tables use different ID types in some environments,
-- so compare the IDs as text to avoid uuid = text operator errors.

CREATE OR REPLACE FUNCTION public.block_out_team_bid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'bid'
     AND EXISTS (
       SELECT 1
       FROM public.auction_team_out o
       WHERE o.player_id::text = NEW.player_id::text
         AND o.team_id::text = NEW.team_id::text
     )
  THEN
    RAISE EXCEPTION 'Your team is OUT for this player and cannot bid again.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auction_out_bid_guard
  ON public.auction_history;

CREATE TRIGGER auction_out_bid_guard
BEFORE INSERT ON public.auction_history
FOR EACH ROW
WHEN (NEW.type = 'bid')
EXECUTE FUNCTION public.block_out_team_bid();

NOTIFY pgrst, 'reload schema';
