alter table public.gamevault_submissions
  add column if not exists genre text not null default 'other',
  add column if not exists description text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'gamevault_submissions_genre_check'
      and conrelid = 'public.gamevault_submissions'::regclass
  ) then
    alter table public.gamevault_submissions
      add constraint gamevault_submissions_genre_check
      check (genre in ('arcade', 'strategy', 'puzzle', 'action', 'simulation', 'educational', 'other'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'gamevault_submissions_description_check'
      and conrelid = 'public.gamevault_submissions'::regclass
  ) then
    alter table public.gamevault_submissions
      add constraint gamevault_submissions_description_check
      check (char_length(description) <= 240);
  end if;
end;
$$;
