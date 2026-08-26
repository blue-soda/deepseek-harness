# @deepseek-ai/dsh-tool-banyan-ops

Model-facing Banyan Server operations and search tools.

The package intentionally talks to Banyan Server through its HTTP API instead of
opening database or Redis connections from the agent process. This keeps
authorization, audit, and recovery behavior owned by the backend.

## Tools

- `banyan_ops_status`: read entity counts and infrastructure status.
- `banyan_content_search`: search shared content through Banyan Search.
- `banyan_reaction_cache_rebuild`: rebuild Redis reaction counters for one content item.
- `banyan_content_reindex`: reindex one content item into Elasticsearch.

## Configuration

```yaml
- id: tool-banyan-ops
  name: '@deepseek-ai/dsh-tool-banyan-ops'
  config:
    baseUrl: http://127.0.0.1:8080/api/v1
    authTokenEnv: BANYAN_API_TOKEN
```
