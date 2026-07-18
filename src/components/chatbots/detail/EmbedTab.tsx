import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import type { Chatbot } from '@/entities'
import { CodeBlock } from '@/components/CodeBlock'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export function EmbedTab({ chatbot }: { chatbot: Chatbot }) {
  const [idCopied, setIdCopied] = useState(false)
  const snippet = `<script src="${window.location.origin}/widget.js" data-chatbot-id="${chatbot.embed_id}" async></script>`

  async function copyBotId() {
    await navigator.clipboard.writeText(chatbot.embed_id)
    setIdCopied(true)
    setTimeout(() => setIdCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Install your chatbot</CardTitle>
          <CardDescription>
            Paste this snippet just before the closing{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">&lt;/body&gt;</code> tag on your site and{' '}
            {chatbot.name} will appear automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={snippet} filename="index.html" copyable />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Bot ID</CardTitle>
          <CardDescription>Use this if you're integrating manually through our API.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3">
            <code className="font-mono text-sm text-brand-navy">{chatbot.embed_id}</code>
            <button
              type="button"
              onClick={copyBotId}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-brand-text-secondary transition-colors hover:bg-slate-50"
            >
              {idCopied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {idCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
