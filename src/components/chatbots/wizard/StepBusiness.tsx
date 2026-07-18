import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { WizardDraft } from '../CreateWizard'

const INDUSTRIES = [
  'E-commerce',
  'SaaS',
  'Healthcare',
  'Real Estate',
  'Finance',
  'Education',
  'Hospitality',
  'Agency',
  'Legal',
  'Other',
]

interface StepBusinessProps {
  draft: WizardDraft
  updateDraft: (patch: Partial<WizardDraft>) => void
}

export function StepBusiness({ draft, updateDraft }: StepBusinessProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company-name">Company name</Label>
        <Input
          id="company-name"
          value={draft.company_name}
          onChange={(e) => updateDraft({ company_name: e.target.value })}
          placeholder="e.g. Brightpath Agency"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="business-description">Business description</Label>
        <Textarea
          id="business-description"
          value={draft.business_description}
          onChange={(e) => updateDraft({ business_description: e.target.value })}
          placeholder="What does your business do?"
          rows={4}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Industry</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INDUSTRIES.map((industry) => {
            const selected = draft.industry === industry
            return (
              <button
                key={industry}
                type="button"
                onClick={() => updateDraft({ industry })}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                  selected
                    ? 'border-violet-600 bg-violet-600 text-white'
                    : 'border-border bg-white text-brand-text-secondary hover:border-violet-300 hover:text-brand-navy'
                )}
              >
                {industry}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
