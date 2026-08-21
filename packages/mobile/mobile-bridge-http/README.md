# @deepseek-ai/dsh-mobile-bridge-http

English | [中文](README.zh.md)

Local HTTP provider for `@deepseek-ai/dsh-mobile`. It calls the Android app's localhost bridge at `http://127.0.0.1:8765` and sends the bridge token as a bearer credential.

For `/execute`, non-2xx responses that still carry the standard Android tool response shape are returned to Consumers as `ok: false` results, preserving bridge error codes such as `user_rejected`, `permission_denied`, or `system_restricted`. Non-standard HTTP failures still surface as provider errors.

## Model Experience

Indirectly, through `@deepseek-ai/dsh-tool-mobile`, which owns Android tool names, prompt guidance, rendered outputs, and failure text.

#### KV Cache effect

No direct invalidation; changing provider URL or token affects execution only, while the named consumer owns request-prefix changes.

## Known Limitations and Deferred Work

- The provider expects the caller to supply the Android bridge token through config or `DSH_ANDROID_BRIDGE_TOKEN`.
- It supports request/response HTTP only; streaming bridge events are deferred.
