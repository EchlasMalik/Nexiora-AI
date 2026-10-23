import { Link } from 'react-router-dom'
import { CompassIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthBackdrop } from '@/components/AuthBackdrop'
import { useDocumentHead } from '@/lib/seo/useDocumentHead'

export default function NotFound() {
  useDocumentHead({
    title: 'Page not found',
    description: "The page you're looking for doesn't exist or has moved.",
    path: '/404',
    noindex: true,
  })

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-light-bg px-6 text-center">
      <AuthBackdrop />
      <div className="animate-enter flex flex-col items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-2xl border border-border bg-white text-violet-600 shadow-sm">
          <CompassIcon className="size-6" />
        </span>
        <p className="mt-3 font-mono text-sm text-violet-600">404</p>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-navy">This page wandered off</h1>
        <p className="max-w-sm text-brand-text-secondary">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link to="/">
          <Button className="mt-4 h-10 rounded-full px-6">Back home</Button>
        </Link>
      </div>
    </div>
  )
}
