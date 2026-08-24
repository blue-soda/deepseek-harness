/**
 * Model-facing Android mobile tools over `ctx.mobile`.
 * @module @deepseek-ai/dsh-tool-mobile
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import type { AndroidToolError, AndroidToolRequest, AndroidToolResponse } from '@deepseek-ai/dsh-mobile'
import type {} from '@deepseek-ai/dsh-attachment'
import type {} from '@deepseek-ai/dsh-mobile'
import type {} from '@deepseek-ai/dsh-system-prompt'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'tool-mobile'

/** Services required by the mobile tool suite. */
export const inject = ['tools', 'mobile', 'systemPrompt']

/** Model-facing mobile tool configuration. */
export interface Config {
  /** Register read-only screen observation. */
  readonly observe?: boolean
  /** Register tap action. */
  readonly tap?: boolean
  /** Register swipe action. */
  readonly swipe?: boolean
  /** Register text input action. */
  readonly type?: boolean
  /** Register Android app launch action. */
  readonly openApp?: boolean
  /** Register Android URL open action. */
  readonly openUrl?: boolean
  /** Register Android app close/background action. */
  readonly closeApp?: boolean
  /** Register Android APK installer action. */
  readonly installApk?: boolean
  /** Register direct Android screenshot capture. */
  readonly screenshot?: boolean
  /** Register Android /system/bin/sh execution through the bridge. */
  readonly androidSh?: boolean
  /** adb executable path used for `screen_observe` screenshot capture. */
  readonly observeScreenshotAdbPath?: string
  /** Optional adb device serial for `screen_observe` screenshot capture. */
  readonly observeScreenshotAdbSerial?: string
  /** Directory for `screen_observe` screenshot reports. */
  readonly observeScreenshotReportsDir?: string
  /** Register screenshot-driven visual action selection. */
  readonly visualStep?: boolean
  /** Vision model used by `mobile_visual_step`. */
  readonly visionModel?: string
  /** OpenAI-compatible base URL for the vision model. */
  readonly visionBaseUrl?: string
  /** Environment variable that holds the vision API key. */
  readonly visionApiKeyEnv?: string
  /** Optional key file used when the environment variable is absent. */
  readonly visionKeyFile?: string
  /** One-based line number read from `visionKeyFile`. */
  readonly visionKeyFileLine?: number
  /** adb executable path used for screenshot capture. */
  readonly visionAdbPath?: string
  /** Optional adb device serial. */
  readonly visionAdbSerial?: string
  /** Directory for screenshot and response reports. */
  readonly visionReportsDir?: string
  /** Device screen width in pixels for normalized coordinate mapping. */
  readonly visionScreenWidth?: number
  /** Device screen height in pixels for normalized coordinate mapping. */
  readonly visionScreenHeight?: number
  /** Register Android confirmation action. */
  readonly confirm?: boolean
  /** Register local memory search. */
  readonly memorySearch?: boolean
  /** Register local memory write. */
  readonly memoryWrite?: boolean
  /** Register local memory deletion. */
  readonly memoryForget?: boolean
  /** Tool timeout in milliseconds. */
  readonly timeoutMs?: number
}

export const Config: z<Config> = z.object({
  observe: z.boolean().default(true),
  tap: z.boolean().default(true),
  swipe: z.boolean().default(true),
  type: z.boolean().default(true),
  openApp: z.boolean().default(true),
  openUrl: z.boolean().default(true),
  closeApp: z.boolean().default(true),
  installApk: z.boolean().default(true),
  screenshot: z.boolean().default(true),
  androidSh: z.boolean().default(true),
  observeScreenshotAdbPath: z.string().default('adb'),
  observeScreenshotAdbSerial: z.string(),
  observeScreenshotReportsDir: z.string(),
  visualStep: z.boolean().default(false),
  visionModel: z.string().default('deepseek-v4-flash-vision-exp'),
  visionBaseUrl: z.string().default('https://api.deepseek.com'),
  visionApiKeyEnv: z.string().default('DEEPSEEK_API_KEY'),
  visionKeyFile: z.string(),
  visionKeyFileLine: z.number().default(1),
  visionAdbPath: z.string().default('adb'),
  visionAdbSerial: z.string(),
  visionReportsDir: z.string(),
  visionScreenWidth: z.number().default(1280),
  visionScreenHeight: z.number().default(2856),
  confirm: z.boolean().default(true),
  memorySearch: z.boolean().default(true),
  memoryWrite: z.boolean().default(true),
  memoryForget: z.boolean().default(true),
  timeoutMs: z.number().default(30_000),
})

/** Complete config after schemastery fills defaults. */
type ResolvedConfig = Required<Config>

/** Normalized tool output returned to the model. */
export interface MobileToolOutput {
  /** Whether the Android bridge returned success. */
  readonly ok: boolean
  /** JSON-encoded Android result object. */
  readonly resultJson: string
  /** Android bridge duration in milliseconds. */
  readonly durationMs: number
  /** Android bridge error code, when the bridge rejected the request. */
  readonly errorCode?: string
  /** Android bridge error message, when the bridge rejected the request. */
  readonly errorMessage?: string
  /** Android bridge recovery hint, when the bridge can suggest a next step. */
  readonly recoveryHint?: string
  /** Captured screenshot path on the host, when `screen_observe` requests `includeScreenshot`. */
  readonly screenshotPath?: string
  /** Durable DSH image attachment for the captured Android screenshot. */
  readonly screenshotAttachment?: JsonImageAttachmentRef
  /** Non-fatal screenshot capture or attachment error. */
  readonly screenshotError?: string
}

interface JsonImageAttachmentRef {
  readonly attachmentId: string
  readonly mediaType: string
  readonly bytes: number
  readonly width: number
  readonly height: number
  readonly name?: string
  readonly originalDimensions?: {
    readonly width: number
    readonly height: number
  }
}

/** Normalized output returned by `mobile_visual_step`. */
export interface MobileVisualStepOutput {
  /** Whether the visual step completed without local/tool errors. */
  readonly ok: boolean
  /** Whether the model says the task is complete. */
  readonly done: boolean
  /** Captured screenshot path on the host. */
  readonly screenshotPath: string
  /** Vision model used for action selection. */
  readonly model: string
  /** Raw parsed action JSON from the vision model. */
  readonly actionJson: string
  /** JSON-encoded bridge execution result, or `{}` when no bridge tool ran. */
  readonly executionJson: string
  /** Model or local reason for the step. */
  readonly reason?: string
}

const IMAGE_DIMENSIONS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    width: { type: 'number', required: true },
    height: { type: 'number', required: true },
  },
} as const

const IMAGE_ATTACHMENT_REF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    attachmentId: { type: 'string', required: true },
    mediaType: { type: 'string', required: true },
    bytes: { type: 'number', required: true },
    width: { type: 'number', required: true },
    height: { type: 'number', required: true },
    name: { type: 'string' },
    originalDimensions: IMAGE_DIMENSIONS_SCHEMA,
  },
} as const

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true },
    resultJson: { type: 'string', required: true },
    durationMs: { type: 'number', required: true },
    errorCode: { type: 'string' },
    errorMessage: { type: 'string' },
    recoveryHint: { type: 'string' },
    screenshotPath: { type: 'string' },
    screenshotAttachment: IMAGE_ATTACHMENT_REF_SCHEMA,
    screenshotError: { type: 'string' },
  },
} as const

const POST_ACTION_PARAMETERS = {
  observeAfter: {
    type: 'boolean',
    description: 'Set true to include a denoised screen_observe summary in this action result after the action completes.',
  },
  screenshotAfter: {
    type: 'boolean',
    description: 'Set true to include a screen_screenshot result in this action result after the action completes.',
  },
} as const

const VISUAL_STEP_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true },
    done: { type: 'boolean', required: true },
    screenshotPath: { type: 'string', required: true },
    model: { type: 'string', required: true },
    actionJson: { type: 'string', required: true },
    executionJson: { type: 'string', required: true },
    reason: { type: 'string' },
  },
} as const

