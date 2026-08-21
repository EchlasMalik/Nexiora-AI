import { useState, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { SuggestedQuestion } from '@/entities'

interface SuggestedQuestionsEditorProps {
  value: SuggestedQuestion[]
  onChange: (next: SuggestedQuestion[]) => void
  /** Overrides the answer field's placeholder — this editor is also reused for the Help tab's static FAQ list, which needs different copy than the default chat-starter framing. */
  answerPlaceholder?: string
}

export function SuggestedQuestionsEditor({
  value,
  onChange,
  answerPlaceholder = 'Fixed answer shown instantly when a visitor taps this question — leave blank to let the AI answer instead',
}: SuggestedQuestionsEditorProps) {
  const [questionDraft, setQuestionDraft] = useState('')

  function addQuestion() {
    const trimmed = questionDraft.trim()
    if (!trimmed || value.some((q) => q.question.toLowerCase() === trimmed.toLowerCase())) return
    onChange([...value, { question: trimmed, answer: '' }])
    setQuestionDraft('')
  }

  function updateAnswer(index: number, answer: string) {
    onChange(value.map((q, i) => (i === index ? { ...q, answer } : q)))
  }

  function removeQuestion(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addQuestion()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={questionDraft}
          onChange={(e) => setQuestionDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. What are your prices?"
        />
        <Button type="button" variant="outline" onClick={addQuestion} className="shrink-0 gap-1.5">
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-col gap-2">
          {value.map((qa, index) => (
            <div key={`${qa.question}-${index}`} className="rounded-xl border border-border bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-brand-navy">{qa.question}</p>
                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
                  aria-label={`Remove "${qa.question}"`}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-brand-text-secondary hover:bg-slate-200"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <Textarea
                value={qa.answer}
                onChange={(e) => updateAnswer(index, e.target.value)}
                placeholder={answerPlaceholder}
                rows={2}
                className="mt-2 bg-white text-sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
