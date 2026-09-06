-- Let the player choose which revisit objective to practice.
-- Revisits never change XP, completion time or unlocks, so accepting the chosen
-- variant from the client is safe; it is still validated (0 or 1) and recorded.
-- When no choice is supplied the stable per-player alternating objective is used,
-- preserving the previous behaviour.
drop function if exists public.begin_revisit(smallint, uuid);

create function public.begin_revisit(
  ruin smallint,
  request_id uuid,
  chosen_variant integer default null
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  p uuid := game_private.require_player();
  prior game_private.revisit_requests%rowtype;
  visit integer;
  variant integer;
begin
  if request_id is null then raise exception 'Request ID required.'; end if;
  if chosen_variant is not null and chosen_variant not in (0, 1) then
    raise exception 'Invalid revisit variant.';
  end if;
  perform 1 from public.profiles where id = p for update;
  select * into prior from game_private.revisit_requests r
    where r.player_id = p and r.request_id = begin_revisit.request_id;
  if found then
    if prior.ruin_id <> ruin then raise exception 'Request ID already used.'; end if;
    return jsonb_build_object('visit', prior.visit, 'variant', prior.variant);
  end if;
  update public.ruin_progress set revisit_count = revisit_count + 1
    where player_id = p and ruin_id = ruin and solved_at is not null
    returning revisit_count into visit;
  if not found then
    raise exception 'Restore this ruin before revisiting.' using errcode = '42501';
  end if;
  -- Player-selected objective; fall back to the stable alternating choice.
  variant := coalesce(
    chosen_variant,
    (get_byte(decode(md5(p::text || ':' || ruin::text), 'hex'), 0) + visit - 1) % 2
  );
  insert into game_private.revisit_requests
    values (p, request_id, ruin, visit, variant, clock_timestamp());
  return jsonb_build_object('visit', visit, 'variant', variant);
end;
$$;

revoke all on function public.begin_revisit(smallint, uuid, integer) from public, anon;
grant execute on function public.begin_revisit(smallint, uuid, integer) to authenticated;
