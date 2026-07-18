-- Nexiora AI — Realtime dashboard inbox (Phase: Polish)
-- Adds conversations/messages to the supabase_realtime publication so the
-- dashboard inbox can subscribe to postgres_changes instead of polling.
-- Existing RLS policies (org membership) are enforced by Realtime the same
-- way they're enforced for normal reads — a client only receives change
-- events for rows it would already be allowed to select.

alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
