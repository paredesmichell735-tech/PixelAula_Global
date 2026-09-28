-- =====================================================================
-- PixelAula · funciones transaccionales y Row Level Security
-- =====================================================================

-- ---------------------------------------------------------------------
-- Curva de nivel: el nivel n exige 500*(n-1) XP acumulada.
-- ---------------------------------------------------------------------
create or replace function pa_xp_for_level(p_level int) returns int
language sql immutable as $$ select greatest(0, (p_level - 1) * 500); $$;

create or replace function pa_level_for_xp(p_xp int) returns int
language sql immutable as $$ select greatest(1, (p_xp / 500) + 1); $$;

create or replace function pa_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from pa_profiles p where p.id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- Alta: perfil, racha, avatar por defecto y piezas gratuitas.
-- ---------------------------------------------------------------------
create or replace function pa_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_username text;
  v_display  text;
  v_config   jsonb := '{}'::jsonb;
  v_row      record;
begin
  v_display := coalesce(new.raw_user_meta_data->>'display_name',
                        split_part(coalesce(new.email,'estudiante'), '@', 1));
  v_username := coalesce(
    new.raw_user_meta_data->>'username',
    regexp_replace(split_part(coalesce(new.email,'player'), '@', 1), '[^a-zA-Z0-9_]', '', 'g')
  );
  if char_length(v_username) < 3 then v_username := 'player'; end if;
  v_username := left(v_username, 14) || '_' || substr(replace(new.id::text,'-',''), 1, 5);

  insert into pa_profiles (id, username, display_name)
  values (new.id, v_username, left(v_display, 40))
  on conflict (id) do nothing;

  insert into pa_streaks (user_id) values (new.id) on conflict do nothing;

  -- Avatar inicial: la primera pieza por defecto de cada categoría.
  for v_row in
    select distinct on (category) category, id, slug
    from pa_avatar_options
    where is_default
    order by category, order_index
  loop
    v_config := v_config || jsonb_build_object(v_row.category, v_row.slug);
    insert into pa_user_avatar_items (user_id, option_id)
    values (new.id, v_row.id) on conflict do nothing;
  end loop;

  insert into pa_user_avatars (user_id, config) values (new.id, v_config)
  on conflict (user_id) do nothing;

  return new;
end $$;

drop trigger if exists pa_on_auth_user_created on auth.users;
create trigger pa_on_auth_user_created
  after insert on auth.users
  for each row execute function pa_handle_new_user();

