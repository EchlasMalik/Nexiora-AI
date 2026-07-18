export interface UserPreferences {
  workspace_name: string
  timezone: string
  notify_new_lead: boolean
  notify_appointment: boolean
  notify_escalation: boolean
  notify_weekly_summary: boolean
}

export const defaultPreferences: UserPreferences = {
  workspace_name: '',
  timezone: 'America/New_York',
  notify_new_lead: true,
  notify_appointment: true,
  notify_escalation: true,
  notify_weekly_summary: false,
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
