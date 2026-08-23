import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'

interface RoiSummaryProps {
  conversations: number
  qualifiedLeads: number
  appointments: number
  averageDealValue: number
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

/**
 * The dashboard's ROI headline — replaces the old flat KPI grid (StatsRow),
 * whose "+X% this week" deltas and "Conversion Rate" were all hardcoded
 * strings, not derived from anything. Every number here is either a direct
 * count or a simple, disclosed calculation (appointments x average deal
 * value from Settings) — no fabricated figures.
 */
export function RoiSummary({ conversations, qualifiedLeads, appointments, averageDealValue }: RoiSummaryProps) {
  const pipelineValue = appointments * averageDealValue
  const hasDealValue = averageDealValue > 0
  const conversionRate = conversations > 0 ? Math.round((appointments / conversations) * 100) : null

  return (
    <Card className="overflow-hidden border-0">
      <div className="bg-linear-to-r from-violet-600 to-violet-800 p-6 text-white sm:p-8">
        <p className="text-sm font-medium text-violet-100">Estimated pipeline this month</p>

        {hasDealValue ? (
          <p className="mt-1 text-4xl font-bold tracking-tight">{CURRENCY_FORMATTER.format(pipelineValue)}</p>
        ) : (
          <div className="mt-2">
            <p className="text-lg font-semibold">Set your average deal value to see this</p>
            <Link
              to="/dashboard/settings"
              className="mt-1 inline-block text-sm font-medium text-violet-100 underline underline-offset-2 hover:text-white"
            >
              Go to Settings →
            </Link>
          </div>
        )}

        <p className="mt-4 text-sm text-violet-100">
          {conversations.toLocaleString()} conversations{'  →  '}
          {qualifiedLeads.toLocaleString()} qualified leads{'  →  '}
          {appointments.toLocaleString()} appointments booked
        </p>

        {conversionRate !== null && (
          <p className="mt-1 text-xs text-violet-200">{conversionRate}% of conversations became appointments</p>
        )}
      </div>
    </Card>
  )
}
