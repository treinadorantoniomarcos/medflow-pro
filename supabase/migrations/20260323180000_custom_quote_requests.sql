create table if not exists public.custom_quote_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  whatsapp text not null,
  address_full text not null,
  admin_count integer not null,
  professional_count integer not null,
  patient_volume text not null,
  desired_app_type text not null,
  additional_info text,
  source_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_quote_requests_created_at_idx
  on public.custom_quote_requests (created_at desc);

create index if not exists custom_quote_requests_status_idx
  on public.custom_quote_requests (status);

create or replace function public.set_custom_quote_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists custom_quote_requests_set_updated_at on public.custom_quote_requests;
create trigger custom_quote_requests_set_updated_at
before update on public.custom_quote_requests
for each row
execute function public.set_custom_quote_requests_updated_at();

alter table public.custom_quote_requests enable row level security;

drop policy if exists "public can create custom quote requests" on public.custom_quote_requests;
create policy "public can create custom quote requests"
on public.custom_quote_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "super admin can read custom quote requests" on public.custom_quote_requests;
create policy "super admin can read custom quote requests"
on public.custom_quote_requests
for select
to authenticated
using (public.has_role('super_admin'::app_role, auth.uid()));

drop policy if exists "super admin can update custom quote requests" on public.custom_quote_requests;
create policy "super admin can update custom quote requests"
on public.custom_quote_requests
for update
to authenticated
using (public.has_role('super_admin'::app_role, auth.uid()))
with check (public.has_role('super_admin'::app_role, auth.uid()));


