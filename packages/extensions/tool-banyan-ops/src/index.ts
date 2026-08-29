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
  /** Optional approval token for Banyan Server ops mutation APIs. */
  readonly approvalToken?: string
  /** Environment variable that may hold the ops approval token when `approvalToken` is absent. */
  readonly approvalTokenEnv?: string
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
  /** Register read-only recent HTTP request trace log. */
  readonly requestsRecent?: boolean
  /** Register read-only HTTP request route/target summary. */
  readonly requestSummary?: boolean
  /** Register read-only internal service span log. */
  readonly spansRecent?: boolean
  /** Register read-only target execution trace aggregation. */
  readonly traceTarget?: boolean
  /** Register target-scoped trace-driven repair actions. */
  readonly repairTarget?: boolean
  /** Register drill action that marks one existing outbox event as failed. */
  readonly drillOutboxFailure?: boolean
  /** Register drill action that overwrites one content item's counters with stale values. */
  readonly drillStaleContentCounters?: boolean
  /** Register content search over Banyan Server search API. */
  readonly contentSearch?: boolean
  /** Register Agent-facing Banyan MCP knowledge search. */
  readonly mcpKnowledgeSearch?: boolean
  /** Register Agent-facing Banyan MCP cross-corpus RAG search. */
  readonly mcpRagSearch?: boolean
  /** Register Redis reaction cache rebuild action. */
  readonly rebuildReactionCache?: boolean
  /** Register read-only Redis reaction cache inspection. */
  readonly inspectReactionCache?: boolean
  /** Register bounded Redis reaction cache rebuild action for published content. */
  readonly rebuildPublishedReactionCaches?: boolean
  /** Register Redis content detail cache eviction action. */
  readonly evictContentCache?: boolean
  /** Register read-only Redis content detail cache inspection. */
  readonly inspectContentCache?: boolean
  /** Register read-only Redis content detail cache runtime metrics. */
  readonly inspectContentCacheMetrics?: boolean
  /** Register Redis content detail cache warm action. */
  readonly warmContentCache?: boolean
  /** Register denormalized content reaction counter rebuild action. */
  readonly rebuildContentCounters?: boolean
  /** Register bounded denormalized content reaction counter rebuild action for published content. */
  readonly rebuildPublishedContentCounters?: boolean
  /** Register Redis public feed projection rebuild action. */
  readonly rebuildPublicFeed?: boolean
  /** Register user social stats rebuild action. */
  readonly rebuildUserSocialStats?: boolean
  /** Register group social stats rebuild action. */
  readonly rebuildGroupSocialStats?: boolean
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
  /** Register read-only grouped outbox diagnostics. */
  readonly outboxDiagnostics?: boolean
  /** Register read-only recent failed outbox event inspection. */
  readonly failedOutboxRecent?: boolean
  /** Register failed outbox projection retry action. */
  readonly retryFailedOutbox?: boolean
}

export const Config: z<Config> = z.object({
  baseUrl: z.string().default('http://127.0.0.1:8080/api/v1'),
  authToken: z.string(),
  authTokenEnv: z.string().default('BANYAN_API_TOKEN'),
  approvalToken: z.string(),
  approvalTokenEnv: z.string().default('BANYAN_OPS_APPROVAL_TOKEN'),
  timeoutMs: z.number().step(1).min(1).default(10_000),
  status: z.boolean().default(true),
  health: z.boolean().default(true),
  kafkaLag: z.boolean().default(true),
  auditRecent: z.boolean().default(true),
  requestsRecent: z.boolean().default(true),
  requestSummary: z.boolean().default(true),
  spansRecent: z.boolean().default(true),
  traceTarget: z.boolean().default(true),
  repairTarget: z.boolean().default(true),
  drillOutboxFailure: z.boolean().default(true),
  drillStaleContentCounters: z.boolean().default(true),
  contentSearch: z.boolean().default(true),
  mcpKnowledgeSearch: z.boolean().default(true),
  mcpRagSearch: z.boolean().default(true),
  rebuildReactionCache: z.boolean().default(true),
  inspectReactionCache: z.boolean().default(true),
  rebuildPublishedReactionCaches: z.boolean().default(true),
  evictContentCache: z.boolean().default(true),
  inspectContentCache: z.boolean().default(true),
  inspectContentCacheMetrics: z.boolean().default(true),
  warmContentCache: z.boolean().default(true),
  rebuildContentCounters: z.boolean().default(true),
  rebuildPublishedContentCounters: z.boolean().default(true),
  rebuildPublicFeed: z.boolean().default(true),
  rebuildUserSocialStats: z.boolean().default(true),
  rebuildGroupSocialStats: z.boolean().default(true),
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
  outboxDiagnostics: z.boolean().default(true),
  failedOutboxRecent: z.boolean().default(true),
  retryFailedOutbox: z.boolean().default(true),
})

