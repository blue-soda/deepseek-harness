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
  /** Register read-only infrastructure health checks. */
  readonly health?: boolean
  /** Register read-only Kafka consumer lag inspection. */
  readonly kafkaLag?: boolean
  /** Register read-only recent operations audit log. */
  readonly auditRecent?: boolean
  /** Register content search over Banyan Server search API. */
  readonly contentSearch?: boolean
  /** Register Redis reaction cache rebuild action. */
  readonly rebuildReactionCache?: boolean
  /** Register bounded Redis reaction cache rebuild action for published content. */
  readonly rebuildPublishedReactionCaches?: boolean
  /** Register Redis content detail cache eviction action. */
  readonly evictContentCache?: boolean
  /** Register Redis content detail cache warm action. */
  readonly warmContentCache?: boolean
  /** Register denormalized content reaction counter rebuild action. */
  readonly rebuildContentCounters?: boolean
  /** Register bounded denormalized content reaction counter rebuild action for published content. */
  readonly rebuildPublishedContentCounters?: boolean
  /** Register Redis public feed projection rebuild action. */
  readonly rebuildPublicFeed?: boolean
  /** Register Elasticsearch content reindex action. */
  readonly reindexContent?: boolean
  /** Register Elasticsearch content index ensure action. */
  readonly ensureContentIndex?: boolean
  /** Register read-only Elasticsearch content index inspection. */
  readonly inspectContentIndex?: boolean
  /** Register bulk published-content reindex action. */
  readonly reindexPublishedContent?: boolean
  /** Register read-only Elasticsearch knowledge index inspection. */
  readonly inspectKnowledgeIndex?: boolean
  /** Register Elasticsearch knowledge index ensure action. */
  readonly ensureKnowledgeIndex?: boolean
  /** Register one knowledge document reindex action. */
  readonly reindexKnowledgeDocument?: boolean
  /** Register bulk knowledge document reindex action. */
  readonly reindexKnowledgeDocuments?: boolean
  /** Register expired pending upload cleanup action. */
  readonly cleanupExpiredUploads?: boolean
  /** Register outbox projection replay action. */
  readonly replayOutbox?: boolean
  /** Register read-only recent failed outbox event inspection. */
  readonly failedOutboxRecent?: boolean
  /** Register failed outbox projection retry action. */
  readonly retryFailedOutbox?: boolean
}

export const Config: z<Config> = z.object({
  baseUrl: z.string().default('http://127.0.0.1:8080/api/v1'),
  authToken: z.string(),
  authTokenEnv: z.string().default('BANYAN_API_TOKEN'),
  timeoutMs: z.number().step(1).min(1).default(10_000),
  status: z.boolean().default(true),
  health: z.boolean().default(true),
  kafkaLag: z.boolean().default(true),
  auditRecent: z.boolean().default(true),
  contentSearch: z.boolean().default(true),
  rebuildReactionCache: z.boolean().default(true),
  rebuildPublishedReactionCaches: z.boolean().default(true),
  evictContentCache: z.boolean().default(true),
  warmContentCache: z.boolean().default(true),
  rebuildContentCounters: z.boolean().default(true),
  rebuildPublishedContentCounters: z.boolean().default(true),
  rebuildPublicFeed: z.boolean().default(true),
  reindexContent: z.boolean().default(true),
  ensureContentIndex: z.boolean().default(true),
  inspectContentIndex: z.boolean().default(true),
  reindexPublishedContent: z.boolean().default(true),
  inspectKnowledgeIndex: z.boolean().default(true),
  ensureKnowledgeIndex: z.boolean().default(true),
  reindexKnowledgeDocument: z.boolean().default(true),
  reindexKnowledgeDocuments: z.boolean().default(true),
  cleanupExpiredUploads: z.boolean().default(true),
  replayOutbox: z.boolean().default(true),
  failedOutboxRecent: z.boolean().default(true),
  retryFailedOutbox: z.boolean().default(true),
})

