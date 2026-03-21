alter table public.profiles
add column if not exists tutorial_state jsonb not null default '{}'::jsonb;

comment on column public.profiles.tutorial_state is
'Persiste o estado dos tutoriais contextuais por usuario.';

