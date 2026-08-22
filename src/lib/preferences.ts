// Notification toggles used to live here too, but a browser's localStorage
// can never be read by a server-side Edge Function — so they've moved to
// real org columns (`src/lib/orgPreferences.ts`) where notifyOrgOwner can
// actually check them. workspace_name/timezone stay local for now.
export interface UserPreferences {
  workspace_name: string
  timezone: string
}

export const defaultPreferences: UserPreferences = {
  workspace_name: '',
  timezone: 'America/New_York',
}

function key(orgId: string) {
  return `nexiora:preferences:${orgId}`
}

export function getPreferences(orgId: string): UserPreferences {
  try {
    const raw = localStorage.getItem(key(orgId))
    return raw ? { ...defaultPreferences, ...(JSON.parse(raw) as Partial<UserPreferences>) } : defaultPreferences
  } catch {
    return defaultPreferences
  }
}

export function savePreferences(orgId: string, prefs: UserPreferences): void {
  localStorage.setItem(key(orgId), JSON.stringify(prefs))
}
