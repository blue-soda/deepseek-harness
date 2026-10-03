/** Log-only Android bridge facts owned by the optional mobile tool plugin. */
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
/** Coarse safety class declared by Android mobile bridge tools. */
export type MobileToolRisk =
  | 'read_only'
  | 'reversible'
  | 'external_side_effect'
  | 'sensitive'

/** Serializable Android bridge failure facts captured beside mobile tool results. */
export interface MobileToolErrorLog {
  /** Stable bridge error code. */
  readonly code: string
  /** Human-readable bridge error message. */
  readonly message: string
}


declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
  /**
   * Tool-private Android bridge request facts for reconstructing mobile I/O
   * without changing the generic model-facing `tool/call` surface event.
   */
    'mobile/tool-request': {
    /** DSH tool call identity that owns this bridge request. */
      callId: ToolCallId
      /** Android bridge request id, usually the same value as `callId`. */
      requestId: string
      /** Android bridge tool name, for example `screen.observe` or `input.tap`. */
      tool: string
      /** Safety class declared for the Android bridge request. */
      risk: MobileToolRisk
      /** Lossless JSON string of the Android bridge arguments sent to the phone. */
      argumentsJson: string
      /** Session id forwarded to the Android bridge, when present. */
      bridgeSessionId?: string
    }
    /**
   * Tool-private Android bridge response facts for reconstructing mobile I/O
   * without changing the generic model-facing `tool/result` surface event.
   */
    'mobile/tool-result': {
    /** DSH tool call identity that owns this bridge response. */
      callId: ToolCallId
      /** Android bridge request id paired with `mobile/tool-request`. */
      requestId: string
      /** Android bridge tool name, for example `screen.observe` or `input.tap`. */
      tool: string
      /** Whether the bridge accepted and completed the request successfully. */
      ok: boolean
      /** Lossless JSON string of the Android bridge result payload. */
      resultJson: string
      /** Serializable bridge or transport failure, when the request failed. */
      error?: MobileToolErrorLog
      /** Bridge or client-observed duration in milliseconds. */
      durationMs: number
    }
    /**
   * Mobile bridge reachability observed immediately before a tool execution.
   * Log-only: this does not change model context, but lets replay distinguish
   * bridge-tool failures from bridge availability drift.
   */
    'mobile/bridge-connected': {
    /** DSH tool call identity whose execution observed the bridge. */
      callId: ToolCallId
      /** Android bridge request id about to be executed. */
      requestId: string
      /** Android bridge tool name, for example `screen.observe` or `input.tap`. */
      tool: string
      /** Bridge lifecycle status returned by `/health`. */
      status: 'stopped' | 'listening' | 'connected' | 'error'
      /** Android bridge implementation version. */
      version: string
      /** Number of tools advertised by the bridge health response. */
      toolCount: number
    }
    /**
   * Mobile bridge health could not be observed before a tool execution.
   * Log-only: the paired `mobile/tool-result` still records the final tool
   * outcome when execution is attempted.
   */
    'mobile/bridge-disconnected': {
    /** DSH tool call identity whose execution observed the bridge failure. */
      callId: ToolCallId
      /** Android bridge request id about to be executed. */
      requestId: string
      /** Android bridge tool name, for example `screen.observe` or `input.tap`. */
      tool: string
      /** Reachability failure facts. */
      error: MobileToolErrorLog
    }
    /**
   * A mobile `user.confirm` tool call asked the Android user for a decision.
   * Log-only and tool-private; the model sees only the normal tool result.
   */
    'mobile/approval-requested': {
    /** DSH tool call identity that owns this mobile approval request. */
      callId: ToolCallId
      /** Android bridge request id carrying the approval dialog. */
      requestId: string
      /** Confirmation title shown to the Android user. */
      title: string
      /** Confirmation detail shown to the Android user. */
      detail: string
      /** Approval timeout forwarded to Android, when supplied by the model. */
      timeoutMs?: number
    }
    /**
   * The outcome of a prior `mobile/approval-requested`.
   * Log-only audit facts for reconstructing human confirmation flow.
   */
    'mobile/approval-decided': {
    /** DSH tool call identity that owns this mobile approval request. */
      callId: ToolCallId
      /** Android bridge request id carrying the approval dialog. */
      requestId: string
      /** Whether the Android user approved the request. */
      approved: boolean
      /** Serializable bridge or transport failure, when approval was not granted. */
      error?: MobileToolErrorLog
      /** Bridge or client-observed approval duration in milliseconds. */
      durationMs: number
    }

  }
}
