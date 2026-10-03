---
description: "Save Android image attachments without native codecs. Request images must fit the selected route targets."
kind: package-reference
---

# @deepseek-ai/dsh-attachment-android

English | [中文](README.zh.md)

## Summary

Save Android image attachments without native codecs. Request images must fit the selected route targets.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## Use this package

Android embedded attachment backend for DeepSeek Harness. It mounts `ctx.attachments` without `sharp`/libvips and stores PNG, JPEG, and WebP images as verified content-addressed objects under `DSH_HOME`.

This backend is intended for the embedded Android runtime where native image-processing packages are either unavailable or too large. It validates image headers and dimensions, persists original encoded bytes, and serves model-request images only when the stored image already fits the route budget. Oversized request projections fail closed with `IMAGE_TOO_LARGE`; Android/Kotlin-side resizing can be layered behind this package later without changing the DSH attachment API.

<a id="model-experience"></a>
## Model Experience

Indirectly, through the tool consumers of this provider.

#### KV Cache effect

The consuming plugin owns request-prefix changes; service configuration affects execution only.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The extension requires the deployment-owned Android bridge or Banyan client; physical-device integration remains unverified.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers</summary>

None.

</details>
