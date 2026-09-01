/**
 * Package-owned invariant companion for `@blue-soda/dsh-banyan-ui-authoring`.
 * @module @blue-soda/dsh-banyan-ui-authoring/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@blue-soda/dsh-banyan-ui-authoring'

/** Cordis companion plugin name. */
export const name = 'banyan-ui-authoring-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/** No runtime invariant: this prompt-only package has no independent lifecycle stream. */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
