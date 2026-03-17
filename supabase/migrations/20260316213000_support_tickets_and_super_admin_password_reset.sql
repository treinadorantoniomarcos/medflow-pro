create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.clinics(id) on delete cascade,
  requester_id uuid not null,
  requester_name text not null,
  requester_email text,
  subject text not null,
  message text not null,
  status text not null default 'open',
  super_admin_response text,
  responded_by uuid,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_tenant_id_idx on public.support_tickets (tenant_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists support_tickets_created_at_idx on public.support_tickets (created_at desc);

create or replace function public.set_support_tickets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row
execute function public.set_support_tickets_updated_at();

alter table public.support_tickets enable row level security;

drop policy if exists "tenant members can read support tickets" on public.support_tickets;
create policy "tenant members can read support tickets"
on public.support_tickets
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.tenant_id = support_tickets.tenant_id
  )
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'super_admin'
  )
);

drop policy if exists "tenant members can create support tickets" on public.support_tickets;
create policy "tenant members can create support tickets"
on public.support_tickets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.tenant_id = support_tickets.tenant_id
      and ur.role in ('owner', 'admin', 'professional', 'receptionist')
  )
);

drop policy if exists "super admin can update support tickets" on public.support_tickets;
create policy "super admin can update support tickets"
on public.support_tickets
for update
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
