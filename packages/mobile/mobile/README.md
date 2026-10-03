---
description: "Execute Android bridge tools through a selected provider. Device discovery remains the deployment owner’s responsibility."
kind: package-reference
---

# @deepseek-ai/dsh-mobile

English | [中文](README.zh.md)

## Summary

Execute Android bridge tools through a selected provider. Device discovery remains the deployment owner’s responsibility.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## Use this package

Service Definition for Android mobile bridge execution. It registers `ctx.mobile`, owns provider selection, and exposes `health()` plus `execute()` for Consumers.

<a id="model-experience"></a>
## Model Experience

Indirectly, through the tool consumers of this provider.

#### KV Cache effect

The consuming plugin owns request-prefix changes; service configuration affects execution only.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Mobile session events now cover bridge reachability, bridge request/result facts, and Android user confirmation audit records. Richer streaming bridge events are still deferred.
- Provider selection supports one active provider; richer device discovery belongs in a later mobile runtime design.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers</summary>

None.

</details>
