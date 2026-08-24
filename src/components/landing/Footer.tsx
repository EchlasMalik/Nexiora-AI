import { Logo } from '@/components/Logo'

const links = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#use-cases', label: 'Use cases' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 sm:flex-row sm:justify-between">
        <Logo />
        <nav className="flex flex-wrap items-center justify-center gap-6">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-brand-text-secondary hover:text-brand-navy"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <p className="text-sm text-brand-text-secondary">
          © {new Date().getFullYear()} Nexiora AI. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
