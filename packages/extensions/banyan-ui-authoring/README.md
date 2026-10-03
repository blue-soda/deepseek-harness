---
description: "Give Agents guidance for installing removable Banyan client UI plugins. The client must supply the UI extension runtime."
kind: package-reference
---

# Banyan UI Authoring

English | [中文](README.zh.md)

## Summary

Give Agents guidance for installing removable Banyan client UI plugins. The client must supply the UI extension runtime.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## Use this package

`@blue-soda/dsh-banyan-ui-authoring` contributes a DSH system prompt section for Banyan-hosted Agents.

The package teaches Agents to use the existing Cordis dynamic-plugin tools together with Banyan's client-side `BanyanUI` inspect provider and `banyanUiExtensions` service. Installed plugins become persistent Banyan UI plugins that appear in Banyan Settings and can be enabled, disabled, or removed by the user.

This package only provides Host-side authoring guidance. The actual Banyan UI extension runtime lives in the Banyan app client plugin.

<a id="model-experience"></a>
## Model Experience

### Banyan UI authoring system prompt

#### What the model sees

The model sees the `tool:banyan-ui-authoring` section while the optional bundle mounts this plugin. It requires discovery through `cordis_inspect_list` and `cordis_inspect_query`, keeps presentation in a removable client plugin, and directs installation through the current Plugin Manager.

##### Prompt excerpt

```markdown
# Banyan UI Plugins

When the user asks you to customize Banyan UI, inspect the current client capabilities before writing a removable client plugin.
```

#### Token effect

Fixed prompt-section cost on every request made by a host profile that includes the Banyan web host bundle.

#### KV Cache effect

Prefix-stable while the Banyan UI authoring prompt text and plugin mount position remain unchanged. Editing or removing this prompt changes later request prefixes from the first changed prompt token.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The extension requires the deployment-owned Android bridge or Banyan client; physical-device integration remains unverified.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers</summary>

None.

</details>
