create table if not exists public.gamevault_submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  kind text not null check (kind in ('html', 'url')),
  source_url text,
  storage_path text unique,
  original_filename text,
  file_size bigint not null default 0 check (file_size between 0 and 1000000),
  content_sha256 text,
  scan_verdict text not null default 'NEEDS_REVIEW' check (scan_verdict in ('NEEDS_REVIEW', 'WARNING', 'BLOCKED')),
  scan_score integer not null default 0 check (scan_score between 0 and 100),
  scan_findings jsonb not null default '[]'::jsonb check (jsonb_typeof(scan_findings) = 'array'),
  scan_version text not null default 'gv-static-1',
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected', 'publishing', 'publish_failed', 'published', 'scan_failed')),
  rights_confirmed boolean not null default false,
  request_fingerprint text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  published_at timestamptz,
  published_path text,
  published_commit_sha text,
  updated_at timestamptz not null default now(),
  constraint gamevault_submission_source_check check (
    (kind = 'html' and storage_path is not null and source_url is null) or
    (kind = 'url' and source_url is not null and storage_path is null)
  )
);

create index if not exists gamevault_submissions_status_submitted_idx
  on public.gamevault_submissions (status, submitted_at desc);
create index if not exists gamevault_submissions_fingerprint_submitted_idx
  on public.gamevault_submissions (request_fingerprint, submitted_at desc);

alter table public.gamevault_submissions enable row level security;
revoke all on table public.gamevault_submissions from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.gamevault_submissions to service_role;

create table if not exists public.gamevault_submission_events (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.gamevault_submissions(id) on delete cascade,
  action text not null check (action in ('submitted', 'scan_failed', 'approved', 'rejected', 'publish_started', 'publish_failed', 'published')),
  actor_email text,
  note text check (note is null or char_length(note) <= 1000),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists gamevault_submission_events_item_created_idx
  on public.gamevault_submission_events (submission_id, created_at desc);
alter table public.gamevault_submission_events enable row level security;
revoke all on table public.gamevault_submission_events from public, anon, authenticated;
grant select, insert, update, delete on table public.gamevault_submission_events to service_role;
grant usage, select on sequence public.gamevault_submission_events_id_seq to service_role;

create table if not exists public.gamevault_rate_limits (
  key_hash text primary key check (char_length(key_hash) = 64),
  window_started_at timestamptz not null default now(),
  hits integer not null default 0 check (hits >= 0),
  updated_at timestamptz not null default now()
);
create index if not exists gamevault_rate_limits_updated_idx
  on public.gamevault_rate_limits (updated_at);
alter table public.gamevault_rate_limits enable row level security;
revoke all on table public.gamevault_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.gamevault_rate_limits to service_role;

create or replace function public.gamevault_consume_rate_limit(
  p_key_hash text,
  p_max_hits integer default 6,
  p_window_seconds integer default 3600
) returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_allowed boolean;
begin
  if p_key_hash is null or char_length(p_key_hash) <> 64 or p_max_hits < 1 or p_window_seconds < 1 then
    return false;
  end if;

  insert into public.gamevault_rate_limits (key_hash, window_started_at, hits, updated_at)
  values (p_key_hash, now(), 1, now())
  on conflict (key_hash) do update
  set
    hits = case
      when public.gamevault_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else public.gamevault_rate_limits.hits + 1
    end,
    window_started_at = case
      when public.gamevault_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else public.gamevault_rate_limits.window_started_at
    end,
    updated_at = now()
  returning hits <= p_max_hits into v_allowed;

  delete from public.gamevault_rate_limits
    where updated_at < now() - interval '7 days';

  return v_allowed;
end;
$$;
revoke all on function public.gamevault_consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.gamevault_consume_rate_limit(text, integer, integer) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gamevault-quarantine', 'gamevault-quarantine', false, 1000000, array['text/html'])
on conflict (id) do update
set public = false, file_size_limit = 1000000, allowed_mime_types = array['text/html'];
