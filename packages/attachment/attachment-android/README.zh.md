---
description: "无需原生编码库即可保存 Android 图片附件。请求图片必须符合所选模型路由的目标限制。"
kind: package-reference
---

# @deepseek-ai/dsh-attachment-android

[English](README.md) | 中文

## 概述

无需原生编码库即可保存 Android 图片附件。请求图片必须符合所选模型路由的目标限制。

## 目录

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## 使用此包

DeepSeek Harness 的 Android 嵌入式附件后端。它在不依赖 `sharp`/libvips 的情况下挂载 `ctx.attachments`，并把 PNG、JPEG、WebP 图片作为经过校验的内容寻址对象存放在 `DSH_HOME` 下。

该后端面向嵌入 Android runtime：原生图片处理包在这里要么不可用，要么体积过大。它会校验图片头、尺寸和引用完整性，保存原始编码字节；当图片本身已经满足模型路由预算时，直接作为 model-request image 返回。超过请求预算的投影会以 `IMAGE_TOO_LARGE` 失败关闭；后续可以在不改变 DSH attachment API 的前提下，把 Android/Kotlin 侧 resize 接到这个包后面。

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
