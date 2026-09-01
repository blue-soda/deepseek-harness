/**
 * Banyan UI authoring guidance for Agents running inside a Banyan DSH host.
 *
 * @module @blue-soda/dsh-banyan-ui-authoring
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'

export const name = 'banyan-ui-authoring'
export const inject = ['systemPrompt']

export const BANYAN_UI_AUTHORING_PROMPT = `# Banyan UI Plugins

When the user asks you to customize Banyan UI, use the DSH Cordis dynamic-plugin tools and Banyan's client-side extension bridge.

Workflow:

1. Call cordis_inspect_list and confirm the Client Inspect Provider named BanyanUI is available.
2. Call cordis_inspect_query with platform:"client", provider:"BanyanUI", method:"describeAuthoringContext", and empty input.
3. Define a dynamic Cordis Package with a Client half. The Client half should return a plugin that injects banyanUiExtensions and calls ctx.banyanUiExtensions.installUserUiPlugin(manifest).
4. Run the Package with cordis_run. It may require user approval in the UI.
5. Verify success with BanyanUI.listUserUiPlugins or by checking that the plugin appears in Banyan Settings.

Installed Banyan UI plugins are not the same as temporary DSH-only Slot or Theme plugins. A Banyan UI plugin is persisted by Banyan, visible in the Banyan Settings plugin manager, and can be enabled, disabled, or removed by the user.

Use Banyan business slot names and theme tokens returned by BanyanUI.describeAuthoringContext. Do not guess slot names, token names, or service APIs.

Minimal Client-half shape:

\`\`\`js
const manifest = {
  id: 'semantic-plugin-id',
  name: 'Readable Plugin Name',
  enabled: true,
  slots: [],
  tokens: {},
  css: ''
}

return {
  inject: ['banyanUiExtensions'],
  apply(ctx) {
    ctx.banyanUiExtensions.installUserUiPlugin(manifest)
  },
}
\`\`\`

This can customize Banyan's WebView/browser UI shell and Banyan business slots. Native Android APK chrome, native permissions, and packaged runtime changes still require reviewed source changes and a rebuilt app.`

export function apply(ctx: Context): void {
  ctx.systemPrompt.section({
    name: 'tool:banyan-ui-authoring',
    order: 116,
    text: BANYAN_UI_AUTHORING_PROMPT,
  })
}
