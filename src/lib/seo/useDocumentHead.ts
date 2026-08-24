import { useEffect } from 'react'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from './siteConfig'

interface DocumentHeadOptions {
  title: string
  description: string
  /** Path only, e.g. "/" — combined with SITE_URL for the canonical link and og:url. */
  path: string
  ogImage?: string
  /** JSON-LD objects to inject as separate <script type="application/ld+json"> tags. */
  structuredData?: object[]
  /** Set true for pages that should never be indexed (soft-404s, auth/app pages). */
  noindex?: boolean
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Sets per-route <title>/meta/canonical/OG/Twitter tags and injects JSON-LD.
 *
 * This is a client-rendered SPA (Vite, no SSR) — a crawler that doesn't
 * execute JavaScript only ever sees index.html's static tags, never these.
 * What makes this actually reach non-JS crawlers is the build's prerender
 * step (scripts/prerender.mjs): it loads each public route in a headless
 * browser *after* this hook has already run, then saves the resulting DOM
 * — including everything set here — as that route's static HTML. Pages that
 * don't call this (the authenticated dashboard) simply keep whatever the
 * previous route left in <head>, which is fine since those aren't meant to
 * be indexed and are never prerendered.
 */
export function useDocumentHead({
  title,
  description,
  path,
  ogImage = DEFAULT_OG_IMAGE,
  structuredData,
  noindex = false,
}: DocumentHeadOptions): void {
  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${path}`
    const fullTitle = path === '/' ? title : `${title} — ${SITE_NAME}`

    document.title = fullTitle
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    upsertCanonical(canonicalUrl)

    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:image', ogImage)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', ogImage)

    // Idempotent regardless of how many times this effect fires (observed
    // twice on a single real mount in production, not just React's dev-only
    // StrictMode double-invoke) — clear any previously-injected structured
    // data before adding the current set, rather than assuming "one mount,
    // one append" and ending up with duplicated JSON-LD blocks.
    document.head.querySelectorAll('script[data-seo-jsonld="true"]').forEach((el) => el.remove())
    const scripts = (structuredData ?? []).map((data) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.seoJsonld = 'true'
      script.textContent = JSON.stringify(data)
      document.head.appendChild(script)
      return script
    })

    return () => {
      scripts.forEach((s) => s.remove())
    }
    // Options are constant per call site (static page copy) — only the
    // primitives are real dependencies; re-deriving structuredData/ogImage
    // identity every render would just churn the DOM for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, noindex])
}