-- ---------------------------------------------------------------------
-- Siguiente misión de la progresión lineal (materia, luego nivel).
-- ---------------------------------------------------------------------
create or replace function pa_next_mission_id(p_mission_id uuid) returns uuid
language sql stable as $$
  with cur as (
    select m.level_number as lvl, s.order_index as sub
    from pa_missions m join pa_subjects s on s.id = m.subject_id
    where m.id = p_mission_id
  )
  select m.id
  from pa_missions m
  join pa_subjects s on s.id = m.subject_id
  cross join cur
  where m.is_published and s.is_published
    and (s.order_index, m.level_number) > (cur.sub, cur.lvl)
  order by s.order_index, m.level_number
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- pa_complete_mission · TRANSACCIÓN ÚNICA
-- XP, Pixeles, gemas, estrellas, subida de nivel, desbloqueo de la
-- siguiente misión y registro del evento. Todo junto o nada.
-- ---------------------------------------------------------------------
create or replace function pa_complete_mission(
  p_attempt_id uuid,
  p_score int,
  p_stars int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_attempt   pa_mission_attempts;
  v_mission   pa_missions;
  v_prev      int := 0;
  v_xp        int;
  v_coins     int;
  v_gems      int;
  v_next      uuid;
  v_profile   pa_profiles;
  v_new_level int;
  v_leveled   boolean := false;
begin
  select * into v_attempt from pa_mission_attempts where id = p_attempt_id for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND' using errcode='P0002'; end if;
  if v_attempt.status <> 'ACTIVE' then
    raise exception 'ATTEMPT_ALREADY_FINISHED' using errcode='P0001';
  end if;

  select * into v_mission from pa_missions where id = v_attempt.mission_id;

  select coalesce(stars,0) into v_prev
  from pa_user_mission_progress
  where user_id = v_attempt.user_id and mission_id = v_attempt.mission_id;

  -- Repetir una misión da el 25%: evita farmear la primera para siempre.
  if coalesce(v_prev,0) = 0 then
    v_xp := v_mission.xp_reward; v_coins := v_mission.coins_reward; v_gems := v_mission.gems_reward;
  else
    v_xp := (v_mission.xp_reward * 0.25)::int;
    v_coins := (v_mission.coins_reward * 0.25)::int;
    v_gems := 0;
  end if;

  update pa_mission_attempts set
    status='COMPLETED', score=p_score, stars=p_stars,
    xp_awarded=v_xp, coins_awarded=v_coins, gems_awarded=v_gems, finished_at=now()
  where id = p_attempt_id;

  insert into pa_user_mission_progress (user_id, mission_id, status, stars, best_score, attempts, completed_at)
  values (v_attempt.user_id, v_attempt.mission_id, 'COMPLETED', p_stars, p_score, 1, now())
  on conflict (user_id, mission_id) do update set
    status='COMPLETED',
    stars = greatest(pa_user_mission_progress.stars, excluded.stars),
    best_score = greatest(pa_user_mission_progress.best_score, excluded.best_score),
    attempts = pa_user_mission_progress.attempts + 1,
    completed_at = now();

  v_next := pa_next_mission_id(v_attempt.mission_id);
  if v_next is not null then
    insert into pa_user_mission_progress (user_id, mission_id, status)
    values (v_attempt.user_id, v_next, 'ACTIVE')
    on conflict (user_id, mission_id) do update set
      status = case when pa_user_mission_progress.status = 'LOCKED'
                    then 'ACTIVE' else pa_user_mission_progress.status end;
  end if;

  update pa_profiles set
    total_xp = total_xp + v_xp,
    current_xp = current_xp + v_xp,
    pixels_coins = pixels_coins + v_coins,
    gems = gems + v_gems
  where id = v_attempt.user_id
  returning * into v_profile;

  v_new_level := pa_level_for_xp(v_profile.total_xp);
  if v_new_level > v_profile.level then
    v_leveled := true;
    update pa_profiles
      set level = v_new_level,
          current_xp = v_profile.total_xp - pa_xp_for_level(v_new_level)
      where id = v_attempt.user_id
      returning * into v_profile;

    insert into pa_notifications (user_id, type, title, message)
    values (v_attempt.user_id, 'LEVEL_UP', '¡Subiste de nivel!',
            format('Ahora eres nivel %s. Sigue así.', v_new_level));
  end if;

  insert into pa_xp_events (user_id, attempt_id, source, xp, coins, gems)
  values (v_attempt.user_id, p_attempt_id, 'mission_complete', v_xp, v_coins, v_gems);

  insert into pa_activity_feed (user_id, type, title, subtitle, icon)
  values (v_attempt.user_id, 'MISSION_COMPLETED',
          format('Completaste la misión "%s"', v_mission.title),
          format('+%s XP', v_xp), 'trophy');

  return jsonb_build_object(
    'xpAwarded', v_xp,
    'coinsAwarded', v_coins,
    'gemsAwarded', v_gems,
    'stars', p_stars,
    'score', p_score,
    'leveledUp', v_leveled,
    'newLevel', v_profile.level,
    'totalXp', v_profile.total_xp,
    'pixelsCoins', v_profile.pixels_coins,
    'gems', v_profile.gems,
    'nextMissionId', v_next
  );
end $$;

-- ---------------------------------------------------------------------
-- pa_spend_gems · descuento atómico para las pistas
-- ---------------------------------------------------------------------
create or replace function pa_spend_gems(p_user_id uuid, p_amount int) returns int
language plpgsql security definer set search_path = public as $$
declare v_gems int;
begin
  if p_amount <= 0 then
    select gems into v_gems from pa_profiles where id = p_user_id;
    return v_gems;
  end if;

  update pa_profiles set gems = gems - p_amount
  where id = p_user_id and gems >= p_amount
  returning gems into v_gems;

  if not found then raise exception 'INSUFFICIENT_GEMS' using errcode='P0001'; end if;
  return v_gems;
end $$;

-- ---------------------------------------------------------------------
-- pa_purchase_item · compra atómica (Pixeles o gemas)
-- ---------------------------------------------------------------------
create or replace function pa_purchase_item(
  p_user_id  uuid,
  p_item_id  uuid,
  p_quantity int default 1,
  p_currency text default 'COINS'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_item    pa_shop_items;
  v_profile pa_profiles;
  v_total   int;
  v_qty     int;
begin
  if p_quantity < 1 then raise exception 'INVALID_QUANTITY' using errcode='P0001'; end if;

  select * into v_item from pa_shop_items where id = p_item_id and is_available;
  if not found then raise exception 'ITEM_NOT_FOUND' using errcode='P0002'; end if;

  select * into v_profile from pa_profiles where id = p_user_id for update;
  if v_profile.level < v_item.min_level then
    raise exception 'LEVEL_TOO_LOW' using errcode='P0001';
  end if;

  if p_currency = 'GEMS' then
    v_total := v_item.price_gems * p_quantity;
    if v_profile.gems < v_total then raise exception 'INSUFFICIENT_GEMS' using errcode='P0001'; end if;
    update pa_profiles set gems = gems - v_total where id = p_user_id returning * into v_profile;
  else
    v_total := v_item.price_coins * p_quantity;
    if v_profile.pixels_coins < v_total then raise exception 'INSUFFICIENT_COINS' using errcode='P0001'; end if;
    update pa_profiles set pixels_coins = pixels_coins - v_total where id = p_user_id returning * into v_profile;
  end if;

  insert into pa_inventory (user_id, item_id, quantity)
  values (p_user_id, p_item_id, p_quantity)
  on conflict (user_id, item_id) do update set quantity = pa_inventory.quantity + excluded.quantity
  returning quantity into v_qty;

  -- Si el objeto es una pieza de avatar, queda desbloqueada.
  if v_item.avatar_option_id is not null then
    insert into pa_user_avatar_items (user_id, option_id)
    values (p_user_id, v_item.avatar_option_id) on conflict do nothing;
  end if;

  return jsonb_build_object(
    'itemId', p_item_id,
    'quantityOwned', v_qty,
    'coinsSpent', case when p_currency = 'GEMS' then 0 else v_total end,
    'gemsSpent',  case when p_currency = 'GEMS' then v_total else 0 end,
    'coinsRemaining', v_profile.pixels_coins,
    'gemsRemaining', v_profile.gems
  );
end $$;

-- =====================================================================
-- Row Level Security
--
-- El backend usa service_role y se salta RLS, pero los clientes hablan con
-- Supabase Auth directamente y podrían intentar leer con la anon key. La
-- regla antitrampa vive también aquí: pa_activities no tiene política de
-- lectura para usuarios.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'pa_profiles','pa_avatar_options','pa_user_avatars','pa_user_avatar_items','pa_avatar_styles',
    'pa_subjects','pa_missions','pa_mission_objectives','pa_activities',
    'pa_user_mission_progress','pa_mission_attempts','pa_attempt_objectives','pa_attempt_answers',
    'pa_concept_mastery','pa_achievements','pa_user_achievements','pa_badges','pa_user_badges',
    'pa_challenges','pa_user_challenges','pa_streaks','pa_xp_events',
    'pa_shop_items','pa_inventory','pa_classes','pa_class_members','pa_friendships',
    'pa_community_posts','pa_post_likes','pa_team_challenges',
    'pa_notifications','pa_activity_feed','pa_learning_goals','pa_certifications','pa_calendar_events',
    'pa_asset_manifest','pa_ai_generation_logs'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Catálogo público para cualquier persona autenticada.
create policy pa_subjects_read on pa_subjects for select to authenticated
  using (is_published or pa_is_admin());
create policy pa_missions_read on pa_missions for select to authenticated
  using (is_published or pa_is_admin());
create policy pa_objectives_read on pa_mission_objectives for select to authenticated using (true);
create policy pa_avatar_options_read on pa_avatar_options for select to authenticated using (true);
create policy pa_achievements_read on pa_achievements for select to authenticated using (true);
create policy pa_badges_read on pa_badges for select to authenticated using (true);
create policy pa_challenges_read on pa_challenges for select to authenticated using (true);
create policy pa_shop_read on pa_shop_items for select to authenticated using (is_available);
create policy pa_classes_read on pa_classes for select to authenticated using (true);
create policy pa_calendar_read on pa_calendar_events for select to authenticated using (true);
create policy pa_team_challenges_read on pa_team_challenges for select to authenticated using (true);

-- Perfiles: lectura pública (rankings), escritura solo propia.
create policy pa_profiles_read on pa_profiles for select to authenticated using (true);
create policy pa_profiles_write on pa_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Nadie se auto-asciende a admin.
create or replace function pa_prevent_self_admin() returns trigger
language plpgsql as $$
begin
  if new.is_admin is distinct from old.is_admin
     and current_setting('role', true) <> 'service_role' then
    raise exception 'CANNOT_MODIFY_ADMIN_FLAG';
  end if;
  return new;
end $$;

drop trigger if exists pa_profiles_prevent_self_admin on pa_profiles;
create trigger pa_profiles_prevent_self_admin
  before update on pa_profiles
  for each row execute function pa_prevent_self_admin();

-- Datos propios.
create policy pa_user_avatars_own on pa_user_avatars for select to authenticated using (user_id = auth.uid());
create policy pa_user_avatar_items_own on pa_user_avatar_items for select to authenticated using (user_id = auth.uid());
create policy pa_avatar_styles_own on pa_avatar_styles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pa_ump_own on pa_user_mission_progress for select to authenticated using (user_id = auth.uid());
create policy pa_attempts_own on pa_mission_attempts for select to authenticated using (user_id = auth.uid());
create policy pa_attempt_objectives_own on pa_attempt_objectives for select to authenticated
  using (exists (select 1 from pa_mission_attempts a where a.id = attempt_id and a.user_id = auth.uid()));
-- Solo lectura: si el cliente pudiera escribir aquí, falsearía is_correct.
create policy pa_answers_own on pa_attempt_answers for select to authenticated using (user_id = auth.uid());
create policy pa_mastery_own on pa_concept_mastery for select to authenticated using (user_id = auth.uid());
create policy pa_user_achievements_own on pa_user_achievements for select to authenticated using (user_id = auth.uid());
create policy pa_user_badges_own on pa_user_badges for select to authenticated using (user_id = auth.uid());
create policy pa_user_challenges_own on pa_user_challenges for select to authenticated using (user_id = auth.uid());
create policy pa_streaks_own on pa_streaks for select to authenticated using (user_id = auth.uid());
create policy pa_xp_events_own on pa_xp_events for select to authenticated using (user_id = auth.uid());
create policy pa_inventory_own on pa_inventory for select to authenticated using (user_id = auth.uid());
create policy pa_notifications_own on pa_notifications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pa_feed_own on pa_activity_feed for select to authenticated using (user_id = auth.uid());
create policy pa_goals_own on pa_learning_goals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pa_certifications_own on pa_certifications for select to authenticated using (user_id = auth.uid());

-- Comunidad.
create policy pa_class_members_read on pa_class_members for select to authenticated using (true);
create policy pa_friendships_own on pa_friendships for select to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());
create policy pa_posts_read on pa_community_posts for select to authenticated using (true);
create policy pa_posts_write on pa_community_posts for insert to authenticated with check (user_id = auth.uid());
create policy pa_likes_read on pa_post_likes for select to authenticated using (true);
create policy pa_likes_write on pa_post_likes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- pa_activities: SIN política de lectura a propósito. Con RLS activo y
-- ninguna política permisiva, Postgres deniega por defecto. Solo el backend
-- con service_role la lee, y decide qué columnas expone.
create policy pa_activities_admin on pa_activities for all to authenticated
  using (pa_is_admin()) with check (pa_is_admin());


-- Manifiesto publico para clientes; los costes de IA solo para admin.
create policy pa_asset_manifest_read on pa_asset_manifest for select to authenticated using (true);
create policy pa_ai_logs_admin on pa_ai_generation_logs for select to authenticated using (pa_is_admin());
