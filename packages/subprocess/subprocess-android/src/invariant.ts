/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-subprocess-android`.
 * @module @deepseek-ai/dsh-subprocess-android/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-subprocess-android'

/** Cordis companion plugin name. */
export const name = 'subprocess-android-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: this package adapts the subprocess seam to the Android bridge.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
