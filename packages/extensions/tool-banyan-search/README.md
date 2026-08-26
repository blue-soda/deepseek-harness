# @deepseek-ai/dsh-tool-banyan-search

Read-only Banyan content search and retrieval tools for user-facing Agents.

This package is intentionally separate from `@deepseek-ai/dsh-tool-banyan-ops`.
Ordinary Agents can retrieve public, friend-visible, or self-owned Banyan
content without receiving backend maintenance powers such as cache rebuild,
outbox replay, or Elasticsearch reindex.

## Tools

- `banyan_content_search`: search Banyan shared posts and DSH skill shares.
- `banyan_content_get`: fetch one visible content item with full Markdown body
  and attachment metadata.

## Configuration

```yaml
- id: tool-banyan-search
  name: '@deepseek-ai/dsh-tool-banyan-search'
  config:
    baseUrl: http://127.0.0.1:8080/api/v1
    authTokenEnv: BANYAN_API_TOKEN
```