/** Register enabled Android mobile tools. */
export function apply(ctx: Context, config: Config): void {
  const resolved = config as ResolvedConfig
  if (!Number.isInteger(resolved.timeoutMs) || resolved.timeoutMs < 1) {
    throw new Error('tool-mobile: timeoutMs must be a positive integer')
  }
  ctx.systemPrompt.section({
    name: 'tool:mobile',
    order: 112,
    text: 'Use Android mobile tools to observe and operate the current phone through the local bridge. Screenshots are often the most reliable way to understand visual layout; image-capable main models should call screen_observe with includeScreenshot=true or screen_screenshot when layout, OCR-like reading, or icon-only controls matter. Prefer nodePath actions from screen_observe over coordinates when the node is visible and specific. input_tap with nodePath defaults to accessibility_then_center, meaning it first tries an Accessibility click and falls back to the node center if needed; use strategy="center" only when Accessibility click is unreliable. If coordinates are needed, use explicit display x/y, normalizedX/normalizedY in 0..1 display space, or screenshotX/screenshotY with returnedWidth/returnedHeight from screen_screenshot. Action tools accept observeAfter and screenshotAfter when an immediate post-action summary or screenshot will reduce round trips. Use android_sh mainly for bounded read-only diagnostics such as getprop, date, uptime, free, ps, logcat -d, /proc reads, toybox, pipes, and small shell logic. Do not rely on android_sh for normal phone control, screenshots, app opening, taps, typing, URL opening, APK installation, or app closing; use the dedicated mobile tools first. android_sh runs as an Android app UID, not root or shell, so many service commands like dumpsys/settings/input/am/pm may require approval or max mode and may still fail because Android denies the app UID. Its cwd must be relative to the DroidPilot workspace. If your current model is text-only, omit includeScreenshot or set it false; use mobile_visual_step only as a fallback when text observation is insufficient. Search memory before similar tasks, write durable preferences or task lessons after useful outcomes, request user_confirm before sensitive or irreversible effects, and follow recoveryHint guidance when a bridge tool fails.',
  })
  if (resolved.observe) registerScreenObserve(ctx, resolved)
  if (resolved.tap) registerInputTap(ctx, resolved.timeoutMs)
  if (resolved.swipe) registerInputSwipe(ctx, resolved.timeoutMs)
  if (resolved.type) registerInputType(ctx, resolved.timeoutMs)
  if (resolved.openApp) registerAppOpen(ctx, resolved.timeoutMs)
  if (resolved.openUrl) registerAppOpenUrl(ctx, resolved.timeoutMs)
  if (resolved.closeApp) registerAppClose(ctx, resolved.timeoutMs)
  if (resolved.installApk) registerApkInstall(ctx, resolved.timeoutMs)
  if (resolved.screenshot) registerScreenScreenshot(ctx, resolved.timeoutMs)
  if (resolved.androidSh) registerAndroidSh(ctx, resolved.timeoutMs)
  if (resolved.visualStep) registerMobileVisualStep(ctx, resolved)
  if (resolved.confirm) registerUserConfirm(ctx, resolved.timeoutMs)
  if (resolved.memorySearch) registerMemorySearch(ctx, resolved.timeoutMs)
  if (resolved.memoryWrite) registerMemoryWrite(ctx, resolved.timeoutMs)
  if (resolved.memoryForget) registerMemoryForget(ctx, resolved.timeoutMs)
}

/**
 * Convert an Android bridge response into a tool output value.
 * @param response - Android bridge response returned by `ctx.mobile`.
 * @returns The canonical JSON value declared by every mobile tool.
 */
export function toMobileToolOutput(response: AndroidToolResponse): MobileToolOutput {
  return {
    ok: response.ok,
    resultJson: JSON.stringify(response.result),
    durationMs: response.durationMs,
    ...response.error !== null ? {
      errorCode: response.error.code,
      errorMessage: response.error.message,
      ...response.error.recoveryHint !== undefined ? { recoveryHint: response.error.recoveryHint } : {},
    } : {},
  }
}

function registerScreenObserve(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'screen_observe',
    description: 'Observe the current Android foreground app and accessible UI node summary. Image-capable models may set includeScreenshot=true to also receive an adb screenshot image; text-only models should omit it or set false and use mobile_visual_step only if text observation is insufficient.',
    parameters: {
      includeScreenshot: {
        type: 'boolean',
        description: 'Set true only when the current main model can read image input and visual layout or OCR-like screen reading is needed. Omit or set false for text-only models.',
      },
      includeFullTree: {
        type: 'boolean',
        description: 'Set true only when the default denoised accessibility node summary hides a needed node. This can be large.',
      },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => renderScreenObserveOutput(value),
    },
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const output = await executeAndroidTool(ctx, {
        id: String(exec.callId),
        tool: 'screen.observe',
        risk: 'read_only',
        arguments: {
          ...args.includeFullTree === true ? { includeFullTree: true } : {},
        },
        ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
      }, exec)
      return args.includeScreenshot === true
        ? await attachObserveScreenshot(ctx, config, output, exec)
        : output
    },
    presentCall: args => ({ card: 'generic', title: 'Observe Android screen', kind: 'read', rawInput: args }),
  }))
}

function registerInputTap(ctx: Context, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'input_tap',
    description: 'Tap an Android UI nodePath from screen_observe, or explicit display/screenshot coordinates. Prefer nodePath. Use display x/y only when you know the device display coordinate. Use normalizedX/normalizedY for 0..1 display-relative coordinates. Use screenshotX/screenshotY together with returnedWidth/returnedHeight from screen_screenshot when the point was measured on the returned screenshot image. This action returns only a compact acceptance result; call screen_observe or screen_screenshot afterwards if you need updated screen state.',
    parameters: {
      nodePath: { type: 'string', description: 'Preferred accessible node path from screen_observe.' },
      x: { type: 'integer', description: 'Fallback display-space x coordinate in original Android pixels.' },
      y: { type: 'integer', description: 'Fallback display-space y coordinate in original Android pixels.' },
      normalizedX: { type: 'number', description: 'Fallback x coordinate in normalized display space, from 0.0 left to 1.0 right.' },
      normalizedY: { type: 'number', description: 'Fallback y coordinate in normalized display space, from 0.0 top to 1.0 bottom.' },
      screenshotX: { type: 'number', description: 'Fallback x coordinate measured on the returned screenshot image.' },
      screenshotY: { type: 'number', description: 'Fallback y coordinate measured on the returned screenshot image.' },
      returnedWidth: { type: 'number', description: 'Width of the returned screenshot image used with screenshotX/screenshotY.' },
      returnedHeight: { type: 'number', description: 'Height of the returned screenshot image used with screenshotX/screenshotY.' },
      originalWidth: { type: 'number', description: 'Optional original display width from screen_screenshot; inferred by the bridge when omitted.' },
      originalHeight: { type: 'number', description: 'Optional original display height from screen_screenshot; inferred by the bridge when omitted.' },
      strategy: { type: 'string', description: 'NodePath tap strategy: accessibility_then_center (default), accessibility, or center.' },
      ...POST_ACTION_PARAMETERS,
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderMobileOutput('input.tap', value) }],
    },
    timeoutMs,
    execute(args, exec) {
      const input = parseTapArgs(args)
      return executeAndroidTool(ctx, {
        id: String(exec.callId),
        tool: 'input.tap',
        risk: 'reversible',
        arguments: input,
        ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
      }, exec)
    },
    presentCall: args => ({ card: 'generic', title: 'Tap Android screen', kind: 'edit', rawInput: args }),
  }))
}

