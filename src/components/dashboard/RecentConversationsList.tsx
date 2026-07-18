import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import type { Conversation } from '@/entities'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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

const statusLabels: Record<Conversation['status'], string> = {
  ai: 'AI handling',
  human: 'Human handling',
  closed: 'Closed',
}

export function RecentConversationsList({ conversations }: { conversations: Conversation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Conversations</CardTitle>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <MessageSquare className="size-5" />
            </div>
            <p className="max-w-xs text-sm text-brand-text-secondary">No conversations yet.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <Link
                key={conversation.id}
                to="/dashboard/conversations"
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50"
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="bg-linear-to-br from-violet-500 to-violet-800 text-xs text-white">
                    {initials(conversation.visitor_name || 'Visitor')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-navy">
                    {conversation.visitor_name || 'Anonymous visitor'}
                  </p>
                  <p className="truncate text-xs text-brand-text-secondary">{statusLabels[conversation.status]}</p>
                </div>
                {conversation.unread && <span className="size-2 shrink-0 rounded-full bg-violet-600" />}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
