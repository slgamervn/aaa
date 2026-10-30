alter table public.gamevault_submissions
  add column if not exists orientation text not null default 'auto';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gamevault_submissions_orientation_check'
      and conrelid = 'public.gamevault_submissions'::regclass
  ) then
    alter table public.gamevault_submissions
      add constraint gamevault_submissions_orientation_check
      check (orientation in ('auto', 'landscape', 'portrait'));
  end if;
end;
$$;

alter table public.gamevault_submission_events
  drop constraint if exists gamevault_submission_events_action_check;

alter table public.gamevault_submission_events
  add constraint gamevault_submission_events_action_check
  check (action in (
    'submitted',
    'scan_failed',
    'approved',
    'rejected',
    'publish_started',
    'publish_failed',
    'published',
    'unpublished',
    'orientation_updated'
  ));
