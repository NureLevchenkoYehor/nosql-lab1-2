export function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>
}

export const DEVICE_ACTIVE_THRESHOLD_DAYS = 30

export function isDeviceActive(lastSeenAt: Date | null): boolean {
  if (!lastSeenAt) return false
  const thresholdMs = DEVICE_ACTIVE_THRESHOLD_DAYS * 86400000
  return Math.abs(Date.now() - new Date(lastSeenAt).getTime()) <= thresholdMs
}