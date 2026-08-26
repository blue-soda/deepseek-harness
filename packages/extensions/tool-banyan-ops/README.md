# @deepseek-ai/dsh-tool-banyan-ops

Model-facing Banyan Server operations and search tools.

The package intentionally talks to Banyan Server through its HTTP API instead of
opening database or Redis connections from the agent process. This keeps
authorization, audit, and recovery behavior owned by the backend.

## Tools

- `banyan_ops_status`: read entity counts and infrastructure status.
- `banyan_content_search`: search shared content through Banyan Search.
- `banyan_reaction_cache_rebuild`: rebuild Redis reaction counters for one content item.
- `banyan_reaction_cache_rebuild_published`: rebuild Redis reaction counters for a bounded page of published content.
- `banyan_content_reindex`: reindex one content item into Elasticsearch.
- `banyan_content_index_ensure`: create the Elasticsearch content index if it is missing.
- `banyan_content_reindex_published`: bulk reindex a bounded page of published content.
- `banyan_upload_cleanup`: abandon expired pending upload objects and delete stale local dev-upload files.
- `banyan_outbox_replay`: replay stored outbox events through Banyan Server projections.
- `banyan_outbox_retry_failed`: retry only failed outbox projection rows.

## Configuration

```yaml
- id: tool-banyan-ops
  name: '@deepseek-ai/dsh-tool-banyan-ops'
  config:
    baseUrl: http://127.0.0.1:8080/api/v1
    authTokenEnv: BANYAN_API_TOKEN
```
