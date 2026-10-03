---
description: "从 Banyan 客户端复制工作区、安装共享技能包，或清理 Host 本地会话与缓存文件。文件操作使用 Host 账号权限。复制拒绝相同或嵌套路径，技能文件必须位于选定安装目录中。"
kind: package-reference
---

# @blue-soda/dsh-host-banyan-file-ops

[English](README.md) | 中文

## 概述

从 Banyan 客户端复制工作区、安装共享技能包，或清理 Host 本地会话与缓存文件。文件操作使用 Host 账号权限。复制拒绝相同或嵌套路径，技能文件必须位于选定安装目录中。

## 目录

- [使用此包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与后续工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

<a id="use-this-package"></a>
## 使用此包

可选 bundle 加载此 Host 服务。其 `banyanFileOps` Typert Remote 命名空间提供 `copyDirectory`、`installSkillPackage` 和 `pruneData`，客户端通过当前 Gateway 协议调用。技能默认安装至 DSH 技能根目录，覆盖前需显式指定 overwrite。服务参考见 [Banyan 子系统](../../../docs/subsystems/banyan.zh.md)。

<a id="model-experience"></a>
## Model Experience

None, as Host filesystem methods emit no model context or Session events.

#### KV Cache effect

此包不改变模型请求前缀。

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- 使用已移除 apiproxy 协议的 Banyan 客户端需要迁移到 Typert Remote。
- 清理会删除所选 Host 数据目录中的文件。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作记录</summary>

无。

</details>
