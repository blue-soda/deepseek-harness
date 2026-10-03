---
description: "使用 bearer token 将 Agent 连接至 Android HTTP 桥接。传输错误由工具调用方接收。"
kind: package-reference
---

# @deepseek-ai/dsh-mobile-bridge-http

[English](README.md) | 中文

## 概述

使用 bearer token 将 Agent 连接至 Android HTTP 桥接。传输错误由工具调用方接收。

## 目录

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## 使用此包

`@deepseek-ai/dsh-mobile` 的本地 HTTP provider。它调用 Android App 暴露在 `http://127.0.0.1:8765` 的 localhost bridge，并把 bridge token 作为 bearer credential 发送。

对 `/execute` 而言，只要非 2xx 响应仍携带标准 Android tool response 结构，Provider 就会把它作为 `ok: false` 结果返回给 Consumer，保留 `user_rejected`、`permission_denied` 或 `system_restricted` 等 bridge error code。非标准 HTTP 失败仍作为 provider error 暴露。

<a id="model-experience"></a>
## Model Experience

Indirectly, through the tool consumers of this provider.

#### KV Cache effect

模型请求前缀由使用此服务的插件负责；服务配置只影响执行。

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Provider 要求调用方通过配置或 `DSH_ANDROID_BRIDGE_TOKEN` 提供 Android bridge token。
- 当前只支持请求/响应式 HTTP；streaming bridge events 留待后续实现。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作记录</summary>

无。

</details>