function registerApkInstall(ctx: Context, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'apk_install',
    description: 'Open Android system package installer for an APK that is accessible to DeepDroidPilot. This does not silently install the APK; the user must confirm the Android installer prompt. Prefer this over coordinate tapping inside system install dialogs.',
    parameters: {
      filePath: { type: 'string', description: 'APK file path in the DeepDroidPilot app private files directory.' },
      contentUri: { type: 'string', description: 'Optional Android content:// URI for an APK that the app can grant to the installer.' },
      ...POST_ACTION_PARAMETERS,
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderMobileOutput('apk.install', value) }],
    },
    timeoutMs,
    execute(args, exec) {
      const input = parseApkInstallArgs(args)
      return executeAndroidTool(ctx, {
        id: String(exec.callId),
        tool: 'apk.install',
        risk: 'sensitive',
        arguments: input,
        ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
      }, exec)
    },
    presentCall: args => ({ card: 'generic', title: 'Install Android APK', kind: 'other', rawInput: args }),
  }))
}

function registerInputSwipe(ctx: Context, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'input_swipe',
    description: 'Swipe on the Android screen between two coordinates. This action returns only a compact acceptance result; call screen_observe or screen_screenshot afterwards if you need updated screen state.',
    parameters: {
      startX: { type: 'integer', required: true, description: 'Start x coordinate.' },
      startY: { type: 'integer', required: true, description: 'Start y coordinate.' },
      endX: { type: 'integer', required: true, description: 'End x coordinate.' },
      endY: { type: 'integer', required: true, description: 'End y coordinate.' },
      durationMs: { type: 'integer', description: 'Swipe duration in milliseconds.' },
      ...POST_ACTION_PARAMETERS,
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderMobileOutput('input.swipe', value) }],
    },
    timeoutMs,
    execute(args, exec) {
      const input = parseSwipeArgs(args)
      return executeAndroidTool(ctx, {
        id: String(exec.callId),
        tool: 'input.swipe',
        risk: 'reversible',
        arguments: input,
        ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
      }, exec)
    },
    presentCall: args => ({ card: 'generic', title: 'Swipe Android screen', kind: 'edit', rawInput: args }),
  }))
}

function registerInputType(ctx: Context, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'input_type',
    description: 'Type text into an Android editable nodePath from screen_observe. This action returns only a compact acceptance result; call screen_observe or screen_screenshot afterwards if you need updated screen state.',
    parameters: {
      nodePath: { type: 'string', required: true, description: 'Editable node path from screen_observe.' },
      text: { type: 'string', required: true, description: 'Text to input.' },
      ...POST_ACTION_PARAMETERS,
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderMobileOutput('input.type', value) }],
    },
    timeoutMs,
    execute(args, exec) {
      const input = parseTypeArgs(args)
      return executeAndroidTool(ctx, {
        id: String(exec.callId),
        tool: 'input.type',
        risk: 'external_side_effect',
        arguments: input,
        ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
      }, exec)
    },
    presentCall: args => ({ card: 'generic', title: 'Type on Android', kind: 'edit', rawInput: args }),
  }))
}

function registerAppOpen(ctx: Context, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'app_open',
    description: 'Open an Android app by package name.',
    parameters: {
      packageName: { type: 'string', required: true, description: 'Android package name to launch.' },
      ...POST_ACTION_PARAMETERS,
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderMobileOutput('app.open', value) }],
    },
    timeoutMs,
    execute(args, exec) {
      const input = parseAppOpenArgs(args)
      return executeAndroidTool(ctx, {
        id: String(exec.callId),
        tool: 'app.open',
        risk: 'reversible',
        arguments: input,
        ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
      }, exec)
    },
    presentCall: args => ({ card: 'generic', title: 'Open Android app', kind: 'other', rawInput: args }),
  }))
}

function registerAppOpenUrl(ctx: Context, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'app_open_url',
    description: 'Open an HTTP or HTTPS URL on the Android device, optionally forcing a target app package such as com.android.chrome to avoid the system resolver choosing the wrong handler.',
    parameters: {
      url: { type: 'string', required: true, description: 'HTTP or HTTPS URL to open.' },
      packageName: { type: 'string', description: 'Optional installed Android package that should handle the URL.' },
      ...POST_ACTION_PARAMETERS,
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderMobileOutput('app.open_url', value) }],
    },
    timeoutMs,
    execute(args, exec) {
      const input = parseAppOpenUrlArgs(args)
      return executeAndroidTool(ctx, {
        id: String(exec.callId),
        tool: 'app.open_url',
        risk: 'external_side_effect',
        arguments: input,
        ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
      }, exec)
    },
    presentCall: args => ({ card: 'generic', title: 'Open Android URL', kind: 'other', rawInput: args }),
  }))
}

function registerAppClose(ctx: Context, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'app_close',
    description: 'Move the current Android foreground app to the background with the system Home action.',
    parameters: POST_ACTION_PARAMETERS,
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderMobileOutput('app.close', value) }],
    },
    timeoutMs,
    execute(args, exec) {
      return executeAndroidTool(ctx, {
        id: String(exec.callId),
        tool: 'app.close',
        risk: 'reversible',
        arguments: postActionArgs(objectArgs(args)),
        ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
      }, exec)
    },
    presentCall: () => ({ card: 'generic', title: 'Close Android app', kind: 'other', rawInput: {} }),
  }))
}

function registerScreenScreenshot(ctx: Context, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'screen_screenshot',
    description: 'Capture the current Android screen through the DeepDroidPilot bridge and return it as a durable image attachment when attachments are available.',
    parameters: {},
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => renderScreenObserveOutput(value),
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(_args, exec) {
      const output = await executeAndroidTool(ctx, {
        id: String(exec.callId),
        tool: 'screen.screenshot',
        risk: 'read_only',
        arguments: {},
        ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
      }, exec)
      return attachBridgeScreenshot(ctx, output)
    },
    presentCall: () => ({ card: 'generic', title: 'Capture Android screen', kind: 'read', rawInput: {} }),
  }))
}

function registerAndroidSh(ctx: Context, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'android_sh',
    description: 'Run a bounded Android /system/bin/sh command in the DroidPilot workspace through the Android bridge. This is best for read-only diagnostics and small shell logic, not normal phone control. It runs as an Android app UID, not root or shell; system-service commands such as dumpsys/settings/input/am/pm may require approval or max mode and can still be denied. Prefer dedicated tools for screen observation, screenshots, app opening, tapping, typing, URL opening, APK installation, and app closing. Use mode="safe" for ordinary read-only diagnostics, mode="approval" when a command needs explicit user approval, and mode="max" only when the user has asked for the highest app-UID permissions Android can grant.',
    parameters: {
      command: { type: 'string', required: true, description: 'Shell command passed to /system/bin/sh -c.' },
      cwd: { type: 'string', description: 'Relative working directory under the DroidPilot workspace. Absolute paths are rejected.' },
      mode: { type: 'string', description: 'One of safe, approval, or max. Defaults to safe.' },
      timeoutMs: { type: 'integer', description: 'Command timeout in milliseconds.' },
      maxOutputBytes: { type: 'integer', description: 'Maximum bytes captured separately from stdout and stderr.' },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderMobileOutput('shell.exec', value) }],
    },
    timeoutMs,
    execute(args, exec) {
      return executeAndroidTool(ctx, {
        id: String(exec.callId),
        tool: 'shell.exec',
        risk: 'sensitive',
        arguments: parseAndroidShArgs(args),
        ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
      }, exec)
    },
    presentCall: args => ({ card: 'generic', title: 'Run Android shell', kind: 'other', rawInput: args }),
  }))
}

