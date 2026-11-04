-- 1) Tiered CDI yield: e.g. 120% of CDI up to R$ 10.000, then 100% (or 0%).
alter table public.investments
  add column cdi_limit numeric(14, 2) check (cdi_limit is null or (cdi_limit > 0 and cdi_limit < 1000000000)),
  add column cdi_percent_above numeric(6, 2) default 100
    check (cdi_percent_above is null or (cdi_percent_above >= 0 and cdi_percent_above <= 1000));

-- 2) One-time income can be earmarked for a goal (e.g. "Carro").
alter table public.transactions
  add column goal_id uuid,
  add constraint transactions_goal_fk foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete set null (goal_id),
  add constraint goal_only_one_time_income
    check (goal_id is null or (kind = 'income' and recurrence = 'one_time'));