interface ResolvedConfig {
  readonly baseUrl: string
  readonly authToken?: string
  readonly authTokenEnv: string
  readonly approvalToken?: string
  readonly approvalTokenEnv: string
  readonly timeoutMs: number
  readonly status: boolean
  readonly health: boolean
  readonly kafkaLag: boolean
  readonly auditRecent: boolean
  readonly requestsRecent: boolean
  readonly requestSummary: boolean
  readonly spansRecent: boolean
  readonly traceTarget: boolean
  readonly repairTarget: boolean
  readonly drillOutboxFailure: boolean
  readonly drillStaleContentCounters: boolean
  readonly contentSearch: boolean
  readonly mcpKnowledgeSearch: boolean
  readonly mcpRagSearch: boolean
  readonly rebuildReactionCache: boolean
  readonly inspectReactionCache: boolean
  readonly rebuildPublishedReactionCaches: boolean
  readonly evictContentCache: boolean
  readonly inspectContentCache: boolean
  readonly inspectContentCacheMetrics: boolean
  readonly warmContentCache: boolean
  readonly rebuildContentCounters: boolean
  readonly rebuildPublishedContentCounters: boolean
  readonly rebuildPublicFeed: boolean
  readonly rebuildUserSocialStats: boolean
  readonly rebuildGroupSocialStats: boolean
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
  readonly outboxDiagnostics: boolean
  readonly failedOutboxRecent: boolean
  readonly retryFailedOutbox: boolean
}

