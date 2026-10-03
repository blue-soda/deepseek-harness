---
description: "Run a constrained embedded configuration without native image codecs. This provider rejects image attachments explicitly. Choose the Android attachment provider when image support is required."
kind: package-reference
---

# @deepseek-ai/dsh-attachment-basic

English | [中文](README.zh.md)

## Summary

Run a constrained embedded configuration without native image codecs. This provider rejects image attachments explicitly. Choose the Android attachment provider when image support is required.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## Use this package

Mount this provider where images are unavailable. It implements the attachment service with empty accepted media types; image validation, saving, and reading fail explicitly.

<a id="model-experience"></a>
## Model Experience

None, as the provider rejects image attachments and contributes no model context.

#### KV Cache effect

This package does not change model request prefixes.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Image storage and request projection are unavailable.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers</summary>

None.

</details>
