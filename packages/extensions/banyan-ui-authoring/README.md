# Banyan UI Authoring

`@blue-soda/dsh-banyan-ui-authoring` contributes a DSH system prompt section for Banyan-hosted Agents.

The package teaches Agents to use the existing Cordis dynamic-plugin tools together with Banyan's client-side `BanyanUI` inspect provider and `banyanUiExtensions` service. Installed plugins become persistent Banyan UI plugins that appear in Banyan Settings and can be enabled, disabled, or removed by the user.

This package only provides Host-side authoring guidance. The actual Banyan UI extension runtime lives in the Banyan app client plugin.

## Model Experience

### Banyan UI authoring system prompt

#### What the model sees

The conversation model sees the `tool:banyan-ui-authoring` system prompt section whenever the Banyan web host bundle mounts this plugin. It instructs the Agent to inspect `BanyanUI.describeAuthoringContext`, install persistent UI plugins through `ctx.banyanUiExtensions.installUserUiPlugin(manifest)`, and verify them with `BanyanUI.listUserUiPlugins`.

##### Prompt excerpt

```markdown
# Banyan UI Plugins

When the user asks you to customize Banyan UI, use the DSH Cordis dynamic-plugin tools and Banyan's client-side extension bridge.
```

#### Token effect

Fixed prompt-section cost on every request made by a host profile that includes the Banyan web host bundle.

#### KV Cache effect

Prefix-stable while the Banyan UI authoring prompt text and plugin mount position remain unchanged. Editing or removing this prompt changes later request prefixes from the first changed prompt token.