interface ResolvedConfig {
  readonly baseUrl: string
  readonly authToken?: string
  readonly authTokenEnv: string
  readonly timeoutMs: number
  readonly status: boolean
  readonly health: boolean
  readonly kafkaLag: boolean
  readonly auditRecent: boolean
  readonly contentSearch: boolean
  readonly rebuildReactionCache: boolean
  readonly rebuildPublishedReactionCaches: boolean
  readonly evictContentCache: boolean
  readonly warmContentCache: boolean
  readonly rebuildContentCounters: boolean
  readonly rebuildPublishedContentCounters: boolean
  readonly rebuildPublicFeed: boolean
  readonly reindexContent: boolean
  readonly ensureContentIndex: boolean
  readonly inspectContentIndex: boolean
  readonly reindexPublishedContent: boolean
  readonly inspectKnowledgeIndex: boolean
  readonly ensureKnowledgeIndex: boolean
  readonly reindexKnowledgeDocument: boolean
  readonly reindexKnowledgeDocuments: boolean
  readonly cleanupExpiredUploads: boolean
  readonly replayOutbox: boolean
  readonly failedOutboxRecent: boolean
  readonly retryFailedOutbox: boolean
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
  + 'banyan_ops_status is read-only and should be called before maintenance; banyan_ops_health actively checks Redis, Elasticsearch, and Kafka connectivity; banyan_kafka_lag inspects consumer lag for the Canal/Kafka projection topic; banyan_ops_audit_recent shows who recently ran maintenance actions. '
  + 'banyan_content_search searches public/friend/self content through the server search layer, backed by Elasticsearch when enabled. '
  + 'Use banyan_content_cache_evict or banyan_content_cache_warm for stale content details, banyan_content_counters_rebuild for stale denormalized like/favorite counts, banyan_reaction_cache_rebuild for one stale Redis reaction bitmap, banyan_reaction_cache_rebuild_published after Redis cache loss, and banyan_content_reindex only when a content item is missing or stale in Elasticsearch. '
  + 'Use banyan_content_feed_rebuild_public when the public sharing feed is empty or out of order after Redis loss or projection outages. '
  + 'Use banyan_content_index_inspect before Elasticsearch maintenance to check whether the content index exists and how many documents it contains, banyan_content_index_ensure if the index may be missing, and banyan_content_reindex_published to rebuild a bounded page of published content. '
  + 'Use banyan_knowledge_index_inspect before knowledge/RAG index maintenance, banyan_knowledge_index_ensure if the knowledge index may be missing, banyan_knowledge_reindex_document for one stale document, and banyan_knowledge_reindex_documents after Elasticsearch resets or ingestion outages. '
  + 'Use banyan_upload_cleanup to abandon expired pending upload objects and free stale local object files. '
  + 'Use banyan_outbox_failed_recent when ops status reports failed outbox projections, banyan_outbox_retry_failed to retry those failures, and banyan_outbox_replay to replay stored outbox events after broader consumer outages or local test resets. '
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
  if (resolved.health) registerOpsHealth(ctx, resolved)
  if (resolved.kafkaLag) registerKafkaLag(ctx, resolved)
  if (resolved.auditRecent) registerOpsAuditRecent(ctx, resolved)
  if (resolved.contentSearch) registerContentSearch(ctx, resolved)
  if (resolved.rebuildReactionCache) registerReactionCacheRebuild(ctx, resolved)
  if (resolved.rebuildPublishedReactionCaches) registerPublishedReactionCacheRebuild(ctx, resolved)
  if (resolved.evictContentCache) registerContentCacheEvict(ctx, resolved)
  if (resolved.warmContentCache) registerContentCacheWarm(ctx, resolved)
  if (resolved.rebuildContentCounters) registerContentCountersRebuild(ctx, resolved)
  if (resolved.rebuildPublishedContentCounters) registerPublishedContentCountersRebuild(ctx, resolved)
  if (resolved.rebuildPublicFeed) registerPublicFeedRebuild(ctx, resolved)
  if (resolved.reindexContent) registerContentReindex(ctx, resolved)
  if (resolved.inspectContentIndex) registerContentIndexInspect(ctx, resolved)
  if (resolved.ensureContentIndex) registerContentIndexEnsure(ctx, resolved)
  if (resolved.reindexPublishedContent) registerPublishedContentReindex(ctx, resolved)
  if (resolved.inspectKnowledgeIndex) registerKnowledgeIndexInspect(ctx, resolved)
  if (resolved.ensureKnowledgeIndex) registerKnowledgeIndexEnsure(ctx, resolved)
  if (resolved.reindexKnowledgeDocument) registerKnowledgeDocumentReindex(ctx, resolved)
  if (resolved.reindexKnowledgeDocuments) registerKnowledgeDocumentsReindex(ctx, resolved)
  if (resolved.cleanupExpiredUploads) registerUploadCleanup(ctx, resolved)
  if (resolved.replayOutbox) registerOutboxReplay(ctx, resolved)
  if (resolved.failedOutboxRecent) registerOutboxFailedRecent(ctx, resolved)
  if (resolved.retryFailedOutbox) registerOutboxRetryFailed(ctx, resolved)
}