function registerUserConfirm(ctx: Context, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'user_confirm',
    description: 'Ask the Android user to approve or reject a sensitive action before continuing.',
    parameters: {
      title: { type: 'string', required: true, description: 'Short confirmation title shown to the user.' },
      detail: { type: 'string', required: true, description: 'Specific action and risk the user is approving.' },
      timeoutMs: { type: 'integer', description: 'Approval timeout in milliseconds.' },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderMobileOutput('user.confirm', value) }],
    },
    timeoutMs,
    execute(args, exec) {
      const input = parseConfirmArgs(args)
      return executeAndroidTool(ctx, {
        id: String(exec.callId),
        tool: 'user.confirm',
        risk: 'sensitive',
        arguments: input,
        ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
      }, exec)
    },
    presentCall: args => ({ card: 'generic', title: 'Ask Android user', kind: 'other', rawInput: args }),
  }))
}

function registerMemorySearch(ctx: Context, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'memory_search',
    description: 'Search durable Android-local memories for preferences, task trajectories, and knowledge relevant to the current task.',
    parameters: {
      query: { type: 'string', required: true, description: 'Search query for prior preferences or task lessons.' },
      limit: { type: 'integer', description: 'Maximum number of memories to return.' },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderMobileOutput('memory.search', value) }],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    execute(args, exec) {
      const input = parseMemorySearchArgs(args)
      return executeAndroidTool(ctx, {
        id: String(exec.callId),
        tool: 'memory.search',
        risk: 'read_only',
        arguments: input,
        ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
      }, exec)
    },
    presentCall: args => ({ card: 'generic', title: 'Search Android memory', kind: 'read', rawInput: args }),
  }))
}

function registerMemoryWrite(ctx: Context, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'memory_write',
    description: 'Write a durable Android-local memory after a useful user preference, task lesson, or reusable fact is known.',
    parameters: {
      text: { type: 'string', required: true, description: 'Memory text. Do not include secrets or one-time verification codes.' },
      kind: { type: 'string', description: 'Memory kind: preference, task_trajectory, or knowledge.' },
      metadata: {
        type: 'object',
        description: 'Optional string metadata such as app, topic, or tool names.',
        additionalProperties: true,
      },
      sourceTaskId: { type: 'string', description: 'Optional task/session id that produced the memory.' },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderMobileOutput('memory.write', value) }],
    },
    timeoutMs,
    execute(args, exec) {
      const input = parseMemoryWriteArgs(args)
      return executeAndroidTool(ctx, {
        id: String(exec.callId),
        tool: 'memory.write',
        risk: 'reversible',
        arguments: input,
        ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
      }, exec)
    },
    presentCall: args => ({ card: 'generic', title: 'Write Android memory', kind: 'edit', rawInput: args }),
  }))
}

function registerMemoryForget(ctx: Context, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'memory_forget',
    description: 'Forget one durable Android-local memory by id. Ask the user to confirm before deleting user-visible memories.',
    parameters: {
      id: { type: 'string', required: true, description: 'Memory id returned by memory_search or memory_write.' },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderMobileOutput('memory.forget', value) }],
    },
    timeoutMs,
    execute(args, exec) {
      const input = parseMemoryForgetArgs(args)
      return executeAndroidTool(ctx, {
        id: String(exec.callId),
        tool: 'memory.forget',
        risk: 'sensitive',
        arguments: input,
        ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
      }, exec)
    },
    presentCall: args => ({ card: 'generic', title: 'Forget Android memory', kind: 'other', rawInput: args }),
  }))
}

function registerMobileVisualStep(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(defineTool({
    name: 'mobile_visual_step',
    description: 'Text-only fallback for Android visual control: capture an adb screenshot, ask a configured vision helper model for one next action, and execute it through the mobile bridge when possible. Do not call this when the current main model can read images; instead call screen_observe with includeScreenshot=true and then use ordinary mobile tools.',
    parameters: {
      goal: { type: 'string', required: true, description: 'Current mobile task goal.' },
      previousActions: { type: 'string', description: 'Short summary of prior visual actions and outcomes.' },
    },
    output: {
      schema: VISUAL_STEP_OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderMobileVisualStepOutput(value as MobileVisualStepOutput) }],
    },
    timeoutMs: config.timeoutMs,
    async execute(args, exec) {
      return executeMobileVisualStep(ctx, config, args, exec)
    },
    presentCall: args => ({ card: 'generic', title: 'Visual Android step', kind: 'edit', rawInput: args }),
  }))
}

async function executeMobileVisualStep(
  ctx: Context,
  config: ResolvedConfig,
  args: unknown,
  exec: ToolRunContext,
): Promise<MobileVisualStepOutput> {
  const input = objectArgs(args)
  const goal = requiredString(input, 'goal')
  const previousActions = optionalString(input, 'previousActions') ?? ''
  const vision = resolveVisionConfig(config)
  const screenshotPath = captureVisionScreenshot(vision)
  const action = await requestVisionAction(vision, {
    goal,
    previousActions,
    screenshotPath,
  }, exec.signal)
  const execution = await executeVisualAction(ctx, vision, action, exec)
  const executionOk = typeof execution['ok'] === 'boolean' ? execution['ok'] : true
  return {
    ok: executionOk,
    done: action.action === 'done',
    screenshotPath,
    model: vision.model,
    actionJson: JSON.stringify(action),
    executionJson: JSON.stringify(execution),
    ...action.reason === undefined ? {} : { reason: action.reason },
  }
}

async function executeAndroidTool(
  ctx: Context,
  request: AndroidToolRequest,
  exec: ToolRunContext,
): Promise<MobileToolOutput> {
  const session = exec.agent?.session
  await recordBridgeReachability(ctx, request, exec)
  appendApprovalRequested(request, exec)
  session?.append('mobile/tool-request', {
    callId: exec.callId,
    requestId: request.id,
    tool: request.tool,
    risk: request.risk,
    argumentsJson: JSON.stringify(request.arguments),
    ...request.sessionId === undefined ? {} : { bridgeSessionId: String(request.sessionId) },
  })
  const startedAt = Date.now()
  try {
    const response = await ctx.mobile.execute(request, exec.signal)
    session?.append('mobile/tool-result', {
      callId: exec.callId,
      requestId: response.id,
      tool: request.tool,
      ok: response.ok,
      resultJson: JSON.stringify(response.result),
      ...response.error === null ? {} : { error: response.error },
      durationMs: response.durationMs,
    })
    appendApprovalDecided(request, exec, {
      approved: approvalApproved(response),
      ...response.error === null ? {} : { error: response.error },
      durationMs: response.durationMs,
    })
    return toMobileToolOutput(response)
  } catch (error) {
    const bridgeError = errorToAndroidToolError(error)
    const durationMs = Date.now() - startedAt
    session?.append('mobile/tool-result', {
      callId: exec.callId,
      requestId: request.id,
      tool: request.tool,
      ok: false,
      resultJson: '{}',
      error: bridgeError,
      durationMs,
    })
    appendApprovalDecided(request, exec, {
      approved: false,
      error: bridgeError,
      durationMs,
    })
    throw error
  }
}

async function attachObserveScreenshot(
  ctx: Context,
  _config: ResolvedConfig,
  output: MobileToolOutput,
  exec: ToolRunContext,
): Promise<MobileToolOutput> {
  try {
    const screenshot = await executeAndroidTool(ctx, {
      id: `${String(exec.callId)}:screenshot`,
      tool: 'screen.screenshot',
      risk: 'read_only',
      arguments: {},
      ...exec.agent !== undefined ? { sessionId: exec.agent.session.id } : {},
    }, exec)
    return attachBridgeScreenshot(ctx, { ...output, screenshotPath: 'android-bridge:screen.screenshot' }, screenshot)
  } catch (error) {
    return {
      ...output,
      screenshotError: errorToAndroidToolError(error).message,
    }
  }
}

