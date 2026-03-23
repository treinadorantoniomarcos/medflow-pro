create table if not exists public.platform_settings (
  id integer primary key default 1,
  checkout_url text,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id)
values (1)
on conflict (id) do nothing;

create or replace function public.set_platform_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists platform_settings_set_updated_at on public.platform_settings;
create trigger platform_settings_set_updated_at
before update on public.platform_settings
for each row
execute function public.set_platform_settings_updated_at();

alter table public.platform_settings enable row level security;

drop policy if exists "super admin can read platform settings" on public.platform_settings;
create policy "super admin can read platform settings"
on public.platform_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'super_admin'
  )
);

drop policy if exists "super admin can manage platform settings" on public.platform_settings;
create policy "super admin can manage platform settings"
on public.platform_settings
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'super_admin'
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'super_admin'
  )
);
