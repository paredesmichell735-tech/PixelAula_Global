-- =====================================================================
-- PixelAula · esquema del dominio real
--
-- Sustituye el modelo anterior (mundos/capítulos/niveles de combate) por el
-- de los mockups: materias -> misiones -> actividades, con objetivos,
-- simuladores, Pixeles, gemas, insignias y comunidad.
--
-- Las tablas antiguas se conservan hasta que el backend deje de usarlas;
-- la migración de retirada va aparte para no perder datos por accidente.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type rarity as enum ('COMMON','UNCOMMON','RARE','EPIC','LEGENDARY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type difficulty as enum ('FACIL','MEDIO','DIFICIL','EPICO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_type as enum (
    'MULTIPLE_CHOICE','TRUE_FALSE','ORDERING','MATCHING','DRAG_DROP',
    'IMAGE_SELECTION','SQL_CHALLENGE','NETWORK_SIMULATION','CIRCUIT_SIMULATION'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type mission_status as enum ('LOCKED','ACTIVE','COMPLETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attempt_status as enum ('ACTIVE','COMPLETED','FAILED','ABANDONED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type achievement_category as enum
    ('APRENDIZAJE','EXPLORACION','CONSTANCIA','CREATIVIDAD','ESPECIALES');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inventory_category as enum ('ROPA','ACCESORIOS','MOCHILAS','MASCOTAS','EFECTOS','CONSUMIBLE');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- 1 · Identidad y progresión del estudiante
-- =====================================================================

create table if not exists pa_profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  username       text not null unique
                   check (char_length(username) between 3 and 20
                          and username ~ '^[a-zA-Z0-9_]+$'),
  display_name   text not null check (char_length(display_name) between 2 and 40),
  title          text not null default 'Estudiante PixelAula',
  level          int  not null default 1 check (level >= 1),
  current_xp     int  not null default 0 check (current_xp >= 0),
  total_xp       int  not null default 0 check (total_xp >= 0),
  pixels_coins   int  not null default 0 check (pixels_coins >= 0),
  gems           int  not null default 0 check (gems >= 0),
  is_admin       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists pa_profiles_username_trgm on pa_profiles using gin (username gin_trgm_ops);
create index if not exists pa_profiles_total_xp_idx on pa_profiles(total_xp desc);

-- =====================================================================
-- 2 · Avatar
-- =====================================================================

create table if not exists pa_avatar_options (
  id            uuid primary key default gen_random_uuid(),
  category      text not null,           -- coincide con AvatarCategory del contrato
  slug          text not null,
  name          text not null,
  rarity        rarity not null default 'COMMON',
  asset         text not null,           -- sprite_key o color hexadecimal
  price_coins   int  not null default 0 check (price_coins >= 0),
  /** Si es true, todo el mundo lo tiene desde el minuto uno. */
  is_default    boolean not null default false,
  unlock_condition text,
  order_index   int not null default 0,
  created_at    timestamptz not null default now(),
  unique (category, slug)
);

create index if not exists pa_avatar_options_category_idx on pa_avatar_options(category, order_index);

create table if not exists pa_user_avatars (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  config     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Piezas que el usuario ha desbloqueado o comprado.
create table if not exists pa_user_avatar_items (
  user_id     uuid not null references auth.users(id) on delete cascade,
  option_id   uuid not null references pa_avatar_options(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, option_id)
);

create table if not exists pa_avatar_styles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 30),
  config      jsonb not null,
  is_equipped boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists pa_avatar_styles_user_idx on pa_avatar_styles(user_id, created_at desc);
-- Un solo estilo equipado por usuario.
create unique index if not exists pa_avatar_styles_one_equipped
  on pa_avatar_styles(user_id) where is_equipped;

-- =====================================================================
-- 3 · Materias, misiones y actividades
-- =====================================================================

create table if not exists pa_subjects (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  description    text not null,
  icon           text not null,
  color          text not null default '#19D3FF',
  order_index    int  not null check (order_index > 0),
  difficulty     difficulty not null default 'FACIL',
  required_xp    int  not null default 500 check (required_xp > 0),
  total_lessons  int  not null default 0,
  total_projects int  not null default 0,
  /** Nivel de cuenta necesario para abrir la materia. */
  min_level      int  not null default 1,
  narrative_theme text,
  is_published   boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists pa_subjects_order_idx on pa_subjects(order_index);

create table if not exists pa_missions (
  id                uuid primary key default gen_random_uuid(),
  subject_id        uuid not null references pa_subjects(id) on delete cascade,
  slug              text not null,
  title             text not null,
  description       text not null,
  level_number      int  not null check (level_number > 0),
  difficulty        difficulty not null default 'FACIL',
  estimated_minutes int  not null default 10 check (estimated_minutes > 0),
  xp_reward         int  not null default 100 check (xp_reward >= 0),
  coins_reward      int  not null default 20 check (coins_reward >= 0),
  gems_reward       int  not null default 0 check (gems_reward >= 0),
  activity_count    int  not null default 5 check (activity_count between 1 and 40),
  -- Posición del nodo en el mapa de aprendizaje (0-100, relativo a la isla).
  position_x        numeric(5,2) not null default 50,
  position_y        numeric(5,2) not null default 50,
  briefing_md       text,
  briefing_key_points text[] not null default '{}',
  /** Frases de "Lo que aprendiste" de la pantalla de resultados. */
  learned_points    text[] not null default '{}',
  is_published      boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (subject_id, slug),
  unique (subject_id, level_number)
);

create index if not exists pa_missions_subject_idx on pa_missions(subject_id, level_number);

create table if not exists pa_mission_objectives (
  id          uuid primary key default gen_random_uuid(),
  mission_id  uuid not null references pa_missions(id) on delete cascade,
  order_index int  not null check (order_index > 0),
  description text not null,
  /** Qué actividad marca este objetivo como cumplido. Null = manual. */
  activity_index int,
  unique (mission_id, order_index)
);

create index if not exists pa_mission_objectives_mission_idx on pa_mission_objectives(mission_id, order_index);

-- ---------------------------------------------------------------------
-- Actividades · ANTITRAMPA
-- `payload` es lo único que puede salir al cliente. `solution` y
-- `explanation` NUNCA se serializan antes de que el usuario responda; la
-- política RLS de esta tabla no da lectura a los usuarios.
-- ---------------------------------------------------------------------
create table if not exists pa_activities (
  id             uuid primary key default gen_random_uuid(),
  mission_id     uuid not null references pa_missions(id) on delete cascade,
  order_index    int  not null check (order_index > 0),
  type           activity_type not null,
  title          text not null,
  question       text not null,
  -- Público: opciones, tablero del circuito, dispositivos de red, plantilla SQL...
  payload        jsonb not null default '{}'::jsonb,
  ---------------------------- PRIVADO ---------------------------------
  solution       jsonb not null,
  explanation    text not null,
  ----------------------------------------------------------------------
  hints          text[] not null default '{}'
                   check (array_length(hints,1) is null or array_length(hints,1) <= 3),
  hint_cost_gems int  not null default 1 check (hint_cost_gems >= 0),
  points         int  not null default 100 check (points > 0),
  concept        text,
  source         text not null default 'seed' check (source in ('ai','seed','manual')),
  model_used     text,
  prompt_version text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists pa_activities_mission_order
  on pa_activities(mission_id, order_index) where is_active;
create index if not exists pa_activities_mission_idx on pa_activities(mission_id);

-- =====================================================================
-- 4 · Progreso, intentos y respuestas
-- =====================================================================

create table if not exists pa_user_mission_progress (
  user_id      uuid not null references auth.users(id) on delete cascade,
  mission_id   uuid not null references pa_missions(id) on delete cascade,
  status       mission_status not null default 'LOCKED',
  stars        int  not null default 0 check (stars between 0 and 3),
  best_score   int  not null default 0 check (best_score between 0 and 100),
  attempts     int  not null default 0 check (attempts >= 0),
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, mission_id)
);

create index if not exists pa_ump_user_status_idx on pa_user_mission_progress(user_id, status);

create table if not exists pa_mission_attempts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  mission_id     uuid not null references pa_missions(id) on delete cascade,
  status         attempt_status not null default 'ACTIVE',
  activity_order uuid[] not null,
  activity_index int  not null default 0 check (activity_index >= 0),
  correct_count  int  not null default 0 check (correct_count >= 0),
  wrong_count    int  not null default 0 check (wrong_count >= 0),
  skipped_count  int  not null default 0 check (skipped_count >= 0),
  hints_used     int  not null default 0 check (hints_used >= 0),
  score          int  not null default 0 check (score between 0 and 100),
  stars          int  not null default 0 check (stars between 0 and 3),
  xp_awarded     int  not null default 0,
  coins_awarded  int  not null default 0,
  gems_awarded   int  not null default 0,
  teacher_note   text,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  updated_at     timestamptz not null default now()
);

-- Un solo intento abierto por misión: así "continuar" reanuda en vez de duplicar.
create unique index if not exists pa_attempts_one_active
  on pa_mission_attempts(user_id, mission_id) where status = 'ACTIVE';
create index if not exists pa_attempts_user_idx on pa_mission_attempts(user_id, started_at desc);

create table if not exists pa_attempt_objectives (
  attempt_id   uuid not null references pa_mission_attempts(id) on delete cascade,
  objective_id uuid not null references pa_mission_objectives(id) on delete cascade,
  completed    boolean not null default false,
  primary key (attempt_id, objective_id)
);

create table if not exists pa_attempt_answers (
  id                uuid primary key default gen_random_uuid(),
  attempt_id        uuid not null references pa_mission_attempts(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  activity_id       uuid not null references pa_activities(id) on delete cascade,
  -- Idempotencia: un reenvío por mala red no cuenta como segundo intento.
  client_attempt_id uuid not null,
  answer            jsonb not null,
  is_correct        boolean not null,
  score             int  not null default 0 check (score between 0 and 100),
  hints_used        int  not null default 0,
  time_spent_ms     int,
  skipped           boolean not null default false,
  ai_feedback       jsonb,
  explanation_md    text,
  explained_at      timestamptz,
  created_at        timestamptz not null default now()
);

create unique index if not exists pa_answers_idempotency
  on pa_attempt_answers(attempt_id, client_attempt_id);
create index if not exists pa_answers_attempt_idx on pa_attempt_answers(attempt_id, created_at);
create index if not exists pa_answers_user_idx on pa_attempt_answers(user_id, created_at desc);

-- Dominio por concepto: alimenta la personalización de la IA.
create table if not exists pa_concept_mastery (
  user_id       uuid not null references auth.users(id) on delete cascade,
  concept       text not null,
  correct_count int not null default 0,
  wrong_count   int not null default 0,
  mastery_level numeric(4,3) not null default 0 check (mastery_level between 0 and 1),
  last_practiced_at timestamptz,
  primary key (user_id, concept)
);

-- =====================================================================
-- 5 · Gamificación
-- =====================================================================

create table if not exists pa_achievements (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  category     achievement_category not null,
  title        text not null,
  description  text not null,
  icon         text not null,
  metric       text not null,
  target_value int  not null check (target_value > 0),
  reward_xp    int  not null default 0,
  reward_coins int  not null default 0,
  is_secret    boolean not null default false,
  order_index  int not null default 0
);

create table if not exists pa_user_achievements (
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references pa_achievements(id) on delete cascade,
  current_value  int  not null default 0,
  unlocked_at    timestamptz,
  primary key (user_id, achievement_id)
);

create table if not exists pa_badges (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text not null,
  icon        text not null,
  rarity      rarity not null default 'COMMON',
  order_index int not null default 0
);

create table if not exists pa_user_badges (
  user_id     uuid not null references auth.users(id) on delete cascade,
  badge_id    uuid not null references pa_badges(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table if not exists pa_challenges (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  description  text not null,
  kind         text not null check (kind in ('WEEKLY','TEAM','EXPLORATION','STREAK')),
  metric       text not null,
  target_value int  not null check (target_value > 0),
  reward_xp    int  not null default 0,
  reward_coins int  not null default 0,
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz
);

create table if not exists pa_user_challenges (
  user_id       uuid not null references auth.users(id) on delete cascade,
  challenge_id  uuid not null references pa_challenges(id) on delete cascade,
  current_value int not null default 0,
  joined_at     timestamptz not null default now(),
  completed_at  timestamptz,
  primary key (user_id, challenge_id)
);

create table if not exists pa_streaks (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  current_days       int  not null default 0 check (current_days >= 0),
  longest_days       int  not null default 0 check (longest_days >= 0),
  last_activity_date date,
  last_claimed_date  date,
  freezes_available  int  not null default 0 check (freezes_available >= 0),
  updated_at         timestamptz not null default now()
);

-- Fuente de verdad para los rankings por periodo.
create table if not exists pa_xp_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid references pa_mission_attempts(id) on delete set null,
  source     text not null,
  xp         int  not null default 0,
  coins      int  not null default 0,
  gems       int  not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pa_xp_events_user_idx on pa_xp_events(user_id, created_at desc);
create index if not exists pa_xp_events_created_idx on pa_xp_events(created_at desc);

-- =====================================================================
-- 6 · Economía
-- =====================================================================

create table if not exists pa_shop_items (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null,
  category    inventory_category not null,
  rarity      rarity not null default 'COMMON',
  price_coins int  not null default 0 check (price_coins >= 0),
  price_gems  int  not null default 0 check (price_gems >= 0),
  icon        text not null,
  effect      jsonb not null default '{}'::jsonb,
  /** Si apunta a una pieza de avatar, comprarla la desbloquea. */
  avatar_option_id uuid references pa_avatar_options(id) on delete set null,
  is_consumable boolean not null default false,
  min_level   int  not null default 1,
  is_available boolean not null default true
);

create table if not exists pa_inventory (
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_id    uuid not null references pa_shop_items(id) on delete cascade,
  quantity   int  not null default 0 check (quantity >= 0),
  equipped   boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- =====================================================================
-- 7 · Comunidad
-- =====================================================================

create table if not exists pa_classes (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  code         text not null unique check (char_length(code) between 4 and 12),
  teacher_name text,
  created_at   timestamptz not null default now()
);

create table if not exists pa_class_members (
  class_id  uuid not null references pa_classes(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

create index if not exists pa_class_members_user_idx on pa_class_members(user_id);

create table if not exists pa_friendships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  friend_id  uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','BLOCKED')),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  constraint pa_friendships_no_self check (user_id <> friend_id)
);

create index if not exists pa_friendships_user_idx on pa_friendships(user_id, status);
create index if not exists pa_friendships_friend_idx on pa_friendships(friend_id, status);

create table if not exists pa_community_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  message    text not null check (char_length(message) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists pa_posts_created_idx on pa_community_posts(created_at desc);

create table if not exists pa_post_likes (
  post_id    uuid not null references pa_community_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists pa_team_challenges (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid references pa_classes(id) on delete cascade,
  title         text not null,
  description   text not null,
  target_value  int  not null check (target_value > 0),
  current_value int  not null default 0,
  reward_title  text not null,
  ends_at       timestamptz
);

-- =====================================================================
-- 8 · Avisos, objetivos, certificados y calendario
-- =====================================================================

create table if not exists pa_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('NEW_MISSION','LEVEL_UP','ACHIEVEMENT','STREAK','REWARD','COMMUNITY')),
  title      text not null,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists pa_notifications_user_idx on pa_notifications(user_id, created_at desc);

create table if not exists pa_activity_feed (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  subtitle   text not null default '',
  icon       text not null default 'star',
  created_at timestamptz not null default now()
);

create index if not exists pa_feed_user_idx on pa_activity_feed(user_id, created_at desc);

create table if not exists pa_learning_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  subject_id    uuid references pa_subjects(id) on delete set null,
  target_value  int  not null check (target_value > 0),
  current_value int  not null default 0 check (current_value >= 0),
  due_date      date,
  completed     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pa_goals_user_idx on pa_learning_goals(user_id);

create table if not exists pa_certifications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  subject_id       uuid not null references pa_subjects(id) on delete cascade,
  title            text not null,
  status           text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS','COMPLETED')),
  progress_percent int  not null default 0 check (progress_percent between 0 and 100),
  issued_at        timestamptz,
  credential_url   text,
  unique (user_id, subject_id)
);

create table if not exists pa_calendar_events (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid references pa_classes(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  kind         text not null default 'LIVE_CLASS' check (kind in ('LIVE_CLASS','DEADLINE','CHALLENGE')),
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  location     text,
  teacher_name text
);

create index if not exists pa_calendar_starts_idx on pa_calendar_events(starts_at);

-- =====================================================================
-- 9 · updated_at automático
-- =====================================================================

create or replace function pa_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'pa_profiles','pa_user_avatars','pa_avatar_styles','pa_subjects','pa_missions',
    'pa_activities','pa_user_mission_progress','pa_mission_attempts','pa_inventory',
    'pa_streaks','pa_learning_goals'
  ] loop
    if not exists (select 1 from pg_trigger where tgname = t || '_set_updated_at') then
      execute format(
        'create trigger %I before update on %I for each row execute function pa_set_updated_at()',
        t || '_set_updated_at', t);
    end if;
  end loop;
end $$;


-- =====================================================================
-- 10 · Assets y control de costes de IA
-- =====================================================================

create table if not exists pa_asset_manifest (
  id         int primary key default 1 check (id = 1),
  version    int not null default 1,
  assets     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into pa_asset_manifest (id, version, assets)
values (1, 1, '{}'::jsonb)
on conflict (id) do nothing;

create table if not exists pa_ai_generation_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  mission_id     uuid references pa_missions(id) on delete set null,
  operation      text not null,
  provider       text not null,
  model          text not null,
  prompt_version text,
  input_tokens   int not null default 0,
  output_tokens  int not null default 0,
  cost_usd       numeric(10,6) not null default 0,
  latency_ms     int,
  success        boolean not null default true,
  retry_count    int not null default 0,
  error_code     text,
  error_message  text,
  created_at     timestamptz not null default now()
);

create index if not exists pa_ai_logs_created_idx on pa_ai_generation_logs(created_at desc);
create index if not exists pa_ai_logs_operation_idx on pa_ai_generation_logs(operation, created_at desc);