interface RequestOptions {
  readonly method?: string
  readonly path: string
  readonly query?: Record<string, string | number | boolean | undefined>
  readonly body?: unknown
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
  + 'Use banyan_ops_requests_recent to inspect recent HTTP request traces with method, path, status, duration, actor, and business target evidence when debugging API execution chains. '
  + 'Use banyan_ops_request_summary first when you need a compact slow/error request summary grouped by route and business target before drilling into one target trace. '
  + 'Use banyan_ops_spans_recent to inspect internal service spans such as RAG corpus fan-out and target repair steps with durationMs and business target evidence. '
  + 'Use banyan_ops_trace_target when you have a content id, knowledge document id, workspace id, Agent profile id, AgentRun id, or search index name and need one execution-chain report with matching audit rows, HTTP request rows, service span rows, outbox rows, observations, and suggested repair tools. '
  + 'Use banyan_ops_repair_target after tracing one target when you need Banyan Server to run the supported target-scoped repairs and return a before/steps/after repair report; for maintenance work, follow trace -> repair -> trace again so you can verify the target after-state. '
  + 'Use banyan_ops_drill_outbox_failure and banyan_ops_drill_stale_content_counters only for explicit reliability drills or tests, then prove recovery with banyan_ops_trace_target -> banyan_ops_repair_target -> banyan_ops_trace_target. '
  + 'banyan_content_search searches public/friend/self content through the server search layer, backed by Elasticsearch when enabled. '
  + 'Use banyan_mcp_knowledge_search when an Agent needs audited knowledge citations through the Banyan MCP endpoint, and use banyan_mcp_rag_search when an Agent needs cross-corpus RAG citations from knowledge, shared posts, group-space posts, and shared DSH Skills with backend evidence and quality scoring. '
  + 'Use banyan_content_cache_metrics to inspect content cache hit rate, loader calls, single-flight coalescing, and hotspot candidates; use banyan_content_cache_inspect and banyan_reaction_cache_inspect before cache repair when possible; use banyan_content_cache_evict or banyan_content_cache_warm for stale content details, banyan_content_counters_rebuild for stale denormalized like/favorite counts, banyan_reaction_cache_rebuild for one stale Redis reaction bitmap, banyan_reaction_cache_rebuild_published after Redis cache loss, and banyan_content_reindex only when a content item is missing or stale in Elasticsearch. '
  + 'Use banyan_content_feed_rebuild_public when the public sharing feed is empty or out of order after Redis loss or projection outages. '
  + 'Use banyan_social_user_stats_rebuild or banyan_social_group_stats_rebuild when friend counts or group member counts look stale after conversation/friend/group events. '
  + 'Use banyan_content_index_inspect before Elasticsearch maintenance to check whether the content index exists and how many documents it contains, banyan_content_index_ensure if the index may be missing, and banyan_content_reindex_published to rebuild a bounded page of published content. '
  + 'Use banyan_knowledge_index_inspect before knowledge/RAG index maintenance, banyan_knowledge_index_ensure if the knowledge index may be missing, banyan_knowledge_reindex_document for one stale document, and banyan_knowledge_reindex_documents after Elasticsearch resets or ingestion outages. '
  + 'Use banyan_upload_cleanup to abandon expired pending upload objects and free stale local object files. '
  + 'Use banyan_outbox_diagnostics when ops status reports NEW or FAILED outbox projections to group the backlog by aggregate and event type, banyan_outbox_failed_recent for concrete failed rows, banyan_outbox_retry_failed to retry those failures, and banyan_outbox_replay to replay stored outbox events after broader consumer outages or local test resets. '
  + 'Mutation tools call audited POST endpoints and may require the configured X-Banyan-Ops-Approval token on Banyan Server; missing approval is a server-side refusal, not a reason to bypass the API. '
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
  if (resolved.requestsRecent) registerOpsRequestsRecent(ctx, resolved)
  if (resolved.requestSummary) registerOpsRequestSummary(ctx, resolved)
  if (resolved.spansRecent) registerOpsSpansRecent(ctx, resolved)
  if (resolved.traceTarget) registerOpsTraceTarget(ctx, resolved)
  if (resolved.repairTarget) registerOpsRepairTarget(ctx, resolved)
  if (resolved.drillOutboxFailure) registerOpsDrillOutboxFailure(ctx, resolved)
  if (resolved.drillStaleContentCounters) registerOpsDrillStaleContentCounters(ctx, resolved)
  if (resolved.contentSearch) registerContentSearch(ctx, resolved)
  if (resolved.mcpKnowledgeSearch) registerMcpKnowledgeSearch(ctx, resolved)
  if (resolved.mcpRagSearch) registerMcpRagSearch(ctx, resolved)
  if (resolved.rebuildReactionCache) registerReactionCacheRebuild(ctx, resolved)
  if (resolved.inspectReactionCache) registerReactionCacheInspect(ctx, resolved)
  if (resolved.rebuildPublishedReactionCaches) registerPublishedReactionCacheRebuild(ctx, resolved)
  if (resolved.evictContentCache) registerContentCacheEvict(ctx, resolved)
  if (resolved.inspectContentCache) registerContentCacheInspect(ctx, resolved)
  if (resolved.inspectContentCacheMetrics) registerContentCacheMetrics(ctx, resolved)
  if (resolved.warmContentCache) registerContentCacheWarm(ctx, resolved)
  if (resolved.rebuildContentCounters) registerContentCountersRebuild(ctx, resolved)
  if (resolved.rebuildPublishedContentCounters) registerPublishedContentCountersRebuild(ctx, resolved)
  if (resolved.rebuildPublicFeed) registerPublicFeedRebuild(ctx, resolved)
  if (resolved.rebuildUserSocialStats) registerUserSocialStatsRebuild(ctx, resolved)
  if (resolved.rebuildGroupSocialStats) registerGroupSocialStatsRebuild(ctx, resolved)
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
  if (resolved.outboxDiagnostics) registerOutboxDiagnostics(ctx, resolved)
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

function registerOpsRequestsRecent(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_ops_requests_recent',
    description: 'Read recent Banyan Server HTTP request trace entries. Use to see API method, path, status, durationMs, actorUserId, and derived businessTarget evidence without mixing them into the maintenance audit log.',
    parameters: {
      limit: { type: 'integer', description: 'Maximum request trace rows to return. Defaults to 50, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        path: '/ops/requests/recent',
        query: {
          limit: readLimit(query.limit, 50),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Read Banyan request traces', kind: 'read', rawInput: args }),
  }))
}

function registerOpsRequestSummary(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_ops_request_summary',
    description: 'Read a compact Banyan Server HTTP request summary grouped by normalized route and derived business target. Use to identify slow or failed API chains before calling banyan_ops_trace_target or repair tools.',
    parameters: {
      limit: { type: 'integer', description: 'Maximum recent request trace rows to summarize. Defaults to 100, maximum enforced by Banyan Server.' },
      slowThresholdMs: { type: 'integer', description: 'Requests at or above this duration count as slow. Defaults to 500 ms.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        path: '/ops/requests/summary',
        query: {
          limit: readLimit(query.limit, 100),
          slowThresholdMs: readLimit(query.slowThresholdMs, 500),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Summarize Banyan request traces', kind: 'read', rawInput: args }),
  }))
}

function registerOpsSpansRecent(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_ops_spans_recent',
    description: 'Read recent Banyan Server internal service span entries. Use to inspect RAG corpus fan-out, target repair steps, durationMs, success status, and businessTarget evidence without mixing spans into the maintenance audit log.',
    parameters: {
      limit: { type: 'integer', description: 'Maximum service span rows to return. Defaults to 50, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        path: '/ops/spans/recent',
        query: {
          limit: readLimit(query.limit, 50),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Read Banyan service spans', kind: 'read', rawInput: args }),
  }))
}

function registerOpsTraceTarget(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_ops_trace_target',
    description: 'Read one Banyan execution-chain report for a target such as CONTENT, KNOWLEDGE_DOCUMENT, KNOWLEDGE_RAG, SEARCH_INDEX, AGENT_PROFILE, AGENT_RUN, or CONVERSATION. Returns matching ops audit rows, HTTP request rows, service span rows, outbox rows, status counts, observations, and suggested repair tools.',
    parameters: {
      targetType: { type: 'string', description: 'Target type, for example CONTENT, KNOWLEDGE_DOCUMENT, KNOWLEDGE_RAG, SEARCH_INDEX, AGENT_PROFILE, AGENT_RUN, or CONVERSATION.' },
      targetId: { type: 'string', description: 'Target id, such as a content id, knowledge document id, workspace id, search index name, agent profile id, AgentRun id, or conversation id.' },
      auditLimit: { type: 'integer', description: 'Maximum matching audit rows to return. Defaults to 20, maximum enforced by Banyan Server.' },
      outboxLimit: { type: 'integer', description: 'Maximum matching outbox rows to return. Defaults to 50, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      const targetType = requireString(args, 'targetType')
      const targetId = requireString(args, 'targetId')
      return formatHttpResult(await requestJson(config, {
        path: `/ops/traces/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}`,
        query: {
          auditLimit: readLimit(query.auditLimit, 20),
          outboxLimit: readLimit(query.outboxLimit, 50),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Trace Banyan execution target', kind: 'read', rawInput: args }),
  }))
}

function registerOpsRepairTarget(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_ops_repair_target',
    description: 'Run Banyan Server supported target-scoped repair actions after tracing CONTENT, KNOWLEDGE_DOCUMENT, KNOWLEDGE_RAG, or SEARCH_INDEX. Returns a before trace, executed steps, and after trace so the ops Agent can explain what changed; call banyan_ops_trace_target again afterward to verify the target after-state.',
    parameters: {
      targetType: { type: 'string', description: 'Target type, for example CONTENT, KNOWLEDGE_DOCUMENT, KNOWLEDGE_RAG, or SEARCH_INDEX.' },
      targetId: { type: 'string', description: 'Target id, such as a content id, knowledge document id, workspace id, or search index name.' },
      limit: { type: 'integer', description: 'Maximum target outbox rows or indexed rows to repair. Defaults to 50, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      const targetType = requireString(args, 'targetType')
      const targetId = requireString(args, 'targetId')
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: `/ops/traces/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}/repair`,
        query: {
          limit: readLimit(query.limit, 50),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Repair Banyan execution target', kind: 'edit', rawInput: args }),
  }))
}

function registerOpsDrillOutboxFailure(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_ops_drill_outbox_failure',
    description: 'Inject a controlled Banyan outbox failure by marking one existing outbox event FAILED. Use only for explicit reliability drills, then verify recovery with trace -> repair -> trace.',
    parameters: {
      eventId: { type: 'string', required: true, description: 'Existing Banyan outbox event id to mark FAILED.' },
      message: { type: 'string', description: 'Failure message to store on the event. Defaults to a drill marker.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      const eventId = requireString(args, 'eventId')
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: `/ops/drills/outbox/${encodeURIComponent(eventId)}/mark-failed`,
        query: {
          message: typeof query.message === 'string' ? query.message : undefined,
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Inject Banyan outbox failure drill', kind: 'edit', rawInput: args }),
  }))
}

function registerOpsDrillStaleContentCounters(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_ops_drill_stale_content_counters',
    description: 'Inject stale denormalized like/favorite counters for one Banyan content item. Use only for explicit cache/count repair drills, then verify recovery with trace -> repair -> trace.',
    parameters: {
      contentId: { type: 'string', required: true, description: 'Banyan shared content ID.' },
      likeCount: { type: 'integer', description: 'Injected likeCount. Defaults to 999.' },
      favoriteCount: { type: 'integer', description: 'Injected favoriteCount. Defaults to 999.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      const contentId = requireString(args, 'contentId')
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: `/ops/drills/contents/${encodeURIComponent(contentId)}/stale-counters`,
        query: {
          likeCount: readLimit(query.likeCount, 999),
          favoriteCount: readLimit(query.favoriteCount, 999),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Inject Banyan stale counter drill', kind: 'edit', rawInput: args }),
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
      spaceType: { type: 'string', enum: ['GROUP'], description: 'Optional content space type for group-space search.' },
      spaceId: { type: 'string', description: 'Optional group subject id for group-space search.' },
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
          spaceType: typeof query.spaceType === 'string' ? query.spaceType : undefined,
          spaceId: typeof query.spaceId === 'string' ? query.spaceId : undefined,
          cursor: typeof query.cursor === 'string' ? query.cursor : undefined,
          limit: readLimit(query.limit),
        },
      })
      return formatHttpResult(result)
    },
    presentCall: args => ({ card: 'generic', title: 'Search Banyan content', kind: 'read', rawInput: args }),
  }))
}

