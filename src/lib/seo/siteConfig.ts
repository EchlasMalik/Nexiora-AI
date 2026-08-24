// Single source of truth for the public site's canonical domain and default
// social/share metadata — every OG tag, JSON-LD block, canonical link,
// robots.txt/sitemap/llms.txt reference should read from here rather than
// hardcoding the domain, so a future domain change only touches one file
// (see the nexiora-ai.app migration, where a hardcoded vercel.app URL in a
// single backend file was the only thing missed).
export const SITE_URL = 'https://nexiora-ai.app'
export const SITE_NAME = 'Nexiora AI'
export const DEFAULT_DESCRIPTION =
  'Nexiora AI answers questions, captures leads, and books meetings — trained on your business and live on your site in minutes.'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/Nexiora-AI.png`
