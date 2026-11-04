-- Fix: "permission denied for table mfa_factors".
-- The authenticated role cannot read auth.mfa_factors directly, so the MFA
-- check runs inside a SECURITY DEFINER function in a private (non-API) schema.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      );
$$;

revoke all on function private.mfa_satisfied() from public, anon;
grant execute on function private.mfa_satisfied() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['user_settings', 'transactions', 'goals', 'investments', 'balance_snapshots'] loop
    execute format('drop policy if exists "require mfa when enrolled" on public.%I', t);
    execute format($p$
      create policy "require mfa when enrolled" on public.%I as restrictive to authenticated
      using ((select private.mfa_satisfied()))
      with check ((select private.mfa_satisfied()))$p$, t);
  end loop;
end $$;
