alter table public.gamevault_submissions
  drop constraint if exists gamevault_submissions_status_check;

alter table public.gamevault_submissions
  add constraint gamevault_submissions_status_check
  check (status in (
    'pending_review',
    'approved',
    'rejected',
    'publishing',
    'unpublishing',
    'publish_failed',
    'published',
    'scan_failed'
  ));

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
    'unpublished'
  ));
