---
description: "Inspect Banyan backend health, traces, caches, indexes, and outbox state. Run audited maintenance and controlled reliability drills through its HTTP API. Backend authorization and approval policy govern mutations."
kind: package-reference
---

# @deepseek-ai/dsh-tool-banyan-ops

English | [中文](README.zh.md)

## Summary

Inspect Banyan backend health, traces, caches, indexes, and outbox state. Run audited maintenance and controlled reliability drills through its HTTP API. Backend authorization and approval policy govern mutations.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## Use this package

Mount this plugin in an Agent scope with `ctx.tools` and `ctx.systemPrompt`. Configure `baseUrl`, `authTokenEnv`, and `approvalTokenEnv`; accepted fields live in the [configuration catalog](../../../docs/config-catalog.md). Read operations use GET; maintenance uses audited POST. When backend mutation approval is required, `X-Banyan-Ops-Approval` must contain the configured approval token. The [tool catalog](../../../docs/tool-catalog.md#deepseek-aidsh-tool-banyan-ops) lists every operation.

<a id="model-experience"></a>
## Model Experience

### Tools and guidance

#### What the model sees

The model receives Banyan diagnostics and maintenance tool schemas, operations guidance, and rendered backend results. See the generated [tool catalog](../../../docs/tool-catalog.md#deepseek-aidsh-tool-banyan-ops).

#### Token effect

Tool definitions and guidance consume request tokens while mounted; traces and diagnostics add result tokens.

#### KV Cache effect

Tool or guidance edits change the prefix; HTTP credentials do not change schema text.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Maintenance and drill tools can mutate backend state; server approval and authorization remain required.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers</summary>

None.

</details>
