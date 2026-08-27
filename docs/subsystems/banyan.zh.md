# Banyan 宿主服务

[English](banyan.md) | 中文

Banyan 向 DSH Host 插件树贡献了两个宿主端 Cordis 服务。它们运行在 DSH Host 进程内，既不运行于浏览器，也不运行在 Banyan 后端。

## `ctx.banyanFileOps`

Banyan UI 插件需要、但必须在 DSH Host 上执行的文件系统操作。

- `copyDirectory` 通过把目录树复制到新路径来迁移 Agent 工作区，跳过默认忽略名；拒绝相同或相互嵌套的源/目标路径以及非绝对路径。
- `installBanyanSkillPackage` 把一个精选技能（`SKILL.md` 及辅助文件）写入 DSH 技能根目录，校验目录段并确保每个文件都落在目标目录之下。
- `pruneData` 删除 DSH 会话日志（`target: 'logs'`，位于 `<DSH_HOME>/sessions` 之下）或状态缓存文件（`target: 'cache'`，位于 `<DSH_HOME>/storages` 之下），保留目录，且不触碰 profiles、settings、skills、credentials 与各 Agent 工作区。

来源：[`packages/host/banyan-file-ops/src/index.ts`](../../packages/host/banyan-file-ops/src/index.ts)

## `ctx.mobile`

Android 设备桥接能力。Provider 注册一个桥接传输；Consumers 不拥有 HTTP、令牌或 Provider 选择策略，即可执行命名的 Android 工具（例如截图、观察、点击、输入、打开应用）。`MobileRuntime` 选定唯一可用的 Provider（或显式配置的一个）并暴露 `health` 与 `execute`。

来源：[`packages/mobile/mobile/src/index.ts`](../../packages/mobile/mobile/src/index.ts)

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.zh.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

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
