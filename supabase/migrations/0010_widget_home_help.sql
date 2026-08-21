-- Nexiora AI — widget Home/Help redesign
--
-- Adds the fields the new tabbed widget needs: a brand logo distinct from
-- the small circular avatar_url, a list of custom external links for the
-- Home tab, and a separate static FAQ list for the Help tab (deliberately
-- not reusing suggested_questions, which are tappable chat-starter prompts
-- shown in Messages, not a reference list).

alter table public.chatbots
  add column logo_url text not null default '',
  add column links jsonb not null default '[]'::jsonb,
  add column faqs jsonb not null default '[]'::jsonb;
