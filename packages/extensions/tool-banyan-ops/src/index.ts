/**
 * Model-facing Banyan server operations and search tools.
 *
 * @module @deepseek-ai/dsh-tool-banyan-ops
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-system-prompt'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'tool-banyan-ops'

/** Services required by the Banyan ops tool suite. */
export const inject = ['tools', 'systemPrompt']

/** Model-facing Banyan ops configuration. */
export interface Config {
  /** Banyan Server API base URL, including `/api/v1`. */
  readonly baseUrl?: string
  /** Optional bearer token for protected Banyan Server APIs. */
  readonly authToken?: string
  /** Environment variable that may hold a bearer token when `authToken` is absent. */
  readonly authTokenEnv?: string
  /** HTTP request timeout in milliseconds. */
  readonly timeoutMs?: number
  /** Register read-only server status. */
  readonly status?: boolean
  /** Register content search over Banyan Server search API. */
  readonly contentSearch?: boolean
  /** Register Redis reaction cache rebuild action. */
  readonly rebuildReactionCache?: boolean
  /** Register Elasticsearch content reindex action. */
  readonly reindexContent?: boolean
  /** Register expired pending upload cleanup action. */
  readonly cleanupExpiredUploads?: boolean
}

export const Config: z<Config> = z.object({
  baseUrl: z.string().default('http://127.0.0.1:8080/api/v1'),
  authToken: z.string(),
  authTokenEnv: z.string().default('BANYAN_API_TOKEN'),
  timeoutMs: z.number().step(1).min(1).default(10_000),
  status: z.boolean().default(true),
  contentSearch: z.boolean().default(true),
  rebuildReactionCache: z.boolean().default(true),
  reindexContent: z.boolean().default(true),
  cleanupExpiredUploads: z.boolean().default(true),
})

interface ResolvedConfig {
  readonly baseUrl: string
  readonly authToken?: string
  readonly authTokenEnv: string
  readonly timeoutMs: number
  readonly status: boolean
  readonly contentSearch: boolean
  readonly rebuildReactionCache: boolean
  readonly reindexContent: boolean
  readonly cleanupExpiredUploads: boolean
}

interface RequestOptions {
  readonly method?: string
  readonly path: string
  readonly query?: Record<string, string | number | boolean | undefined>
}

interface BanyanHttpResult {
  readonly ok: boolean
  readonly method: string
  readonly url: string
  readonly status?: number
  readonly durationMs: number
  readonly value?: unknown
  readonly error?: string
  readonly bodyText?: string
}

const TEXT_OUTPUT = {
  schema: { type: 'string' as const },
  render: (_args: unknown, value: string) => [{ type: 'text' as const, text: value }],
}

const PROMPT_TEXT =
  'Use Banyan ops tools to inspect and repair the Banyan backend through its audited HTTP API. '
  + 'banyan_ops_status is read-only and should be called before maintenance. '
  + 'banyan_content_search searches public/friend/self content through the server search layer, backed by Elasticsearch when enabled. '
  + 'Use banyan_reaction_cache_rebuild only when Redis reaction counters may be stale, and banyan_content_reindex only when a content item is missing or stale in Elasticsearch. '
  + 'Use banyan_upload_cleanup to abandon expired pending upload objects and free stale local object files. '
  + 'Do not bypass these tools by accessing the database directly unless the user explicitly asks for low-level diagnosis.'

/** Register enabled Banyan Server tools. */
export function apply(ctx: Context, config: Config): void {
  const resolved = resolveConfig(config)
  ctx.systemPrompt.section({
    name: 'tool:banyan-ops',
    order: 114,
    text: PROMPT_TEXT,
  })

  if (resolved.status) registerOpsStatus(ctx, resolved)
  if (resolved.contentSearch) registerContentSearch(ctx, resolved)
  if (resolved.rebuildReactionCache) registerReactionCacheRebuild(ctx, resolved)
  if (resolved.reindexContent) registerContentReindex(ctx, resolved)
  if (resolved.cleanupExpiredUploads) registerUploadCleanup(ctx, resolved)
}

function registerOpsStatus(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_ops_status',
    description: 'Read a Banyan Server operations snapshot: entity counts, outbox progress, Redis reaction-cache settings, Elasticsearch settings, Canal consumer flag, and Kafka outbox topic.',
    parameters: {},
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async () => formatHttpResult(await requestJson(config, { path: '/ops/status' })),
    presentCall: args => ({ card: 'generic', title: 'Read Banyan ops status', kind: 'read', rawInput: args }),
  }))
}

