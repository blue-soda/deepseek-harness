---
description: "Connect an Agent to the Android HTTP bridge using a bearer token. Transport failures reach the consuming tool."
kind: package-reference
---

# @deepseek-ai/dsh-mobile-bridge-http

English | [中文](README.zh.md)

## Summary

Connect an Agent to the Android HTTP bridge using a bearer token. Transport failures reach the consuming tool.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## Use this package

Local HTTP provider for `@deepseek-ai/dsh-mobile`. It calls the Android app's localhost bridge at `http://127.0.0.1:8765` and sends the bridge token as a bearer credential.

For `/execute`, non-2xx responses that still carry the standard Android tool response shape are returned to Consumers as `ok: false` results, preserving bridge error codes such as `user_rejected`, `permission_denied`, or `system_restricted`. Non-standard HTTP failures still surface as provider errors.

<a id="model-experience"></a>
## Model Experience

Indirectly, through the tool consumers of this provider.

#### KV Cache effect

The consuming plugin owns request-prefix changes; service configuration affects execution only.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The provider expects the caller to supply the Android bridge token through config or `DSH_ANDROID_BRIDGE_TOKEN`.
- It supports request/response HTTP only; streaming bridge events are deferred.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers</summary>

None.

</details>
