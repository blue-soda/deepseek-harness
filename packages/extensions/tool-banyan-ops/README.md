# @deepseek-ai/dsh-tool-banyan-ops

Model-facing Banyan Server operations and search tools.

The package intentionally talks to Banyan Server through its HTTP API instead of
opening database or Redis connections from the agent process. This keeps
authorization, audit, and recovery behavior owned by the backend.

## Tools

- `banyan_ops_status`: read entity counts and infrastructure status.
- `banyan_ops_health`: actively check Redis, Elasticsearch, and Kafka connectivity through Banyan Server.
- `banyan_kafka_lag`: inspect Kafka consumer-group lag for the Banyan outbox projection topic.
- `banyan_ops_audit_recent`: read recent audited maintenance actions.
- `banyan_ops_requests_recent`: read recent HTTP request traces with method, path, status, duration, actor, and derived business target evidence.
- `banyan_ops_request_summary`: summarize recent HTTP request traces by normalized route and business target, including slow/error counts.
- `banyan_ops_spans_recent`: read recent internal service spans for RAG corpus fan-out and target repair steps.
- `banyan_ops_trace_target`: aggregate one target's audit rows, HTTP request rows, service span rows, outbox rows, observations, and suggested repair tools, including `AGENT_RUN` lifecycle traces.
- `banyan_ops_repair_target`: run supported target-scoped repairs and return before/steps/after trace evidence; use trace -> repair -> trace again when verifying maintenance work.
- `banyan_ops_drill_outbox_failure`: mark one existing outbox event as `FAILED` for an explicit reliability drill.
- `banyan_ops_drill_stale_content_counters`: overwrite one content item's denormalized like/favorite counters for an explicit cache/count repair drill.
- `banyan_ops_drill_upload_expired`: expire one pending upload object and optionally create a stale local dev-upload file for an explicit upload cleanup drill.
- `banyan_ops_drill_kafka_consumer_stop`: stop the Banyan Canal/Kafka consumer for a controlled lag drill; verify with `banyan_kafka_lag`, then repair targetType `KAFKA`.
- `banyan_content_search`: search shared content through Banyan Search.
- `banyan_mcp_knowledge_search`: call Banyan MCP `banyan.knowledge.search` for audited Agent knowledge citations.
- `banyan_mcp_rag_search`: call Banyan MCP `banyan.rag.search` for audited cross-corpus RAG citations from knowledge, posts, group-space posts, and DSH Skills with quality scoring.
- `banyan_content_cache_inspect`: inspect one Redis content detail cache entry without mutating it.
- `banyan_content_cache_metrics`: inspect content cache hit rate, loader calls, single-flight coalescing, and hotspot candidates.
- `banyan_content_cache_evict`: evict one content detail cache entry.
- `banyan_content_cache_warm`: rebuild one content detail cache entry from the database.
- `banyan_content_counters_rebuild`: rebuild denormalized like/favorite counters for one content item.
- `banyan_content_counters_rebuild_published`: rebuild denormalized like/favorite counters for a bounded page of published content.
- `banyan_content_feed_rebuild_public`: rebuild Redis public feed projection for posts and Skill shares.
- `banyan_social_user_stats_rebuild`: rebuild one user's social stats projection, including friend count.
- `banyan_social_group_stats_rebuild`: rebuild one group's social stats projection, including member count.
- `banyan_reaction_cache_inspect`: inspect one Redis reaction cache entry without mutating it.
- `banyan_reaction_cache_rebuild`: rebuild Redis reaction bitmap/cache state for one content item.
- `banyan_reaction_cache_rebuild_published`: rebuild Redis reaction bitmap/cache state for a bounded page of published content.
- `banyan_content_reindex`: reindex one content item into Elasticsearch.
- `banyan_content_index_inspect`: inspect whether the configured Elasticsearch content index exists and how many documents it contains.
- `banyan_content_index_ensure`: create the Elasticsearch content index if it is missing.
- `banyan_content_reindex_published`: bulk reindex a bounded page of published content.
- `banyan_knowledge_index_inspect`: inspect whether the configured Elasticsearch knowledge index exists and how many chunk documents it contains.
- `banyan_knowledge_index_ensure`: create the Elasticsearch knowledge index if it is missing.
- `banyan_knowledge_reindex_document`: reindex one knowledge document's chunks.
- `banyan_knowledge_reindex_documents`: bulk reindex a bounded page of knowledge documents.
- `banyan_upload_cleanup`: abandon expired pending upload objects and delete stale local dev-upload files.
- `banyan_outbox_replay`: replay stored outbox events through Banyan Server projections.
- `banyan_outbox_diagnostics`: group NEW and FAILED outbox backlog by status, aggregate type, and event type.
- `banyan_outbox_failed_recent`: inspect recent failed outbox projection rows.
- `banyan_outbox_retry_failed`: retry only failed outbox projection rows.

## Configuration

```yaml
- id: tool-banyan-ops
  name: '@deepseek-ai/dsh-tool-banyan-ops'
  config:
    baseUrl: http://127.0.0.1:8080/api/v1
    authTokenEnv: BANYAN_API_TOKEN
    approvalTokenEnv: BANYAN_OPS_APPROVAL_TOKEN
```

Read-only tools use GET endpoints and do not need an ops approval token.
Mutation tools use audited POST endpoints. When Banyan Server enables
`banyan.ops.mutation-approval.required`, the tool package sends
`X-Banyan-Ops-Approval` from `approvalToken` or `approvalTokenEnv`; without it
the server returns 403 and records a rejected ops audit entry.
