import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import type { Agent } from '@deepseek-ai/dsh-agent'
import MobileRuntime from '@deepseek-ai/dsh-mobile'
import type { AndroidBridgeHealth, AndroidBridgeProvider, AndroidToolRequest, AndroidToolResponse } from '@deepseek-ai/dsh-mobile'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as toolMobile from '@deepseek-ai/dsh-tool-mobile'
import {
  parseAndroidShArgs,
  parseApkInstallArgs,
  parseAppListInstalledArgs,
  parseAppOpenArgs,
  parseAppOpenUrlArgs,
  parseConfirmArgs,
  parseMemoryForgetArgs,
  parseMemorySearchArgs,
  parseMemoryWriteArgs,
  parseSwipeArgs,
  parseTapArgs,
  parseTypeArgs,
  renderMobileOutput,
  renderScreenObserveOutput,
  toMobileToolOutput,
} from '@deepseek-ai/dsh-tool-mobile'

class FakeProvider implements AndroidBridgeProvider {
  readonly id = 'fake'
  readonly requests: AndroidToolRequest[] = []
  failure: Error | undefined
  healthFailure: Error | undefined

  available(): boolean {
    return true
  }

  health(): Promise<AndroidBridgeHealth> {
    if (this.healthFailure !== undefined) return Promise.reject(this.healthFailure)
    return Promise.resolve({
      status: 'listening',
      version: 'fake',
      tools: [{ name: 'input.tap', risk: 'reversible', description: 'Tap' }],
    })
  }

  execute(request: AndroidToolRequest): Promise<AndroidToolResponse> {
    this.requests.push(request)
    if (this.failure !== undefined) return Promise.reject(this.failure)
    return Promise.resolve({
      id: request.id,
      ok: true,
      result: { echoed: request.arguments },
      error: null,
      durationMs: 7,
    })
  }
}

async function setup(): Promise<{ ctx: Context; provider: FakeProvider }> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(MobileRuntime, { provider: 'fake' })
  const provider = new FakeProvider()
  ctx.mobile.registerProvider(provider)
  await ctx.plugin(toolMobile, { timeoutMs: 5_000 })
  return { ctx, provider }
}

function signal(): AbortSignal {
  return new AbortController().signal
}

function resultText(result: { content: { type: string; text?: string }[] }): string {
  return result.content.filter(block => block.type === 'text').map(block => block.text).join('')
}

function fakeAgent(ctx: Context, id: string): Agent {
  const session = ctx.sessions.create(SessionId(id))
  return { id: session.id, session } as unknown as Agent
}

