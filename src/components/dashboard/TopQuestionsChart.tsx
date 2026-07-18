import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const data = [
  { topic: 'Pricing', count: 42 },
  { topic: 'Features', count: 35 },
  { topic: 'Demos', count: 28 },
  { topic: 'Support', count: 19 },
  { topic: 'Integrations', count: 12 },
]

export function TopQuestionsChart() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Questions</CardTitle>
        <p className="text-sm text-brand-text-secondary">Sample data — fills in as conversations come in</p>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="topic"
                tickLine={false}
                axisLine={false}
                width={90}
                tick={{ fontSize: 12, fill: '#64748B' }}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                cursor={{ fill: '#F1F5F9' }}
              />
              <Bar dataKey="count" fill="#7C3AED" radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
