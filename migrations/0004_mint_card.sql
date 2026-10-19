alter table forged_nft add column if not exists name text not null default '';
alter table forged_nft add column if not exists rarity text not null default '';
alter table forged_nft add column if not exists model_id text not null default '';
alter table forged_nft add column if not exists driver_id text not null default '';
