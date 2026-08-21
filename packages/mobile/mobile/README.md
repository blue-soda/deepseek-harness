# @deepseek-ai/dsh-mobile

English | [中文](README.zh.md)

Service Definition for Android mobile bridge execution. It registers `ctx.mobile`, owns provider selection, and exposes `health()` plus `execute()` for Consumers.

## Model Experience

Indirectly, through `@deepseek-ai/dsh-tool-mobile`, which owns Android tool names, prompt guidance, rendered outputs, and failure text.

#### KV Cache effect

No direct invalidation; the named consumer owns request-prefix changes.

## Known Limitations and Deferred Work

- Mobile session events now cover bridge reachability, bridge request/result facts, and Android user confirmation audit records. Richer streaming bridge events are still deferred.
- Provider selection supports one active provider; richer device discovery belongs in a later mobile runtime design.