function registerContentSearch(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_content_search',
    description: 'Search Banyan shared content through the server search API. Use this for knowledge/content lookup before answering user questions about published posts or DSH skills.',
    parameters: {
      q: { type: 'string', description: 'Search query. Empty string returns recent visible content.' },
      kind: { type: 'string', enum: ['POST', 'DSH_SKILL'], description: 'Optional content kind filter.' },
      scope: { type: 'string', enum: ['public', 'friends', 'self'], description: 'Visibility scope. Defaults to public.' },
      cursor: { type: 'string', description: 'Optional search_after cursor from the previous response.' },
      limit: { type: 'integer', description: 'Result limit. Defaults to 10, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      const result = await requestJson(config, {
        path: '/search/contents',
        query: {
          q: typeof query.q === 'string' ? query.q : '',
          kind: typeof query.kind === 'string' ? query.kind : undefined,
          scope: typeof query.scope === 'string' ? query.scope : 'public',
          cursor: typeof query.cursor === 'string' ? query.cursor : undefined,
          limit: readLimit(query.limit),
        },
      })
      return formatHttpResult(result)
    },
    presentCall: args => ({ card: 'generic', title: 'Search Banyan content', kind: 'read', rawInput: args }),
  }))
}

function registerReactionCacheRebuild(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_reaction_cache_rebuild',
    description: 'Rebuild Redis reaction bitmap/cache data for one Banyan content item from authoritative database reactions. Use after detecting stale like/favorite counters.',
    parameters: {
      contentId: { type: 'string', required: true, description: 'Banyan shared content ID.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const contentId = requireString(args, 'contentId')
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: `/ops/reactions/${encodeURIComponent(contentId)}/rebuild-cache`,
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Rebuild Banyan reaction cache', kind: 'edit', rawInput: args }),
  }))
}

function registerContentReindex(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_content_reindex',
    description: 'Reindex one Banyan content item into Elasticsearch from the authoritative database row. Use when search results are missing or stale.',
    parameters: {
      contentId: { type: 'string', required: true, description: 'Banyan shared content ID.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const contentId = requireString(args, 'contentId')
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: `/ops/search/contents/${encodeURIComponent(contentId)}/index`,
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Reindex Banyan content', kind: 'edit', rawInput: args }),
  }))
}

function registerUploadCleanup(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_upload_cleanup',
    description: 'Abandon expired pending Banyan upload objects and delete any stale local dev-upload files. Use when storage grows unexpectedly or ops status shows many pending uploads.',
    parameters: {
      limit: { type: 'integer', description: 'Maximum expired pending upload objects to scan. Defaults to 200, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: '/ops/uploads/abandon-expired',
        query: {
          limit: readLimit(query.limit),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Clean Banyan expired uploads', kind: 'edit', rawInput: args }),
  }))
}

async function requestJson(config: ResolvedConfig, options: RequestOptions): Promise<BanyanHttpResult> {
  const method = options.method ?? 'GET'
  const url = buildUrl(config.baseUrl, options.path, options.query)
  const headers: Record<string, string> = { accept: 'application/json' }
  const token = config.authToken ?? process.env[config.authTokenEnv]
  if (token !== undefined && token.length > 0) {
    headers.authorization = `Bearer ${token}`
  }

  const controller = new AbortController()
  const started = Date.now()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)
  try {
    const response = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
    })
    const bodyText = await response.text()
    const value = parseJsonBody(bodyText)
    return {
      ok: response.ok,
      method,
      url,
      status: response.status,
      durationMs: Date.now() - started,
      ...value !== undefined ? { value } : { bodyText },
    }
  } catch (error) {
    return {
      ok: false,
      method,
      url,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions['query']): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const url = new URL(path.replace(/^\//, ''), normalizedBase)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function parseJsonBody(body: string): unknown {
  if (body.length === 0) return undefined
  try {
    return JSON.parse(body)
  } catch {
    return body
  }
}

function formatHttpResult(result: BanyanHttpResult): string {
  return JSON.stringify(result, null, 2)
}

function readLimit(value: unknown): number {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : 10
}

function requireString(args: unknown, key: string): string {
  const value = (args as Record<string, unknown>)[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`tool-banyan-ops: ${key} must be a non-empty string`)
  }
  return value
}

function resolveConfig(config: Config): ResolvedConfig {
  const baseUrl = config.baseUrl ?? 'http://127.0.0.1:8080/api/v1'
  const authTokenEnv = config.authTokenEnv ?? 'BANYAN_API_TOKEN'
  const timeoutMs = config.timeoutMs ?? 10_000
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new TypeError('tool-banyan-ops: timeoutMs must be a positive integer')
  }
  return {
    baseUrl,
    ...config.authToken !== undefined ? { authToken: config.authToken } : {},
    authTokenEnv,
    timeoutMs,
    status: config.status ?? true,
    contentSearch: config.contentSearch ?? true,
    rebuildReactionCache: config.rebuildReactionCache ?? true,
    reindexContent: config.reindexContent ?? true,
    cleanupExpiredUploads: config.cleanupExpiredUploads ?? true,
  }
}
