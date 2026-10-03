---
description: "Retrieve visible Banyan posts, shared skills, and knowledge documents for an Agent. Access follows the configured backend identity. This package grants retrieval tools without maintenance operations."
kind: package-reference
---

# @deepseek-ai/dsh-tool-banyan-search

English | [中文](README.zh.md)

## Summary

Retrieve visible Banyan posts, shared skills, and knowledge documents for an Agent. Access follows the configured backend identity. This package grants retrieval tools without maintenance operations.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## Use this package

Mount this plugin in an Agent scope with `ctx.tools` available. Configure `baseUrl` and `authTokenEnv` for the backend. The [configuration catalog](../../../docs/config-catalog.md) owns all accepted settings; the [tool catalog](../../../docs/tool-catalog.md#deepseek-aidsh-tool-banyan-search) owns the five retrieval schemas. The optional Banyan bundle registers a search preset using this plugin.

<a id="model-experience"></a>
## Model Experience

### Tools and guidance

#### What the model sees

The model receives five Banyan retrieval tool schemas and text results containing visible content and skill-package metadata. See the generated [tool catalog](../../../docs/tool-catalog.md#deepseek-aidsh-tool-banyan-search).

#### Token effect

Schemas consume tokens while mounted; retrieved Markdown and metadata consume result tokens.

#### KV Cache effect

Changing the mounted tools changes the request prefix; backend credentials affect execution only.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Requires a reachable Banyan backend and an authorized identity.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers</summary>

None.

</details>
