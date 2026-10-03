---
description: "通过 Android 桥接执行收集输出的 shell 命令。持久终端及原始管道需要其他提供方。"
kind: package-reference
---

# @deepseek-ai/dsh-subprocess-android

[English](README.md) | 中文

## 概述

通过 Android 桥接执行收集输出的 shell 命令。持久终端及原始管道需要其他提供方。

## 目录

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## 使用此包

`ctx.subprocess` 的 Android bridge 实现。

该 provider 通过 DeepDroidPilot 的 Android bridge `shell.exec` 工具执行短生命周期命令。它有意比 `@deepseek-ai/dsh-subprocess-local` 更小：前台 collect-mode 命令可用；raw stdio pipe 和 PTY terminal 会明确失败，直到 Android bridge 补上长生命周期进程句柄协议。

它会把 `bash -c <command>` 与 `sh -c <command>` 请求映射到 Android `/system/bin/sh -c <command>`，因此现有 DSH bash executor 可以在不内置 GNU Bash 的情况下运行在 Android 上。其他 argv 请求会经过 shell quoting 后交给 `/system/bin/sh` 执行。

<a id="model-experience"></a>
## Model Experience

Indirectly, through the tool consumers of this provider.

#### KV Cache effect

模型请求前缀由使用此服务的插件负责；服务配置只影响执行。

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- 此扩展依赖部署方提供的 Android 桥接或 Banyan 客户端，未验证真机集成。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作记录</summary>

无。

</details>
