import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Headset, Search, Send } from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { ChatbotRepo, ConversationRepo, MessageRepo } from '@/entities'
import { supabase } from '@/lib/supabase'
import { DashboardLayout } from '@/components/DashboardLayout'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageBubble } from '@/components/conversations/MessageBubble'
import { cn } from '@/lib/utils'

function initials(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Conversations() {
  const { orgId } = useOrg()
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', orgId],
    queryFn: () => ConversationRepo.list(orgId!, { sort: '-created_date' }),
    enabled: !!orgId,
  })

  const { data: chatbots = [] } = useQuery({
    queryKey: ['chatbots', orgId],
    queryFn: () => ChatbotRepo.list(orgId!),
    enabled: !!orgId,
  })

  const chatbotNames = useMemo(() => {
    const map: Record<string, string> = {}
    chatbots.forEach((bot) => {
      map[bot.id] = bot.name
    })
    return map
  }, [chatbots])

  // On mobile, only one pane (list or messages) shows at a time, so
  // auto-opening the first conversation would skip straight past the list —
  // this only runs at desktop widths (matches the `lg:` breakpoint the two
  // panes themselves use below), where both panes are visible together.
  useEffect(() => {
    if (selectedId || conversations.length === 0) return
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setSelectedId(conversations[0].id)
    }
  }, [conversations, selectedId])

  // Realtime inbox: RLS on `conversations`/`messages` still applies to
  // postgres_changes payloads, so this only ever fires for rows this org can
  // already see. Invalidating react-query's cache (rather than splicing the
  // raw payload into state) keeps a single source of truth for shaping/
  // sorting instead of duplicating that logic here.
  useEffect(() => {
    if (!orgId) return

    const channel = supabase
      .channel(`inbox-${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `org_id=eq.${orgId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations', orgId] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `org_id=eq.${orgId}` },
        (payload) => {
          const changedConversationId =
            (payload.new as { conversation_id?: string } | null)?.conversation_id ??
            (payload.old as { conversation_id?: string } | null)?.conversation_id
          if (changedConversationId) {
            queryClient.invalidateQueries({ queryKey: ['messages', orgId, changedConversationId] })
          }
          queryClient.invalidateQueries({ queryKey: ['conversations', orgId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId, queryClient])

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter(
      (c) =>
        (c.visitor_name || 'anonymous visitor').toLowerCase().includes(query) ||
        (chatbotNames[c.chatbot_id] || '').toLowerCase().includes(query)
    )
  }, [conversations, search, chatbotNames])

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', orgId, selectedId],
    queryFn: () => MessageRepo.filter(orgId!, { conversation_id: selectedId! }, { sort: 'created_date' }),
    enabled: !!orgId && !!selectedId,
  })

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation || !orgId) return
      await MessageRepo.create(orgId, {
        conversation_id: selectedConversation.id,
        role: 'operator',
        content: draft.trim(),
      })
      if (selectedConversation.status === 'ai') {
        await ConversationRepo.update(orgId, selectedConversation.id, { status: 'human' })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', orgId, selectedId] })
      queryClient.invalidateQueries({ queryKey: ['conversations', orgId] })
      setDraft('')
    },
  })

  const backToAIMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation || !orgId) return
      await ConversationRepo.update(orgId, selectedConversation.id, { status: 'ai' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', orgId] })
    },
  })

  function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim() || !selectedConversation) return
    sendMutation.mutate()
  }

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">Conversations</h1>

      {conversationsLoading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner />
        </div>
      ) : conversations.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white py-20 text-center text-sm text-brand-text-secondary">
          No conversations yet. They'll show up here once visitors start chatting.
        </div>
      ) : (
        <div className="flex h-[calc(100vh-12rem)] gap-4">
          <div
            className={cn(
              'w-full shrink-0 flex-col rounded-2xl border border-border bg-white lg:flex lg:max-w-xs',
              selectedId ? 'hidden' : 'flex'
            )}
          >
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-text-secondary" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                    conv.id === selectedId ? 'bg-violet-50' : 'hover:bg-slate-50'
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-violet-100 text-xs text-violet-700">
                        {initials(conv.visitor_name || 'Visitor')}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unread && (
                      <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-violet-600 ring-2 ring-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-brand-navy">
                        {conv.visitor_name || 'Anonymous visitor'}
                      </p>
                      {conv.status === 'human' && <Headset className="size-3.5 shrink-0 text-amber-500" />}
                    </div>
                    <p className="truncate text-xs text-brand-text-secondary">
                      {chatbotNames[conv.chatbot_id] || 'Unknown bot'}
                    </p>
                  </div>
                </button>
              ))}
              {filteredConversations.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-brand-text-secondary">No matches.</p>
              )}
            </div>
          </div>

          <div
            className={cn(
              'flex-1 flex-col rounded-2xl border border-border bg-white lg:flex',
              selectedId ? 'flex' : 'hidden lg:flex'
            )}
          >
            {!selectedConversation ? (
              <div className="flex flex-1 items-center justify-center text-sm text-brand-text-secondary">
                Select a conversation to view messages.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      onClick={() => setSelectedId(null)}
                      aria-label="Back to conversations"
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-brand-text-secondary hover:bg-slate-100 lg:hidden"
                    >
                      <ArrowLeft className="size-4" />
                    </button>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-brand-navy">
                        {selectedConversation.visitor_name || 'Anonymous visitor'}
                      </p>
                      <p className="text-sm text-brand-text-secondary">
                        {selectedConversation.status === 'human'
                          ? '👤 Managed by you'
                          : selectedConversation.status === 'closed'
                            ? 'Closed'
                            : '🤖 Managed by AI'}
                      </p>
                    </div>
                  </div>
                  {selectedConversation.status === 'human' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => backToAIMutation.mutate()}
                      disabled={backToAIMutation.isPending}
                    >
                      Return to AI
                    </Button>
                  )}
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  {messagesLoading ? (
                    <div className="flex justify-center py-10">
                      <LoadingSpinner />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="py-10 text-center text-sm text-brand-text-secondary">No messages yet.</p>
                  ) : (
                    messages.map((message) => <MessageBubble key={message.id} message={message} />)
                  )}
                </div>

                <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Reply as operator…"
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!draft.trim() || sendMutation.isPending}>
                    <Send className="size-4" />
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
