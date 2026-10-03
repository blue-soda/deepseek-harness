---
description: "启用可选 Banyan Host 服务以及移动端、搜索和运维 Agent preset。卸载会移除其即时 Host 功能与 preset 声明。"
kind: package-bundle
---

# 可选 Banyan 插件包

[English](README.md) | 中文

## 概述

启用可选 Banyan Host 服务以及移动端、搜索和运维 Agent preset。卸载会移除其即时 Host 功能与 preset 声明。

## 目录

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## 使用此包

本插件包挂载 Banyan Host 文件操作服务与 UI 创作指导，并注册 `mobile`、`banyan-search` 和 `banyan-ops` Agent preset。官方默认 profile 不包含它。通过插件管理器将它显式添加到 Web profile；禁用或移除后，Host 扩展和 preset 声明随之移除。已经使用某个 preset 的会话可能保留所取得的版本，直到会话释放它。

Preset 声明只选择 Agent 能力。Bundle 提供这些插件的依赖，以及不能放在单个 Agent 作用域中的 Host 服务。入口模块不产生功能；组合由 patch 文件负责。Android 附件和子进程提供者保留为依赖，供内嵌部署显式覆盖提供者使用，普通桌面 Host 不挂载它们。

## 客户端 API

可选的 `banyanFileOps` Typert Remote 命名空间提供 `copyDirectory`、`installSkillPackage` 和 `pruneData`。已经移除的 `host/apiproxy` 协议不受支持；客户端需要使用当前 Typert Gateway。Agent preset 编辑和会话生命周期遵循官方 API。实际 Banyan UI 扩展运行时属于 Banyan 客户端。

<a id="model-experience"></a>
## Model Experience

Indirectly, through the plugins selected by the optional patch files.

#### KV Cache effect

模型请求前缀由使用此服务的插件负责；服务配置只影响执行。

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- 旧 Android 运行时打包脚本继续保留，但当前官方 Desktop 和原生运行时尚未完成 Android 验证。Android 桥接图片转换需要遵守当前的宽度、高度和字节目标。现有 Banyan 客户端需要先迁移 API，才能使用此 Host。对话 CSS 和消息渲染器的直接覆盖不属于本插件包；Banyan 展示应由独立客户端插件负责。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作记录</summary>

无。

</details>
