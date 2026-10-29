create or replace function public.gamevault_review_submission(
  p_submission_id uuid,
  p_action text,
  p_actor_email text,
  p_note text default null
) returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_submission public.gamevault_submissions%rowtype;
  v_action text;
  v_note text;
begin
  if p_action is null or p_action not in ('approve', 'reject') then
    raise exception using errcode = '22023', message = 'INVALID_REVIEW_ACTION';
  end if;
  if p_actor_email is null or char_length(btrim(p_actor_email)) < 3 then
    raise exception using errcode = '22023', message = 'REVIEWER_REQUIRED';
  end if;

  v_action := case when p_action = 'approve' then 'approved' else 'rejected' end;
  v_note := nullif(left(btrim(coalesce(p_note, '')), 1000), '');

  update public.gamevault_submissions
  set status = v_action,
      reviewed_at = now(),
      reviewed_by = left(lower(btrim(p_actor_email)), 320),
      review_note = v_note,
      updated_at = now()
  where id = p_submission_id
    and (
      (p_action = 'approve' and status = 'pending_review')
      or (p_action = 'reject' and status in ('pending_review', 'scan_failed'))
    )
  returning * into v_submission;

  if not found then
    raise exception using errcode = 'P0001', message = 'SUBMISSION_NOT_PENDING';
  end if;

  insert into public.gamevault_submission_events
    (submission_id, action, actor_email, note, details)
  values
    (v_submission.id, v_action, left(lower(btrim(p_actor_email)), 320), v_note,
      jsonb_build_object('new_status', v_submission.status, 'scan_version', v_submission.scan_version));

  return to_jsonb(v_submission);
end;
$$;

revoke all on function public.gamevault_review_submission(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.gamevault_review_submission(uuid, text, text, text) to service_role;
