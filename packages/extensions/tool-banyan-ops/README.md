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
- `banyan_content_search`: search shared content through Banyan Search.
- `banyan_content_cache_evict`: evict one content detail cache entry.
- `banyan_content_cache_warm`: rebuild one content detail cache entry from the database.
- `banyan_content_counters_rebuild`: rebuild denormalized like/favorite counters for one content item.
- `banyan_content_counters_rebuild_published`: rebuild denormalized like/favorite counters for a bounded page of published content.
- `banyan_content_feed_rebuild_public`: rebuild Redis public feed projection for posts and Skill shares.
- `banyan_reaction_cache_rebuild`: rebuild Redis reaction counters for one content item.
- `banyan_reaction_cache_rebuild_published`: rebuild Redis reaction counters for a bounded page of published content.
- `banyan_content_reindex`: reindex one content item into Elasticsearch.
- `banyan_content_index_ensure`: create the Elasticsearch content index if it is missing.
- `banyan_content_reindex_published`: bulk reindex a bounded page of published content.
- `banyan_upload_cleanup`: abandon expired pending upload objects and delete stale local dev-upload files.
- `banyan_outbox_replay`: replay stored outbox events through Banyan Server projections.
- `banyan_outbox_failed_recent`: inspect recent failed outbox projection rows.
- `banyan_outbox_retry_failed`: retry only failed outbox projection rows.

## Configuration

```yaml
- id: tool-banyan-ops
  name: '@deepseek-ai/dsh-tool-banyan-ops'
  config:
    baseUrl: http://127.0.0.1:8080/api/v1
    authTokenEnv: BANYAN_API_TOKEN
```
