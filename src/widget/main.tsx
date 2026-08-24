import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PublicWidgetLoader } from './PublicWidgetLoader'
// `?inline` gives the compiled CSS as a string instead of Vite auto-injecting
// a <link> into the host page's <head> — critical here, since this script
// runs on arbitrary third-party sites and must never leak styles onto them.
import widgetStyles from '@/index.css?inline'

function mount() {
  const scriptEl = document.currentScript as HTMLScriptElement | null
  const embedId = scriptEl?.dataset.chatbotId
  const avoidSelector = scriptEl?.dataset.avoidSelector

  if (!embedId) {
    console.error('[Nexiora widget] missing data-chatbot-id attribute on the <script> tag.')
    return
  }

  const host = document.createElement('div')
  host.id = 'nexiora-chat-widget-host'
  document.body.appendChild(host)

  // Shadow DOM isolates the widget's styles from the host page in both
  // directions — the host's CSS can't leak in, and ours can't leak out.
  const shadowRoot = host.attachShadow({ mode: 'open' })

  // index.css defines every brand color/radius as a CSS custom property on
  // `:root` (--border, --radius, --brand-navy, etc.) — but `:root` inside a
  // shadow-scoped stylesheet can only ever match the real page's <html>
  // element, never the shadow host. Left as `:root`, none of those
  // properties are ever defined inside this shadow tree, so every
  // var(--border)/var(--radius)-dependent utility (rounded corners, border
  // colors, brand colors) silently falls back to the browser default
  // instead — the live widget looked completely unstyled (square corners,
  // black borders) despite the CSS loading correctly. `:host` is the
  // shadow-DOM equivalent of `:root` — it correctly targets the shadow host
  // element, so properties defined there inherit normally to everything
  // inside this shadow tree.
  // Separately from the :root/:host issue above: Tailwind's arbitrary-value
  // ("bracket") syntax — e.g. w-[380px], bg-[#faf9fc], scale-[1.02] — never
  // makes it into this build's compiled CSS at all, even for a from-scratch
  // isolated build of just this config. Standard named utilities (rounded-2xl,
  // shadow-sm, right-6) compile fine; only the bracket-value ones silently
  // vanish, specific to this separate widget build (root cause not fully
  // pinned down — an @source directive didn't fix it either). Rather than
  // depend on Tailwind here, every bracket-value utility ChatWidget.tsx needs
  // for its embedded variant is hand-written below instead, so the panel's
  // sizing/position/mobile-centering can never silently disappear again
  // regardless of what this build tool does on a future change.
  // The panel wrap is a Framer Motion `motion.div` that animates its own
  // opacity/scale/y via a direct inline `style.transform` — which always
  // wins over any stylesheet rule for the same property, full stop. Centering
  // with `left:50%;transform:translateX(-50%)` on that same element gets
  // silently clobbered the instant Framer Motion writes its own transform.
  // Centering via explicit width + `margin:0 auto` between `left:0`/`right:0`
  // sidesteps `transform` entirely, so it can't conflict.
  const handWrittenCss = `
    .nexiora-widget-panel-wrap{position:fixed;z-index:50;left:0;right:0;margin:0 auto;width:380px;max-width:calc(100vw - 24px);transition:bottom 300ms ease-out}
    @media (min-width:640px){.nexiora-widget-panel-wrap{left:auto;right:24px;margin:0}}
    .nexiora-widget-panel{height:600px;width:100%}
    .nexiora-widget-launcher-wrap{transition:bottom 300ms ease-out}
    .nexiora-widget-greeting{max-width:220px}
    .nexiora-widget-tab-bg{background-color:#faf9fc}
    .nexiora-widget-bubble-max{max-width:80%}
    .nexiora-widget-text-10{font-size:10px}
    .nexiora-widget-btn-scale:enabled:hover{transform:scale(1.02)}
  `

  const styleEl = document.createElement('style')
  styleEl.textContent = widgetStyles.replace(/:root(?=\s*[,{])/g, ':host') + handWrittenCss
  shadowRoot.appendChild(styleEl)

  const mountPoint = document.createElement('div')
  shadowRoot.appendChild(mountPoint)

  createRoot(mountPoint).render(
    <StrictMode>
      <PublicWidgetLoader embedId={embedId} avoidSelector={avoidSelector} />
    </StrictMode>
  )
}

mount()
