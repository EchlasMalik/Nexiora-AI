import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { startOfMonth } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import {
  ChatbotRepo,
  ConversationRepo,
  ContactRepo,
  AppointmentRepo,
  type Conversation,
  type Contact,
} from '@/entities'
import { getOrgSettings } from '@/lib/orgPreferences'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/PageHeader'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { RoiSummary } from '@/components/dashboard/RoiSummary'
import { ConversationsLeadsChart, type DayPoint } from '@/components/dashboard/ConversationsLeadsChart'
import { ChatbotsList } from '@/components/dashboard/ChatbotsList'
import { RecentConversationsList } from '@/components/dashboard/RecentConversationsList'

// Anything counted as actively worked, not just sitting untouched or dead.
const QUALIFIED_LEAD_STATUSES = new Set(['qualified', 'contacted', 'won'])

function buildLast7DaysSeries(conversations: Conversation[], contacts: Contact[]): DayPoint[] {
  const days: { key: string; label: string }[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    days.push({
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
    })
  }
  return days.map((day) => ({
    label: day.label,
    conversations: conversations.filter((c) => c.created_date.slice(0, 10) === day.key).length,
    leads: contacts.filter((c) => c.created_date.slice(0, 10) === day.key).length,
  }))
}

export default function Dashboard() {
  const { user } = useAuth()
  const { orgId } = useOrg()

  const [chatbotsQuery, conversationsQuery, contactsQuery, appointmentsQuery] = useQueries({
    queries: [
      {
        queryKey: ['chatbots', orgId],
        queryFn: () => ChatbotRepo.list(orgId!),
        enabled: !!orgId,
      },
      {
        queryKey: ['conversations', orgId],
        queryFn: () => ConversationRepo.list(orgId!, { sort: '-created_date' }),
        enabled: !!orgId,
      },
      {
        queryKey: ['contacts', orgId],
        queryFn: () => ContactRepo.list(orgId!, { sort: '-created_date' }),
        enabled: !!orgId,
      },
      {
        queryKey: ['appointments', orgId],
        queryFn: () => AppointmentRepo.list(orgId!, { sort: '-created_date' }),
        enabled: !!orgId,
      },
    ],
  })

  const { data: orgSettings } = useQuery({
    queryKey: ['org-settings', orgId],
    queryFn: () => getOrgSettings(orgId!),
    enabled: !!orgId,
  })

  const chatbots = chatbotsQuery.data ?? []
  const conversations = conversationsQuery.data ?? []
  const contacts = contactsQuery.data ?? []
  const appointments = appointmentsQuery.data ?? []
  const recentConversations = conversations.slice(0, 5)

  const isLoading =
    chatbotsQuery.isLoading || conversationsQuery.isLoading || contactsQuery.isLoading || appointmentsQuery.isLoading

  const chartData = useMemo(() => buildLast7DaysSeries(conversations, contacts), [conversations, contacts])

  const roiStats = useMemo(() => {
    const monthStart = startOfMonth(new Date()).toISOString()
    const conversationsThisMonth = conversations.filter((c) => c.created_date >= monthStart).length
    const qualifiedLeadsThisMonth = contacts.filter(
      (c) => c.created_date >= monthStart && QUALIFIED_LEAD_STATUSES.has(c.status)
    ).length
    const appointmentsThisMonth = appointments.filter(
      (a) => a.created_date >= monthStart && a.status !== 'cancelled'
    ).length
    return { conversationsThisMonth, qualifiedLeadsThisMonth, appointmentsThisMonth }
  }, [conversations, contacts, appointments])

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="Here's what's happening across your chatbots."
      />

      {isLoading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6">
          <RoiSummary
            conversations={roiStats.conversationsThisMonth}
            qualifiedLeads={roiStats.qualifiedLeadsThisMonth}
            appointments={roiStats.appointmentsThisMonth}
            averageDealValue={orgSettings?.average_deal_value ?? 0}
          />

          <ConversationsLeadsChart data={chartData} />

          <div className="grid gap-6 lg:grid-cols-2">
            <ChatbotsList chatbots={chatbots} />
            <RecentConversationsList conversations={recentConversations} />
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
