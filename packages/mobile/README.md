---
description: "Android bridge capability and tool package navigation."
kind: package-group
---

# mobile/ - Android mobile capability family

English | [中文](README.zh.md)

## Summary

This family provides provider-neutral Android bridge execution plus the model-facing tools that consume it.

## Table of Contents

- [Banyan subsystem](../../docs/subsystems/banyan.md)

| Package | Role | ctx key |
|---|---|---|
| [`mobile/`](mobile/README.md) | Defines Android provider registration, selection, shared errors, and `health()` / `execute()` | `ctx.mobile` |
| [`mobile-bridge-http/`](mobile-bridge-http/README.md) | Calls the DeepDroidPilot localhost HTTP bridge | registers on `ctx.mobile` |
| [`tool-mobile/`](tool-mobile/README.md) | Exposes Android observation, input, app launch, and confirmation tools to the model | registers on `ctx.tools` |

`@deepseek-ai/dsh-mobile` owns the capability seam. Providers register transports; Consumers own model-visible names, schemas, prompt guidance, and rendering.
