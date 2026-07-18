import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { ChatbotRepo, type Chatbot, type ChatbotPosition, type SuggestedQuestion } from '@/entities'
import { CHATBOT_THEME_COLORS } from '@/lib/themeColors'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SuggestedQuestionsEditor } from '../SuggestedQuestionsEditor'

interface SettingsForm {
  name: string
  company_name: string
  welcome_message: string
  business_description: string
  fallback_message: string
  offline_message: string
  business_hours: string
  custom_prompt: string
  booking_url: string
}

interface BrandingForm {
  theme_color: string
  position: ChatbotPosition
  avatar_url: string
}

export function SettingsTab({ chatbot }: { chatbot: Chatbot }) {
  const { orgId } = useOrg()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [form, setForm] = useState<SettingsForm>({
    name: chatbot.name,
    company_name: chatbot.company_name,
    welcome_message: chatbot.welcome_message,
    business_description: chatbot.business_description,
    fallback_message: chatbot.fallback_message,
    offline_message: chatbot.offline_message,
    business_hours: chatbot.business_hours,
    custom_prompt: chatbot.custom_prompt,
    booking_url: chatbot.booking_url,
  })
  const [justSaved, setJustSaved] = useState(false)

  const [branding, setBranding] = useState<BrandingForm>({
    theme_color: chatbot.theme_color,
    position: chatbot.position,
    avatar_url: chatbot.avatar_url,
  })
  const [brandingSaved, setBrandingSaved] = useState(false)

  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>(chatbot.suggested_questions)
  const [questionsSaved, setQuestionsSaved] = useState(false)

  const [deleteArmed, setDeleteArmed] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  function update(patch: Partial<SettingsForm>) {
    setForm((prev) => ({ ...prev, ...patch }))
    setJustSaved(false)
  }

  function updateBranding(patch: Partial<BrandingForm>) {
    setBranding((prev) => ({ ...prev, ...patch }))
    setBrandingSaved(false)
  }

  const saveMutation = useMutation({
    mutationFn: () => ChatbotRepo.update(orgId!, chatbot.id, form),
    onSuccess: (updated) => {
      queryClient.setQueryData(['chatbot', orgId, chatbot.id], updated)
      queryClient.invalidateQueries({ queryKey: ['chatbots', orgId] })
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2500)
    },
  })

  const brandingMutation = useMutation({
    mutationFn: () => ChatbotRepo.update(orgId!, chatbot.id, branding),
    onSuccess: (updated) => {
      queryClient.setQueryData(['chatbot', orgId, chatbot.id], updated)
      queryClient.invalidateQueries({ queryKey: ['chatbots', orgId] })
      setBrandingSaved(true)
      setTimeout(() => setBrandingSaved(false), 2500)
    },
  })

  const questionsMutation = useMutation({
    mutationFn: () => ChatbotRepo.update(orgId!, chatbot.id, { suggested_questions: suggestedQuestions }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['chatbot', orgId, chatbot.id], updated)
      queryClient.invalidateQueries({ queryKey: ['chatbots', orgId] })
      setQuestionsSaved(true)
      setTimeout(() => setQuestionsSaved(false), 2500)
    },
  })

  async function handleDelete() {
    if (!deleteArmed) {
      setDeleteArmed(true)
      toast.warning('Click again to permanently delete this chatbot — this cannot be undone.')
      return
    }

    setIsDeleting(true)
    try {
      await ChatbotRepo.remove(orgId!, chatbot.id)
      queryClient.invalidateQueries({ queryKey: ['chatbots', orgId] })
      toast.success(`${chatbot.name} was deleted.`)
      navigate('/dashboard/chatbots', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete chatbot')
      setDeleteArmed(false)
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-name">Bot name</Label>
              <Input id="settings-name" value={form.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-company">Company name</Label>
              <Input
                id="settings-company"
                value={form.company_name}
                onChange={(e) => update({ company_name: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-welcome">Welcome message</Label>
            <Textarea
              id="settings-welcome"
              rows={3}
              value={form.welcome_message}
              onChange={(e) => update({ welcome_message: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-description">Business description</Label>
            <Textarea
              id="settings-description"
              rows={4}
              value={form.business_description}
              onChange={(e) => update({ business_description: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Behaviour</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-fallback">Fallback message</Label>
            <Textarea
              id="settings-fallback"
              rows={2}
              value={form.fallback_message}
              onChange={(e) => update({ fallback_message: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-offline">Offline message</Label>
            <Textarea
              id="settings-offline"
              rows={2}
              value={form.offline_message}
              onChange={(e) => update({ offline_message: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-hours">Business hours</Label>
            <Input
              id="settings-hours"
              value={form.business_hours}
              onChange={(e) => update({ business_hours: e.target.value })}
              placeholder="Mon–Fri 9am–6pm EST"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-prompt">Custom prompt (system)</Label>
            <Textarea
              id="settings-prompt"
              rows={4}
              value={form.custom_prompt}
              onChange={(e) => update({ custom_prompt: e.target.value })}
              placeholder="Additional instructions for how your chatbot should behave…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-booking">Booking URL</Label>
            <Input
              id="settings-booking"
              value={form.booking_url}
              onChange={(e) => update({ booking_url: e.target.value })}
              placeholder="https://cal.com/you"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        {justSaved && <span className="text-sm font-medium text-emerald-600">✓ Saved</span>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>How this chatbot looks when it's embedded on your site.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>Theme color</Label>
            <div className="flex flex-wrap gap-3">
              {CHATBOT_THEME_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updateBranding({ theme_color: color })}
                  aria-label={`Select color ${color}`}
                  className="flex size-9 items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                >
                  {branding.theme_color.toLowerCase() === color.toLowerCase() && (
                    <Check className="size-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Widget position</Label>
            <div className="flex gap-2">
              {(['bottom-right', 'bottom-left'] as const).map((position) => (
                <button
                  key={position}
                  type="button"
                  onClick={() => updateBranding({ position })}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors',
                    branding.position === position
                      ? 'border-violet-600 bg-violet-600 text-white'
                      : 'border-border bg-white text-brand-text-secondary hover:border-violet-300'
                  )}
                >
                  {position.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-avatar">Avatar URL</Label>
            <Input
              id="settings-avatar"
              value={branding.avatar_url}
              onChange={(e) => updateBranding({ avatar_url: e.target.value })}
              placeholder="https://your-cdn.com/avatar.png"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => brandingMutation.mutate()} disabled={brandingMutation.isPending}>
              {brandingMutation.isPending ? 'Saving…' : 'Save branding'}
            </Button>
            {brandingSaved && <span className="text-sm font-medium text-emerald-600">✓ Saved</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suggested questions</CardTitle>
          <CardDescription>
            Quick-tap buttons shown when a chat starts. Give one a fixed answer to skip the AI for that
            question, or leave it blank to let the AI answer from your knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SuggestedQuestionsEditor value={suggestedQuestions} onChange={setSuggestedQuestions} />
          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => questionsMutation.mutate()} disabled={questionsMutation.isPending}>
              {questionsMutation.isPending ? 'Saving…' : 'Save questions'}
            </Button>
            {questionsSaved && <span className="text-sm font-medium text-emerald-600">✓ Saved</span>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete {chatbot.name} and everything tied to it — conversations, contacts, appointments,
            and its knowledge base. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : deleteArmed ? 'Click again to confirm' : `Delete ${chatbot.name}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
