---
description: "Copy a workspace, install a shared skill package, or prune Host-local session and cache files from a Banyan client. Filesystem operations run on the Host account. Copying rejects identical or nested paths, and skill files must remain inside the selected installation directory."
kind: package-reference
---

# @blue-soda/dsh-host-banyan-file-ops

English | [中文](README.zh.md)

## Summary

Copy a workspace, install a shared skill package, or prune Host-local session and cache files from a Banyan client. Filesystem operations run on the Host account. Copying rejects identical or nested paths, and skill files must remain inside the selected installation directory.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## Use this package

The optional bundle mounts this Host service. Its `banyanFileOps` Typert Remote namespace exposes `copyDirectory`, `installSkillPackage`, and `pruneData`. Clients use the current Gateway protocol. Skill installation defaults to the DSH skills root and rejects existing targets unless overwrite is requested. See the [Banyan subsystem](../../../docs/subsystems/banyan.md) for the service reference.

<a id="model-experience"></a>
## Model Experience

None, as Host filesystem methods emit no model context or Session events.

#### KV Cache effect

This package does not change model request prefixes.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Banyan clients using the removed apiproxy protocol require migration to Typert Remote.
- Pruning deletes files under the selected Host data tree.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers</summary>

None.

</details>