async function attachBridgeScreenshot(
  ctx: Context,
  output: MobileToolOutput,
  screenshotOutput = output,
): Promise<MobileToolOutput> {
  try {
    const screenshot = parseScreenshotResult(screenshotOutput.resultJson)
    const attachments = ctx.get('attachments')
    if (attachments === undefined) {
      return {
        ...output,
        screenshotPath: output.screenshotPath ?? 'android-bridge:screen.screenshot',
        screenshotError: 'ctx.attachments is not mounted; cannot attach screenshot image',
      }
    }
    const attachment = await attachments.saveImage({
      data: screenshot.data,
      mediaType: screenshot.mediaType,
      name: 'android-screen.png',
    })
    return {
      ...output,
      screenshotPath: output.screenshotPath ?? 'android-bridge:screen.screenshot',
      screenshotAttachment: attachment,
    }
  } catch (error) {
    return {
      ...output,
      screenshotPath: output.screenshotPath ?? 'android-bridge:screen.screenshot',
      screenshotError: errorToAndroidToolError(error).message,
    }
  }
}

function parseScreenshotResult(resultJson: string): BridgeScreenshotCapture {
  const value = JSON.parse(resultJson) as unknown
  const record = objectArgs(value)
  const mediaType = requiredString(record, 'mediaType')
  if (!SCREENSHOT_MEDIA_TYPES.has(mediaType)) {
    throw new Error('screen.screenshot returned an unsupported mediaType')
  }
  return {
    data: Uint8Array.from(Buffer.from(requiredString(record, 'base64'), 'base64')),
    mediaType: mediaType as ImageMediaType,
    width: requiredInteger(record, 'width'),
    height: requiredInteger(record, 'height'),
  }
}

async function recordBridgeReachability(
  ctx: Context,
  request: AndroidToolRequest,
  exec: ToolRunContext,
): Promise<void> {
  const session = exec.agent?.session
  if (session === undefined) return
  try {
    const health = await ctx.mobile.health(exec.signal)
    session.append('mobile/bridge-connected', {
      callId: exec.callId,
      requestId: request.id,
      tool: request.tool,
      status: health.status,
      version: health.version,
      toolCount: health.tools.length,
    })
  } catch (error) {
    session.append('mobile/bridge-disconnected', {
      callId: exec.callId,
      requestId: request.id,
      tool: request.tool,
      error: errorToAndroidToolError(error),
    })
  }
}

function appendApprovalRequested(request: AndroidToolRequest, exec: ToolRunContext): void {
  const session = exec.agent?.session
  if (session === undefined || request.tool !== 'user.confirm') return
  const title = String(request.arguments['title'] ?? '')
  const detail = String(request.arguments['detail'] ?? '')
  const timeoutMs = request.arguments['timeoutMs']
  session.append('mobile/approval-requested', {
    callId: exec.callId,
    requestId: request.id,
    title,
    detail,
    ...typeof timeoutMs === 'number' ? { timeoutMs } : {},
  })
}

function appendApprovalDecided(
  request: AndroidToolRequest,
  exec: ToolRunContext,
  decision: { readonly approved: boolean; readonly error?: AndroidToolError; readonly durationMs: number },
): void {
  const session = exec.agent?.session
  if (session === undefined || request.tool !== 'user.confirm') return
  session.append('mobile/approval-decided', {
    callId: exec.callId,
    requestId: request.id,
    approved: decision.approved,
    ...decision.error === undefined ? {} : { error: decision.error },
    durationMs: decision.durationMs,
  })
}

function approvalApproved(response: AndroidToolResponse): boolean {
  if (!response.ok) return false
  const approved = response.result['approved']
  return typeof approved === 'boolean' ? approved : true
}

function errorToAndroidToolError(error: unknown): AndroidToolError {
  const record = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {}
  const code = typeof record['code'] === 'string' && record['code'].length > 0
    ? record['code']
    : 'MOBILE_TOOL_EXECUTION_ERROR'
  const message = error instanceof Error ? error.message : String(error)
  return { code, message }
}

/**
 * Render one normalized mobile tool output for the model.
 * @param tool - Android bridge tool name used for the call.
 * @param value - Normalized mobile tool output.
 * @returns Text content shown to the model.
 */
export function renderMobileOutput(tool: string, value: MobileToolOutput): string {
  if (value.ok) {
    return `${tool} ok in ${value.durationMs}ms\n${value.resultJson}`
  }
  const hint = value.recoveryHint === undefined ? '' : `\nRecovery hint: ${value.recoveryHint}`
  return `${tool} failed in ${value.durationMs}ms: ${value.errorCode ?? 'unknown'} ${value.errorMessage ?? ''}${hint}`.trim()
}

/**
 * Render `screen_observe`, including an image block when screenshot attachment is available.
 * @param value - Normalized mobile tool output.
 * @returns Content blocks shown to the model.
 */
export function renderScreenObserveOutput(value: MobileToolOutput): ContentBlock[] {
  const screenshotPath = value.screenshotPath === undefined ? '' : `\nscreenshot: ${value.screenshotPath}`
  const screenshotError = value.screenshotError === undefined ? '' : `\nscreenshot unavailable: ${value.screenshotError}`
  const renderedValue = {
    ...value,
    resultJson: renderModelSafeScreenResultJson(value),
  }
  const blocks: ContentBlock[] = [{
    type: 'text',
    text: `${renderMobileOutput('screen.observe', renderedValue)}${screenshotPath}${screenshotError}`,
  }]
  if (value.screenshotAttachment !== undefined) {
    blocks.push({ type: 'image', attachment: value.screenshotAttachment as ImageAttachmentRef })
  }
  return blocks
}

function renderModelSafeScreenResultJson(value: MobileToolOutput): string {
  const screenshot = tryParseScreenshotSummary(value.resultJson)
  if (screenshot === undefined) return value.resultJson
  return JSON.stringify({
    mediaType: screenshot.mediaType,
    width: screenshot.width,
    height: screenshot.height,
    bytes: screenshot.bytes,
    ...screenshot.originalWidth === undefined ? {} : { originalWidth: screenshot.originalWidth },
    ...screenshot.originalHeight === undefined ? {} : { originalHeight: screenshot.originalHeight },
    ...screenshot.returnedWidth === undefined ? {} : { returnedWidth: screenshot.returnedWidth },
    ...screenshot.returnedHeight === undefined ? {} : { returnedHeight: screenshot.returnedHeight },
    ...screenshot.coordinateSpace === undefined ? {} : { coordinateSpace: screenshot.coordinateSpace },
    ...screenshot.timestampMillis === undefined ? {} : { timestampMillis: screenshot.timestampMillis },
    ...value.screenshotAttachment === undefined
      ? {}
      : { attachmentId: value.screenshotAttachment.attachmentId },
  })
}

function tryParseScreenshotSummary(resultJson: string): {
  readonly mediaType: string
  readonly width: number
  readonly height: number
  readonly bytes: number
  readonly originalWidth?: number
  readonly originalHeight?: number
  readonly returnedWidth?: number
  readonly returnedHeight?: number
  readonly coordinateSpace?: string
  readonly timestampMillis?: number
} | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(resultJson)
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined
  const record = parsed as Record<string, unknown>
  if (typeof record['base64'] !== 'string') return undefined
  const mediaType = record['mediaType']
  const width = record['width']
  const height = record['height']
  const bytes = record['bytes']
  const originalWidth = record['originalWidth']
  const originalHeight = record['originalHeight']
  const returnedWidth = record['returnedWidth']
  const returnedHeight = record['returnedHeight']
  const coordinateSpace = record['coordinateSpace']
  const timestampMillis = record['timestampMillis']
  if (typeof mediaType !== 'string' ||
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    typeof bytes !== 'number') {
    return undefined
  }
  return {
    mediaType,
    width,
    height,
    bytes,
    ...typeof originalWidth === 'number' ? { originalWidth } : {},
    ...typeof originalHeight === 'number' ? { originalHeight } : {},
    ...typeof returnedWidth === 'number' ? { returnedWidth } : {},
    ...typeof returnedHeight === 'number' ? { returnedHeight } : {},
    ...typeof coordinateSpace === 'string' ? { coordinateSpace } : {},
    ...typeof timestampMillis === 'number' ? { timestampMillis } : {},
  }
}

