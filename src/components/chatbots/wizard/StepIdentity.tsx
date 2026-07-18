import { Check } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CHATBOT_THEME_COLORS } from '@/lib/themeColors'
import { SuggestedQuestionsEditor } from '../SuggestedQuestionsEditor'
import type { WizardDraft } from '../CreateWizard'

interface StepIdentityProps {
  draft: WizardDraft
  updateDraft: (patch: Partial<WizardDraft>) => void
}

export function StepIdentity({ draft, updateDraft }: StepIdentityProps) {
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
          {CHATBOT_THEME_COLORS.map((color) => (
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
        <Label>Suggested questions</Label>
        <p className="text-xs text-brand-text-secondary">
          Shown as quick-tap buttons when a chat starts. Give one a fixed answer to skip the AI for that
          question, or leave it blank to let the AI answer from your knowledge base.
        </p>
        <SuggestedQuestionsEditor
          value={draft.suggested_questions}
          onChange={(suggested_questions) => updateDraft({ suggested_questions })}
        />
      </div>
    </div>
  )
}
