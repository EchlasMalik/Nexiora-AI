import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function ComingSoonCard({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <Icon className="size-6" />
        </div>
        <p className="max-w-sm text-sm text-brand-text-secondary">{message}</p>
      </CardContent>
    </Card>
  )
}
