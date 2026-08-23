/**
 * Android bridge implementation of the subprocess seam.
 * @module @deepseek-ai/dsh-subprocess-android
 */

import type { Readable, Writable } from 'node:stream'
import type { Context } from '@deepseek-ai/cordis'
import { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess'
import type {
  SubprocessCollectedOutputs,
  SubprocessHandle,
  SubprocessOutputRead,
  SubprocessOutputReader,
  SubprocessSpawnSpec,
  SubprocessTerminalHandle,
  SubprocessTerminalSpawnSpec,
} from '@deepseek-ai/dsh-subprocess'
import type {} from '@deepseek-ai/dsh-mobile'

export const name = 'subprocess-android'
export const inject = ['mobile']

export interface Config {
  /** Bridge shell mode: safe, approval, or max. */
  mode?: AndroidShellMode
  /** Absolute Android workspace root used to make cwd bridge-relative. */
  workspaceRoot?: string
  /** Output cap requested from the Android bridge. */
  maxOutputBytes?: number
}

type AndroidShellMode = 'safe' | 'approval' | 'max'

interface AndroidShellResult {
  readonly exitCode: number | null
  readonly timedOut: boolean
  readonly stdout: string
  readonly stderr: string
  readonly stdoutTruncated: boolean
  readonly stderrTruncated: boolean
}

const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024
const SHELL_MODES = new Set<AndroidShellMode>(['safe', 'approval', 'max'])

export class AndroidSubprocessRuntime extends SubprocessRuntime {
  private readonly mode: AndroidShellMode
  private readonly workspaceRoot: string | undefined
  private readonly maxOutputBytes: number
  private readonly live = new Set<AndroidSubprocessHandle>()

  constructor(ctx: Context, config: Config = {}) {
    super(ctx)
    const mode = config.mode ?? 'safe'
    if (!SHELL_MODES.has(mode)) throw new Error('subprocess-android: mode must be safe, approval, or max')
    this.mode = mode
    this.workspaceRoot = config.workspaceRoot ?? process.env.DSH_ANDROID_SHELL_WORKSPACE_ROOT
    this.maxOutputBytes = config.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
    ctx.effect(() => async () => {
      for (const handle of this.live) handle.terminate()
      await Promise.allSettled([...this.live].map(handle => handle.done))
      this.live.clear()
    }, 'android subprocess teardown')
  }

  async resolveExecutable(command: string, _env?: Readonly<Record<string, string>>, signal?: AbortSignal): Promise<string> {
    if (command.length === 0) throw new Error('subprocess-android: executable must be non-empty')
    if (command.includes('/') || command.includes('\\')) {
      if (command.startsWith('/')) return command
      throw new Error('subprocess-android: executable must be an absolute path or a bare PATH name')
    }
    if (command === 'bash') return '/system/bin/sh'
    const output = await this.ctx.mobile.execute({
      id: `subprocess-android:resolve:${command}`,
      tool: 'shell.exec',
      risk: 'sensitive',
      arguments: {
        command: `command -v ${quoteShell(command)}`,
        mode: 'safe',
        timeoutMs: 5_000,
        maxOutputBytes: 4_096,
      },
    }, signal)
    const result = parseAndroidShellResult(output.result)
    if (!output.ok || result.exitCode !== 0) {
      throw new Error(`subprocess-android: command ${JSON.stringify(command)} was not found on PATH`)
    }
    const resolved = result.stdout.trim().split(/\r?\n/u)[0]
    if (resolved === undefined || resolved.length === 0) {
      throw new Error(`subprocess-android: command ${JSON.stringify(command)} resolved to an empty path`)
    }
    return resolved
  }

  spawn(spec: SubprocessSpawnSpec): SubprocessHandle {
    validateSupportedStdio(spec)
    const handle = new AndroidSubprocessHandle(this.run(spec), isCollectMode(spec.stdio.stdout), isCollectMode(spec.stdio.stderr))
    this.live.add(handle)
    handle.done.finally(() => this.live.delete(handle)).catch(() => {})
    return handle
  }

  spawnTerminal(_spec: SubprocessTerminalSpawnSpec): Promise<SubprocessTerminalHandle> {
    return Promise.reject(new Error('subprocess-android: terminal PTY allocation is not supported by the Android bridge yet'))
  }

  private async run(spec: SubprocessSpawnSpec): Promise<AndroidShellResult> {
    const timeoutMs = Math.max(100, Math.min(spec.graceMs + 60_000, 60_000))
    const command = commandFromArgv(spec.argv)
    const stdin = typeof spec.stdio.stdin === 'object' ? spec.stdio.stdin.data : undefined
    const bridgeCommand = stdin === undefined
      ? command
      : `cat <<'__DSH_STDIN__' | (${command})\n${stdin.replaceAll('__DSH_STDIN__', '__DSH_STDIN_ESCAPED__')}\n__DSH_STDIN__`
    const response = await this.ctx.mobile.execute({
      id: `subprocess-android:spawn:${Date.now()}`,
      tool: 'shell.exec',
      risk: 'sensitive',
      arguments: {
        command: bridgeCommand,
        cwd: cwdRelativeToWorkspace(spec.cwd, this.workspaceRoot),
        mode: this.mode,
        timeoutMs,
        maxOutputBytes: this.maxOutputBytes,
      },
    }, spec.signal)
    const result = parseAndroidShellResult(response.result)
    if (response.error !== null && result.exitCode === null && !result.timedOut) {
      throw new Error(`subprocess-android: ${response.error.message}`)
    }
    return result
  }
}

class AndroidSubprocessHandle implements SubprocessHandle {
  readonly pid = -1
  readonly stdin: Writable | undefined = undefined
  readonly stdout: Readable | undefined = undefined
  readonly stderr: Readable | undefined = undefined
  readonly collected: SubprocessCollectedOutputs
  readonly done: Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>

  private terminated = false
  private readonly stdoutReader = new BufferedOutputReader()
  private readonly stderrReader = new BufferedOutputReader()

  constructor(running: Promise<AndroidShellResult>, collectStdout: boolean, collectStderr: boolean) {
    this.collected = {
      ...collectStdout ? { stdout: this.stdoutReader } : {},
      ...collectStderr ? { stderr: this.stderrReader } : {},
    }
    this.done = running.then((result) => {
      this.stdoutReader.settle(result.stdout, result.stdoutTruncated)
      this.stderrReader.settle(result.stderr, result.stderrTruncated)
      if (this.terminated) return { exitCode: null, signal: 'SIGTERM' }
      return {
        exitCode: result.exitCode,
        signal: result.timedOut ? 'SIGKILL' : null,
      }
    })
  }

  terminate(): void {
    this.terminated = true
  }

  async waitForExit(signal?: AbortSignal): Promise<boolean> {
    if (signal?.aborted === true) return false
    await this.done
    return !(signal?.aborted ?? false)
  }
}

class BufferedOutputReader implements SubprocessOutputReader {
  private text = ''
  private truncated = false

  settle(text: string, truncated: boolean): void {
    this.text = text
    this.truncated = truncated
  }

  readFrom(fromByte: number): SubprocessOutputRead {
    const bounded = Math.max(0, Math.min(fromByte, this.text.length))
    return {
      text: this.text.slice(bounded),
      nextOffset: this.text.length,
      lossy: this.truncated || bounded !== fromByte,
    }
  }
}

export function commandFromArgv(argv: readonly string[]): string {
  const [program, ...args] = argv
  if (program === undefined || program.length === 0) throw new Error('subprocess-android: argv must contain a program')
  if ((program === 'bash' || program === 'sh' || program === '/system/bin/sh') && args[0] === '-c') {
    const command = args[1]
    if (command === undefined) throw new Error('subprocess-android: shell -c requires a command')
    return command
  }
  return argv.map(quoteShell).join(' ')
}

export function cwdRelativeToWorkspace(cwd: string, workspaceRoot: string | undefined): string {
  if (cwd.length === 0 || cwd === '.') return '.'
  if (workspaceRoot === undefined || workspaceRoot.length === 0) return cwd.startsWith('/') ? '.' : cwd
  const normalizedRoot = trimTrailingSlash(workspaceRoot)
  if (cwd === normalizedRoot) return '.'
  const prefix = `${normalizedRoot}/`
  if (cwd.startsWith(prefix)) return cwd.slice(prefix.length) || '.'
  return cwd.startsWith('/') ? '.' : cwd
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') && value.length > 1 ? value.replace(/\/+$/u, '') : value
}

function validateSupportedStdio(spec: SubprocessSpawnSpec): void {
  if (spec.stdio.stdin === 'pipe' || spec.stdio.stdout === 'pipe' || spec.stdio.stderr === 'pipe') {
    throw new Error('subprocess-android: raw stdio pipes are not supported by the Android bridge yet')
  }
}

function isCollectMode(value: SubprocessSpawnSpec['stdio']['stdout']): boolean {
  return typeof value === 'object'
}

function parseAndroidShellResult(value: Record<string, unknown>): AndroidShellResult {
  return {
    exitCode: value.exitCode === null ? null : numberField(value.exitCode, 'exitCode'),
    timedOut: booleanField(value.timedOut, 'timedOut'),
    stdout: stringField(value.stdout, 'stdout'),
    stderr: stringField(value.stderr, 'stderr'),
    stdoutTruncated: booleanField(value.stdoutTruncated, 'stdoutTruncated'),
    stderrTruncated: booleanField(value.stderrTruncated, 'stderrTruncated'),
  }
}

function quoteShell(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

function numberField(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`subprocess-android: ${path} must be a number`)
  return value
}

function booleanField(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`subprocess-android: ${path} must be a boolean`)
  return value
}

function stringField(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new Error(`subprocess-android: ${path} must be a string`)
  return value
}

export function apply(ctx: Context, config: Config): void {
  void new AndroidSubprocessRuntime(ctx, config)
}

export default AndroidSubprocessRuntime