/**
 * Render a screenshot-driven visual step for the model.
 * @param value - Normalized visual step output.
 * @returns Text content shown to the model.
 */
export function renderMobileVisualStepOutput(value: MobileVisualStepOutput): string {
  const reason = value.reason === undefined ? '' : `\nreason: ${value.reason}`
  return [
    `mobile_visual_step ${value.ok ? 'ok' : 'failed'} using ${value.model}`,
    `done: ${String(value.done)}`,
    `screenshot: ${value.screenshotPath}`,
    `action: ${value.actionJson}`,
    `execution: ${value.executionJson}${reason}`,
  ].join('\n')
}

/**
 * Validate `input_tap` arguments.
 * @param args - Model-supplied tool arguments.
 * @returns Android bridge arguments for `input.tap`.
 */
export function parseTapArgs(args: unknown): Record<string, unknown> {
  const value = objectArgs(args)
  const postAction = postActionArgs(value)
  const strategy = optionalString(value, 'strategy')
  if (strategy !== undefined && !['accessibility_then_center', 'accessibility', 'center'].includes(strategy)) {
    throw new Error('input_tap strategy must be one of accessibility_then_center, accessibility, or center')
  }
  const strategyArgs = strategy === undefined ? {} : { strategy }
  const nodePath = optionalString(value, 'nodePath')
  if (nodePath !== undefined) return { nodePath, ...strategyArgs, ...postAction }
  const x = optionalInteger(value, 'x')
  const y = optionalInteger(value, 'y')
  if (x !== undefined || y !== undefined) {
    if (x === undefined || y === undefined) throw new Error('input_tap requires both x and y display coordinates')
    return { x, y, ...postAction }
  }
  const normalizedX = optionalNumber(value, 'normalizedX')
  const normalizedY = optionalNumber(value, 'normalizedY')
  if (normalizedX !== undefined || normalizedY !== undefined) {
    if (normalizedX === undefined || normalizedY === undefined) {
      throw new Error('input_tap requires both normalizedX and normalizedY')
    }
    return { normalizedX, normalizedY, ...postAction }
  }
  const screenshotX = optionalNumber(value, 'screenshotX')
  const screenshotY = optionalNumber(value, 'screenshotY')
  if (screenshotX !== undefined || screenshotY !== undefined) {
    if (screenshotX === undefined || screenshotY === undefined) {
      throw new Error('input_tap requires both screenshotX and screenshotY')
    }
    const originalWidth = optionalNumber(value, 'originalWidth')
    const originalHeight = optionalNumber(value, 'originalHeight')
    return {
      screenshotX,
      screenshotY,
      returnedWidth: requiredNumber(value, 'returnedWidth'),
      returnedHeight: requiredNumber(value, 'returnedHeight'),
      ...originalWidth !== undefined ? { originalWidth } : {},
      ...originalHeight !== undefined ? { originalHeight } : {},
      ...postAction,
    }
  }
  throw new Error('input_tap requires nodePath, x/y, normalizedX/normalizedY, or screenshotX/screenshotY with returnedWidth/returnedHeight')
}

/**
 * Validate `apk_install` arguments.
 * @param args - Model-supplied tool arguments.
 * @returns Android bridge arguments for `apk.install`.
 */
export function parseApkInstallArgs(args: unknown): Record<string, unknown> {
  const value = objectArgs(args)
  const contentUri = optionalString(value, 'contentUri')
  if (contentUri !== undefined) return { contentUri, ...postActionArgs(value) }
  return { filePath: requiredString(value, 'filePath'), ...postActionArgs(value) }
}

/**
 * Validate `input_swipe` arguments.
 * @param args - Model-supplied tool arguments.
 * @returns Android bridge arguments for `input.swipe`.
 */
export function parseSwipeArgs(args: unknown): Record<string, unknown> {
  const value = objectArgs(args)
  return {
    startX: requiredInteger(value, 'startX'),
    startY: requiredInteger(value, 'startY'),
    endX: requiredInteger(value, 'endX'),
    endY: requiredInteger(value, 'endY'),
    ...optionalInteger(value, 'durationMs') !== undefined ? { durationMs: optionalInteger(value, 'durationMs') } : {},
    ...postActionArgs(value),
  }
}

/**
 * Validate `input_type` arguments.
 * @param args - Model-supplied tool arguments.
 * @returns Android bridge arguments for `input.type`.
 */
export function parseTypeArgs(args: unknown): Record<string, unknown> {
  const value = objectArgs(args)
  return {
    nodePath: requiredString(value, 'nodePath'),
    text: requiredString(value, 'text'),
    ...postActionArgs(value),
  }
}

/**
 * Validate `app_open` arguments.
 * @param args - Model-supplied tool arguments.
 * @returns Android bridge arguments for `app.open`.
 */
export function parseAppOpenArgs(args: unknown): Record<string, unknown> {
  const value = objectArgs(args)
  return { packageName: requiredString(value, 'packageName'), ...postActionArgs(value) }
}

/**
 * Validate `app_open_url` arguments.
 * @param args - Model-supplied tool arguments.
 * @returns Android bridge arguments for `app.open_url`.
 */
export function parseAppOpenUrlArgs(args: unknown): Record<string, unknown> {
  const value = objectArgs(args)
  const url = requiredString(value, 'url').trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('url must start with http:// or https://')
  }
  const packageName = optionalString(value, 'packageName')
  return {
    url,
    ...packageName !== undefined ? { packageName } : {},
    ...postActionArgs(value),
  }
}

/**
 * Validate `user_confirm` arguments.
 * @param args - Model-supplied tool arguments.
 * @returns Android bridge arguments for `user.confirm`.
 */
export function parseConfirmArgs(args: unknown): Record<string, unknown> {
  const value = objectArgs(args)
  return {
    title: requiredString(value, 'title'),
    detail: requiredString(value, 'detail'),
    ...optionalInteger(value, 'timeoutMs') !== undefined ? { timeoutMs: optionalInteger(value, 'timeoutMs') } : {},
  }
}

/**
 * Validate `memory_search` arguments.
 * @param args - Model-supplied tool arguments.
 * @returns Android bridge arguments for `memory.search`.
 */
export function parseMemorySearchArgs(args: unknown): Record<string, unknown> {
  const value = objectArgs(args)
  const limit = optionalInteger(value, 'limit')
  if (limit !== undefined && limit < 1) {
    throw new Error('limit must be a positive integer')
  }
  return {
    query: requiredString(value, 'query'),
    ...limit !== undefined ? { limit } : {},
  }
}

/**
 * Validate `memory_write` arguments.
 * @param args - Model-supplied tool arguments.
 * @returns Android bridge arguments for `memory.write`.
 */
export function parseMemoryWriteArgs(args: unknown): Record<string, unknown> {
  const value = objectArgs(args)
  const kind = optionalMemoryKind(value, 'kind')
  const metadata = optionalStringMap(value, 'metadata')
  const sourceTaskId = optionalString(value, 'sourceTaskId')
  return {
    text: requiredString(value, 'text'),
    ...kind !== undefined ? { kind } : {},
    ...metadata !== undefined ? { metadata } : {},
    ...sourceTaskId !== undefined ? { sourceTaskId } : {},
  }
}

/**
 * Validate `memory_forget` arguments.
 * @param args - Model-supplied tool arguments.
 * @returns Android bridge arguments for `memory.forget`.
 */
export function parseMemoryForgetArgs(args: unknown): Record<string, unknown> {
  return { id: requiredString(objectArgs(args), 'id') }
}

/**
 * Validate `android_sh` arguments.
 * @param args - Model-supplied tool arguments.
 * @returns Android bridge arguments for `shell.exec`.
 */
