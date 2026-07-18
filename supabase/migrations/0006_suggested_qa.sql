-- Nexiora AI — suggested questions gain fixed answers (Phase: Polish)
--
-- `suggested_questions` was a plain text[] of chat-starter prompts; clicking
-- one just sent it through the AI like any other message. This converts it
-- to jsonb so each question can carry its own fixed answer, shown instantly
-- without a Claude round trip when one is set. Existing questions are
-- preserved with an empty answer — visitors just weren't collected yet.
--
-- Done as add/backfill/swap rather than a single `ALTER COLUMN ... USING`
-- because Postgres doesn't allow a subquery inside a column-type transform
-- expression.

alter table public.chatbots
  add column suggested_questions_new jsonb not null default '[]'::jsonb;

update public.chatbots
set suggested_questions_new = coalesce(
  (
    select jsonb_agg(jsonb_build_object('question', q, 'answer', ''))
    from unnest(suggested_questions) as q
  ),
  '[]'::jsonb
);

alter table public.chatbots drop column suggested_questions;
alter table public.chatbots rename column suggested_questions_new to suggested_questions;
