---
description: "检查 Banyan 后端健康状态、追踪记录、缓存、索引及 outbox，通过 HTTP API 执行留有审计记录的维护和受控可靠性演练。后端授权与审批策略控制修改操作。"
kind: package-reference
---

# @deepseek-ai/dsh-tool-banyan-ops

[English](README.md) | 中文

## 概述

检查 Banyan 后端健康状态、追踪记录、缓存、索引及 outbox，通过 HTTP API 执行留有审计记录的维护和受控可靠性演练。后端授权与审批策略控制修改操作。

## 目录

- [使用此包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与后续工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

<a id="use-this-package"></a>
## 使用此包

在具有 `ctx.tools` 和 `ctx.systemPrompt` 的 Agent 作用域中加载此插件，配置 `baseUrl`、`authTokenEnv` 和 `approvalTokenEnv`，全部字段见[配置目录](../../../docs/config-catalog.zh.md)。读取使用 GET，维护使用留有审计记录的 POST。后端要求修改审批时，`X-Banyan-Ops-Approval` 必须包含配置的审批 token。[工具目录](../../../docs/tool-catalog.zh.md#deepseek-aidsh-tool-banyan-ops) 列出全部操作。

<a id="model-experience"></a>
## Model Experience

### Tools and guidance

#### What the model sees

模型接收 Banyan 诊断和维护工具定义、操作指导及渲染后的后端结果，详见生成的[工具目录](../../../docs/tool-catalog.zh.md#deepseek-aidsh-tool-banyan-ops)。

#### Token effect

加载期间工具定义与指导占用请求 token，追踪及诊断增加结果 token。

#### KV Cache effect

工具或指导文本变化会改变前缀；HTTP 凭证不会改变工具定义。

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- 维护和演练工具可能修改后端状态，仍需满足服务端审批及授权要求。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作记录</summary>

无。

</details>
