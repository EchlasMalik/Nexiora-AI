import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface Stat {
  label: string
  value: string
  /** Omit when there's nothing meaningful to compare against yet (e.g. no prior month, or a setting that isn't configured). */
  change?: string
  /** Defaults to 'up' when `change` is set — pass 'down' for a real decline so the icon/color aren't misleadingly positive. */
  trend?: 'up' | 'down'
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
          <Card className="h-full">
            <CardContent className="flex h-full flex-col gap-3">
              <div className={`flex size-11 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor}`}>
                <stat.icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-brand-navy">{stat.value}</p>
                <p className="text-sm text-brand-text-secondary">{stat.label}</p>
              </div>
              {stat.change && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium',
                    stat.trend === 'down' ? 'text-red-600' : 'text-emerald-600'
                  )}
                >
                  {stat.trend === 'down' ? (
                    <ArrowDownRight className="size-3.5" />
                  ) : (
                    <ArrowUpRight className="size-3.5" />
                  )}
                  {stat.change}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
