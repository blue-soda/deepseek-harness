---
description: "在受限嵌入式环境中运行无需原生图像编码库的配置。此提供方明确拒绝图片附件。需要图片支持时应选择 Android 附件提供方。"
kind: package-reference
---

# @deepseek-ai/dsh-attachment-basic

[English](README.md) | 中文

## 概述

在受限嵌入式环境中运行无需原生图像编码库的配置。此提供方明确拒绝图片附件。需要图片支持时应选择 Android 附件提供方。

## 目录

- [使用此包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与后续工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

<a id="use-this-package"></a>
## 使用此包

在不支持图片的环境中加载此提供方。它以空媒体类型列表实现附件服务，明确拒绝图片验证、保存和读取。

<a id="model-experience"></a>
## Model Experience

None, as the provider rejects image attachments and contributes no model context.

#### KV Cache effect

此包不改变模型请求前缀。

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- 不提供图片存储或请求投影。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作记录</summary>

无。

</details>
