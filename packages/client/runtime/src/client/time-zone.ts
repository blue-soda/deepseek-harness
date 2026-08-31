/** Browser-owned time-zone sampling for prompt RPC provenance. */

interface ClientTimeZoneTransportGlobal {
  __DSH_TRANSPORT__?: {
    clientTimeZone?: string
  }
}

function normalizeClientTimeZone(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const candidate = value.trim()
  if (candidate === 'UTC') return 'UTC'
  if (!/^[A-Za-z]+\/[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)*$/.test(candidate)) return undefined
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: candidate })
      .resolvedOptions()
      .timeZone
  } catch {
    return undefined
  }
}

/**
 * Resolve the current browser IANA zone for one outbound operation.
 * @returns The browser-provided canonical zone.
 * @throws when the runtime cannot provide a non-empty zone.
 */
export function resolvedClientTimeZone(): string {
  const configured = normalizeClientTimeZone((globalThis as ClientTimeZoneTransportGlobal).__DSH_TRANSPORT__?.clientTimeZone)
  if (configured !== undefined) return configured
  const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone
  if (typeof timeZone !== 'string' || timeZone.length === 0) {
    throw new Error('browser time zone is unavailable')
  }
  return normalizeClientTimeZone(timeZone) ?? 'UTC'
}
