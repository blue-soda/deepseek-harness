import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolvedClientTimeZone } from '../src/client/time-zone.ts'

afterEach(() => {
  vi.restoreAllMocks()
  delete (globalThis as { __DSH_TRANSPORT__?: unknown }).__DSH_TRANSPORT__
})

describe('browser time zone', () => {
  it('returns the runtime-resolved zone', () => {
    expect(resolvedClientTimeZone()).toBe(
      new Intl.DateTimeFormat().resolvedOptions().timeZone,
    )
  })

  it('uses an explicit transport zone when a native shell supplies one', () => {
    ;(globalThis as { __DSH_TRANSPORT__?: { clientTimeZone?: string } }).__DSH_TRANSPORT__ = {
      clientTimeZone: 'UTC',
    }

    expect(resolvedClientTimeZone()).toBe('UTC')
  })

  it('falls back to UTC when a native WebView exposes a non-IANA zone label', () => {
    const options = new Intl.DateTimeFormat().resolvedOptions()
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      ...options,
      timeZone: 'GMT+08:00',
    })

    expect(resolvedClientTimeZone()).toBe('UTC')
  })

  it.each([undefined, ''])('fails loud when the runtime exposes no zone %#', (timeZone) => {
    const options = new Intl.DateTimeFormat().resolvedOptions()
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      ...options,
      timeZone: timeZone as string,
    })

    expect(() => resolvedClientTimeZone()).toThrow('browser time zone is unavailable')
  })
})
