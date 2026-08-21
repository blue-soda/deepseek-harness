# @deepseek-ai/dsh-mobile

[English](README.md) | 中文

Android 移动端 bridge 执行的 Service Definition。它注册 `ctx.mobile`，拥有 provider 选择策略，并为 Consumer 暴露 `health()` 与 `execute()`。

## Model Experience

Indirectly, through `@deepseek-ai/dsh-tool-mobile`, which owns Android tool names, prompt guidance, rendered outputs, and failure text.

#### KV Cache effect

无直接失效；具名 Consumer 拥有 request-prefix 变化。

## Known Limitations and Deferred Work

- Mobile session events 已覆盖 bridge 可达性、bridge 请求/结果事实和 Android 用户确认审计记录。更丰富的 streaming bridge events 仍留待后续设计。
- Provider 选择当前支持一个活动 provider；更丰富的设备发现属于后续 mobile runtime 设计。
