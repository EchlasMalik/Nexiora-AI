import type { Chatbot } from '@/entities'
import { ChatWidget } from '@/components/ChatWidget'

export function LivePreviewTab({ chatbot }: { chatbot: Chatbot }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="max-w-md text-center text-sm text-brand-text-secondary">
        This is exactly what visitors will see and interact with once {chatbot.name} is live on your site.
      </p>
      <div className="h-[560px] w-full max-w-sm">
        <ChatWidget chatbot={chatbot} variant="full" />
      </div>
    </div>
  )
}
