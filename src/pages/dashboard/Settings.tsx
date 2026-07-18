import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { defaultPreferences, getPreferences, savePreferences, type UserPreferences } from '@/lib/preferences'
import { exportOrgData } from '@/lib/dataExport'
import { fetchSubscription } from '@/lib/billing'
import { supabase } from '@/lib/supabase'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' },
]

const PLAN_LABELS: Record<string, { name: string; price: string }> = {
  starter: { name: 'Starter', price: '£39/mo' },
  growth: { name: 'Growth', price: '£79/mo' },
  business: { name: 'Business', price: '£199/mo' },
  enterprise: { name: 'Enterprise', price: 'Custom' },
}

const NOTIFICATIONS: { key: keyof UserPreferences; label: string; description: string }[] = [
  { key: 'notify_new_lead', label: 'New lead', description: 'A visitor is captured as a lead.' },
  { key: 'notify_appointment', label: 'Appointment', description: 'A new appointment is booked.' },
  { key: 'notify_escalation', label: 'Escalation', description: 'A conversation is handed off to a human.' },
  { key: 'notify_weekly_summary', label: 'Weekly summary', description: 'A digest of activity every Monday.' },
]

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const { orgId } = useOrg()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState(user?.name ?? '')
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [deleteArmed, setDeleteArmed] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const { data: subscription } = useQuery({
    queryKey: ['subscription', orgId],
    queryFn: () => fetchSubscription(orgId!),
    enabled: !!orgId,
  })

  useEffect(() => {
    if (orgId) setPreferences(getPreferences(orgId))
  }, [orgId])

  function updatePreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    setPreferences((prev) => ({ ...prev, [key]: value }))
    setJustSaved(false)
  }

  async function handleSave() {
    if (!user || !orgId) return
    setIsSaving(true)
    try {
      await updateProfile({ name: fullName.trim() })
      savePreferences(orgId, preferences)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleExportData() {
    if (!orgId) return
    setIsExporting(true)
    try {
      await exportOrgData(orgId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export your data')
    } finally {
      setIsExporting(false)
    }
  }

  async function handleDeleteWorkspace() {
    if (!deleteArmed) {
      setDeleteArmed(true)
      toast.warning('Click again to permanently delete your workspace and account — this cannot be undone.')
      return
    }

    setIsDeleting(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-workspace`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}) as { error?: string })
        throw new Error(body.error || 'Failed to delete workspace')
      }

      await supabase.auth.signOut()
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete workspace')
      setDeleteArmed(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Settings" description="Manage your account and workspace preferences." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your personal account details.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="full-name">Full name</Label>
                <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ''} disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose what you want to hear about.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {NOTIFICATIONS.map((item) => (
                <label key={item.key} className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={preferences[item.key] as boolean}
                    onCheckedChange={(checked) => updatePreference(item.key, checked === true)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-brand-navy">{item.label}</p>
                    <p className="text-xs text-brand-text-secondary">{item.description}</p>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>General workspace preferences.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="workspace-name">Workspace name</Label>
                <Input
                  id="workspace-name"
                  value={preferences.workspace_name ?? ''}
                  onChange={(e) => updatePreference('workspace_name', e.target.value)}
                  placeholder={user?.company_name || 'My workspace'}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value) => updatePreference('timezone', value)}
                >
                  <SelectTrigger id="timezone" className="w-full">
                    <SelectValue placeholder="Select a timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
            {justSaved && <span className="text-sm font-medium text-emerald-600">✓ Saved</span>}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden border-0">
            <div className="bg-linear-to-r from-violet-600 to-violet-800 p-6 text-white">
              <p className="text-sm text-violet-100">Current plan</p>
              <p className="mt-1 text-2xl font-semibold">
                {subscription?.status === 'active' || subscription?.status === 'trialing'
                  ? (PLAN_LABELS[subscription.plan]?.name ?? subscription.plan)
                  : 'No active plan'}
              </p>
              <p className="text-sm text-violet-100">
                {subscription?.status === 'active' || subscription?.status === 'trialing'
                  ? (PLAN_LABELS[subscription.plan]?.price ?? '')
                  : 'Choose a plan to get started'}
              </p>
              <Button
                onClick={() => navigate('/dashboard/billing')}
                className="mt-4 w-full justify-center bg-none bg-white text-violet-700 hover:bg-slate-100"
              >
                Manage plan
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your data</CardTitle>
              <CardDescription>Download everything in your workspace as a JSON file.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full justify-center gap-1.5"
              >
                <Download className="size-4" />
                {isExporting ? 'Preparing export…' : 'Export my data'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-destructive">Danger zone</CardTitle>
              <CardDescription>
                Permanently deletes your workspace, all its data, and your account. Cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={handleDeleteWorkspace}
                disabled={isDeleting}
                className="w-full justify-center border-red-300 text-destructive hover:bg-red-50"
              >
                {isDeleting ? 'Deleting…' : deleteArmed ? 'Click again to permanently delete' : 'Delete workspace'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
