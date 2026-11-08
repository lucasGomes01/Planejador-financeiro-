-- How a goal receives money every month:
--   'fixed'   → goals.monthly_contribution
--   'surplus' → (income − fixed and one-time expenses) of each month × surplus_percent
alter table public.goals
  add column contribution_mode text not null default 'fixed' check (contribution_mode in ('fixed', 'surplus')),
  add column surplus_percent numeric(5, 2) not null default 100 check (surplus_percent >= 0 and surplus_percent <= 100);
