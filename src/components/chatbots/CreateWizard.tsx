import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useOrg } from '@/contexts/OrgContext'
import { ChatbotRepo, type ChatbotTone, type Chatbot } from '@/entities'
import { Button } from '@/components/ui/button'
import { StepIdentity } from './wizard/StepIdentity'
import { StepBusiness } from './wizard/StepBusiness'
import { StepPersonality } from './wizard/StepPersonality'
import { StepReview } from './wizard/StepReview'

export interface WizardDraft {
  name: string
  welcome_message: string
  theme_color: string
  suggested_questions: string[]
  company_name: string
  business_description: string
  industry: string
  tone: ChatbotTone
  fallback_message: string
}

const STEP_NAMES = ['Identity', 'Business', 'Personality', 'Review']

const initialDraft: WizardDraft = {
  name: '',
  welcome_message: '',
  theme_color: '#7c3aed',
  suggested_questions: [],
  company_name: '',
  business_description: '',
  industry: '',
  tone: 'professional',
  fallback_message: '',
}

function generateEmbedId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return `bot_${id}`
}

export function CreateWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<WizardDraft>(initialDraft)
  const { orgId } = useOrg()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  function updateDraft(patch: Partial<WizardDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  const createMutation = useMutation({
    mutationFn: (): Promise<Chatbot> =>
      ChatbotRepo.create(orgId!, {
        name: draft.name.trim(),
        welcome_message: draft.welcome_message,
        theme_color: draft.theme_color,
        suggested_questions: draft.suggested_questions,
        company_name: draft.company_name,
        business_description: draft.business_description,
        industry: draft.industry,
        tone: draft.tone,
        fallback_message: draft.fallback_message,
        embed_id: generateEmbedId(),
      }),
    onSuccess: (chatbot) => {
      queryClient.invalidateQueries({ queryKey: ['chatbots', orgId] })
      navigate(`/dashboard/chatbots/${chatbot.id}`)
    },
  })

  const canContinue = step !== 0 || draft.name.trim().length > 0

  function handleContinue() {
    if (step < 3) {
      setStep((s) => s + 1)
    } else {
      createMutation.mutate()
    }
  }

  function handleBack() {
    if (step === 0) {
      onClose()
    } else {
      setStep((s) => s - 1)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 border-b border-border bg-white px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-brand-text-secondary uppercase">
                Step {step + 1} of 4 — {STEP_NAMES[step]}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-brand-navy">Create a new chatbot</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-brand-text-secondary hover:bg-slate-100"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-4 flex gap-1.5">
            {STEP_NAMES.map((name, i) => (
              <div key={name} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className="h-full rounded-full bg-linear-to-r from-violet-600 to-violet-800"
                  initial={false}
                  animate={{ width: i <= step ? '100%' : '0%' }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 0 && <StepIdentity draft={draft} updateDraft={updateDraft} />}
          {step === 1 && <StepBusiness draft={draft} updateDraft={updateDraft} />}
          {step === 2 && <StepPersonality draft={draft} updateDraft={updateDraft} />}
          {step === 3 && <StepReview draft={draft} />}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-border bg-white px-6 py-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          <Button type="button" onClick={handleContinue} disabled={!canContinue || createMutation.isPending}>
            {step === 3 ? (createMutation.isPending ? 'Creating…' : 'Create chatbot') : 'Continue'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
