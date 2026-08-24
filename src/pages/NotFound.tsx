import { Link } from 'react-router-dom'
import { CompassIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDocumentHead } from '@/lib/seo/useDocumentHead'

export default function NotFound() {
  useDocumentHead({
    title: 'Page not found',
    description: "The page you're looking for doesn't exist or has moved.",
    path: '/404',
    noindex: true,
  })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-brand-light-bg px-6 text-center">
      <CompassIcon className="size-10 text-brand-text-secondary" />
      <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Page not found</h1>
      <p className="max-w-sm text-sm text-brand-text-secondary">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to="/">
        <Button className="mt-2">Back home</Button>
      </Link>
    </div>
  )
}
