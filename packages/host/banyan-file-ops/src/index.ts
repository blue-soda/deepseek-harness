/**
 * Banyan host-side filesystem operations. This plugin owns privileged file
 * mutations that are needed by Banyan UI plugins but must run on the DSH Host,
 * not in the browser and not in the Banyan backend.
 * @module @blue-soda/dsh-host-banyan-file-ops
 */

import { copyFile, lstat, mkdir, readFile, readdir, readlink, stat, symlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join, posix, relative, resolve, win32 } from 'node:path'
import { Context, Service } from '@deepseek-ai/cordis'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

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

export interface BanyanSkillPackageFile {
  path: string
  url?: string | null
  text?: string
}

export interface InstallBanyanSkillPackageOptions {
  directoryName: string
  skillMd: string
  files?: BanyanSkillPackageFile[]
  targetRootPath?: string
  overwrite?: boolean
  signal?: AbortSignal
}

export interface InstallBanyanSkillPackageResult {
  targetRootPath: string
  installedPath: string
  writtenFiles: number
  skippedFiles: number
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

const SKILL_DIRECTORY_NAME = /^[a-z0-9][a-z0-9._-]{0,119}$/i

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

function safeRelativeFilePath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '')
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length === 0 || parts.some(part => part === '.' || part === '..')) {
    throw new Error(`invalid skill package file path: ${JSON.stringify(path)}`)
  }
  return parts.join(posix.sep)
}

async function pathExists(path: string): Promise<boolean> {
  return await lstat(path).then(() => true, () => false)
}

async function fetchText(url: string, signal: AbortSignal | undefined): Promise<string> {
  const response = await fetch(url, signal === undefined ? undefined : { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${url}`)
  return await response.text()
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

  async installBanyanSkillPackage(options: InstallBanyanSkillPackageOptions): Promise<InstallBanyanSkillPackageResult> {
    const directoryName = options.directoryName.trim()
    if (!SKILL_DIRECTORY_NAME.test(directoryName) || directoryName === '.' || directoryName === '..') {
      throw new BanyanFileOpsError(
        'directoryName must be a safe single skill directory segment',
        directoryName,
        directoryName,
      )
    }
    const targetRootPath = resolve(options.targetRootPath ?? join(resolveDshHome(), 'skills'))
    const installedPath = resolve(join(targetRootPath, directoryName))
    if (!isSameOrChildPath(targetRootPath, installedPath)) {
      throw new BanyanFileOpsError('skill package target must stay below the skill root', targetRootPath, installedPath)
    }
    if (!options.overwrite && await pathExists(installedPath)) {
      throw new BanyanFileOpsError(`skill directory already exists: "${installedPath}"`, targetRootPath, installedPath)
    }
    throwIfAborted(options.signal)
    await mkdir(installedPath, { recursive: true })
    await writeFile(join(installedPath, 'SKILL.md'), options.skillMd, { encoding: 'utf8', mode: 0o600 })
    let writtenFiles = 1
    let skippedFiles = 0
    for (const file of options.files ?? []) {
      throwIfAborted(options.signal)
      const relativePath = safeRelativeFilePath(file.path)
      if (relativePath === 'SKILL.md') {
        skippedFiles += 1
        continue
      }
      const destination = resolve(join(installedPath, relativePath))
      if (!isSameOrChildPath(installedPath, destination)) {
        throw new BanyanFileOpsError('skill package file escaped the installed directory', installedPath, destination)
      }
      if (!options.overwrite && await pathExists(destination)) {
        skippedFiles += 1
        continue
      }
      await mkdir(dirname(destination), { recursive: true })
      const text = file.text ?? (file.url == null ? undefined : await fetchText(file.url, options.signal))
      if (text === undefined) {
        skippedFiles += 1
        continue
      }
      await writeFile(destination, text, { encoding: 'utf8', mode: 0o600 })
      writtenFiles += 1
    }
    try {
      await readFile(join(installedPath, 'SKILL.md'), 'utf8')
    } catch (error) {
      throw new BanyanFileOpsError(
        `installed SKILL.md cannot be read: ${error instanceof Error ? error.message : String(error)}`,
        targetRootPath,
        installedPath,
      )
    }
    return { targetRootPath, installedPath, writtenFiles, skippedFiles }
  }
}
