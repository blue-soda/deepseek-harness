/**
 * Model-facing Banyan content search and retrieval tools.
 *
 * @module @deepseek-ai/dsh-tool-banyan-search
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-system-prompt'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'tool-banyan-search'

/** Services required by the Banyan search tool suite. */
export const inject = ['tools', 'systemPrompt']

/** Model-facing Banyan search configuration. */
export interface Config {
  /** Banyan Server API base URL, including `/api/v1`. */
  readonly baseUrl?: string
  /** Optional bearer token for protected Banyan Server APIs. */
  readonly authToken?: string
  /** Environment variable that may hold a bearer token when `authToken` is absent. */
  readonly authTokenEnv?: string
  /** HTTP request timeout in milliseconds. */
  readonly timeoutMs?: number
  /** Register content search. */
  readonly contentSearch?: boolean
  /** Register single content retrieval. */
  readonly contentGet?: boolean
  /** Register knowledge chunk search. */
  readonly knowledgeSearch?: boolean
  /** Register single knowledge document retrieval. */
  readonly knowledgeGet?: boolean
}

export const Config: z<Config> = z.object({
  baseUrl: z.string().default('http://127.0.0.1:8080/api/v1'),
  authToken: z.string(),
  authTokenEnv: z.string().default('BANYAN_API_TOKEN'),
  timeoutMs: z.number().step(1).min(1).default(10_000),
  contentSearch: z.boolean().default(true),
  contentGet: z.boolean().default(true),
  knowledgeSearch: z.boolean().default(true),
  knowledgeGet: z.boolean().default(true),
})

interface ResolvedConfig {
  readonly baseUrl: string
  readonly authToken?: string
  readonly authTokenEnv: string
  readonly timeoutMs: number
  readonly contentSearch: boolean
  readonly contentGet: boolean
  readonly knowledgeSearch: boolean
  readonly knowledgeGet: boolean
}

interface RequestOptions {
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
  'Use Banyan search tools as a read-only Agentic RAG source for Banyan posts and shared DSH skills. '
  + 'Call banyan_content_search first to find candidate items, then banyan_content_get when the full Markdown body or attachments are needed. '
  + 'Call banyan_knowledge_search for personal/team knowledge snippets, then banyan_knowledge_get if the original Markdown document is needed. '
  + 'Respect each result visibility and cite content titles or authors when using retrieved information. '
  + 'These tools do not mutate Banyan Server and do not provide backend maintenance permissions.'

/** Register enabled Banyan content tools. */
export function apply(ctx: Context, config: Config): void {
  const resolved = resolveConfig(config)
  ctx.systemPrompt.section({
    name: 'tool:banyan-search',
    order: 113,
    text: PROMPT_TEXT,
  })

  if (resolved.contentSearch) registerContentSearch(ctx, resolved)
  if (resolved.contentGet) registerContentGet(ctx, resolved)
  if (resolved.knowledgeSearch) registerKnowledgeSearch(ctx, resolved)
  if (resolved.knowledgeGet) registerKnowledgeGet(ctx, resolved)
}

function registerContentSearch(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_content_search',
    description: 'Search visible Banyan shared content through the server search API. Use this to retrieve relevant posts or DSH skill shares before answering Banyan knowledge questions.',
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
      return formatHttpResult(await requestJson(config, {
        path: '/search/contents',
        query: {
          q: typeof query.q === 'string' ? query.q : '',
          kind: typeof query.kind === 'string' ? query.kind : undefined,
          scope: typeof query.scope === 'string' ? query.scope : 'public',
          cursor: typeof query.cursor === 'string' ? query.cursor : undefined,
          limit: readLimit(query.limit),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Search Banyan content', kind: 'read', rawInput: args }),
  }))
}

function registerContentGet(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_content_get',
    description: 'Fetch one visible Banyan content item by ID, including full Markdown body and attachment metadata. Use after banyan_content_search identifies a relevant item.',
    parameters: {
      contentId: { type: 'string', required: true, description: 'Banyan shared content ID.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async args => formatHttpResult(await requestJson(config, {
      path: `/contents/${encodeURIComponent(requireString(args, 'contentId'))}`,
    })),
    presentCall: args => ({ card: 'generic', title: 'Read Banyan content', kind: 'read', rawInput: args }),
  }))
}

function registerKnowledgeSearch(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_knowledge_search',
    description: 'Search visible Banyan knowledge chunks through the server knowledge API. Use this for Agentic RAG over personal or team Markdown knowledge before answering project, document, or workflow questions.',
    parameters: {
      q: { type: 'string', description: 'Search query. Empty string returns recent visible knowledge chunks.' },
      workspaceId: { type: 'string', description: 'Optional Banyan workspace ID.' },
      scope: { type: 'string', enum: ['public', 'workspace', 'self'], description: 'Visibility scope. Defaults to workspace.' },
      limit: { type: 'integer', description: 'Result limit. Defaults to 10, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        path: '/knowledge/search',
        query: {
          q: typeof query.q === 'string' ? query.q : '',
          workspaceId: typeof query.workspaceId === 'string' ? query.workspaceId : undefined,
          scope: typeof query.scope === 'string' ? query.scope : 'workspace',
          limit: readLimit(query.limit),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Search Banyan knowledge', kind: 'read', rawInput: args }),
  }))
}

function registerKnowledgeGet(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_knowledge_get',
    description: 'Fetch one visible Banyan knowledge document by ID, including the full Markdown body and chunk count. Use after banyan_knowledge_search identifies a relevant document.',
    parameters: {
      documentId: { type: 'string', required: true, description: 'Banyan knowledge document ID.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async args => formatHttpResult(await requestJson(config, {
      path: `/knowledge/documents/${encodeURIComponent(requireString(args, 'documentId'))}`,
    })),
    presentCall: args => ({ card: 'generic', title: 'Read Banyan knowledge', kind: 'read', rawInput: args }),
  }))
}

async function requestJson(config: ResolvedConfig, options: RequestOptions): Promise<BanyanHttpResult> {
  const method = 'GET'
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
    const response = await fetch(url, { method, headers, signal: controller.signal })
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
    throw new TypeError(`tool-banyan-search: ${key} must be a non-empty string`)
  }
  return value
}

function resolveConfig(config: Config): ResolvedConfig {
  const baseUrl = config.baseUrl ?? 'http://127.0.0.1:8080/api/v1'
  const authTokenEnv = config.authTokenEnv ?? 'BANYAN_API_TOKEN'
  const timeoutMs = config.timeoutMs ?? 10_000
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new TypeError('tool-banyan-search: timeoutMs must be a positive integer')
  }
  return {
    baseUrl,
    ...config.authToken !== undefined ? { authToken: config.authToken } : {},
    authTokenEnv,
    timeoutMs,
    contentSearch: config.contentSearch ?? true,
    contentGet: config.contentGet ?? true,
    knowledgeSearch: config.knowledgeSearch ?? true,
    knowledgeGet: config.knowledgeGet ?? true,
  }
}
