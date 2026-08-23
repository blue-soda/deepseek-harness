import { Context } from '@deepseek-ai/cordis'
import MobileRuntime from '@deepseek-ai/dsh-mobile'
import type { AndroidBridgeHealth, AndroidBridgeProvider, AndroidToolRequest, AndroidToolResponse } from '@deepseek-ai/dsh-mobile'
import { describe, expect, it } from 'vitest'
import AndroidSubprocessRuntime, { commandFromArgv, cwdRelativeToWorkspace } from '../src/index.ts'

class FakeProvider implements AndroidBridgeProvider {
  readonly id = 'fake'
  readonly requests: AndroidToolRequest[] = []
  result: Record<string, unknown> = {
    exitCode: 0,
    timedOut: false,
    stdout: 'ok\n',
    stderr: '',
    stdoutTruncated: false,
    stderrTruncated: false,
  }

  available(): boolean {
    return true
  }

  health(): Promise<AndroidBridgeHealth> {
    return Promise.resolve({ status: 'connected', version: 'fake', tools: [] })
  }

  execute(request: AndroidToolRequest): Promise<AndroidToolResponse> {
    this.requests.push(request)
    return Promise.resolve({
      id: request.id,
      ok: true,
      result: this.result,
      error: null,
      durationMs: 1,
    })
  }
}

async function setup(): Promise<{ ctx: Context; provider: FakeProvider }> {
  const ctx = new Context()
  await ctx.plugin(MobileRuntime, { provider: 'fake' })
  const provider = new FakeProvider()
  ctx.mobile.registerProvider(provider)
  await ctx.plugin(AndroidSubprocessRuntime, { workspaceRoot: '/data/workspace' })
  return { ctx, provider }
}

describe('android subprocess provider', () => {
  it('maps shell argv and cwd to the Android bridge shell tool', async () => {
    const { ctx, provider } = await setup()
    const handle = ctx.subprocess.spawn({
      argv: ['bash', '-c', 'echo ok'],
      cwd: '/data/workspace/project',
      stdio: {
        stdin: 'ignore',
        stdout: { maxBytes: 1024 },
        stderr: { maxBytes: 1024 },
      },
      graceMs: 1000,
    })

    await expect(handle.done).resolves.toEqual({ exitCode: 0, signal: null })
    expect(handle.collected.stdout?.readFrom(0)).toMatchObject({ text: 'ok\n', nextOffset: 3, lossy: false })
    expect(provider.requests[0]).toMatchObject({
      tool: 'shell.exec',
      arguments: { command: 'echo ok', cwd: 'project', mode: 'safe' },
    })
  })

  it('quotes non-shell argv through /system/bin/sh', () => {
    expect(commandFromArgv(['echo', "it's", 'ok'])).toBe("'echo' 'it'\\''s' 'ok'")
    expect(commandFromArgv(['sh', '-c', 'echo direct'])).toBe('echo direct')
  })

  it('maps cwd outside the Android workspace to bridge default cwd', () => {
    expect(cwdRelativeToWorkspace('/data/workspace', '/data/workspace/')).toBe('.')
    expect(cwdRelativeToWorkspace('/data/workspace/a/b', '/data/workspace')).toBe('a/b')
    expect(cwdRelativeToWorkspace('/other', '/data/workspace')).toBe('.')
  })
})
