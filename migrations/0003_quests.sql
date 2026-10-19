create table if not exists quest_user (
  wallet text primary key,
  user_id text,
  discord_id text,
  discord_name text,
  x_handle text,
  ig_handle text,
  points integer not null default 0,
  spins integer not null default 0,
  streak integer not null default 0,
  last_checkin text,
  referred_by text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create unique index if not exists quest_discord on quest_user (discord_id) where discord_id is not null;
create unique index if not exists quest_x on quest_user (x_handle) where x_handle is not null;
create unique index if not exists quest_ig on quest_user (ig_handle) where ig_handle is not null;

create table if not exists quest_completion (
  id text primary key,
  wallet text not null,
  quest_id text not null,
  status text not null,
  points integer not null default 0,
  day text not null,
  note text,
  sample integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists quest_completion_wallet on quest_completion (wallet, quest_id, day);
create index if not exists quest_completion_status on quest_completion (status, created_at);

create table if not exists quest_nonce (
  wallet text primary key,
  nonce text not null,
  answer integer not null,
  exp timestamptz not null
);

create table if not exists quest_config (
  id text primary key,
  href text,
  paused integer not null default 0
);

insert into quest_config (id, href, paused) values
  ('x-follow', 'https://x.com/DinoDragRace', 0),
  ('x-like', '', 0),
  ('x-rt', '', 0),
  ('ig-follow', 'https://instagram.com/dinodragrace', 0),
  ('ig-like', '', 0),
  ('ig-comment', '', 0)
on conflict (id) do nothing;
