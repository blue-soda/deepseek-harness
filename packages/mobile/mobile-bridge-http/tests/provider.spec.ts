import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { AddressInfo } from 'node:net'
import MobileRuntime from '@deepseek-ai/dsh-mobile'
import { Context } from '@deepseek-ai/cordis'
import * as bridgePlugin from '@deepseek-ai/dsh-mobile-bridge-http'
import { AndroidHttpBridgeProvider } from '@deepseek-ai/dsh-mobile-bridge-http'

type Handler = (req: IncomingMessage, res: ServerResponse) => void

let server: Server
let baseUrl: string
let handler: Handler

beforeEach(async () => {
  handler = (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ status: 'listening', version: 'test', tools: [] }))
  }
  server = createServer((req, res) => { handler(req, res) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterEach(async () => {
  await new Promise<void>(resolve => server.close(() => { resolve() }))
})

function provider(): AndroidHttpBridgeProvider {
  return new AndroidHttpBridgeProvider({ baseUrl, token: 'secret-token', timeoutMs: 5_000 })
}

describe('AndroidHttpBridgeProvider', () => {
  it('reads bridge health with the bearer token and validates the response shape', async () => {
    let seenAuth: string | undefined
    handler = (req, res) => {
      seenAuth = req.headers.authorization
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({
        status: 'listening',
        version: '1',
        tools: [{ name: 'screen.observe', risk: 'read_only', description: 'Observe' }],
      }))
    }

    await expect(provider().health()).resolves.toEqual({
      status: 'listening',
      version: '1',
      tools: [{ name: 'screen.observe', risk: 'read_only', description: 'Observe' }],
    })
    expect(seenAuth).toBe('Bearer secret-token')
  })

  it('posts execute requests and parses Android bridge results', async () => {
    let body = ''
    handler = (req, res) => {
      req.setEncoding('utf8')
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({
          id: 'call-1',
          ok: true,
          result: { tapped: true },
          error: null,
          durationMs: 12,
        }))
      })
    }

    const result = await provider().execute({
      id: 'call-1',
      tool: 'input.tap',
      risk: 'reversible',
      arguments: { x: 1, y: 2 },
    })

    expect(JSON.parse(body)).toMatchObject({ tool: 'input.tap', arguments: { x: 1, y: 2 } })
    expect(result).toEqual({ id: 'call-1', ok: true, result: { tapped: true }, error: null, durationMs: 12 })
  })

  it('maps non-2xx bridge errors to MobileError', async () => {
    handler = (_req, res) => {
      res.writeHead(403, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'bad token' } }))
    }
    await expect(provider().health()).rejects.toThrow(expect.objectContaining({
      code: 'MOBILE_BRIDGE_HTTP_ERROR',
      message: expect.stringContaining('bad token'),
    }))
  })

  it('parses non-2xx standard execute failures as Android tool responses', async () => {
    handler = (_req, res) => {
      res.writeHead(403, { 'content-type': 'application/json' })
      res.end(JSON.stringify({
        id: 'confirm-1',
        ok: false,
        result: {},
        error: {
          code: 'user_rejected',
          message: 'User rejected confirmation.',
          recoveryHint: 'Revise the plan before asking again.',
        },
        durationMs: 15,
      }))
    }

    await expect(provider().execute({
      id: 'confirm-1',
      tool: 'user.confirm',
      risk: 'sensitive',
      arguments: { title: 'Confirm', detail: 'Proceed?' },
    })).resolves.toEqual({
      id: 'confirm-1',
      ok: false,
      result: {},
      error: {
        code: 'user_rejected',
        message: 'User rejected confirmation.',
        recoveryHint: 'Revise the plan before asking again.',
      },
      durationMs: 15,
    })
  })

  it('rejects malformed success responses before they reach Consumers', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ status: 'listening', version: '1', tools: [{ name: 'tap', risk: 'wild' }] }))
    }
    await expect(provider().health()).rejects.toThrow(expect.objectContaining({ code: 'MOBILE_BRIDGE_INVALID_RESPONSE' }))
  })
})

describe('mobile-bridge-http plugin registration', () => {
  it('registers the HTTP provider into ctx.mobile and unregisters with its fiber', async () => {
    const ctx = new Context()
    await ctx.plugin(MobileRuntime, { provider: 'android-http' })
    const fiber = await ctx.plugin(bridgePlugin, { baseUrl, token: 'secret-token' })
    await expect(ctx.mobile.health()).resolves.toMatchObject({ status: 'listening' })
    await fiber.dispose()
    await expect(ctx.mobile.health()).rejects.toThrow(expect.objectContaining({ code: 'MOBILE_PROVIDER_CONFIGURED_MISSING' }))
  })

  it('has no default export so Loader preserves namespace plugin metadata', () => {
    expect('default' in bridgePlugin).toBe(false)
    expect(bridgePlugin.name).toBe('mobile-bridge-http')
    expect(bridgePlugin.inject).toEqual(['mobile'])
  })
})
