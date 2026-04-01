create or replace function public.get_my_subscription_access_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _tenant_id uuid := public.get_user_tenant_id(auth.uid());
  _settings jsonb;
  _subscription jsonb;
  _status text;
  _grace_until timestamptz;
  _current_period_end timestamptz;
  _now timestamptz := now();
begin
  if _tenant_id is null then
    return jsonb_build_object(
      'status', 'canceled',
      'expired_trial', false,
      'blocked', true,
      'current_period_end', null,
      'grace_until', null
    );
  end if;

  select coalesce(settings, '{}'::jsonb)
    into _settings
    from public.clinics
    where id = _tenant_id
    limit 1;

  if not found then
    return jsonb_build_object(
      'status', 'canceled',
      'expired_trial', false,
      'blocked', true,
      'current_period_end', null,
      'grace_until', null
    );
  end if;

  _subscription := coalesce(_settings->'subscription', '{}'::jsonb);
  _status := coalesce(_subscription->>'status', 'trialing');
  _grace_until := nullif(_subscription->>'grace_until', '')::timestamptz;
  _current_period_end := nullif(_subscription->>'current_period_end', '')::timestamptz;

  return jsonb_build_object(
    'status', _status,
    'expired_trial', (_status = 'trialing' and (_current_period_end is null or _current_period_end < _now)),
    'blocked', (
      _status = 'paused'
      or _status = 'canceled'
      or (_status = 'past_due' and _grace_until is not null and _grace_until < _now)
    ),
    'current_period_end', case
      when _current_period_end is null then null
      else _current_period_end::text
    end,
    'grace_until', case
      when _grace_until is null then null
      else _grace_until::text
    end
  );
end;
$$;

revoke all on function public.get_my_subscription_access_state() from public;
grant execute on function public.get_my_subscription_access_state() to authenticated;
