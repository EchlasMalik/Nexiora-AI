import { motion } from 'framer-motion'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export interface Stat {
  label: string
  value: string
  change: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
}

export function StatsRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.05 }}
        >
          <Card>
            <CardContent className="flex flex-col gap-3">
              <div className={`flex size-11 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor}`}>
                <stat.icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-brand-navy">{stat.value}</p>
                <p className="text-sm text-brand-text-secondary">{stat.label}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <ArrowUpRight className="size-3.5" />
                {stat.change}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
