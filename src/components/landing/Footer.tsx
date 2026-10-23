import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'

const productLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#use-cases', label: 'Use cases' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
]

const accountLinks = [
  { to: '/register', label: 'Start free trial' },
  { to: '/login', label: 'Sign in' },
  { to: '/forgot-password', label: 'Reset password' },
]

const linkClass = 'text-sm text-brand-text-secondary transition-colors hover:text-brand-navy'

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-brand-text-secondary">
            The AI chatbot that answers questions, captures leads, and books meetings — around the clock.
          </p>
        </div>

        <nav aria-label="Product">
          <p className="text-sm font-semibold text-brand-navy">Product</p>
          <ul className="mt-4 space-y-3">
            {productLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={linkClass}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Account">
          <p className="text-sm font-semibold text-brand-navy">Account</p>
          <ul className="mt-4 space-y-3">
            {accountLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-border/60">
        <p className="mx-auto max-w-6xl px-6 py-6 text-sm text-brand-text-secondary">
          © {new Date().getFullYear()} Nexiora AI. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
