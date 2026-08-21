# @deepseek-ai/dsh-mobile-bridge-http

[English](README.md) | 中文

`@deepseek-ai/dsh-mobile` 的本地 HTTP provider。它调用 Android App 暴露在 `http://127.0.0.1:8765` 的 localhost bridge，并把 bridge token 作为 bearer credential 发送。

对 `/execute` 而言，只要非 2xx 响应仍携带标准 Android tool response 结构，Provider 就会把它作为 `ok: false` 结果返回给 Consumer，保留 `user_rejected`、`permission_denied` 或 `system_restricted` 等 bridge error code。非标准 HTTP 失败仍作为 provider error 暴露。

## Model Experience

Indirectly, through `@deepseek-ai/dsh-tool-mobile`, which owns Android tool names, prompt guidance, rendered outputs, and failure text.

#### KV Cache effect

无直接失效；provider URL 或 token 的变化只影响执行，具名 Consumer 拥有 request-prefix 变化。

## Known Limitations and Deferred Work

- Provider 要求调用方通过配置或 `DSH_ANDROID_BRIDGE_TOKEN` 提供 Android bridge token。
- 当前只支持请求/响应式 HTTP；streaming bridge events 留待后续实现。
