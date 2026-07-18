import { cn } from '@/lib/utils'

export function Logo({
  className,
  iconClassName,
  showText = true,
  subtitle,
}: {
  className?: string
  iconClassName?: string
  showText?: boolean
  subtitle?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img src="/Nexiora-AI.png" alt="Nexiora AI" className={cn('size-9 shrink-0 rounded-xl', iconClassName)} />
      {showText && (
        <div className="min-w-0 leading-tight">
          <span className="block truncate font-logo text-xl font-bold tracking-tight text-brand-navy">
            Nexiora AI
          </span>
          {subtitle && (
            <span className="block truncate text-xs text-brand-text-secondary">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  )
}
