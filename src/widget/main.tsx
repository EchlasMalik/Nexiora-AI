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

  const styleEl = document.createElement('style')
  styleEl.textContent = widgetStyles
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