export function parseAndroidShArgs(args: unknown): Record<string, unknown> {
  const value = objectArgs(args)
  const mode = optionalString(value, 'mode')
  if (mode !== undefined && !ANDROID_SH_MODES.has(mode)) {
    throw new Error(`mode must be one of ${Array.from(ANDROID_SH_MODES).join(', ')}`)
  }
  const cwd = optionalString(value, 'cwd')
  const timeoutMs = optionalInteger(value, 'timeoutMs')
  const maxOutputBytes = optionalInteger(value, 'maxOutputBytes')
  return {
    command: requiredString(value, 'command'),
    ...cwd !== undefined ? { cwd } : {},
    ...mode !== undefined ? { mode } : {},
    ...timeoutMs !== undefined ? { timeoutMs } : {},
    ...maxOutputBytes !== undefined ? { maxOutputBytes } : {},
  }
}

type VisualActionName = 'open_app' | 'open_url' | 'tap' | 'swipe' | 'type' | 'wait' | 'done'

interface VisualAction extends Record<string, unknown> {
  readonly action: VisualActionName
  readonly reason?: string
}

interface VisionConfig {
  readonly model: string
  readonly baseUrl: string
  readonly apiKeyEnv: string
  readonly keyFile?: string
  readonly keyFileLine: number
  readonly adbPath: string
  readonly adbSerial?: string
  readonly reportsDir: string
  readonly screenWidth: number
  readonly screenHeight: number
}

interface ScreenshotCaptureConfig {
  readonly adbPath: string
  readonly adbSerial?: string
  readonly reportsDir: string
}

interface ScreenshotCapture {
  readonly screenshotPath: string
  readonly data: Buffer
}

interface BridgeScreenshotCapture {
  readonly data: Uint8Array
  readonly mediaType: ImageMediaType
  readonly width: number
  readonly height: number
}

interface VisionActionRequest {
  readonly goal: string
  readonly previousActions: string
  readonly screenshotPath: string
}

interface DeepSeekChatResponse {
  readonly choices?: readonly {
    readonly message?: {
      readonly content?: string
    }
  }[]
}

function resolveVisionConfig(config: ResolvedConfig): VisionConfig {
  const reportsDir = stringOrUndefined(config.visionReportsDir)
    ?? process.env['DSH_MOBILE_VISUAL_REPORT_DIR']
    ?? resolve(process.cwd(), 'reports', 'mobile-vision')
  const keyFile = stringOrUndefined(config.visionKeyFile)
  const adbSerial = stringOrUndefined(config.visionAdbSerial) ?? process.env['ANDROID_SERIAL']
  return {
    model: config.visionModel,
    baseUrl: config.visionBaseUrl,
    apiKeyEnv: config.visionApiKeyEnv,
    ...keyFile === undefined ? {} : { keyFile },
    keyFileLine: positiveInteger(config.visionKeyFileLine, 'visionKeyFileLine'),
    adbPath: config.visionAdbPath,
    ...adbSerial === undefined ? {} : { adbSerial },
    reportsDir,
    screenWidth: positiveInteger(config.visionScreenWidth, 'visionScreenWidth'),
    screenHeight: positiveInteger(config.visionScreenHeight, 'visionScreenHeight'),
  }
}

function captureVisionScreenshot(config: VisionConfig): string {
  return captureAdbScreenshot(config, 'mobile-vision').screenshotPath
}