function registerMcpKnowledgeSearch(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_mcp_knowledge_search',
    description: 'Call Banyan Server MCP tool banyan.knowledge.search for audited Agent knowledge citations. Use when answering from Banyan knowledge documents and cite returned document/chunk evidence.',
    parameters: {
      query: { type: 'string', required: true, description: 'RAG query text.' },
      workspaceId: { type: 'string', description: 'Banyan workspace id. Defaults to the backend default workspace when omitted.' },
      scope: { type: 'string', enum: ['public', 'workspace', 'friends', 'self'], description: 'Permission scope. Defaults to workspace.' },
      cursor: { type: 'string', description: 'Optional search_after cursor from the previous MCP response.' },
      limit: { type: 'integer', description: 'Citation limit. Defaults to 5, maximum enforced by Banyan Server.' },
      agentProfileId: { type: 'string', description: 'Optional Agent profile id to include in backend audit evidence.' },
      toolCallId: { type: 'string', description: 'Optional caller-stable tool call id for backend audit evidence.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: '/mcp/tools/knowledge.search',
        body: {
          query: requireString(args, 'query'),
          workspaceId: typeof query.workspaceId === 'string' ? query.workspaceId : undefined,
          scope: typeof query.scope === 'string' ? query.scope : 'workspace',
          cursor: typeof query.cursor === 'string' ? query.cursor : undefined,
          limit: readLimit(query.limit, 5),
          agentProfileId: typeof query.agentProfileId === 'string' ? query.agentProfileId : undefined,
          toolCallId: typeof query.toolCallId === 'string' ? query.toolCallId : undefined,
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Search Banyan MCP knowledge', kind: 'read', rawInput: args }),
  }))
}

