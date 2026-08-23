/** Package-owned invariant companion for `@deepseek-ai/dsh-attachment-basic`. @module @deepseek-ai/dsh-attachment-basic/invariant */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-attachment-basic'
/** Cordis companion plugin name. */
export const name = 'attachment-basic-invariant'
/** Services required before package ownership can be reserved. */
export const inject = ['invariants', 'attachments']
/** No runtime invariant: this backend intentionally rejects image persistence. */
const install: InvariantInstaller = () => {}
/** Register the package invariant companion. */
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
