/**
 * Banyan host-side filesystem operations. This plugin owns privileged file
 * mutations that are needed by Banyan UI plugins but must run on the DSH Host,
 * not in the browser and not in the Banyan backend.
 * @module @blue-soda/dsh-host-banyan-file-ops
 */

import { copyFile, lstat, mkdir, readdir, readlink, stat, symlink } from 'node:fs/promises'
import { basename, dirname, join, posix, relative, resolve, win32 } from 'node:path'
import { Context, Service } from '@deepseek-ai/cordis'

const DEFAULT_DIRECTORY_COPY_SKIP_NAMES = new Set([
  '.git',
  '.hg',
  '.svn',
  '.DS_Store',
  'node_modules',
  '.pnpm-store',
  '.gradle',
  '.idea',
  '.vscode',
  'dist',
  'build',
  'out',
])

export interface DirectoryCopyOptions {
  sourcePath: string
  targetPath: string
  overwrite?: boolean
  skipNames?: string[]
  signal?: AbortSignal
}

export interface DirectoryCopyResult {
  sourcePath: string
  targetPath: string
  copiedFiles: number
  copiedDirectories: number
  skippedEntries: number
}

export class BanyanFileOpsError extends Error {
  constructor(
    message: string,
    readonly sourcePath: string,
    readonly targetPath: string,
  ) {
    super(message)
    this.name = 'BanyanFileOpsError'
  }
}

function isSameOrChildPath(parent: string, child: string): boolean {
  const rel = relative(parent, child)
  return rel === '' || (rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\') && !/^(?:[a-z]:)?[/\\]/i.test(rel))
}

function fullyQualified(path: string): boolean {
  return process.platform === 'win32'
    ? win32.isAbsolute(path) && /^(?:[A-Za-z]:[\\/]|[\\/]{2}[^\\/]+[\\/]+[^\\/]+)/.test(path)
    : posix.isAbsolute(path)
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw signal.reason instanceof Error ? signal.reason : new Error('directory copy was aborted')
}

async function copyDirectoryTree(
  sourcePath: string,
  targetPath: string,
  options: {
    overwrite: boolean
    skipNames: ReadonlySet<string>
    signal?: AbortSignal
  },
  counters: Omit<DirectoryCopyResult, 'sourcePath' | 'targetPath'>,
): Promise<void> {
  throwIfAborted(options.signal)
  await mkdir(targetPath, { recursive: true })
  counters.copiedDirectories += 1

  for (const entry of await readdir(sourcePath, { withFileTypes: true })) {
    throwIfAborted(options.signal)
    if (options.skipNames.has(entry.name)) {
      counters.skippedEntries += 1
      continue
    }
    const from = join(sourcePath, entry.name)
    const to = join(targetPath, entry.name)
    if (entry.isDirectory()) {
      await copyDirectoryTree(from, to, options, counters)
      continue
    }
    if (entry.isSymbolicLink()) {
      if (!options.overwrite && await lstat(to).then(() => true, () => false)) {
        counters.skippedEntries += 1
        continue
      }
      await symlink(await readlink(from), to)
      counters.copiedFiles += 1
      continue
    }
    if (!entry.isFile()) {
      counters.skippedEntries += 1
      continue
    }
    if (!options.overwrite && await lstat(to).then(() => true, () => false)) {
      counters.skippedEntries += 1
      continue
    }
    await mkdir(dirname(to), { recursive: true })
    await copyFile(from, to)
    counters.copiedFiles += 1
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    banyanFileOps: BanyanFileOps
  }
}

export default class BanyanFileOps extends Service {
  constructor(ctx: Context) {
    super(ctx, 'banyanFileOps')
  }

  async copyDirectory(options: DirectoryCopyOptions): Promise<DirectoryCopyResult> {
    if (!fullyQualified(options.sourcePath) || !fullyQualified(options.targetPath)) {
      throw new BanyanFileOpsError(
        'sourcePath and targetPath must be fully qualified absolute paths',
        options.sourcePath,
        options.targetPath,
      )
    }
    const sourcePath = resolve(options.sourcePath)
    const targetPath = resolve(options.targetPath)
    if (!await directoryExists(sourcePath)) {
      throw new BanyanFileOpsError(`source directory does not exist: "${sourcePath}"`, sourcePath, targetPath)
    }
    if (isSameOrChildPath(sourcePath, targetPath) || isSameOrChildPath(targetPath, sourcePath)) {
      throw new BanyanFileOpsError(
        'source and target directories must not be the same path or nested inside each other',
        sourcePath,
        targetPath,
      )
    }
    const skipNames = new Set([
      ...DEFAULT_DIRECTORY_COPY_SKIP_NAMES,
      ...(options.skipNames ?? []).map(name => basename(name)),
    ])
    const counters = { copiedFiles: 0, copiedDirectories: 0, skippedEntries: 0 }
    await copyDirectoryTree(sourcePath, targetPath, {
      overwrite: options.overwrite === true,
      skipNames,
      ...options.signal === undefined ? {} : { signal: options.signal },
    }, counters)
    return { sourcePath, targetPath, ...counters }
  }
}
