import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, ArrowRight } from 'lucide-react'
import type { Chatbot } from '@/entities'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const statusStyles: Record<Chatbot['status'], string> = {
  active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700',
  draft: 'bg-slate-100 text-slate-600',
}

export function ChatbotCard({ chatbot }: { chatbot: Chatbot }) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="group h-full">
      <Link to={`/dashboard/chatbots/${chatbot.id}`} className="block h-full">
        <Card className="h-full transition-shadow group-hover:shadow-md">
          <CardContent className="flex h-full flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: chatbot.theme_color || '#7C3AED' }}
              >
                <Bot className="size-5" />
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                  statusStyles[chatbot.status]
                )}
              >
                {chatbot.status}
              </span>
            </div>

            <div className="flex-1">
              <p className="truncate font-semibold text-brand-navy">{chatbot.name}</p>
              <p className="mt-1 line-clamp-2 text-sm text-brand-text-secondary">
                {chatbot.business_description || 'No description yet.'}
              </p>
            </div>

            <div className="flex h-5 items-center justify-end text-sm font-medium text-violet-600 opacity-0 transition-opacity group-hover:opacity-100">
              Manage <ArrowRight className="ml-1 size-3.5" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
