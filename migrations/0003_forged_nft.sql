create table if not exists forged_nft (
  id text primary key,
  user_id text not null,
  signature text not null unique,
  prompt text not null,
  image text not null,
  video text not null,
  created_at timestamptz not null default now()
);

create index if not exists forged_nft_user on forged_nft (user_id);
