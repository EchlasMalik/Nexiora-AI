-- Nexiora AI — index the actual lookup pattern used by public-chat
--
-- findOrCreateConversation looks up a conversation by (chatbot_id,
-- visitor_id) on every single widget message. Only chatbot_id was indexed
-- before — fine at low row counts, but a popular chatbot accumulating
-- thousands of distinct visitor conversations would force a partial scan
-- to find the right one. This is the composite index that query actually
-- wants.

create index conversations_chatbot_id_visitor_id_idx on public.conversations(chatbot_id, visitor_id);
