-- Esquema inicial del Mapa de Inundaciones de Tigre.
-- Borrador local: revisar antes de aplicar a un proyecto Supabase.
-- Los datos ficticios de src/data/ no se insertan en esta migración.

create table public.reviewers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.citizen_reports (
  id uuid primary key default gen_random_uuid(),
  locality text not null check (char_length(trim(locality)) between 1 and 120),
  location_label text not null check (char_length(trim(location_label)) between 1 and 200),
  latitude double precision,
  longitude double precision,
  incident_type text not null check (incident_type in ('street_flooding', 'standing_water', 'fallen_tree', 'other')),
  severity text not null default 'unknown' check (severity in ('unknown', 'low', 'moderate', 'high')),
  description text check (description is null or char_length(description) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'in_review', 'verified', 'rejected')),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.reviewers (user_id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint citizen_reports_coordinates_pair check ((latitude is null) = (longitude is null)),
  constraint citizen_reports_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint citizen_reports_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint citizen_reports_review_metadata check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null and review_note is null)
    or
    (status <> 'pending' and reviewed_at is not null and reviewed_by is not null)
  ),
  constraint citizen_reports_rejection_reason check (status <> 'rejected' or review_note is not null)
);

-- Dataset sintético del práctico; separado de los antecedentes verificados.
create table public.puntos_demo (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 120),
  locality text not null check (char_length(trim(locality)) between 1 and 120),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  category text not null check (category in ('low', 'moderate', 'high')),
  value integer not null check (value between 0 and 100),
  event_date date not null,
  description text not null check (char_length(description) <= 300),
  is_demo boolean not null default true check (is_demo),
  source text not null default 'dataset_sintetico_poc' check (source = 'dataset_sintetico_poc'),
  created_at timestamptz not null default now()
);

create table public.flood_events (
  id uuid primary key default gen_random_uuid(),
  locality text not null check (char_length(trim(locality)) between 1 and 120),
  location_label text,
  latitude double precision,
  longitude double precision,
  occurred_at date,
  incident_type text not null check (incident_type in ('river_flood', 'urban_flood', 'standing_water', 'other')),
  severity text not null default 'unknown' check (severity in ('unknown', 'low', 'moderate', 'high')),
  severity_basis text,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  verified_by uuid references public.reviewers (user_id) on delete restrict,
  is_published boolean not null default false,
  review_note text,
  origin_report_id uuid unique references public.citizen_reports (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flood_events_coordinates_pair check ((latitude is null) = (longitude is null)),
  constraint flood_events_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint flood_events_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint flood_events_verified_metadata check (
    (verification_status = 'verified' and verified_at is not null and verified_by is not null)
    or
    (verification_status <> 'verified' and verified_at is null and verified_by is null)
  ),
  constraint flood_events_publish_only_verified check (not is_published or verification_status = 'verified')
);

create table public.event_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.flood_events (id) on delete cascade,
  source_title text not null check (char_length(trim(source_title)) between 1 and 300),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  publisher_key text not null check (char_length(trim(publisher_key)) between 1 and 160),
  source_type text not null check (source_type in ('official', 'academic', 'media', 'other')),
  published_at date,
  retrieved_at timestamptz not null default now(),
  citation_note text check (citation_note is null or char_length(citation_note) <= 1000),
  created_at timestamptz not null default now()
);

create index citizen_reports_status_created_idx on public.citizen_reports (status, created_at desc);
create index puntos_demo_locality_idx on public.puntos_demo (locality);
create index puntos_demo_category_idx on public.puntos_demo (category);
create index flood_events_public_date_idx on public.flood_events (occurred_at desc)
  where verification_status = 'verified' and is_published;
create index flood_events_locality_idx on public.flood_events (locality);
create index event_sources_event_id_idx on public.event_sources (event_id);

alter table public.reviewers enable row level security;
alter table public.citizen_reports enable row level security;
alter table public.puntos_demo enable row level security;
alter table public.flood_events enable row level security;
alter table public.event_sources enable row level security;

create policy "reviewers can read own reviewer record"
  on public.reviewers for select to authenticated
  using (user_id = (select auth.uid()));

create policy "reviewers can read citizen reports"
  on public.citizen_reports for select to authenticated
  using (exists (
    select 1 from public.reviewers r where r.user_id = (select auth.uid())
  ));

create policy "reviewers can update citizen reports"
  on public.citizen_reports for update to authenticated
  using (exists (
    select 1 from public.reviewers r where r.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.reviewers r where r.user_id = (select auth.uid())
  ));

