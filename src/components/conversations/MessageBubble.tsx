import { Bot, Headset, User } from 'lucide-react'
import type { Message } from '@/entities'
import { cn } from '@/lib/utils'

export function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex items-start gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-brand-text-secondary">
          <User className="size-4" />
        </div>
        <div className="max-w-[70%] rounded-2xl rounded-tl-md bg-muted px-4 py-2.5 text-sm text-brand-navy">
          {message.content}
        </div>
      </div>
    )
  }

  const isOperator = message.role === 'operator'

  return (
    <div className="flex items-start justify-end gap-2.5">
      <div
        className={cn(
          'max-w-[70%] rounded-2xl rounded-tr-md px-4 py-2.5 text-sm text-white',
          isOperator ? 'bg-amber-500' : 'bg-linear-to-r from-violet-600 to-violet-800'
        )}
      >
        {message.content}
      </div>
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full text-white',
          isOperator ? 'bg-amber-500' : 'bg-violet-600'
        )}
      >
        {isOperator ? <Headset className="size-4" /> : <Bot className="size-4" />}
      </div>
    </div>
  )
}
