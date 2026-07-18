export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-brand-text-secondary">{description}</p>}
    </div>
  )
}
