-- Financial Planner — initial schema
-- Every table is protected by Row Level Security: a user can only ever
-- read or write rows where user_id = auth.uid().

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Settings (one row per user)
-- ---------------------------------------------------------------------------
create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  cdi_annual_rate numeric(6, 3) not null default 14.900 check (cdi_annual_rate >= 0 and cdi_annual_rate <= 100),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Income and expenses (fixed monthly or one-time)
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  recurrence text not null check (recurrence in ('fixed', 'one_time')),
  description text not null check (char_length(description) between 1 and 120),
  category text check (category is null or char_length(category) <= 60),
  amount numeric(14, 2) not null check (amount > 0 and amount < 1000000000),
  -- one_time: the day it happens. fixed: first month it applies (day 1).
  date date not null,
  -- fixed only: last month it applies (null = no end).
  end_date date,
  created_at timestamptz not null default now(),
  constraint end_after_start check (end_date is null or end_date >= date),
  constraint end_only_fixed check (recurrence = 'fixed' or end_date is null)
);
create index transactions_user_date_idx on public.transactions (user_id, date);

-- ---------------------------------------------------------------------------
-- Goals (e.g. "Carro")
-- ---------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  target_amount numeric(14, 2) not null check (target_amount > 0 and target_amount < 1000000000),
  target_date date,
  monthly_contribution numeric(14, 2) not null default 0 check (monthly_contribution >= 0 and monthly_contribution < 1000000000),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

-- ---------------------------------------------------------------------------
-- Places where money is kept (accounts, CDBs, stocks, ...)
-- ---------------------------------------------------------------------------
create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  institution text check (institution is null or char_length(institution) <= 80),
  type text not null check (type in ('cash', 'fixed_income', 'stocks', 'other')),
  -- e.g. 105 means 105% of CDI. Null when not CDI-indexed.
  cdi_percent numeric(6, 2) check (cdi_percent is null or (cdi_percent >= 0 and cdi_percent <= 1000)),
  goal_id uuid,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  -- The linked goal must belong to the same user.
  constraint investments_goal_fk foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete set null (goal_id)
);

-- Balance history: one value per place per day.
create table public.balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  investment_id uuid not null,
  date date not null default current_date,
  amount numeric(14, 2) not null check (amount >= 0 and amount < 1000000000),
  created_at timestamptz not null default now(),
  unique (user_id, investment_id, date),
  -- The investment must belong to the same user.
  constraint snapshots_investment_fk foreign key (investment_id, user_id)
    references public.investments (id, user_id) on delete cascade
);
create index balance_snapshots_user_date_idx on public.balance_snapshots (user_id, date);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['user_settings', 'transactions', 'goals', 'investments', 'balance_snapshots'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format($p$create policy "own rows: select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "own rows: insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "own rows: update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "own rows: delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)$p$, t);
  end loop;
end $$;

-- If the user has enrolled MFA, require an aal2 session to touch data.
-- (Users without MFA keep working with aal1.)
do $$
declare t text;
begin
  foreach t in array array['user_settings', 'transactions', 'goals', 'investments', 'balance_snapshots'] loop
    execute format($p$
      create policy "require mfa when enrolled" on public.%I as restrictive to authenticated
      using (
        (select auth.jwt() ->> 'aal') = 'aal2'
        or not exists (select 1 from auth.mfa_factors f where f.user_id = (select auth.uid()) and f.status = 'verified')
      )
      with check (
        (select auth.jwt() ->> 'aal') = 'aal2'
        or not exists (select 1 from auth.mfa_factors f where f.user_id = (select auth.uid()) and f.status = 'verified')
      )$p$, t);
  end loop;
end $$;

-- Keep updated_at fresh on settings
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger user_settings_touch before update on public.user_settings
for each row execute function public.touch_updated_at();
