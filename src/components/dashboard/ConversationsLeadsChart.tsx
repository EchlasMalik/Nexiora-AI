import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export interface DayPoint {
  label: string
  conversations: number
  leads: number
}

export function ConversationsLeadsChart({ data }: { data: DayPoint[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Conversations & Leads</CardTitle>
        <p className="text-sm text-brand-text-secondary">Last 7 days</p>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="conversationsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0891B2" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0891B2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={28}
                tick={{ fontSize: 12, fill: '#64748B' }}
              />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="conversations"
                name="Conversations"
                stroke="#7C3AED"
                strokeWidth={2}
                fill="url(#conversationsFill)"
              />
              <Area
                type="monotone"
                dataKey="leads"
                name="Leads"
                stroke="#0891B2"
                strokeWidth={2}
                fill="url(#leadsFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