describe('dsh-tool-mobile parser helpers', () => {
  it('prefers nodePath taps and falls back to x/y coordinates', () => {
    expect(parseTapArgs({ nodePath: '0/1' })).toEqual({ nodePath: '0/1' })
    expect(parseTapArgs({
      nodePath: '0/1',
      strategy: 'center',
      observeAfter: true,
      screenshotAfter: true,
    })).toEqual({
      nodePath: '0/1',
      strategy: 'center',
      observeAfter: true,
      screenshotAfter: true,
    })
    expect(parseTapArgs({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 })
    expect(() => parseTapArgs({ x: 10 })).toThrow(/both x and y/)
    expect(() => parseTapArgs({ nodePath: '0/1', strategy: 'manual' })).toThrow(/strategy/)
  })

  it('validates swipe, type, app open, and confirmation inputs', () => {
    expect(parseSwipeArgs({ startX: 0, startY: 1, endX: 2, endY: 3, durationMs: 100 }))
      .toEqual({ startX: 0, startY: 1, endX: 2, endY: 3, durationMs: 100 })
    expect(parseTypeArgs({ nodePath: '0/2', text: 'hello' })).toEqual({ nodePath: '0/2', text: 'hello' })
    expect(parseTypeArgs({ nodePath: '0/2', text: 'hello', replace: true })).toEqual({ nodePath: '0/2', text: 'hello', replace: true })
    expect(parseTypeArgs({ nodePath: '0/2', text: 'hello', replace: false })).toEqual({ nodePath: '0/2', text: 'hello', replace: false })
    expect(parseAppOpenArgs({ packageName: 'com.example' })).toEqual({ packageName: 'com.example' })
    expect(parseAppListInstalledArgs({ query: 'chrome', limit: 5 })).toEqual({ query: 'chrome', limit: 5 })
    expect(parseAppOpenUrlArgs({
      url: 'https://example.com',
      packageName: 'com.android.chrome',
      observeAfter: true,
    })).toEqual({
      url: 'https://example.com',
      packageName: 'com.android.chrome',
      observeAfter: true,
    })
    expect(() => parseAppOpenUrlArgs({ url: 'ftp://example.com' })).toThrow(/http/)
    expect(parseConfirmArgs({ title: 'Send?', detail: 'Approve send' })).toEqual({ title: 'Send?', detail: 'Approve send' })
    expect(() => parseAppListInstalledArgs({ limit: 0 })).toThrow(/positive integer/)
  })

  it('validates memory search, write, and forget inputs', () => {
    expect(parseMemorySearchArgs({ query: 'browser', limit: 3 })).toEqual({ query: 'browser', limit: 3 })
    expect(parseMemoryWriteArgs({
      text: 'Prefer short summaries',
      kind: 'preference',
      metadata: { topic: 'browser' },
      sourceTaskId: 'task-1',
    })).toEqual({
      text: 'Prefer short summaries',
      kind: 'preference',
      metadata: { topic: 'browser' },
      sourceTaskId: 'task-1',
    })
    expect(parseMemoryForgetArgs({ id: 'memory-1' })).toEqual({ id: 'memory-1' })
    expect(parseAndroidShArgs({ command: 'pwd', mode: 'safe', cwd: 'tmp', timeoutMs: 1000 }))
      .toEqual({ command: 'pwd', mode: 'safe', cwd: 'tmp', timeoutMs: 1000 })
    expect(() => parseMemorySearchArgs({ query: 'browser', limit: 0 })).toThrow(/positive integer/)
    expect(() => parseMemoryWriteArgs({ text: 'x', kind: 'secret' })).toThrow(/kind must be one of/)
    expect(() => parseMemoryWriteArgs({ text: 'x', metadata: { topic: 1 } })).toThrow(/metadata.topic/)
    expect(() => parseAndroidShArgs({ command: 'pwd', mode: 'root' })).toThrow(/mode must be one of/)
  })

  it('validates explicit tap coordinate modes and apk install inputs', () => {
    expect(parseTapArgs({ normalizedX: 0.25, normalizedY: 0.75 })).toEqual({
      normalizedX: 0.25,
      normalizedY: 0.75,
    })
    expect(parseTapArgs({
      screenshotX: 120,
      screenshotY: 240,
      returnedWidth: 536,
      returnedHeight: 1194,
      originalWidth: 1280,
      originalHeight: 2856,
    })).toEqual({
      screenshotX: 120,
      screenshotY: 240,
      returnedWidth: 536,
      returnedHeight: 1194,
      originalWidth: 1280,
      originalHeight: 2856,
    })
    expect(parseApkInstallArgs({ filePath: '/data/user/0/app/files/downloads/app.apk' }))
      .toEqual({ filePath: '/data/user/0/app/files/downloads/app.apk' })
    expect(parseApkInstallArgs({ contentUri: 'content://example/app.apk' }))
      .toEqual({ contentUri: 'content://example/app.apk' })
    expect(() => parseTapArgs({ x: 1 })).toThrow(/both x and y/)
    expect(() => parseTapArgs({ screenshotX: 1, screenshotY: 2 })).toThrow(/returnedWidth/)
  })
})

describe('dsh-tool-mobile', () => {
  it('registers the expected Android tool schemas', async () => {
    const { ctx } = await setup()
    expect(ctx.tools.schemas().map(schema => schema.name).filter(name => name.includes('_')).sort()).toEqual([
      'android_sh',
      'apk_install',
      'app_close',
      'app_list_installed',
      'app_open',
      'app_open_url',
      'input_swipe',
      'input_tap',
      'input_type',
      'memory_forget',
      'memory_search',
      'memory_write',
      'screen_observe',
      'screen_screenshot',
      'user_confirm',
    ])
    expect(ctx.tools.get('mobile_visual_step')).toBeUndefined()
  })

  it('executes input_tap through ctx.mobile and returns normalized JSON text', async () => {
    const { ctx, provider } = await setup()
    const result = await ctx.tools.execute({
      signal: signal(),
      callId: CallId('tap-1'),
      name: 'input_tap',
      arguments: { nodePath: '0/1', strategy: 'accessibility_then_center', observeAfter: true },
    })

    expect(result.isError).toBe(false)
    if (result.isError) throw new Error('expected input_tap success')
    expect(provider.requests).toEqual([{
      id: 'tap-1',
      tool: 'input.tap',
      risk: 'reversible',
      arguments: { nodePath: '0/1', strategy: 'accessibility_then_center', observeAfter: true },
    }])
    expect(result.value).toEqual({
      ok: true,
      resultJson: '{"echoed":{"nodePath":"0/1","strategy":"accessibility_then_center","observeAfter":true}}',
      durationMs: 7,
    })
    expect(resultText(result)).toContain('input.tap ok in 7ms')
  })

  it('passes includeFullTree to screen_observe bridge arguments', async () => {
    const { ctx, provider } = await setup()
    const result = await ctx.tools.execute({
      signal: signal(),
      callId: CallId('observe-full-tree'),
      name: 'screen_observe',
      arguments: { includeFullTree: true },
    })

    expect(result.isError).toBe(false)
    expect(provider.requests).toEqual([{
      id: 'observe-full-tree',
      tool: 'screen.observe',
      risk: 'read_only',
      arguments: { includeFullTree: true },
    }])
  })

  it('passes summary to screen_observe bridge arguments', async () => {
    const { ctx, provider } = await setup()
    const result = await ctx.tools.execute({
      signal: signal(),
      callId: CallId('observe-summary'),
      name: 'screen_observe',
      arguments: { summary: true },
    })

    expect(result.isError).toBe(false)
    expect(provider.requests).toEqual([{
      id: 'observe-summary',
      tool: 'screen.observe',
      risk: 'read_only',
      arguments: { summary: true },
    }])
  })

  it('executes app_list_installed through ctx.mobile', async () => {
    const { ctx, provider } = await setup()
    const result = await ctx.tools.execute({
      signal: signal(),
      callId: CallId('list-apps-1'),
      name: 'app_list_installed',
      arguments: { query: 'chrome', limit: 5 },
    })

    expect(result.isError).toBe(false)
    expect(provider.requests).toEqual([{
      id: 'list-apps-1',
      tool: 'app.list_installed',
      risk: 'read_only',
      arguments: { query: 'chrome', limit: 5 },
    }])
  })

  it('executes app_open_url through ctx.mobile', async () => {
    const { ctx, provider } = await setup()
    const result = await ctx.tools.execute({
      signal: signal(),
      callId: CallId('open-url-1'),
      name: 'app_open_url',
      arguments: { url: 'https://www.google.com/search?q=Deepseek', packageName: 'com.android.chrome', screenshotAfter: true },
    })

    expect(result.isError).toBe(false)
    expect(provider.requests).toEqual([{
      id: 'open-url-1',
      tool: 'app.open_url',
      risk: 'external_side_effect',
      arguments: {
        url: 'https://www.google.com/search?q=Deepseek',
        packageName: 'com.android.chrome',
        screenshotAfter: true,
      },
    }])
  })

  it('records mobile request and response facts in the owning agent session', async () => {
    const { ctx } = await setup()
    const agent = fakeAgent(ctx, 'mobile-agent-success')
    const result = await ctx.tools.execute({
      signal: signal(),
      callId: CallId('tap-session'),
      name: 'input_tap',
      arguments: { nodePath: '0/1' },
      agent,
    })

    expect(result.isError).toBe(false)
    expect(agent.session.events.map(event => event.type)).toEqual([
      'mobile/bridge-connected',
      'mobile/tool-request',
      'mobile/tool-result',
    ])
    expect(agent.session.events[0]).toMatchObject({
      type: 'mobile/bridge-connected',
      data: {
        callId: 'tap-session',
        requestId: 'tap-session',
        tool: 'input.tap',
        status: 'listening',
        version: 'fake',
        toolCount: 1,
      },
    })
    expect(agent.session.events[1]).toMatchObject({
      type: 'mobile/tool-request',
      data: {
        callId: 'tap-session',
        requestId: 'tap-session',
        tool: 'input.tap',
        risk: 'reversible',
        argumentsJson: '{"nodePath":"0/1"}',
        bridgeSessionId: 'mobile-agent-success',
      },
    })
    expect(agent.session.events[2]).toMatchObject({
      type: 'mobile/tool-result',
      data: {
        callId: 'tap-session',
        requestId: 'tap-session',
        tool: 'input.tap',
        ok: true,
        resultJson: '{"echoed":{"nodePath":"0/1"}}',
        durationMs: 7,
      },
    })
  })

  it('executes memory_write through ctx.mobile and records mobile session facts', async () => {
    const { ctx, provider } = await setup()
    const agent = fakeAgent(ctx, 'mobile-memory-agent')
    const result = await ctx.tools.execute({
      signal: signal(),
      callId: CallId('memory-write-1'),
      name: 'memory_write',
      arguments: {
        text: 'Prefer short summaries',
        kind: 'preference',
        metadata: { topic: 'browser' },
        sourceTaskId: 'task-1',
      },
      agent,
    })

    expect(result.isError).toBe(false)
    expect(provider.requests).toContainEqual({
      id: 'memory-write-1',
      tool: 'memory.write',
      risk: 'reversible',
      arguments: {
        text: 'Prefer short summaries',
        kind: 'preference',
        metadata: { topic: 'browser' },
        sourceTaskId: 'task-1',
      },
      sessionId: 'mobile-memory-agent',
    })
    expect(agent.session.events[0]).toMatchObject({
      type: 'mobile/bridge-connected',
      data: {
        callId: 'memory-write-1',
        tool: 'memory.write',
      },
    })
    expect(agent.session.events[1]).toMatchObject({
      type: 'mobile/tool-request',
      data: {
        callId: 'memory-write-1',
        tool: 'memory.write',
        risk: 'reversible',
      },
    })
    expect(agent.session.events[2]).toMatchObject({
      type: 'mobile/tool-result',
      data: {
        callId: 'memory-write-1',
        tool: 'memory.write',
        ok: true,
      },
    })
  })

  it('records failed bridge executions before surfacing the tool error', async () => {
    const { ctx, provider } = await setup()
    provider.failure = Object.assign(new Error('bridge offline'), { code: 'MOBILE_BRIDGE_HTTP_ERROR' })
    const agent = fakeAgent(ctx, 'mobile-agent-failed')
    const result = await ctx.tools.execute({
      signal: signal(),
      callId: CallId('tap-failed'),
      name: 'input_tap',
      arguments: { nodePath: '0/1' },
      agent,
    })

    expect(result.isError).toBe(true)
    expect(agent.session.events.map(event => event.type)).toEqual([
      'mobile/bridge-connected',
      'mobile/tool-request',
      'mobile/tool-result',
    ])
    expect(agent.session.events[2]).toMatchObject({
      type: 'mobile/tool-result',
      data: {
        callId: 'tap-failed',
        requestId: 'tap-failed',
        tool: 'input.tap',
        ok: false,
        resultJson: '{}',
        error: { code: 'MOBILE_BRIDGE_HTTP_ERROR', message: 'bridge offline' },
      },
    })
  })

  it('records bridge disconnection facts when health fails before execution', async () => {
    const { ctx, provider } = await setup()
    provider.healthFailure = Object.assign(new Error('health offline'), { code: 'MOBILE_BRIDGE_HEALTH_FAILED' })
    const agent = fakeAgent(ctx, 'mobile-agent-health-failed')
    const result = await ctx.tools.execute({
      signal: signal(),
      callId: CallId('tap-health-failed'),
      name: 'input_tap',
      arguments: { nodePath: '0/1' },
      agent,
    })

    expect(result.isError).toBe(false)
    expect(agent.session.events[0]).toMatchObject({
      type: 'mobile/bridge-disconnected',
      data: {
        callId: 'tap-health-failed',
        requestId: 'tap-health-failed',
        tool: 'input.tap',
        error: { code: 'MOBILE_BRIDGE_HEALTH_FAILED', message: 'health offline' },
      },
    })
    expect(agent.session.events.map(event => event.type)).toEqual([
      'mobile/bridge-disconnected',
      'mobile/tool-request',
      'mobile/tool-result',
    ])
  })

  it('records mobile approval request and decision events around user_confirm', async () => {
    const { ctx } = await setup()
    const agent = fakeAgent(ctx, 'mobile-approval-agent')
    const result = await ctx.tools.execute({
      signal: signal(),
      callId: CallId('approval-1'),
      name: 'user_confirm',
      arguments: { title: 'Send?', detail: 'Approve sending a draft', timeoutMs: 1_000 },
      agent,
    })

    expect(result.isError).toBe(false)
    expect(agent.session.events.map(event => event.type)).toEqual([
      'mobile/bridge-connected',
      'mobile/approval-requested',
      'mobile/tool-request',
      'mobile/tool-result',
      'mobile/approval-decided',
    ])
    expect(agent.session.events[1]).toMatchObject({
      type: 'mobile/approval-requested',
      data: {
        callId: 'approval-1',
        requestId: 'approval-1',
        title: 'Send?',
        detail: 'Approve sending a draft',
        timeoutMs: 1_000,
      },
    })
    expect(agent.session.events[4]).toMatchObject({
      type: 'mobile/approval-decided',
      data: {
        callId: 'approval-1',
        requestId: 'approval-1',
        approved: true,
        durationMs: 7,
      },
    })
  })

  it('keeps a keyless snapshot of one stub mobile tool transcript', async () => {
    const { ctx } = await setup()
    const agent = fakeAgent(ctx, 'mobile-keyless-transcript')
    const result = await ctx.tools.execute({
      signal: signal(),
      callId: CallId('observe-snapshot'),
      name: 'screen_observe',
      arguments: {},
      agent,
    })

    expect(result.isError).toBe(false)
    expect(agent.session.events.map(event => ({
      type: event.type,
      data: event.data,
    }))).toMatchInlineSnapshot(`
      [
        {
          "data": {
            "callId": "observe-snapshot",
            "requestId": "observe-snapshot",
            "status": "listening",
            "tool": "screen.observe",
            "toolCount": 1,
            "version": "fake",
          },
          "type": "mobile/bridge-connected",
        },
        {
          "data": {
            "argumentsJson": "{}",
            "bridgeSessionId": "mobile-keyless-transcript",
            "callId": "observe-snapshot",
            "requestId": "observe-snapshot",
            "risk": "read_only",
            "tool": "screen.observe",
          },
          "type": "mobile/tool-request",
        },
        {
          "data": {
            "callId": "observe-snapshot",
            "durationMs": 7,
            "ok": true,
            "requestId": "observe-snapshot",
            "resultJson": "{"echoed":{}}",
            "tool": "screen.observe",
          },
          "type": "mobile/tool-result",
        },
      ]
    `)
  })

  it('surfaces parser failures as tool errors without calling the provider', async () => {
    const { ctx, provider } = await setup()
    const result = await ctx.tools.execute({
      signal: signal(),
      callId: CallId('tap-bad'),
      name: 'input_tap',
      arguments: { x: 1 },
    })
    expect(result.isError).toBe(true)
    expect(resultText(result)).toContain('both x and y')
    expect(provider.requests).toEqual([])
  })

  it('presents mobile calls with stable card titles', async () => {
    const { ctx } = await setup()
    expect(ctx.tools.get('screen_observe')?.presentCall?.({})).toEqual({
      card: 'generic',
      title: 'Observe Android screen',
      kind: 'read',
      rawInput: {},
    })
    expect(ctx.tools.get('app_open')?.presentCall?.({ packageName: 'com.example' })).toEqual({
      card: 'generic',
      title: 'Open Android app',
      kind: 'other',
      rawInput: { packageName: 'com.example' },
    })
    expect(ctx.tools.get('app_open_url')?.presentCall?.({ url: 'https://example.com' })).toEqual({
      card: 'generic',
      title: 'Open Android URL',
      kind: 'other',
      rawInput: { url: 'https://example.com' },
    })
    expect(ctx.tools.get('app_close')?.presentCall?.({})).toEqual({
      card: 'generic',
      title: 'Close Android app',
      kind: 'other',
      rawInput: {},
    })
  })

  it('renders failed bridge responses with code message and recovery hint', () => {
    expect(renderMobileOutput('user.confirm', {
      ok: false,
      resultJson: '{}',
      durationMs: 4,
      errorCode: 'approval_rejected',
      errorMessage: 'User rejected',
      recoveryHint: 'Ask for a safer action.',
    })).toBe('user.confirm failed in 4ms: approval_rejected User rejected\nRecovery hint: Ask for a safer action.')
  })

  it('renders screen_observe screenshot attachments as image blocks', () => {
    const content = renderScreenObserveOutput({
      ok: true,
      resultJson: '{"foregroundApp":"com.example"}',
      durationMs: 4,
      screenshotPath: 'reports/mobile-observe/screen.png',
      screenshotAttachment: {
        attachmentId: `sha256:${'a'.repeat(64)}`,
        mediaType: 'image/png',
        bytes: 123,
        width: 320,
        height: 640,
      },
    })

    expect(content).toHaveLength(2)
    expect(content[0]).toMatchObject({ type: 'text' })
    expect(content[1]).toMatchObject({
      type: 'image',
      attachment: {
        mediaType: 'image/png',
        width: 320,
        height: 640,
      },
    })
  })

  it('renders screenshot results without leaking base64 text into model history', () => {
    const content = renderScreenObserveOutput({
      ok: true,
      resultJson: JSON.stringify({
        mediaType: 'image/png',
        base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
        bytes: 24,
        width: 1,
        height: 1,
        originalWidth: 1280,
        originalHeight: 2856,
        returnedWidth: 536,
        returnedHeight: 1194,
        coordinateSpace: 'display',
        timestampMillis: 123,
      }),
      durationMs: 4,
      screenshotPath: 'android-bridge:screen.screenshot',
      screenshotAttachment: {
        attachmentId: `sha256:${'b'.repeat(64)}`,
        mediaType: 'image/png',
        bytes: 24,
        width: 1,
        height: 1,
      },
    })

    expect(content).toHaveLength(2)
    expect(content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('"attachmentId":"sha256:'),
    })
    expect(content[0]).toMatchObject({
      type: 'text',
      text: expect.not.stringContaining('iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'),
    })
    expect(content[0]).toMatchObject({
      type: 'text',
      text: expect.not.stringContaining('"base64"'),
    })
    expect(content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('"originalWidth":1280'),
    })
    expect(content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('"returnedHeight":1194'),
    })
    expect(content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('"coordinateSpace":"display"'),
    })
  })

  it('maps bridge recovery hints into mobile tool output', () => {
    expect(toMobileToolOutput({
      id: 'tap-1',
      ok: false,
      result: {},
      durationMs: 8,
      error: {
        code: 'system_restricted',
        message: 'Android blocked the action.',
        recoveryHint: 'Choose a visible enabled node.',
      },
    })).toMatchObject({
      ok: false,
      resultJson: '{}',
      durationMs: 8,
      errorCode: 'system_restricted',
      errorMessage: 'Android blocked the action.',
      recoveryHint: 'Choose a visible enabled node.',
    })
  })

  it('has the namespace-plugin export shape', () => {
    expect('default' in toolMobile).toBe(false)
    expect(toolMobile.name).toBe('tool-mobile')
    expect(toolMobile.inject).toEqual(['tools', 'mobile', 'systemPrompt'])
  })
})