function captureAdbScreenshot(config: ScreenshotCaptureConfig, prefix: string): ScreenshotCapture {
  mkdirSync(config.reportsDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const screenshotPath = resolve(config.reportsDir, `${prefix}-${timestamp}.png`)
  const adbArgs = [
    ...config.adbSerial === undefined ? [] : ['-s', config.adbSerial],
    'exec-out',
    'screencap',
    '-p',
  ]
  const screenshot = execFileSync(config.adbPath, adbArgs, { maxBuffer: 16 * 1024 * 1024 })
  writeFileSync(screenshotPath, screenshot)
  return { screenshotPath, data: screenshot }
}

async function requestVisionAction(
  config: VisionConfig,
  request: VisionActionRequest,
  signal: AbortSignal,
): Promise<VisualAction> {
  const apiKey = readVisionApiKey(config)
  const screenshot = readFileSync(request.screenshotPath)
  const response = await fetch(new URL('/chat/completions', config.baseUrl), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      thinking: { type: 'disabled' },
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              'You control an Android phone from a screenshot.',
              'Return only one compact JSON object and no markdown.',
              'Use normalized coordinates from 0 to 1000 relative to the screenshot.',
              'Allowed actions:',
              '{"action":"open_app","packageName":"com.example.app","reason":"..."}',
              '{"action":"open_url","url":"https://www.google.com/search?q=...","reason":"..."}',
              '{"action":"tap","x":500,"y":500,"reason":"..."}',
              '{"action":"swipe","startX":500,"startY":850,"endX":500,"endY":250,"durationMs":350,"reason":"..."}',
              '{"action":"type","nodePath":"0/1","text":"...","reason":"..."}',
              '{"action":"wait","durationMs":1000,"reason":"..."}',
              '{"action":"done","reason":"..."}',
              'Prefer open_url when direct browser navigation or search is enough. Do not use open_app for browsers unless the exact package is known to expose a launch intent. Prefer visible center points for taps.',
              `Goal: ${request.goal}`,
              request.previousActions.length === 0 ? 'Previous actions: none' : `Previous actions: ${request.previousActions}`,
            ].join('\n'),
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${screenshot.toString('base64')}` },
          },
        ],
      }],
      max_tokens: 800,
      temperature: 0,
    }),
    signal,
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`vision model request failed: HTTP ${String(response.status)} ${text.slice(0, 300)}`)
  }
  const json = await response.json() as DeepSeekChatResponse
  const content = json.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('vision model returned no text content')
  }
  return parseVisionAction(content)
}

async function executeVisualAction(
  ctx: Context,
  config: VisionConfig,
  action: VisualAction,
  exec: ToolRunContext,
): Promise<Record<string, unknown>> {
  if (action.action === 'done') return { done: true }
  if (action.action === 'wait') {
    const durationMs = optionalActionNumber(action, 'durationMs') ?? 1000
    await sleep(Math.max(0, Math.min(durationMs, 10_000)), exec.signal)
    return { waitedMs: durationMs }
  }

  const request = visualActionToBridgeRequest(config, action, exec)
  const output = await executeAndroidTool(ctx, request, exec)
  return output as unknown as Record<string, unknown>
}

function visualActionToBridgeRequest(
  config: VisionConfig,
  action: VisualAction,
  exec: ToolRunContext,
): AndroidToolRequest {
  const id = `${String(exec.callId)}:visual`
  const sessionId = exec.agent?.session.id
  const session = sessionId === undefined ? {} : { sessionId }
  switch (action.action) {
    case 'open_app':
      return {
        id,
        tool: 'app.open',
        risk: 'reversible',
        arguments: { packageName: requiredActionString(action, 'packageName') },
        ...session,
      }
    case 'open_url':
      return {
        id,
        tool: 'app.open_url',
        risk: 'external_side_effect',
        arguments: parseAppOpenUrlArgs({ url: requiredActionString(action, 'url') }),
        ...session,
      }
    case 'tap':
      return {
        id,
        tool: 'input.tap',
        risk: 'reversible',
        arguments: {
          normalizedX: normalizedToUnit(requiredActionNumber(action, 'x')),
          normalizedY: normalizedToUnit(requiredActionNumber(action, 'y')),
        },
        ...session,
      }
    case 'swipe':
      return {
        id,
        tool: 'input.swipe',
        risk: 'reversible',
        arguments: {
          startX: normalizedToPx(requiredActionNumber(action, 'startX'), config.screenWidth),
          startY: normalizedToPx(requiredActionNumber(action, 'startY'), config.screenHeight),
          endX: normalizedToPx(requiredActionNumber(action, 'endX'), config.screenWidth),
          endY: normalizedToPx(requiredActionNumber(action, 'endY'), config.screenHeight),
          durationMs: Math.max(1, Math.round(optionalActionNumber(action, 'durationMs') ?? 300)),
        },
        ...session,
      }
    case 'type':
      return {
        id,
        tool: 'input.type',
        risk: 'external_side_effect',
        arguments: {
          nodePath: requiredActionString(action, 'nodePath'),
          text: requiredActionString(action, 'text'),
        },
        ...session,
      }
    case 'wait':
    case 'done':
      throw new Error(`visual action ${action.action} does not map to a bridge request`)
    default:
      throw new Error(`unsupported visual action ${String(action.action)}`)
  }
}

function parseVisionAction(text: string): VisualAction {
  const rawJson = extractJsonObject(text)
  const value = parsePossiblyLooseJson(rawJson)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('vision model action must be a JSON object')
  }
  const record = value as Record<string, unknown>
  const action = requiredActionString(record, 'action')
  if (!VISUAL_ACTIONS.has(action)) {
    throw new Error(`vision model action must be one of ${Array.from(VISUAL_ACTIONS).join(', ')}`)
  }
  const reason = optionalActionString(record, 'reason')
  return {
    ...record,
    action,
    ...reason === undefined ? {} : { reason },
  } as VisualAction
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/u, '').trim()
  const start = trimmed.indexOf('{')
  if (start < 0) throw new Error('vision model did not return a JSON object')
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < trimmed.length; index += 1) {
    const char = trimmed[index]
    if (char === undefined) continue
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }
    if (char === '"') {
      inString = true
    } else if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) return trimmed.slice(start, index + 1)
    }
  }
  throw new Error('vision model JSON object was not closed')
}

function parsePossiblyLooseJson(rawJson: string): unknown {
  try {
    return JSON.parse(rawJson)
  } catch {
    const repaired = rawJson.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/gu, '$1"$2":')
    return JSON.parse(repaired)
  }
}

function readVisionApiKey(config: VisionConfig): string {
  const envKey = process.env[config.apiKeyEnv]?.trim()
  if (envKey !== undefined && envKey.length > 0) return envKey
  if (config.keyFile === undefined) {
    throw new Error(`vision API key missing: set ${config.apiKeyEnv} or configure visionKeyFile`)
  }
  const lines = readFileSync(config.keyFile, 'utf8').split(/\r?\n/u)
  const key = lines[config.keyFileLine - 1]?.trim()
  if (key === undefined || key.length === 0) {
    throw new Error(`vision API key missing: ${config.keyFile} line ${String(config.keyFileLine)} is empty`)
  }
  return key
}

function normalizedToPx(value: number, size: number): number {
  const clamped = Math.max(0, Math.min(1000, value))
  return Math.round((clamped / 1000) * (size - 1))
}

function normalizedToUnit(value: number): number {
  return Math.max(0, Math.min(1000, value)) / 1000
}

function requiredActionString(value: Record<string, unknown>, key: string): string {
  const item = optionalActionString(value, key)
  if (item === undefined) throw new Error(`vision action ${key} must be a non-empty string`)
  return item
}

function optionalActionString(value: Record<string, unknown>, key: string): string | undefined {
  const item = value[key]
  if (item === undefined) return undefined
  if (typeof item !== 'string' || item.trim().length === 0) {
    throw new Error(`vision action ${key} must be a non-empty string`)
  }
  return item.trim()
}

function requiredActionNumber(value: Record<string, unknown>, key: string): number {
  const item = optionalActionNumber(value, key)
  if (item === undefined) throw new Error(`vision action ${key} must be a finite number`)
  return item
}

function optionalActionNumber(value: Record<string, unknown>, key: string): number | undefined {
  const item = value[key]
  if (item === undefined) return undefined
  if (typeof item === 'string' && item.trim().length > 0) {
    const parsed = Number(item)
    if (Number.isFinite(parsed)) return parsed
  }
  if (typeof item !== 'number' || !Number.isFinite(item)) {
    throw new Error(`vision action ${key} must be a finite number`)
  }
  return item
}

function stringOrUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim().length === 0) return undefined
  return value
}

function positiveInteger(value: number, key: string): number {
  if (!Number.isInteger(value) || value < 1) throw new Error(`tool-mobile: ${key} must be a positive integer`)
  return value
}

function sleep(durationMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new Error('mobile visual step was aborted'))
  return new Promise((resolveSleep, reject) => {
    const timeout = setTimeout(resolveSleep, durationMs)
    signal.addEventListener('abort', () => {
      clearTimeout(timeout)
      reject(new Error('mobile visual step was aborted'))
    }, { once: true })
  })
}

function objectArgs(args: unknown): Record<string, unknown> {
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    throw new Error('mobile tool arguments must be an object')
  }
  return args as Record<string, unknown>
}

function postActionArgs(value: Record<string, unknown>): Record<string, boolean> {
  const observeAfter = optionalBoolean(value, 'observeAfter')
  const screenshotAfter = optionalBoolean(value, 'screenshotAfter')
  return {
    ...observeAfter !== undefined ? { observeAfter } : {},
    ...screenshotAfter !== undefined ? { screenshotAfter } : {},
  }
}

function requiredString(value: Record<string, unknown>, key: string): string {
  const item = value[key]
  if (typeof item !== 'string' || item.trim().length === 0) {
    throw new Error(`${key} must be a non-empty string`)
  }
  return item
}

function optionalString(value: Record<string, unknown>, key: string): string | undefined {
  const item = value[key]
  if (item === undefined) return undefined
  if (typeof item !== 'string' || item.trim().length === 0) {
    throw new Error(`${key} must be a non-empty string`)
  }
  return item
}

function optionalBoolean(value: Record<string, unknown>, key: string): boolean | undefined {
  const item = value[key]
  if (item === undefined) return undefined
  if (typeof item !== 'boolean') throw new Error(`${key} must be a boolean`)
  return item
}

function requiredInteger(value: Record<string, unknown>, key: string): number {
  const item = optionalInteger(value, key)
  if (item === undefined) throw new Error(`${key} must be an integer`)
  return item
}

function optionalInteger(value: Record<string, unknown>, key: string): number | undefined {
  const item = value[key]
  if (item === undefined) return undefined
  if (typeof item !== 'number' || !Number.isInteger(item)) throw new Error(`${key} must be an integer`)
  return item
}

function requiredNumber(value: Record<string, unknown>, key: string): number {
  const item = optionalNumber(value, key)
  if (item === undefined) throw new Error(`${key} must be a finite number`)
  return item
}

function optionalNumber(value: Record<string, unknown>, key: string): number | undefined {
  const item = value[key]
  if (item === undefined) return undefined
  if (typeof item !== 'number' || !Number.isFinite(item)) throw new Error(`${key} must be a finite number`)
  return item
}

function optionalMemoryKind(value: Record<string, unknown>, key: string): string | undefined {
  const kind = optionalString(value, key)
  if (kind === undefined) return undefined
  if (!MEMORY_KINDS.has(kind)) {
    throw new Error(`${key} must be one of ${Array.from(MEMORY_KINDS).join(', ')}`)
  }
  return kind
}

function optionalStringMap(value: Record<string, unknown>, key: string): Record<string, string> | undefined {
  const item = value[key]
  if (item === undefined) return undefined
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    throw new Error(`${key} must be an object with string values`)
  }
  return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([entryKey, entryValue]) => {
    if (typeof entryValue !== 'string' || entryValue.trim().length === 0) {
      throw new Error(`${key}.${entryKey} must be a non-empty string`)
    }
    return [entryKey, entryValue]
  }))
}

const MEMORY_KINDS = new Set(['preference', 'task_trajectory', 'knowledge'])
const VISUAL_ACTIONS = new Set<string>(['open_app', 'open_url', 'tap', 'swipe', 'type', 'wait', 'done'])
const ANDROID_SH_MODES = new Set(['safe', 'approval', 'max'])
const SCREENSHOT_MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
