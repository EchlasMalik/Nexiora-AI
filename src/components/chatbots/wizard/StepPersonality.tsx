import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { ChatbotTone } from '@/entities'
import type { WizardDraft } from '../CreateWizard'

const TONE_OPTIONS: { value: ChatbotTone; label: string; description: string }[] = [
  { value: 'friendly', label: 'Friendly', description: 'Warm, casual, and approachable.' },
  { value: 'professional', label: 'Professional', description: 'Polished, formal, and to the point.' },
  { value: 'luxury', label: 'Luxury', description: 'Refined and elevated, white-glove service.' },
  { value: 'playful', label: 'Playful', description: 'Fun, energetic, a little cheeky.' },
  { value: 'supportive', label: 'Supportive', description: 'Empathetic and patient, here to help.' },
  { value: 'sales', label: 'Sales', description: 'Enthusiastic and persuasive, drives action.' },
]

interface StepPersonalityProps {
  draft: WizardDraft
  updateDraft: (patch: Partial<WizardDraft>) => void
}

export function StepPersonality({ draft, updateDraft }: StepPersonalityProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>Tone of voice</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TONE_OPTIONS.map((tone) => {
            const selected = draft.tone === tone.value
            return (
              <button
                key={tone.value}
                type="button"
                onClick={() => updateDraft({ tone: tone.value })}
                className={cn(
                  'rounded-xl border px-4 py-3 text-left transition-colors',
                  selected ? 'border-violet-600 bg-violet-50' : 'border-border bg-white hover:border-violet-300'
                )}
              >
                <p className={cn('text-sm font-semibold', selected ? 'text-violet-700' : 'text-brand-navy')}>
                  {tone.label}
                </p>
                <p className="mt-0.5 text-xs text-brand-text-secondary">{tone.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fallback-message">Fallback message</Label>
        <Textarea
          id="fallback-message"
          value={draft.fallback_message}
          onChange={(e) => updateDraft({ fallback_message: e.target.value })}
          placeholder="Sorry, I'm not sure about that — let me connect you with our team."
          rows={3}
        />
      </div>
    </div>
  )
}
