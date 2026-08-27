# Banyan Host Services

English | [中文](banyan.zh.md)

Banyan contributes two host-side Cordis services to the DSH Host plugin tree. They run
inside the DSH Host process, never in the browser or in the Banyan backend.

## `ctx.banyanFileOps`

Filesystem operations that Banyan UI plugins need but that must run on the DSH Host.

- `copyDirectory` migrates an Agent workspace by copying a directory tree to a new path, skipping
  default ignore names; it refuses same-or-nested source/target and non-absolute paths.
- `installBanyanSkillPackage` writes a curated skill (a `SKILL.md` plus supporting files) into the
  DSH skills root, validating the directory segment and that every file stays under the target.
- `pruneData` deletes DSH session logs (`target: 'logs'`, below `<DSH_HOME>/sessions`) or state
  cache files (`target: 'cache'`, below `<DSH_HOME>/storages`), keeping directories and leaving
  profiles, settings, skills, credentials, and per-Agent workspaces untouched.

Source: [`packages/host/banyan-file-ops/src/index.ts`](../../packages/host/banyan-file-ops/src/index.ts)

## `ctx.mobile`

Android device bridge capability. A provider registers one bridge transport; consumers execute
named Android tools (for example screenshot, observe, tap, input, open-app) without owning HTTP,
token, or provider-selection policy. `MobileRuntime` selects a single usable provider (or one
configured explicitly) and exposes `health` and `execute`.

Source: [`packages/mobile/mobile/src/index.ts`](../../packages/mobile/mobile/src/index.ts)

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxbanyanfileops--banyanfileops"></a>

### `ctx.banyanFileOps` — `BanyanFileOps`

Host-side filesystem operations for Banyan UI plugins (workspace migration, skill install, and pruning DSH session/state data). These run on the DSH Host, not in the browser or the Banyan backend.

```ts cordis-catalog
/**
 * Recursively copy a directory tree to a target path, skipping default ignore names.
 * @param options Copy source/target paths and optional overwrite/skip rules.
 * @returns Copy counters and the resolved source/target paths.
 */
async copyDirectory(options: DirectoryCopyOptions): Promise<DirectoryCopyResult>

/**
 * Install a DSH skill package (SKILL.md + files) into the skills root.
 * @param options Package directory name, SKILL.md, files, and optional target root.
 * @returns Installed path and written/skipped file counts.
 */
async installBanyanSkillPackage(options: InstallBanyanSkillPackageOptions): Promise<InstallBanyanSkillPackageResult>

/**
 * Delete DSH session logs (target 'logs') or state cache files (target 'cache') under
 * the DSH home, keeping directories and leaving profiles/settings/skills/workspaces
 * untouched.
 * @param request Target ('logs' or 'cache') and an optional abort signal.
 * @returns Freed file/byte counts and the DSH home.
 */
async pruneData(request: PruneDataOptions): Promise<PruneDataResult>
```

Source: [`packages/host/banyan-file-ops/src/index.ts`](../../packages/host/banyan-file-ops/src/index.ts)

<a id="ctxmobile--mobileruntime"></a>

### `ctx.mobile` — `MobileRuntime`

Android bridge capability registry and execution service.

```ts cordis-catalog
/**
 * Register an Android bridge provider.
 * @param provider - provider keyed by its `id`.
 * @returns disposer that unregisters the provider.
 */
registerProvider(provider: AndroidBridgeProvider): () => void

/**
 * Read Android bridge health from the selected provider.
 * @param signal - optional cancellation signal.
 * @returns Android bridge health.
 */
async health(signal?: AbortSignal): Promise<AndroidBridgeHealth>

/**
 * Execute one Android bridge tool through the selected provider.
 * @param request - Android bridge request.
 * @param signal - optional cancellation signal.
 * @returns Android bridge response.
 */
async execute(request: AndroidToolRequest, signal?: AbortSignal): Promise<AndroidToolResponse>
```

Source: [`packages/mobile/mobile/src/index.ts`](../../packages/mobile/mobile/src/index.ts)
<!-- END GENERATED cordis-surface -->