function registerOpsAuditRecent(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_ops_audit_recent',
    description: 'Read recent Banyan Server operations audit log entries. Use before or after maintenance to explain what changed, who requested it, and whether it was accepted.',
    parameters: {
      limit: { type: 'integer', description: 'Maximum audit rows to return. Defaults to 50, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        path: '/ops/audit/recent',
        query: {
          limit: readLimit(query.limit, 50),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Read Banyan ops audit log', kind: 'read', rawInput: args }),
  }))
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

function registerOpsHealth(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_ops_health',
    description: 'Actively check Banyan infrastructure health over the audited backend API. Returns Redis, Elasticsearch, and Kafka UP/DOWN/SKIPPED states with latency and concise error messages.',
    parameters: {},
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async () => formatHttpResult(await requestJson(config, { path: '/ops/health' })),
    presentCall: args => ({ card: 'generic', title: 'Check Banyan infrastructure health', kind: 'read', rawInput: args }),
  }))
}

function registerKafkaLag(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_kafka_lag',
    description: 'Inspect Kafka consumer lag for Banyan projection consumers through the audited backend API. Use when Canal/Kafka is healthy but Redis, Elasticsearch, notifications, or feed projections appear delayed.',
    parameters: {
      groupId: { type: 'string', description: 'Optional Kafka consumer group id. Defaults to the Banyan Server consumer group.' },
      topic: { type: 'string', description: 'Optional Kafka topic. Defaults to the Banyan outbox topic.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        path: '/ops/kafka/lag',
        query: {
          groupId: typeof query.groupId === 'string' ? query.groupId : undefined,
          topic: typeof query.topic === 'string' ? query.topic : undefined,
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Read Banyan Kafka consumer lag', kind: 'read', rawInput: args }),
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

function registerPublishedReactionCacheRebuild(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_reaction_cache_rebuild_published',
    description: 'Rebuild Redis reaction bitmap/cache data for a bounded page of published Banyan content from authoritative database reactions. Use after Redis cache loss or a local reset.',
    parameters: {
      limit: { type: 'integer', description: 'Maximum published content rows to scan. Defaults to 200, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: '/ops/reactions/rebuild-published',
        query: {
          limit: readLimit(query.limit, 200),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Rebuild published Banyan reaction caches', kind: 'edit', rawInput: args }),
  }))
}

function registerContentCacheEvict(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_content_cache_evict',
    description: 'Evict the Redis content detail cache for one Banyan content item. Use when a content detail page looks stale while the database row is expected to be authoritative.',
    parameters: {
      contentId: { type: 'string', required: true, description: 'Banyan shared content ID.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const contentId = requireString(args, 'contentId')
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: `/ops/cache/contents/${encodeURIComponent(contentId)}/evict`,
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Evict Banyan content cache', kind: 'edit', rawInput: args }),
  }))
}

function registerContentCacheWarm(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_content_cache_warm',
    description: 'Rebuild the Redis content detail cache for one Banyan content item from the authoritative database row. Use after evicting stale content cache or before a demo of a known hot content item.',
    parameters: {
      contentId: { type: 'string', required: true, description: 'Banyan shared content ID.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const contentId = requireString(args, 'contentId')
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: `/ops/cache/contents/${encodeURIComponent(contentId)}/warm`,
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Warm Banyan content cache', kind: 'edit', rawInput: args }),
  }))
}

function registerContentCountersRebuild(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_content_counters_rebuild',
    description: 'Rebuild denormalized Banyan content like/favorite counters from authoritative reaction rows, then evict detail cache and refresh the search document. Use when counters or Elasticsearch ranking look stale.',
    parameters: {
      contentId: { type: 'string', required: true, description: 'Banyan shared content ID.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const contentId = requireString(args, 'contentId')
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: `/ops/counters/contents/${encodeURIComponent(contentId)}/rebuild`,
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Rebuild Banyan content counters', kind: 'edit', rawInput: args }),
  }))
}

function registerPublishedContentCountersRebuild(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_content_counters_rebuild_published',
    description: 'Rebuild denormalized like/favorite counters for a bounded page of published Banyan content from authoritative reaction rows. Use after event projection outages or disaster recovery replay.',
    parameters: {
      limit: { type: 'integer', description: 'Maximum published content rows to scan. Defaults to 200, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: '/ops/counters/contents/rebuild-published',
        query: {
          limit: readLimit(query.limit, 200),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Rebuild published Banyan content counters', kind: 'edit', rawInput: args }),
  }))
}

function registerPublicFeedRebuild(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_content_feed_rebuild_public',
    description: 'Rebuild the Redis public Banyan content feed projection from published public database rows. Use when the sharing feed is empty, missing recent public content, or out of order after Redis loss or projection outages.',
    parameters: {
      kind: { type: 'string', enum: ['POST', 'DSH_SKILL'], description: 'Optional content kind to rebuild. Omit to rebuild all public feed kinds.' },
      limit: { type: 'integer', description: 'Maximum published content rows to scan. Defaults to 500, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: '/ops/feed/public/rebuild',
        query: {
          kind: typeof query.kind === 'string' ? query.kind : undefined,
          limit: readLimit(query.limit, 500),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Rebuild Banyan public feed', kind: 'edit', rawInput: args }),
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

function registerContentIndexEnsure(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_content_index_ensure',
    description: 'Create the Banyan Elasticsearch content index if it is missing. Use before bulk reindexing or after local Elasticsearch resets.',
    parameters: {},
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async () => formatHttpResult(await requestJson(config, {
      method: 'POST',
      path: '/ops/search/contents/index/ensure',
    })),
    presentCall: args => ({ card: 'generic', title: 'Ensure Banyan content search index', kind: 'edit', rawInput: args }),
  }))
}

function registerContentIndexInspect(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_content_index_inspect',
    description: 'Inspect the configured Banyan Elasticsearch content index through the audited backend API. Returns enabled, ok, exists, and documentCount. Use before ensure/reindex or when search results look missing or stale.',
    parameters: {},
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async () => formatHttpResult(await requestJson(config, {
      path: '/ops/search/contents/index/inspect',
    })),
    presentCall: args => ({ card: 'generic', title: 'Inspect Banyan content search index', kind: 'read', rawInput: args }),
  }))
}

