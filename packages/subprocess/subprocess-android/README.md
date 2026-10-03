---
description: "Run collected shell commands through the Android bridge. Persistent terminals and raw pipes require another provider."
kind: package-reference
---

# @deepseek-ai/dsh-subprocess-android

English | [中文](README.zh.md)

## Summary

Run collected shell commands through the Android bridge. Persistent terminals and raw pipes require another provider.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## Use this package

Android bridge implementation of `ctx.subprocess`.

This provider runs short-lived commands through DeepDroidPilot's Android bridge `shell.exec` tool. It is intentionally smaller than `@deepseek-ai/dsh-subprocess-local`: foreground collect-mode commands work, while raw stdio pipes and PTY terminals fail loud until the Android bridge grows a long-lived process-handle protocol.

The provider maps `bash -c <command>` and `sh -c <command>` requests onto Android `/system/bin/sh -c <command>`, so the existing DSH bash executor can run on Android without bundling GNU Bash. Other argv requests are quoted and executed through `/system/bin/sh`.

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
