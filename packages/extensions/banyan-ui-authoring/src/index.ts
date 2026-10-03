/**
 * Banyan UI authoring guidance for Agents running inside a Banyan DSH host.
 *
 * @module @blue-soda/dsh-banyan-ui-authoring
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'

export const name = 'banyan-ui-authoring'
export const inject = ['systemPrompt']

/** System-prompt guidance for authoring optional Banyan client UI plugins. */
export const BANYAN_UI_AUTHORING_PROMPT = `# Banyan UI Plugins

When the user asks you to customize Banyan UI, inspect the current client capabilities before writing a removable client plugin.

Call cordis_inspect_list and look for a Client provider named BanyanUI. Query its declared authoring methods with cordis_inspect_query. Use the returned slot names, theme tokens, and service methods; do not guess APIs. If the provider is absent, work in the Banyan client repository or report the missing integration.

Keep Banyan-specific presentation in a separate client plugin. Use the current plugin-authoring skills and package structure. Install a reviewed bundle through the available Plugin Manager only when its client entry and dependencies are ready. Inspection tools are read-only and cannot install or execute generated plugins.

If the client declares banyanUiExtensions.installUserUiPlugin, follow the declared input fields and verify the installed plugin through the declared inspection method. The user must be able to enable, disable, and remove the plugin in Banyan settings. Native Android UI, permissions, and packaged runtime changes require source changes and an app rebuild.`

export function apply(ctx: Context): void {
  ctx.systemPrompt.section({
    name: 'tool:banyan-ui-authoring',
    order: 116,
    text: BANYAN_UI_AUTHORING_PROMPT,
  })
}
