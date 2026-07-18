import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Mail, Phone, Search, Users } from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { ContactRepo, type Contact, type ContactStatus } from '@/entities'
import { DashboardLayout } from '@/components/DashboardLayout'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toCsv, downloadCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'

const STATUSES: ContactStatus[] = ['new', 'qualified', 'contacted', 'won', 'lost']

const statusStyles: Record<ContactStatus, string> = {
  new: 'bg-violet-50 text-violet-700',
  qualified: 'bg-cyan-50 text-cyan-700',
  contacted: 'bg-amber-50 text-amber-700',
  won: 'bg-emerald-50 text-emerald-700',
  lost: 'bg-red-50 text-red-700',
}

function initials(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Contacts() {
  const { orgId } = useOrg()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', orgId],
    queryFn: () => ContactRepo.list(orgId!),
    enabled: !!orgId,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactStatus }) =>
      ContactRepo.update(orgId!, id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', orgId] })
    },
  })

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return contacts
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)
    )
  }, [contacts, search])

  function handleExport() {
    const csv = toCsv(filteredContacts as unknown as Record<string, unknown>[], [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'company', label: 'Company' },
      { key: 'requirements', label: 'Requirements' },
      { key: 'budget', label: 'Budget' },
      { key: 'timeline', label: 'Timeline' },
      { key: 'status', label: 'Status' },
    ])
    downloadCsv(`contacts-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            Contacts <span className="text-brand-text-secondary">({contacts.length})</span>
          </h1>
          <p className="mt-1 text-sm text-brand-text-secondary">Leads and contacts captured by your chatbots.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={filteredContacts.length === 0}
          className="gap-1.5"
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-text-secondary" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner />
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Users className="size-6" />
          </div>
          <p className="max-w-sm text-sm text-brand-text-secondary">
            No contacts yet. Leads captured by your chatbots will show up here.
          </p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white py-16 text-center text-sm text-brand-text-secondary">
          No contacts match "{search}".
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onStatusChange={(status) => updateStatusMutation.mutate({ id: contact.id, status })}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

function ContactCard({
  contact,
  onStatusChange,
}: {
  contact: Contact
  onStatusChange: (status: ContactStatus) => void
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="bg-linear-to-br from-violet-500 to-violet-800 text-xs text-white">
                {initials(contact.name || 'Unknown')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-navy">{contact.name || 'Unknown'}</p>
              <p className="truncate text-xs text-brand-text-secondary">{contact.company || 'No company'}</p>
            </div>
          </div>
          <select
            value={contact.status}
            onChange={(e) => onStatusChange(e.target.value as ContactStatus)}
            className={cn(
              'shrink-0 cursor-pointer appearance-none rounded-full border-0 px-2.5 py-1 text-xs font-medium capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300',
              statusStyles[contact.status]
            )}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 text-sm text-brand-text-secondary">
          {contact.email && (
            <div className="flex items-center gap-2 truncate">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 truncate">
              <Phone className="size-3.5 shrink-0" />
              <span className="truncate">{contact.phone}</span>
            </div>
          )}
          {contact.requirements && <p className="line-clamp-2">{contact.requirements}</p>}
        </div>

        {(contact.budget || contact.timeline) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {contact.budget && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-brand-text-secondary">
                💰 {contact.budget}
              </span>
            )}
            {contact.timeline && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-brand-text-secondary">
                🗓 {contact.timeline}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
