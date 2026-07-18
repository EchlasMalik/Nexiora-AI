import { Link } from 'react-router-dom'
import { Bot, Plus } from 'lucide-react'
import type { Chatbot } from '@/entities'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const statusStyles: Record<Chatbot['status'], string> = {
  active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700',
  draft: 'bg-slate-100 text-slate-600',
}

export function ChatbotsList({ chatbots }: { chatbots: Chatbot[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Chatbots</CardTitle>
      </CardHeader>
      <CardContent>
        {chatbots.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Bot className="size-5" />
            </div>
            <p className="max-w-xs text-sm text-brand-text-secondary">You haven't created a chatbot yet.</p>
            <Link to="/dashboard/chatbots">
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" />
                Create chatbot
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {chatbots.map((bot) => (
              <Link
                key={bot.id}
                to={`/dashboard/chatbots/${bot.id}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50"
              >
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: bot.theme_color || '#7C3AED' }}
                >
                  <Bot className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-navy">{bot.name}</p>
                  <p className="truncate text-xs text-brand-text-secondary">
                    {bot.company_name || 'No company set'}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[bot.status]}`}
                >
                  {bot.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
