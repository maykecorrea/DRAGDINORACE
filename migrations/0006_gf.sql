-- Garagem Falida. account_id é o id do login ("user"), não a conta do provedor.
-- Uma campanha active por conta: o índice parcial é quem garante.

create table if not exists gf_runs (
  id uuid primary key,
  account_id text not null references "user" (id) on delete cascade,
  status text not null check (status in ('active', 'ended')),
  seed bigint not null,
  engine_version text not null,
  content_version text not null,
  rev int not null default 0,
  week int not null default 0,
  day int not null default 1,
  state jsonb not null,
  ending text,
  score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);

create unique index if not exists gf_runs_one_active
  on gf_runs (account_id)
  where status = 'active';

create index if not exists gf_runs_account_idx on gf_runs (account_id, created_at desc);

create table if not exists gf_action_log (
  id uuid primary key,
  run_id uuid not null references gf_runs (id) on delete cascade,
  rev int not null,
  idempotency_key text not null,
  action jsonb not null,
  summary jsonb not null,
  created_at timestamptz not null default now(),
  unique (run_id, idempotency_key)
);

create table if not exists gf_lessons_seen (
  account_id text not null references "user" (id) on delete cascade,
  lesson_id text not null,
  first_seen_at timestamptz not null default now(),
  times int not null default 1,
  primary key (account_id, lesson_id)
);

create table if not exists gf_account_progress (
  account_id text primary key references "user" (id) on delete cascade,
  runs_started int not null default 0,
  runs_ended int not null default 0,
  bankruptcies int not null default 0,
  best_ending text,
  best_score int,
  max_level int not null default 0,
  scams_dodged int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists account_unlocks (
  account_id text not null references "user" (id) on delete cascade,
  source text not null,
  unlock_key text not null,
  granted_at timestamptz not null default now(),
  consumed_at timestamptz,
  payload jsonb,
  primary key (account_id, source, unlock_key)
);