function registerPublishedContentReindex(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_content_reindex_published',
    description: 'Bulk reindex a bounded page of published Banyan content into Elasticsearch from authoritative database rows. Use after search index loss or projection outages.',
    parameters: {
      limit: { type: 'integer', description: 'Maximum published content rows to scan. Defaults to 200, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: '/ops/search/contents/reindex-published',
        query: {
          limit: readLimit(query.limit, 200),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Reindex published Banyan content', kind: 'edit', rawInput: args }),
  }))
}

function registerKnowledgeIndexInspect(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_knowledge_index_inspect',
    description: 'Inspect the configured Banyan Elasticsearch knowledge index through the audited backend API. Returns enabled, ok, exists, and documentCount. Use before ensure/reindex or when Agentic RAG search looks missing or stale.',
    parameters: {},
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async () => formatHttpResult(await requestJson(config, {
      path: '/ops/search/knowledge/index/inspect',
    })),
    presentCall: args => ({ card: 'generic', title: 'Inspect Banyan knowledge search index', kind: 'read', rawInput: args }),
  }))
}

function registerKnowledgeIndexEnsure(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_knowledge_index_ensure',
    description: 'Create the Banyan Elasticsearch knowledge index if it is missing. Use before knowledge reindexing or after local Elasticsearch resets.',
    parameters: {},
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async () => formatHttpResult(await requestJson(config, {
      method: 'POST',
      path: '/ops/search/knowledge/index/ensure',
    })),
    presentCall: args => ({ card: 'generic', title: 'Ensure Banyan knowledge search index', kind: 'edit', rawInput: args }),
  }))
}

