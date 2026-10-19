insert into quest_config (id, href, paused) values
  ('wallet', '', 0),
  ('discord-join', '', 0),
  ('discord-role', '', 0),
  ('x-follow', 'https://x.com/DinoDragRace', 0),
  ('x-like', '', 0),
  ('x-rt', '', 0),
  ('ig-follow', 'https://instagram.com/dinodragrace', 0),
  ('ig-like', '', 0),
  ('ig-comment', '', 0),
  ('checkin', '', 0),
  ('race', '', 0),
  ('win', '', 0),
  ('referral', '', 0)
on conflict (id) do nothing;
