create table if not exists player_save (
  user_id text primary key,
  payload text not null,
  updated_at timestamptz not null default now()
);
