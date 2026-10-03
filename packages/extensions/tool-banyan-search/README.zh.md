---
description: "让 Agent 检索可见的 Banyan 帖子、共享技能和知识文档。访问范围由配置的后端身份决定。此包提供检索工具，不提供维护操作。"
kind: package-reference
---

# @deepseek-ai/dsh-tool-banyan-search

[English](README.md) | 中文

## 概述

让 Agent 检索可见的 Banyan 帖子、共享技能和知识文档。访问范围由配置的后端身份决定。此包提供检索工具，不提供维护操作。

## 目录

- [使用此包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与后续工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

<a id="use-this-package"></a>
## 使用此包

在具有 `ctx.tools` 的 Agent 作用域中加载此插件，通过 `baseUrl` 和 `authTokenEnv` 配置后端。[配置目录](../../../docs/config-catalog.zh.md) 列出全部设置，[工具目录](../../../docs/tool-catalog.zh.md#deepseek-aidsh-tool-banyan-search) 列出五个检索工具。可选 Banyan bundle 使用此插件注册搜索 preset。

<a id="model-experience"></a>
## Model Experience

### Tools and guidance

#### What the model sees

模型接收五个 Banyan 检索工具定义，以及包含可见内容和技能包元数据的文本结果，详见生成的[工具目录](../../../docs/tool-catalog.zh.md#deepseek-aidsh-tool-banyan-search)。

#### Token effect

加载期间工具定义占用请求 token，检索出的 Markdown 和元数据占用结果 token。

#### KV Cache effect

改变加载的工具会改变请求前缀；后端凭证只影响执行。

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- 需要可访问的 Banyan 后端及已授权身份。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作记录</summary>

无。

</details>
