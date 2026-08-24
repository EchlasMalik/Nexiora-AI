// Prerenders public marketing routes into static HTML after the Vite build.
//
// This is a client-rendered SPA (no SSR) — a crawler that doesn't execute
// JavaScript (Semrush's own crawler, and most GEO/AI crawlers like GPTBot)
// only ever sees dist/index.html's empty `<div id="root"></div>` shell,
// regardless of how much real content the React app renders once it runs.
// That's the actual cause behind Semrush's "missing H1" / "~7 words of
// content" / "only 1 internal link" findings — not thin copy.
//
// This script boots a throwaway static server for the freshly-built dist/,
// loads each route in headless Chromium (letting React, framer-motion, and
// useDocumentHead's <head> tags fully render), then overwrites that route's
// static HTML with the final rendered DOM. Real browsers are unaffected:
// main.tsx calls `createRoot(...).render()`, not `hydrateRoot()`, so React
// simply re-renders over this HTML on load — identical runtime behavior to
// before, just with real content now reaching non-JS crawlers first.
//
// Only add routes here that are genuinely public and meant to be indexed.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROUTES = ['/']

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, '..', 'dist')

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0])
  let filePath = path.join(DIST_DIR, urlPath)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html')
  }
  res.setHeader('Content-Type', MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream')
  fs.createReadStream(filePath).pipe(res)
}

async function main() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.error('prerender: dist/index.html not found — run `vite build` first.')
    process.exit(1)
  }

  const server = http.createServer(serveStatic)
  await new Promise((resolve) => server.listen(0, resolve))
  const { port } = server.address()

  const browser = await chromium.launch()
  try {
    for (const route of ROUTES) {
      // Framer Motion's `whileInView` sections only animate in once they
      // intersect the viewport — a normal-height viewport would leave
      // everything below the fold frozen at its `initial` (opacity: 0)
      // state in the snapshot. An extremely tall viewport means the entire
      // page is already "in view" on load, so every section's reveal
      // animation fires immediately instead of needing a simulated scroll.
      const page = await browser.newPage({ viewport: { width: 1280, height: 20000 } })
      await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' })
      // Generous wait past the slowest real transition (duration + stagger
      // delay) on this page, so nothing is captured mid-animation — this
      // only costs build time, never real user latency.
      await page.waitForTimeout(2000)
      const html = await page.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML)
      await page.close()

      const outPath = route === '/' ? path.join(DIST_DIR, 'index.html') : path.join(DIST_DIR, route, 'index.html')
      fs.mkdirSync(path.dirname(outPath), { recursive: true })
      fs.writeFileSync(outPath, html)
      console.log(`prerender: wrote ${path.relative(DIST_DIR, outPath)}`)
    }
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((err) => {
  // Never fail the build over this: a prerender failure (e.g. the Chromium
  // binary isn't available in this build environment) should just leave
  // dist/index.html as the plain client-rendered shell it already was —
  // exactly today's shipping behavior, not a regression. Losing the SEO
  // enhancement for one deploy is fine; losing the entire deploy over it
  // is not.
  console.warn('prerender: skipped due to error (dist/ left as the plain client-rendered build):', err.message)
  process.exit(0)
})
