---
description: "为 Agent 提供安装可卸载 Banyan 客户端 UI 插件的指导。客户端必须提供 UI 扩展运行时。"
kind: package-reference
---

# Banyan UI 创作

[English](README.md) | 中文

## 概述

为 Agent 提供安装可卸载 Banyan 客户端 UI 插件的指导。客户端必须提供 UI 扩展运行时。

## 目录

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## 使用此包

`@blue-soda/dsh-banyan-ui-authoring` 为 Banyan 托管的 Agent 提供 DSH 系统提示词。

此包指导 Agent 通过 Cordis 动态插件工具以及客户端的 `BanyanUI` inspect provider 和 `banyanUiExtensions` 服务创建持久化 UI 插件。用户可以在 Banyan 设置中启用、禁用或移除这些插件。

此包只提供 Host 侧指导。实际 UI 扩展运行时属于 Banyan 应用客户端。

<a id="model-experience"></a>
## Model Experience

### Banyan UI authoring system prompt

#### What the model sees

加载此插件时，模型接收 `tool:banyan-ui-authoring` 提示词段，指导它检查客户端创作接口，安装 UI 插件并验证结果。

##### Prompt excerpt

```markdown
# Banyan UI Plugins

When the user asks you to customize Banyan UI, inspect the current client capabilities before writing a removable client plugin.
```

#### Token effect

加载期间，每次请求包含固定提示词段的 token 成本。

#### KV Cache effect

提示词文本和加载位置不变时，前缀保持稳定。编辑或移除此提示词会改变后续请求前缀。

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- 此扩展依赖部署方提供的 Android 桥接或 Banyan 客户端，未验证真机集成。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作记录</summary>

无。

</details>
