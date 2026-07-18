import { useState, type KeyboardEvent } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { WizardDraft } from '../CreateWizard'

const THEME_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#db2777',
  '#059669',
  '#ea580c',
  '#0891b2',
  '#dc2626',
  '#4f46e5',
]

interface StepIdentityProps {
  draft: WizardDraft
  updateDraft: (patch: Partial<WizardDraft>) => void
}

export function StepIdentity({ draft, updateDraft }: StepIdentityProps) {
  const [questionDraft, setQuestionDraft] = useState('')

  function addQuestion() {
    const trimmed = questionDraft.trim()
    if (!trimmed || draft.suggested_questions.includes(trimmed)) return
    updateDraft({ suggested_questions: [...draft.suggested_questions, trimmed] })
    setQuestionDraft('')
  }

  function removeQuestion(question: string) {
    updateDraft({ suggested_questions: draft.suggested_questions.filter((q) => q !== question) })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addQuestion()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bot-name">
          Bot name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="bot-name"
          value={draft.name}
          onChange={(e) => updateDraft({ name: e.target.value })}
          placeholder="e.g. Aria"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="welcome-message">Welcome message</Label>
        <Textarea
          id="welcome-message"
          value={draft.welcome_message}
          onChange={(e) => updateDraft({ welcome_message: e.target.value })}
          placeholder="Hi! 👋 How can I help you today?"
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Theme color</Label>
        <div className="flex flex-wrap gap-3">
          {THEME_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => updateDraft({ theme_color: color })}
              aria-label={`Select color ${color}`}
              className="flex size-9 items-center justify-center rounded-full transition-transform hover:scale-110"
              style={{ backgroundColor: color }}
            >
              {draft.theme_color.toLowerCase() === color.toLowerCase() && (
                <Check className="size-4 text-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="suggested-question">Suggested questions</Label>
        <div className="flex gap-2">
          <Input
            id="suggested-question"
            value={questionDraft}
            onChange={(e) => setQuestionDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. What are your prices?"
          />
          <Button type="button" variant="outline" onClick={addQuestion} className="gap-1.5 shrink-0">
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        {draft.suggested_questions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {draft.suggested_questions.map((question) => (
              <span
                key={question}
                className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 py-1 pr-1.5 pl-3 text-xs font-medium text-violet-700"
              >
                {question}
                <button
                  type="button"
                  onClick={() => removeQuestion(question)}
                  aria-label={`Remove "${question}"`}
                  className="flex size-4 items-center justify-center rounded-full hover:bg-violet-100"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
