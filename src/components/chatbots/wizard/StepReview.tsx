import type { ReactNode } from 'react'
import { Bot } from 'lucide-react'
import type { WizardDraft } from '../CreateWizard'

function ReviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-brand-text-secondary">{label}</span>
      <span className="max-w-[65%] text-right text-sm font-medium text-brand-navy">{value}</span>
    </div>
  )
}

export function StepReview({ draft }: { draft: WizardDraft }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-slate-50 p-5">
        <div
          className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white"
          style={{ backgroundColor: draft.theme_color }}
        >
          <Bot className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-brand-navy">{draft.name || 'Untitled bot'}</p>
          <p className="truncate text-sm text-brand-text-secondary">
            {[draft.company_name, draft.industry].filter(Boolean).join(' · ') || 'No company or industry set'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border px-5">
        <ReviewRow label="Welcome message" value={draft.welcome_message || '—'} />
        <ReviewRow label="Tone" value={<span className="capitalize">{draft.tone}</span>} />
        <ReviewRow label="Suggested questions" value={draft.suggested_questions.length} />
        <ReviewRow
          label="Description"
          value={
            draft.business_description
              ? draft.business_description.length > 80
                ? `${draft.business_description.slice(0, 80)}…`
                : draft.business_description
              : '—'
          }
        />
      </div>
    </div>
  )
}
