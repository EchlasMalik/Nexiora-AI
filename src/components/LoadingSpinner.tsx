import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingSpinner({ className, full }: { className?: string; full?: boolean }) {
  const spinner = <Loader2 className={cn('size-6 animate-spin text-violet-600', className)} />

  if (!full) return spinner

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      {spinner}
    </div>
  )
}
