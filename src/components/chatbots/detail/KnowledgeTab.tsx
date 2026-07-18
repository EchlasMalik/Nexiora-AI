import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BookOpen, Loader2, Plus, RotateCw, Trash2, X } from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { KnowledgeDocumentRepo, type KnowledgeDocument, type KnowledgeDocumentType } from '@/entities'
import { indexKnowledgeDocument } from '@/lib/knowledge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const TYPES: { value: KnowledgeDocumentType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'url', label: 'URL' },
  { value: 'faq', label: 'FAQ' },
  { value: 'note', label: 'Note' },
]

interface KnowledgeTabProps {
  chatbotId: string
  documents: KnowledgeDocument[]
}

export function KnowledgeTab({ chatbotId, documents }: KnowledgeTabProps) {
  const { orgId } = useOrg()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [type, setType] = useState<KnowledgeDocumentType>('text')
  const [title, setTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [content, setContent] = useState('')

  function resetForm() {
    setType('text')
    setTitle('')
    setSourceUrl('')
    setContent('')
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const doc = await KnowledgeDocumentRepo.create(orgId!, {
        chatbot_id: chatbotId,
        title: title.trim(),
        content,
        type,
        source_url: type === 'url' ? sourceUrl.trim() : '',
        status: 'processing',
        chunk_count: 0,
      })
      // The document exists and is visible (as "processing") even if indexing
      // itself fails below — the failure path just leaves it in that state
      // for the retry button rather than losing the saved content.
      await indexKnowledgeDocument(doc.id)
      return doc
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents', orgId, chatbotId] })
      resetForm()
      setFormOpen(false)
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents', orgId, chatbotId] })
      resetForm()
      setFormOpen(false)
      toast.error(err instanceof Error ? err.message : 'Failed to index document — you can retry it below.')
    },
  })

  const retryMutation = useMutation({
    mutationFn: (docId: string) => indexKnowledgeDocument(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents', orgId, chatbotId] })
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents', orgId, chatbotId] })
      toast.error(err instanceof Error ? err.message : 'Retry failed.')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (docId: string) => KnowledgeDocumentRepo.remove(orgId!, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents', orgId, chatbotId] })
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-text-secondary">
          {documents.length} document{documents.length === 1 ? '' : 's'}
        </p>
        <Button
          type="button"
          size="sm"
          variant={formOpen ? 'outline' : 'default'}
          onClick={() => setFormOpen((v) => !v)}
          className="gap-1.5"
        >
          {formOpen ? <X className="size-4" /> : <Plus className="size-4" />}
          {formOpen ? 'Cancel' : 'Add document'}
        </Button>
      </div>

      {formOpen && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      type === t.value
                        ? 'border-violet-600 bg-violet-600 text-white'
                        : 'border-border bg-white text-brand-text-secondary hover:border-violet-300'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Pricing FAQ"
              />
            </div>

            {type === 'url' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="doc-source-url">Source URL</Label>
                <Input
                  id="doc-source-url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://example.com/pricing"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doc-content">Content</Label>
              <Textarea
                id="doc-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Paste or write the content your chatbot should learn from…"
              />
            </div>

            <Button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || !content.trim() || createMutation.isPending}
              className="self-start"
            >
              {createMutation.isPending ? 'Indexing…' : 'Save & index'}
            </Button>
          </CardContent>
        </Card>
      )}

      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white py-16 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <BookOpen className="size-5" />
          </div>
          <p className="max-w-sm text-sm text-brand-text-secondary">
            No knowledge added yet. Add documents so your chatbot can answer accurately.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                {doc.status === 'processing' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <BookOpen className="size-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-navy">{doc.title}</p>
                <p
                  className={cn(
                    'truncate text-xs capitalize',
                    doc.status === 'failed' ? 'text-destructive' : 'text-brand-text-secondary'
                  )}
                >
                  {doc.type} · {doc.chunk_count} chunk{doc.chunk_count === 1 ? '' : 's'} · {doc.status}
                </p>
              </div>
              {doc.status === 'failed' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => retryMutation.mutate(doc.id)}
                  disabled={retryMutation.isPending}
                  aria-label={`Retry indexing "${doc.title}"`}
                  className="shrink-0 text-brand-text-secondary hover:text-violet-600"
                >
                  <RotateCw className={cn('size-4', retryMutation.isPending && 'animate-spin')} />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeMutation.mutate(doc.id)}
                aria-label={`Remove "${doc.title}"`}
                className="shrink-0 text-brand-text-secondary hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
