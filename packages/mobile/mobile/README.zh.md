---
description: "通过选定提供方执行 Android 桥接工具。设备发现由部署方负责。"
kind: package-reference
---

# @deepseek-ai/dsh-mobile

[English](README.md) | 中文

## 概述

通过选定提供方执行 Android 桥接工具。设备发现由部署方负责。

## 目录

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## 使用此包

Android 移动端 bridge 执行的 Service Definition。它注册 `ctx.mobile`，拥有 provider 选择策略，并为 Consumer 暴露 `health()` 与 `execute()`。

<a id="model-experience"></a>
## Model Experience

Indirectly, through the tool consumers of this provider.

#### KV Cache effect

模型请求前缀由使用此服务的插件负责；服务配置只影响执行。

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Mobile session events 已覆盖 bridge 可达性、bridge 请求/结果事实和 Android 用户确认审计记录。更丰富的 streaming bridge events 仍留待后续设计。
- Provider 选择当前支持一个活动 provider；更丰富的设备发现属于后续 mobile runtime 设计。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作记录</summary>

无。

</details>
