/**
 * Request and response vocabulary for the Android bridge capability seam.
 * @module @deepseek-ai/dsh-mobile/types
 */

import { HarnessError } from '@deepseek-ai/dsh-llm'

/** Risk levels mirrored by the Android Tool Bridge protocol. */
export type AndroidToolRisk = 'read_only' | 'reversible' | 'external_side_effect' | 'sensitive'

/** One Android-side tool advertised by the bridge. */
export interface AndroidToolDefinition {
  /** Stable Android bridge tool name. */
  readonly name: string
  /** Required risk level for executing this tool. */
  readonly risk: AndroidToolRisk
  /** Human-readable tool purpose. */
  readonly description: string
}

/** Bridge service health returned by `/health`. */
export interface AndroidBridgeHealth {
  /** Bridge lifecycle status. */
  readonly status: 'stopped' | 'listening' | 'connected' | 'error'
  /** Android bridge implementation version. */
  readonly version: string
  /** Tool set currently exposed by the Android bridge. */
  readonly tools: readonly AndroidToolDefinition[]
}

/** One Android bridge execution request. */
export interface AndroidToolRequest {
  /** Unique request id chosen by the DSH caller. */
  readonly id: string
  /** Android bridge tool name. */
  readonly tool: string
  /** Declared risk level; the bridge rejects mismatches. */
  readonly risk: AndroidToolRisk
  /** JSON object passed as `arguments` to the Android bridge. */
  readonly arguments: Record<string, unknown>
  /** Optional session id for Android-side correlation. */
  readonly sessionId?: string
}

/** Android bridge execution error. */
export interface AndroidToolError {
  /** Machine-routable Android bridge error code. */
  readonly code: string
  /** Human-readable failure reason. */
  readonly message: string
  /** Actionable remediation hint supplied by the Android bridge. */
  readonly recoveryHint?: string
}

/** Android bridge execution response. */
export interface AndroidToolResponse {
  /** Request id echoed by the bridge. */
  readonly id: string
  /** Whether the Android tool completed successfully. */
  readonly ok: boolean
  /** Tool-specific JSON result object. */
  readonly result: Record<string, unknown>
  /** Structured error; null on success. */
  readonly error: AndroidToolError | null
  /** Android-side execution duration in milliseconds. */
  readonly durationMs: number
}

/** Provider implementation registered with `ctx.mobile`. */
export interface AndroidBridgeProvider {
  /** Stable provider id. */
  readonly id: string
  /** Cheap local availability check. */
  available(): boolean
  /** Read bridge health; must honor cancellation. */
  health(signal?: AbortSignal): Promise<AndroidBridgeHealth>
  /** Execute one Android bridge tool request; must honor cancellation. */
  execute(request: AndroidToolRequest, signal?: AbortSignal): Promise<AndroidToolResponse>
}

/** Error thrown by the mobile capability seam and its providers. */
export class MobileError extends HarnessError {}
