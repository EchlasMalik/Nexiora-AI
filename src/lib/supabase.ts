import { createClient } from '@supabase/supabase-js'

// Deliberately no eager throw here for missing env vars: Vite inlines
// `import.meta.env.VITE_*` as literal strings at build time, and a
// module-scope `if (!x) throw` on a build-time-empty value becomes a
// provably-true branch — Rolldown's dead-code elimination then treats
// everything reachable only after it (which, transitively, is most of the
// app) as unreachable and strips it from the production bundle. Placeholder
// values here keep the module side-effect-free; `createClient` itself
// throws a clear runtime error on first real network call if they're unset,
// which `isSupabaseConfigured` below lets callers check for explicitly.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
