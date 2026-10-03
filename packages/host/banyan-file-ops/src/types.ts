/** Optional Banyan Host file-operation request and response fields. */
export interface DirectoryCopyOptions {
  sourcePath: string
  targetPath: string
  overwrite?: boolean
  skipNames?: string[]
  signal?: AbortSignal
}

/** Resolved copy paths and counters. */
export interface DirectoryCopyResult {
  sourcePath: string
  targetPath: string
  copiedFiles: number
  copiedDirectories: number
  skippedEntries: number
}

/** One skill-package file supplied as inline text or a download URL. */
export interface BanyanSkillPackageFile {
  path: string
  url?: string | null
  text?: string
}

/** Skill-package content, installation location, and overwrite policy. */
export interface InstallBanyanSkillPackageOptions {
  directoryName: string
  skillMd: string
  files?: BanyanSkillPackageFile[]
  targetRootPath?: string
  overwrite?: boolean
  signal?: AbortSignal
}

/** Installed skill location and file counters. */
export interface InstallBanyanSkillPackageResult {
  targetRootPath: string
  installedPath: string
  writtenFiles: number
  skippedFiles: number
}

/** Host-local data tree to prune and optional cancellation. */
export interface PruneDataOptions {
  /** Which host-local data tree to prune: session logs or the cache storage. */
  target: 'logs' | 'cache'
  signal?: AbortSignal
}

/** Resolved home and deleted-file counters. */
export interface PruneDataResult {
  /** The resolved host account home the prune ran against. */
  home: string
  /** The pruned target, echoed from the request. */
  target: 'logs' | 'cache'
  /** Number of regular files deleted. */
  files: number
  /** Total bytes freed by the deletions. */
  bytes: number
}
