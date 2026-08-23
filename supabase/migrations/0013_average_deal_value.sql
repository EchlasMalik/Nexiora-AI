-- Nexiora AI — ROI dashboard: average deal value
--
-- Drives the dashboard's "estimated pipeline" figure (appointments booked
-- this month x this value). Defaults to 0 rather than a guessed number —
-- the dashboard shows a "set this up" prompt instead of a fabricated £0
-- pipeline until an owner actually sets a real value for their business.

alter table public.orgs
  add column average_deal_value numeric not null default 0;
