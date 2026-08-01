-- ============================================================================
-- La Cantina Plus — esquema PostgreSQL (autohospedado en el VPS).
-- Reemplaza a Supabase. SIN RLS ni publicaciones realtime: Postgres solo
-- escucha en localhost y la unica capa que escribe es el server Express, que
-- ademas emite los eventos realtime via socket.io.
--
-- Uso:  psql -U rockola -d rockola -f db/schema.sql
-- ============================================================================
-- gen_random_uuid() es nativo en PostgreSQL 13+ (no requiere extensión).

-- ─────────────────────────────────────────────────────────────────────────────
-- venues: cada bar / discoteca
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists venues (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  name                 text not null,
  allowed_genres       text[] not null default '{}',
  blocked_track_ids    text[] not null default '{}',
  request_cooldown_sec integer not null default 60,
  allow_explicit       boolean not null default true,
  tip_enabled          boolean not null default true,
  tip_price_cop        integer not null default 5000,
  created_at           timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- queue_items: la cola activa + historico
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists queue_items (
  id                uuid primary key default gen_random_uuid(),
  venue_id          uuid not null references venues(id) on delete cascade,
  track             jsonb not null,           -- snapshot ResolvedTrack (TS)
  requested_by      text not null,
  requested_by_name text,
  position          bigint not null,
  boosted           boolean not null default false,
  status            text not null default 'queued'
                      check (status in ('queued','playing','played','skipped')),
  created_at        timestamptz not null default now()
);

create index if not exists queue_items_venue_status_pos
  on queue_items (venue_id, status, position);

create index if not exists queue_items_venue_created
  on queue_items (venue_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- youtube_resolutions: cache provider_id (iTunes trackId) -> youtube_video_id
-- (evita re-resolver canciones populares; ahorra cuota de YouTube API)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists youtube_resolutions (
  provider_id      text primary key,
  youtube_video_id text not null,
  is_official      boolean not null default false,
  has_video        boolean not null default true,
  resolved_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- house_tracks: catálogo preaprobado para el autofill. No depende de APIs en vivo.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists house_tracks (
  provider_id     text primary key,
  genre           text not null,
  track           jsonb not null,
  active          boolean not null default true,
  weight          integer not null default 1,
  last_picked_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists house_tracks_active_genre
  on house_tracks (active, genre, last_picked_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- external_api_cache + api_circuit_breakers: cache persistente y protección
-- cuando iTunes/Last.fm/YouTube rate-limitan o fallan.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists external_api_cache (
  namespace   text not null,
  cache_key   text not null,
  status      integer not null,
  data        jsonb not null,
  expires_at  timestamptz not null,
  updated_at  timestamptz not null default now(),
  primary key (namespace, cache_key)
);

create index if not exists external_api_cache_exp
  on external_api_cache (namespace, expires_at);

create table if not exists api_circuit_breakers (
  namespace    text primary key,
  blocked_until timestamptz not null,
  reason       text,
  updated_at   timestamptz not null default now()
);
