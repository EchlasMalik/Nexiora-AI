import { useState, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { ChatbotLink } from '@/entities'

interface LinksEditorProps {
  value: ChatbotLink[]
  onChange: (next: ChatbotLink[]) => void
}

export function LinksEditor({ value, onChange }: LinksEditorProps) {
  const [labelDraft, setLabelDraft] = useState('')
  const [urlDraft, setUrlDraft] = useState('')

  function addLink() {
    const label = labelDraft.trim()
    const url = urlDraft.trim()
    if (!label || !url) return
    onChange([...value, { label, url }])
    setLabelDraft('')
    setUrlDraft('')
  }

  function updateUrl(index: number, url: string) {
    onChange(value.map((link, i) => (i === index ? { ...link, url } : link)))
  }

  function removeLink(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addLink()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Join our Discord Server"
        />
        <Input
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://discord.gg/..."
        />
        <Button type="button" variant="outline" onClick={addLink} className="shrink-0 gap-1.5">
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-col gap-2">
          {value.map((link, index) => (
            <div key={`${link.label}-${index}`} className="rounded-xl border border-border bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-brand-navy">{link.label}</p>
                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  aria-label={`Remove "${link.label}"`}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-brand-text-secondary hover:bg-slate-200"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <Input
                value={link.url}
                onChange={(e) => updateUrl(index, e.target.value)}
                placeholder="https://..."
                className="mt-2 bg-white text-sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