function registerKnowledgeDocumentReindex(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_knowledge_reindex_document',
    description: 'Reindex one Banyan knowledge document into Elasticsearch from authoritative document chunks. Use when one Agentic RAG document is missing or stale.',
    parameters: {
      documentId: { type: 'string', required: true, description: 'Banyan knowledge document ID.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const documentId = requireString(args, 'documentId')
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: `/ops/search/knowledge/${encodeURIComponent(documentId)}/index`,
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Reindex Banyan knowledge document', kind: 'edit', rawInput: args }),
  }))
}

function registerKnowledgeDocumentsReindex(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_knowledge_reindex_documents',
    description: 'Bulk reindex a bounded page of Banyan knowledge documents into Elasticsearch from authoritative document chunks. Use after search index loss, RAG ingestion outages, or local development resets.',
    parameters: {
      limit: { type: 'integer', description: 'Maximum knowledge documents to scan. Defaults to 200, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: '/ops/search/knowledge/reindex-documents',
        query: {
          limit: readLimit(query.limit, 200),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Reindex Banyan knowledge documents', kind: 'edit', rawInput: args }),
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
          limit: readLimit(query.limit, 200),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Clean Banyan expired uploads', kind: 'edit', rawInput: args }),
  }))
}

function registerOutboxReplay(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_outbox_replay',
    description: 'Replay stored Banyan outbox events through the backend projection pipeline. Use after Canal/Kafka consumer outages, cache loss, or local development resets.',
    parameters: {
      limit: { type: 'integer', description: 'Maximum outbox events to scan. Defaults to 200, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: '/ops/outbox/replay',
        query: {
          limit: readLimit(query.limit, 200),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Replay Banyan outbox projections', kind: 'edit', rawInput: args }),
  }))
}

function registerOutboxFailedRecent(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_outbox_failed_recent',
    description: 'Read recent failed Banyan outbox projection events, including aggregate, event type, attempts, and last error. Use this before retrying failed projections.',
    parameters: {
      limit: { type: 'integer', description: 'Maximum failed outbox events to return. Defaults to 50, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        path: '/ops/outbox/failed/recent',
        query: {
          limit: readLimit(query.limit, 50),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Read failed Banyan outbox events', kind: 'read', rawInput: args }),
  }))
}

function registerOutboxRetryFailed(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_outbox_retry_failed',
    description: 'Retry only failed Banyan outbox projections. Use when ops status reports failedEvents > 0 before doing a broader replay.',
    parameters: {
      limit: { type: 'integer', description: 'Maximum failed outbox events to retry. Defaults to 200, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: '/ops/outbox/retry-failed',
        query: {
          limit: readLimit(query.limit, 200),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Retry failed Banyan outbox projections', kind: 'edit', rawInput: args }),
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

function readLimit(value: unknown, defaultValue = 10): number {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : defaultValue
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
    health: config.health ?? true,
    kafkaLag: config.kafkaLag ?? true,
    auditRecent: config.auditRecent ?? true,
    contentSearch: config.contentSearch ?? true,
    rebuildReactionCache: config.rebuildReactionCache ?? true,
    rebuildPublishedReactionCaches: config.rebuildPublishedReactionCaches ?? true,
    evictContentCache: config.evictContentCache ?? true,
    warmContentCache: config.warmContentCache ?? true,
    rebuildContentCounters: config.rebuildContentCounters ?? true,
    rebuildPublishedContentCounters: config.rebuildPublishedContentCounters ?? true,
    rebuildPublicFeed: config.rebuildPublicFeed ?? true,
    reindexContent: config.reindexContent ?? true,
    inspectContentIndex: config.inspectContentIndex ?? true,
    ensureContentIndex: config.ensureContentIndex ?? true,
    reindexPublishedContent: config.reindexPublishedContent ?? true,
    inspectKnowledgeIndex: config.inspectKnowledgeIndex ?? true,
    ensureKnowledgeIndex: config.ensureKnowledgeIndex ?? true,
    reindexKnowledgeDocument: config.reindexKnowledgeDocument ?? true,
    reindexKnowledgeDocuments: config.reindexKnowledgeDocuments ?? true,
    cleanupExpiredUploads: config.cleanupExpiredUploads ?? true,
    replayOutbox: config.replayOutbox ?? true,
    failedOutboxRecent: config.failedOutboxRecent ?? true,
    retryFailedOutbox: config.retryFailedOutbox ?? true,
  }
}