function registerMcpRagSearch(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_mcp_rag_search',
    description: 'Call Banyan Server MCP tool banyan.rag.search for audited cross-corpus RAG citations from knowledge documents, shared posts, and shared DSH Skills. Use for resume-facing Agent RAG answers that need backend/citation evidence.',
    parameters: {
      query: { type: 'string', required: true, description: 'RAG query text.' },
      workspaceId: { type: 'string', description: 'Banyan workspace id. Defaults to the backend default workspace when omitted.' },
      scope: { type: 'string', enum: ['public', 'workspace', 'friends', 'self'], description: 'Permission scope. Defaults to workspace.' },
      corpus: { type: 'string', enum: ['all', 'knowledge', 'content', 'skills'], description: 'Corpus selector. Defaults to all.' },
      spaceType: { type: 'string', enum: ['GROUP'], description: 'Optional shared-content space type for group-space RAG.' },
      spaceId: { type: 'string', description: 'Optional group subject id for group-space RAG.' },
      knowledgeCursor: { type: 'string', description: 'Optional knowledge corpus cursor.' },
      contentCursor: { type: 'string', description: 'Optional shared post corpus cursor.' },
      skillCursor: { type: 'string', description: 'Optional shared DSH Skill corpus cursor.' },
      limit: { type: 'integer', description: 'Citation limit. Defaults to 10, maximum enforced by Banyan Server.' },
      agentProfileId: { type: 'string', description: 'Optional Agent profile id to include in backend audit evidence.' },
      toolCallId: { type: 'string', description: 'Optional caller-stable tool call id for backend audit evidence.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: '/mcp/tools/rag.search',
        body: {
          query: requireString(args, 'query'),
          workspaceId: typeof query.workspaceId === 'string' ? query.workspaceId : undefined,
          scope: typeof query.scope === 'string' ? query.scope : 'workspace',
          corpus: typeof query.corpus === 'string' ? query.corpus : 'all',
          spaceType: typeof query.spaceType === 'string' ? query.spaceType : undefined,
          spaceId: typeof query.spaceId === 'string' ? query.spaceId : undefined,
          knowledgeCursor: typeof query.knowledgeCursor === 'string' ? query.knowledgeCursor : undefined,
          contentCursor: typeof query.contentCursor === 'string' ? query.contentCursor : undefined,
          skillCursor: typeof query.skillCursor === 'string' ? query.skillCursor : undefined,
          limit: readLimit(query.limit, 10),
          agentProfileId: typeof query.agentProfileId === 'string' ? query.agentProfileId : undefined,
          toolCallId: typeof query.toolCallId === 'string' ? query.toolCallId : undefined,
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Search Banyan MCP RAG', kind: 'read', rawInput: args }),
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

function registerReactionCacheInspect(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_reaction_cache_inspect',
    description: 'Read Redis reaction-cache metadata for one Banyan content item: enabled/available state, count-key presence, cached like/favorite counts, bitmap sizing, and optional viewer bitmap state. Use before rebuilding reaction cache.',
    parameters: {
      contentId: { type: 'string', required: true, description: 'Banyan shared content ID.' },
      viewerUserId: { type: 'string', description: 'Optional Banyan internal user id to inspect viewer like/favorite bitmap bits.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const contentId = requireString(args, 'contentId')
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        path: `/ops/reactions/${encodeURIComponent(contentId)}/inspect-cache`,
        query: {
          viewerUserId: typeof query.viewerUserId === 'string' && query.viewerUserId.length > 0 ? query.viewerUserId : undefined,
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Inspect Banyan reaction cache', kind: 'read', rawInput: args }),
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

function registerContentCacheInspect(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_content_cache_inspect',
    description: 'Read Redis content-detail cache metadata for one Banyan content item: enabled/available state, key, presence, TTL, and cached JSON byte size. Use before evicting or warming content cache.',
    parameters: {
      contentId: { type: 'string', required: true, description: 'Banyan shared content ID.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const contentId = requireString(args, 'contentId')
      return formatHttpResult(await requestJson(config, {
        path: `/ops/cache/contents/${encodeURIComponent(contentId)}/inspect`,
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Inspect Banyan content cache', kind: 'read', rawInput: args }),
  }))
}

function registerContentCacheMetrics(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_content_cache_metrics',
    description: 'Read Banyan content-detail cache runtime metrics: total lookups, hits, misses, hitRate, loader calls, single-flight coalescing, and top hotspot candidates. Use before and after cache warm/repair drills.',
    parameters: {
      limit: { type: 'integer', description: 'Maximum hotspot content rows to return. Defaults to 20, maximum enforced by Banyan Server.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async (args) => {
      const query = args as Record<string, unknown>
      return formatHttpResult(await requestJson(config, {
        path: '/ops/cache/contents/metrics',
        query: {
          limit: readLimit(query.limit, 20),
        },
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Read Banyan content cache metrics', kind: 'read', rawInput: args }),
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

function registerUserSocialStatsRebuild(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_social_user_stats_rebuild',
    description: 'Rebuild one Banyan user social stats projection, especially friendCount, from authoritative friend relation rows. Use when a profile or social graph count looks stale after Outbox/Canal lag.',
    parameters: {
      userId: { type: 'string', description: 'Banyan internal user id, not the public uid.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const userId = requireString(args, 'userId')
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: `/ops/social/users/${encodeURIComponent(userId)}/stats/rebuild`,
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Rebuild Banyan user social stats', kind: 'edit', rawInput: args }),
  }))
}

function registerGroupSocialStatsRebuild(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_social_group_stats_rebuild',
    description: 'Rebuild one Banyan group social stats projection, especially memberCount, from authoritative conversation participants. Use when group profile counts look stale after Outbox/Canal lag.',
    parameters: {
      conversationId: { type: 'string', description: 'Banyan group conversation id.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    execute: async (args) => {
      const conversationId = requireString(args, 'conversationId')
      return formatHttpResult(await requestJson(config, {
        method: 'POST',
        path: `/ops/social/groups/${encodeURIComponent(conversationId)}/stats/rebuild`,
      }))
    },
    presentCall: args => ({ card: 'generic', title: 'Rebuild Banyan group social stats', kind: 'edit', rawInput: args }),
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

function registerOutboxDiagnostics(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'banyan_outbox_diagnostics',
    description: 'Read grouped Banyan outbox backlog diagnostics. Returns NEW and FAILED counts grouped by status, aggregate type, and event type so an ops Agent can identify whether Redis, Elasticsearch, notifications, social stats, or another projection lane is stuck.',
    parameters: {},
    output: TEXT_OUTPUT,
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    execute: async () => formatHttpResult(await requestJson(config, {
      path: '/ops/outbox/diagnostics',
    })),
    presentCall: args => ({ card: 'generic', title: 'Read Banyan outbox diagnostics', kind: 'read', rawInput: args }),
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
  const approvalToken = config.approvalToken ?? process.env[config.approvalTokenEnv]
  if (method !== 'GET' && approvalToken !== undefined && approvalToken.length > 0) {
    headers['x-banyan-ops-approval'] = approvalToken
  }
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json'
  }

  const controller = new AbortController()
  const started = Date.now()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
  const approvalTokenEnv = config.approvalTokenEnv ?? 'BANYAN_OPS_APPROVAL_TOKEN'
  const timeoutMs = config.timeoutMs ?? 10_000
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new TypeError('tool-banyan-ops: timeoutMs must be a positive integer')
  }
  return {
    baseUrl,
    ...config.authToken !== undefined ? { authToken: config.authToken } : {},
    authTokenEnv,
    ...config.approvalToken !== undefined ? { approvalToken: config.approvalToken } : {},
    approvalTokenEnv,
    timeoutMs,
    status: config.status ?? true,
    health: config.health ?? true,
    kafkaLag: config.kafkaLag ?? true,
    auditRecent: config.auditRecent ?? true,
    requestsRecent: config.requestsRecent ?? true,
    requestSummary: config.requestSummary ?? true,
    spansRecent: config.spansRecent ?? true,
    traceTarget: config.traceTarget ?? true,
    repairTarget: config.repairTarget ?? true,
    drillOutboxFailure: config.drillOutboxFailure ?? true,
    drillStaleContentCounters: config.drillStaleContentCounters ?? true,
    contentSearch: config.contentSearch ?? true,
    mcpKnowledgeSearch: config.mcpKnowledgeSearch ?? true,
    mcpRagSearch: config.mcpRagSearch ?? true,
    rebuildReactionCache: config.rebuildReactionCache ?? true,
    inspectReactionCache: config.inspectReactionCache ?? true,
    rebuildPublishedReactionCaches: config.rebuildPublishedReactionCaches ?? true,
    evictContentCache: config.evictContentCache ?? true,
    inspectContentCache: config.inspectContentCache ?? true,
    inspectContentCacheMetrics: config.inspectContentCacheMetrics ?? true,
    warmContentCache: config.warmContentCache ?? true,
    rebuildContentCounters: config.rebuildContentCounters ?? true,
    rebuildPublishedContentCounters: config.rebuildPublishedContentCounters ?? true,
    rebuildPublicFeed: config.rebuildPublicFeed ?? true,
    rebuildUserSocialStats: config.rebuildUserSocialStats ?? true,
    rebuildGroupSocialStats: config.rebuildGroupSocialStats ?? true,
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
    outboxDiagnostics: config.outboxDiagnostics ?? true,
    failedOutboxRecent: config.failedOutboxRecent ?? true,
    retryFailedOutbox: config.retryFailedOutbox ?? true,
  }
}
