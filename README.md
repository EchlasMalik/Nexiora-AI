# Nexiora AI

A multi-tenant AI chatbot SaaS. Businesses create a chatbot trained on their own content, embed it on their site with one script tag, and manage every conversation, lead, and booking it generates from a real dashboard — backed by Claude, Supabase, and Stripe.

## Features

**Chatbots**
- Wizard-driven chatbot creation (identity, business context, tone, personality)
- Knowledge base ingestion (documents, FAQs, notes) chunked and embedded for retrieval-augmented answers
- Per-chatbot theme color, welcome message, booking link, and fallback message
- Automatic language matching — replies in whichever language the visitor writes in, no configuration needed

**Embeddable widget**
- Single `<script>` tag embed, isolated in a shadow DOM so host-site CSS can never leak in or out
- Anonymous, rate-limited public endpoints (per-visitor hourly cap, per-chatbot daily cap) — no bot-cost surprises
- Every widget conversation is persisted as real `Conversation`/`Message` rows, not just streamed and discarded

**Dashboard**
- Real-time conversation inbox (Supabase Realtime — new messages appear without a refresh)
- Human handoff: take over any AI-managed conversation, hand it back anytime
- Contacts (captured leads) and Appointments, with double-booking conflict detection
- Knowledge base management with per-document processing/ready/failed status
- Usage stats computed from real data (messages this month, knowledge base size, active chatbots vs. plan limits)

**Billing**
- Stripe Checkout + Billing Portal, three plans (Starter/Growth/Business) plus a custom Enterprise tier
- Subscription state synced via a signature-verified Stripe webhook

**Compliance & ops**
- Row-Level Security on every table — tenants are isolated at the database level, not just the UI
- GDPR-compliant data export (full workspace as JSON) and account/workspace deletion
- Appointment confirmation emails via Resend

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind v4, shadcn/ui (radix-ui), framer-motion, react-router-dom, TanStack Query, Zod |
| Backend | Supabase — Postgres, Auth, Realtime, Edge Functions (Deno) |
| AI | Anthropic Claude, streamed via SSE, with an automatic free-tier Gemini fallback if Claude errors; Supabase's built-in `gte-small` model for embeddings; pgvector for retrieval |
| Payments | Stripe (Checkout, Billing Portal, webhooks) |
| Email | Resend |
| Testing | Vitest (unit), Playwright (e2e) |
| Hosting | Vercel (frontend + widget bundle), Supabase (database + Edge Functions) |

## Project structure

```
src/
  pages/                Route-level pages (landing, auth, dashboard/*)
  components/           UI components — shadcn primitives, landing sections, dashboard widgets
  lib/                  Client-side logic: Supabase client, AI streaming, billing, email, GDPR export
  entities/              Zod schemas + typed repositories for every entity
  contexts/              Auth and Org React contexts
  widget/                Standalone embeddable widget entry point
  test/                  Vitest setup

supabase/
  migrations/            Numbered SQL migrations (schema, RLS, RAG, billing, realtime)
  functions/              Edge Functions (Deno) — one per API endpoint, plus _shared/ for common logic

e2e/                     Playwright smoke tests
vite.config.ts           Main app build
vite.widget.config.ts    Standalone widget bundle build (outputs alongside the main app)
vercel.json              SPA routing + explicit build command for Vercel
```

### Edge Functions

| Function | Auth | Purpose |
|---|---|---|
| `chat-completion` | Authenticated | Streams a Claude reply for the dashboard's Live Preview |
| `public-chat` | Anonymous, rate-limited | Streams a Claude reply for the embedded widget; persists the conversation |
| `public-chatbot-config` | Anonymous | Returns public-safe chatbot config for the widget to render |
| `embed-document` | Authenticated | Chunks and embeds a knowledge base document |
| `create-checkout-session` | Authenticated | Starts a Stripe Checkout session |
| `create-portal-session` | Authenticated | Opens the Stripe Billing Portal |
| `stripe-webhook` | Public, signature-verified | Syncs subscription state from Stripe events |
| `delete-workspace` | Authenticated (owner only) | GDPR account/workspace deletion |
| `send-appointment-confirmation` | Authenticated | Emails a booking confirmation via Resend |

## Getting started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com)
- Optional: a free [Gemini API key](https://aistudio.google.com/apikey) — used as an automatic fallback if the Anthropic call fails (e.g. no credits)
- A [Stripe](https://dashboard.stripe.com) account (for billing)
- A [Resend](https://resend.com) account (for email — optional, fails gracefully without it)
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (invoked via `npx supabase`, no global install needed)

### Install

```bash
npm install
```

### Configure environment variables

Create `.env.local` in the project root:

```bash
# Client-side (safe to expose — bundled into the browser build)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"

# Used by the CLI/scripts locally to manage the Supabase project — never bundled
SUPABASE_ACCESS_TOKEN="your-supabase-personal-access-token"
```

Server-only secrets (Anthropic, Gemini, Stripe, Resend) are **never** put in `.env.local` for the app to read — they're pushed to Supabase Edge Function secrets instead, since anything prefixed `VITE_` gets inlined into the public client bundle:

```bash
npx supabase link --project-ref your-project-ref

npx supabase secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  GEMINI_API_KEY=... \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_STARTER=price_... \
  STRIPE_PRICE_GROWTH=price_... \
  STRIPE_PRICE_BUSINESS=price_... \
  RESEND_API_KEY=re_...
```

`GEMINI_API_KEY` is optional but recommended: `chat-completion` and `public-chat` both try Claude first and only fall back to Gemini's free-tier `gemini-2.5-flash` model if the Anthropic call errors (out of credits, rate limited, etc). See `streamAiReply` in `supabase/functions/_shared/chat-core.ts`.

### Set up the database

Apply the migrations in `supabase/migrations/` in order, via the Supabase CLI or the SQL editor in the Supabase dashboard.

### Deploy the Edge Functions

```bash
npx supabase functions deploy chat-completion
npx supabase functions deploy public-chat --no-verify-jwt
npx supabase functions deploy public-chatbot-config --no-verify-jwt
npx supabase functions deploy embed-document
npx supabase functions deploy create-checkout-session
npx supabase functions deploy create-portal-session
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy delete-workspace
npx supabase functions deploy send-appointment-confirmation
```

### Run locally

```bash
npm run dev
```

## Testing

```bash
npm test          # Vitest unit tests
npm run test:e2e  # Playwright end-to-end tests (spins up the dev server automatically)
```

## Building

```bash
npm run build
```

Builds both the main app (`dist/index.html` + assets) and the standalone embeddable widget bundle (`dist/widget.js`) into the same output directory, since they're deployed together.

## Deployment

The frontend and widget bundle deploy to [Vercel](https://vercel.com); the backend runs entirely on Supabase.

- `vercel.json` explicitly sets the build command to `npm run build` (Vercel's zero-config Vite detection would otherwise skip the widget bundle) and rewrites all routes to `index.html` for client-side routing, except `widget.js` which is served as a real static file.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel project environment variables before deploying — the build inlines them at build time.
- Register the Stripe webhook endpoint (`https://<your-project>.supabase.co/functions/v1/stripe-webhook`) in the Stripe Dashboard once deployed.
