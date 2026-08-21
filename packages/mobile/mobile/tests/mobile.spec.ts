import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import MobileRuntime from '@deepseek-ai/dsh-mobile'
import type {
  AndroidBridgeHealth,
  AndroidBridgeProvider,
  AndroidToolRequest,
  AndroidToolResponse,
} from '@deepseek-ai/dsh-mobile'

const HEALTH: AndroidBridgeHealth = { status: 'listening', version: 'test', tools: [] }

function provider(id: string, available = true): AndroidBridgeProvider {
  return {
    id,
    available: () => available,
    health: () => Promise.resolve(HEALTH),
    execute: request => Promise.resolve(response(request)),
  }
}

function response(request: AndroidToolRequest): AndroidToolResponse {
  return {
    id: request.id,
    ok: true,
    result: { tool: request.tool },
    error: null,
    durationMs: 1,
  }
}

async function runtime(config = {}): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(MobileRuntime, config)
  return ctx
}

describe('MobileRuntime provider selection', () => {
  it('runs the only usable registered provider and unregisters it with the disposer', async () => {
    const ctx = await runtime()
    const dispose = ctx.mobile.registerProvider(provider('one'))
    await expect(ctx.mobile.health()).resolves.toEqual(HEALTH)
    dispose()
    await expect(ctx.mobile.health()).rejects.toThrow(expect.objectContaining({ code: 'MOBILE_PROVIDER_UNAVAILABLE' }))
  })

  it('rejects duplicate provider ids', async () => {
    const ctx = await runtime()
    ctx.mobile.registerProvider(provider('dupe'))
    expect(() => ctx.mobile.registerProvider(provider('dupe')))
      .toThrow(expect.objectContaining({ code: 'MOBILE_DUPLICATE_PROVIDER' }))
  })

  it('requires an explicit provider when multiple usable providers are registered', async () => {
    const ctx = await runtime()
    ctx.mobile.registerProvider(provider('a'))
    ctx.mobile.registerProvider(provider('b'))
    await expect(ctx.mobile.health()).rejects.toThrow(expect.objectContaining({ code: 'MOBILE_PROVIDER_AMBIGUOUS' }))
  })

  it('routes configured missing and unavailable providers to distinct errors', async () => {
    const missing = await runtime({ provider: 'wanted' })
    await expect(missing.mobile.health()).rejects.toThrow(expect.objectContaining({ code: 'MOBILE_PROVIDER_CONFIGURED_MISSING' }))

    const unavailable = await runtime({ provider: 'wanted' })
    unavailable.mobile.registerProvider(provider('wanted', false))
    await expect(unavailable.mobile.health()).rejects.toThrow(expect.objectContaining({ code: 'MOBILE_PROVIDER_CONFIGURED_UNAVAILABLE' }))
  })

  it('executes through the configured provider when it is usable', async () => {
    const ctx = await runtime({ provider: 'wanted' })
    ctx.mobile.registerProvider(provider('other'))
    ctx.mobile.registerProvider(provider('wanted'))
    await expect(ctx.mobile.execute({
      id: 'r1',
      tool: 'screen.observe',
      risk: 'read_only',
      arguments: {},
    })).resolves.toMatchObject({ id: 'r1', result: { tool: 'screen.observe' } })
  })
})
