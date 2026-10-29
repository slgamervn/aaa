create policy gamevault_submissions_deny_public_access
  on public.gamevault_submissions
  for all to anon, authenticated
  using (false)
  with check (false);

create policy gamevault_submission_events_deny_public_access
  on public.gamevault_submission_events
  for all to anon, authenticated
  using (false)
  with check (false);

create policy gamevault_rate_limits_deny_public_access
  on public.gamevault_rate_limits
  for all to anon, authenticated
  using (false)
  with check (false);
