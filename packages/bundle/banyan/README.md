---
description: "Enable optional Banyan Host services and mobile, search, and operations Agent presets. Unloading removes its live Host contributions and preset declarations."
kind: package-bundle
---

# Optional Banyan bundle

English | [中文](README.zh.md)

## Summary

Enable optional Banyan Host services and mobile, search, and operations Agent presets. Unloading removes its live Host contributions and preset declarations.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## Use this package

This bundle mounts Banyan Host filesystem services and UI authoring guidance, and registers the `mobile`, `banyan-search`, and `banyan-ops` Agent presets. It is absent from the official default profiles. Add the bundle explicitly to a Web profile through the Plugin Manager; disabling or removing it removes its Host contributions and preset declarations. A session already using a preset can retain its acquired revision until that session releases it.

Preset declarations only select Agent capabilities. The bundle supplies their plugin dependencies and the Host services that cannot live in a single Agent scope. Its entry module is inert; the patch files own composition. Android attachment and subprocess providers remain available as dependencies for an embedded deployment's explicit provider overrides, and are not mounted on a normal desktop Host.

## Client API

The optional `banyanFileOps` Typert Remote namespace exposes `copyDirectory`, `installSkillPackage`, and `pruneData`. The removed `host/apiproxy` wire protocol is unsupported; clients must use the current Typert Gateway. Agent preset editing and session lifecycle follow the official APIs. The actual Banyan UI extension runtime belongs to the Banyan client.

<a id="model-experience"></a>
## Model Experience

Indirectly, through the plugins selected by the optional patch files.

#### KV Cache effect

The consuming plugin owns request-prefix changes; service configuration affects execution only.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The legacy Android runtime packaging scripts are retained, but the current official Desktop and native runtime are not qualified for Android. Android bridge image conversion must honor the current width, height, and byte targets. Existing Banyan clients require an API migration before using this Host. Direct conversation CSS and message-renderer overrides are not part of this bundle; Banyan presentation belongs to a separate client plugin.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers</summary>

None.

</details>
