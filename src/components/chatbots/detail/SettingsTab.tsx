import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/contexts/OrgContext'
import { ChatbotRepo, type Chatbot } from '@/entities'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

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

export function SettingsTab({ chatbot }: { chatbot: Chatbot }) {
  const { orgId } = useOrg()
  const queryClient = useQueryClient()

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

  function update(patch: Partial<SettingsForm>) {
    setForm((prev) => ({ ...prev, ...patch }))
    setJustSaved(false)
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
    </div>
  )
}
