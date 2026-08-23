import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { startOfMonth, subMonths } from 'date-fns'
import { MessageSquare, Users, Calendar, PoundSterling } from 'lucide-react'
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
import { StatsRow, type Stat } from '@/components/dashboard/StatsRow'
import { ConversationsLeadsChart, type DayPoint } from '@/components/dashboard/ConversationsLeadsChart'
import { ChatbotsList } from '@/components/dashboard/ChatbotsList'
import { RecentConversationsList } from '@/components/dashboard/RecentConversationsList'

// Anything counted as actively worked, not just sitting untouched or dead.
const QUALIFIED_LEAD_STATUSES = new Set(['qualified', 'contacted', 'won'])

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

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

/** "+18% vs last month" / "-6% vs last month" — omitted (undefined) when there's no prior-month baseline to compare against. */
function monthOverMonthChange(current: number, previous: number): { change?: string; trend?: 'up' | 'down' } {
  if (previous === 0) {
    return current > 0 ? { change: 'New this month', trend: 'up' } : {}
  }
  const percent = Math.round(((current - previous) / previous) * 100)
  if (percent === 0) return { change: 'Flat vs last month', trend: 'up' }
  return { change: `${Math.abs(percent)}% vs last month`, trend: percent > 0 ? 'up' : 'down' }
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

  const stats: Stat[] = useMemo(() => {
    const now = new Date()
    const thisMonthStart = startOfMonth(now).toISOString()
    const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString()

    const inThisMonth = (date: string) => date >= thisMonthStart
    const inLastMonth = (date: string) => date >= lastMonthStart && date < thisMonthStart

    const conversationsThisMonth = conversations.filter((c) => inThisMonth(c.created_date)).length
    const conversationsLastMonth = conversations.filter((c) => inLastMonth(c.created_date)).length

    const qualifiedThisMonth = contacts.filter(
      (c) => inThisMonth(c.created_date) && QUALIFIED_LEAD_STATUSES.has(c.status)
    ).length
    const qualifiedLastMonth = contacts.filter(
      (c) => inLastMonth(c.created_date) && QUALIFIED_LEAD_STATUSES.has(c.status)
    ).length

    const bookedThisMonth = appointments.filter((a) => inThisMonth(a.created_date) && a.status !== 'cancelled').length
    const bookedLastMonth = appointments.filter((a) => inLastMonth(a.created_date) && a.status !== 'cancelled').length

    const averageDealValue = orgSettings?.average_deal_value ?? 0
    const pipelineThisMonth = bookedThisMonth * averageDealValue
    const pipelineLastMonth = bookedLastMonth * averageDealValue

    const pipelineStat: Stat =
      averageDealValue > 0
        ? {
            label: 'Estimated Pipeline',
            value: CURRENCY_FORMATTER.format(pipelineThisMonth),
            icon: PoundSterling,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            ...monthOverMonthChange(pipelineThisMonth, pipelineLastMonth),
          }
        : {
            label: 'Estimated Pipeline',
            value: '—',
            change: 'Set average deal value in Settings',
            icon: PoundSterling,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
          }

    return [
      {
        label: 'Conversations',
        value: String(conversationsThisMonth),
        icon: MessageSquare,
        iconBg: 'bg-violet-50',
        iconColor: 'text-violet-600',
        ...monthOverMonthChange(conversationsThisMonth, conversationsLastMonth),
      },
      {
        label: 'Qualified Leads',
        value: String(qualifiedThisMonth),
        icon: Users,
        iconBg: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        ...monthOverMonthChange(qualifiedThisMonth, qualifiedLastMonth),
      },
      {
        label: 'Appointments Booked',
        value: String(bookedThisMonth),
        icon: Calendar,
        iconBg: 'bg-sky-50',
        iconColor: 'text-sky-600',
        ...monthOverMonthChange(bookedThisMonth, bookedLastMonth),
      },
      pipelineStat,
    ]
  }, [conversations, contacts, appointments, orgSettings])

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="Here's what's happening across your chatbots this month."
      />

      {isLoading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6">
          <StatsRow stats={stats} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ConversationsLeadsChart data={chartData} />
            </div>
            <ChatbotsList chatbots={chatbots} />
          </div>

          <RecentConversationsList conversations={recentConversations} />
        </div>
      )}
    </DashboardLayout>
  )
}
