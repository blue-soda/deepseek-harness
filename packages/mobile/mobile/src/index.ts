/**
 * Service Definition for Android mobile bridge execution (`ctx.mobile`).
 * Providers register one transport, and Consumers execute named Android tools
 * without owning HTTP, token, or provider selection policy.
 * @module @deepseek-ai/dsh-mobile
 */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {
  AndroidBridgeHealth,
  AndroidBridgeProvider,
  AndroidToolRequest,
  AndroidToolResponse,
} from './types.ts'
import { MobileError } from './types.ts'

export {
  MobileError,
} from './types.ts'
export type {
  AndroidBridgeHealth,
  AndroidBridgeProvider,
  AndroidToolDefinition,
  AndroidToolError,
  AndroidToolRequest,
  AndroidToolResponse,
  AndroidToolRisk,
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    mobile: MobileRuntime
  }
}

/** Mobile runtime provider selection config. */
export interface MobileRuntimeConfig {
  /** Explicit provider id. Omitted = use the only usable provider. */
  readonly provider?: string
}

/** Android bridge capability registry and execution service. */
export class MobileRuntime extends Service {
  static Config: z<MobileRuntimeConfig> = z.object({
    provider: z.string(),
  })

  private providers = new Map<string, AndroidBridgeProvider>()
  private readonly providerId: string | undefined

  constructor(ctx: Context, config: MobileRuntimeConfig = {}) {
    super(ctx, 'mobile')
    this.providerId = config.provider ?? process.env.DSH_MOBILE_PROVIDER
  }

  /**
   * Register an Android bridge provider.
   * @param provider - provider keyed by its `id`.
   * @returns disposer that unregisters the provider.
   */
  registerProvider(provider: AndroidBridgeProvider): () => void {
    if (this.providers.has(provider.id)) {
      throw new MobileError(`a mobile provider with id "${provider.id}" is already registered`, 'MOBILE_DUPLICATE_PROVIDER')
    }
    const providers = this.providers
    const id = provider.id
    const dispose = this.ctx.effect(function* () {
      providers.set(id, provider)
      yield () => providers.delete(id)
    }, 'mobile.registerProvider()')
    return () => void dispose()
  }

  /**
   * Read Android bridge health from the selected provider.
   * @param signal - optional cancellation signal.
   * @returns Android bridge health.
   */
  async health(signal?: AbortSignal): Promise<AndroidBridgeHealth> {
    return this.resolveProvider().health(signal)
  }

  /**
   * Execute one Android bridge tool through the selected provider.
   * @param request - Android bridge request.
   * @param signal - optional cancellation signal.
   * @returns Android bridge response.
   */
  async execute(request: AndroidToolRequest, signal?: AbortSignal): Promise<AndroidToolResponse> {
    return this.resolveProvider().execute(request, signal)
  }

  private resolveProvider(): AndroidBridgeProvider {
    if (this.providerId !== undefined) {
      const provider = this.providers.get(this.providerId)
      if (provider === undefined) {
        throw new MobileError(`configured mobile provider "${this.providerId}" is not registered`, 'MOBILE_PROVIDER_CONFIGURED_MISSING')
      }
      if (!provider.available()) {
        throw new MobileError(`configured mobile provider "${this.providerId}" is registered but unavailable`, 'MOBILE_PROVIDER_CONFIGURED_UNAVAILABLE')
      }
      return provider
    }

    const usable = [...this.providers.values()].filter(provider => provider.available())
    const [single] = usable
    if (single === undefined) {
      throw new MobileError('no usable mobile provider is registered', 'MOBILE_PROVIDER_UNAVAILABLE')
    }
    if (usable.length > 1) {
      const ids = usable.map(provider => provider.id).join(', ')
      throw new MobileError(`multiple usable mobile providers are registered (${ids}); configure one explicitly`, 'MOBILE_PROVIDER_AMBIGUOUS')
    }
    return single
  }
}

export default MobileRuntime
