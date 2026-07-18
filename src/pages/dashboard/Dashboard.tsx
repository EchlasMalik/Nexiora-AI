import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { MessageSquare, Users, Calendar, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { ChatbotRepo, ConversationRepo, ContactRepo, AppointmentRepo, type Conversation, type Contact } from '@/entities'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/PageHeader'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { StatsRow, type Stat } from '@/components/dashboard/StatsRow'
import { ConversationsLeadsChart, type DayPoint } from '@/components/dashboard/ConversationsLeadsChart'
import { TopQuestionsChart } from '@/components/dashboard/TopQuestionsChart'
import { ChatbotsList } from '@/components/dashboard/ChatbotsList'
import { RecentConversationsList } from '@/components/dashboard/RecentConversationsList'

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

  const chatbots = chatbotsQuery.data ?? []
  const conversations = conversationsQuery.data ?? []
  const contacts = contactsQuery.data ?? []
  const appointments = appointmentsQuery.data ?? []
  const recentConversations = conversations.slice(0, 5)

  const isLoading =
    chatbotsQuery.isLoading || conversationsQuery.isLoading || contactsQuery.isLoading || appointmentsQuery.isLoading

  const chartData = useMemo(() => buildLast7DaysSeries(conversations, contacts), [conversations, contacts])

  const stats: Stat[] = [
    {
      label: 'Total Conversations',
      value: String(conversations.length),
      change: '+12% this week',
      icon: MessageSquare,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      label: 'New Leads',
      value: String(contacts.length),
      change: '+8% this week',
      icon: Users,
      iconBg: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
    },
    {
      label: 'Appointments',
      value: String(appointments.length),
      change: '+5% this week',
      icon: Calendar,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
    },
    {
      label: 'Conversion Rate',
      value: '12.4%',
      change: '+2.1pt this week',
      icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
  ]

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
          <StatsRow stats={stats} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ConversationsLeadsChart data={chartData} />
            </div>
            <TopQuestionsChart />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChatbotsList chatbots={chatbots} />
            <RecentConversationsList conversations={recentConversations} />
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