create policy "reviewers can manage flood events"
  on public.flood_events for all to authenticated
  using (exists (
    select 1 from public.reviewers r where r.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.reviewers r where r.user_id = (select auth.uid())
  ));

create policy "reviewers can manage event sources"
  on public.event_sources for all to authenticated
  using (exists (
    select 1 from public.reviewers r where r.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.reviewers r where r.user_id = (select auth.uid())
  ));

-- A public submission can create only a pending report and cannot set review fields.
create policy "visitors can submit pending reports"
  on public.citizen_reports for insert to anon, authenticated
  with check (
    status = 'pending'
    and review_note is null
    and reviewed_at is null
    and reviewed_by is null
  );

-- Visitors read only these allowlisted columns and rows. The view intentionally
-- omits reviewer IDs, internal notes, and citizen-report linkage.
create view public.map_flood_events with (security_barrier = true) as
select
  id,
  locality,
  location_label,
  latitude,
  longitude,
  occurred_at,
  incident_type,
  severity,
  severity_basis
from public.flood_events
where verification_status = 'verified' and is_published;

-- View pública permitida para la PoC académica. Solo expone filas sintéticas.
create view public.map_demo_points with (security_barrier = true) as
select
  id,
  name,
  locality,
  latitude,
  longitude,
  category,
  value,
  event_date,
  description,
  is_demo,
  source
from public.puntos_demo
where is_demo;

create view public.map_event_sources with (security_barrier = true) as
select
  s.id,
  s.event_id,
  s.source_title,
  s.source_url,
  s.source_type,
  s.published_at,
  s.retrieved_at
from public.event_sources s
join public.flood_events e on e.id = s.event_id
where e.verification_status = 'verified' and e.is_published;

-- Views are owned by the migration role; clients do not receive direct SELECT
-- on the underlying tables, so internal fields cannot be queried through PostgREST.
revoke all on public.reviewers, public.citizen_reports, public.puntos_demo, public.flood_events, public.event_sources
  from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.reviewers to authenticated;
grant select, update on public.citizen_reports to authenticated;
grant insert (locality, location_label, latitude, longitude, incident_type, severity, description)
  on public.citizen_reports to anon, authenticated;
grant select, insert, update, delete on public.flood_events to authenticated;
grant select, insert, update, delete on public.event_sources to authenticated;
grant select on public.map_demo_points, public.map_flood_events, public.map_event_sources to anon, authenticated;

create or replace function public.set_flood_event_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger flood_events_set_updated_at
  before update on public.flood_events
  for each row execute function public.set_flood_event_updated_at();

create or replace function public.enforce_event_verification_evidence()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  has_official_source boolean;
  independent_publishers integer;
begin
  if new.verification_status = 'verified' then
    if new.verified_by is null then
      raise exception 'A verified event must identify its reviewer';
    end if;

    select exists (
      select 1 from public.event_sources s
      where s.event_id = new.id and s.source_type = 'official'
    ) into has_official_source;

    select count(distinct s.publisher_key)::integer
      into independent_publishers
      from public.event_sources s
      where s.event_id = new.id;

    if not has_official_source and independent_publishers < 2 then
      raise exception 'Verification requires an official source or two independent publishers';
    end if;

    new.verified_at := coalesce(new.verified_at, now());
  else
    new.verified_at := null;
    new.verified_by := null;
    new.is_published := false;
  end if;

  return new;
end;
$$;

create trigger flood_events_require_evidence
  before insert or update of verification_status, verified_by
  on public.flood_events
  for each row execute function public.enforce_event_verification_evidence();

create or replace function public.protect_verified_event_sources()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  linked_event_id uuid;
begin
  linked_event_id := old.event_id;
  if exists (
    select 1 from public.flood_events e
    where e.id = linked_event_id and e.verification_status = 'verified'
  ) then
    raise exception 'Unverify the event before changing or removing its evidence';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger event_sources_protect_verified_evidence
  before update or delete on public.event_sources
  for each row execute function public.protect_verified_event_sources();

revoke all on function public.set_flood_event_updated_at() from public, anon, authenticated;
revoke all on function public.enforce_event_verification_evidence() from public, anon, authenticated;
revoke all on function public.protect_verified_event_sources() from public, anon, authenticated;

comment on table public.citizen_reports is
  'Submissions unverified; no se publican ni se leen desde el cliente anónimo.';
comment on table public.puntos_demo is
  'Dataset sintético importado para la PoC; no son eventos ni mediciones reales.';
comment on table public.flood_events is
  'Eventos revisados; el mapa público accede mediante map_flood_events.';
comment on table public.event_sources is
  'Fuentes de evidencia asociadas a cada evento.';
