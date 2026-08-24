# @deepseek-ai/dsh-tool-mobile

English | [中文](README.zh.md)

Model-facing Android mobile tools over `ctx.mobile`.

## Session Log

Each Android execution with an owning agent appends log-only mobile events beside the generic `tool/call` and `tool/result` surface records. `mobile/bridge-connected` or `mobile/bridge-disconnected` records bridge reachability before execution, `mobile/tool-request` and `mobile/tool-result` preserve bridge request/result facts, and `mobile/approval-requested` plus `mobile/approval-decided` audit Android `user_confirm` decisions.

## Model Experience

### Mobile System Prompt

#### What the model sees

The package registers a `tool:mobile` system-prompt section that tells the model to prefer node paths, search/write durable memories, request confirmation before sensitive effects, and follow bridge recovery hints after failures.

##### Section text

```markdown
Use Android mobile tools to observe and operate the current phone through the local bridge. Screenshots are often the most reliable way to understand visual layout; image-capable main models should call screen_observe with includeScreenshot=true or screen_screenshot when layout, OCR-like reading, or icon-only controls matter. Prefer nodePath actions from screen_observe over coordinates when the node is visible and specific. input_tap with nodePath defaults to accessibility_then_center, meaning it first tries an Accessibility click and falls back to the node center if needed; use strategy="center" only when Accessibility click is unreliable. If coordinates are needed, use explicit display x/y, normalizedX/normalizedY in 0..1 display space, or screenshotX/screenshotY with returnedWidth/returnedHeight from screen_screenshot. Action tools accept observeAfter and screenshotAfter when an immediate post-action summary or screenshot will reduce round trips. Use android_sh mainly for bounded read-only diagnostics such as getprop, date, uptime, free, ps, logcat -d, /proc reads, toybox, pipes, and small shell logic. Do not rely on android_sh for normal phone control, screenshots, app opening, taps, typing, URL opening, APK installation, or app closing; use the dedicated mobile tools first. android_sh runs as an Android app UID, not root or shell, so many service commands like dumpsys/settings/input/am/pm may require approval or max mode and may still fail because Android denies the app UID. Its cwd must be relative to the DroidPilot workspace. If your current model is text-only, omit includeScreenshot or set it false; use mobile_visual_step only as a fallback when text observation is insufficient. Search memory before similar tasks, write durable preferences or task lessons after useful outcomes, request user_confirm before sensitive or irreversible effects, and follow recoveryHint guidance when a bridge tool fails.
```

#### Token effect

Adds one short prompt section when the plugin is mounted.

#### KV Cache effect

Invalidates the request prefix when this plugin is added, removed, or its prompt text changes.

### Android Tool Suite

#### What the model sees

The model sees `screen_observe`, `screen_screenshot`, `input_tap`, `input_swipe`, `input_type`, `app_open`, `app_open_url`, `app_close`, `apk_install`, `android_sh`, `user_confirm`, `memory_search`, `memory_write`, and `memory_forget` when the matching config flags are enabled. `screen_observe` has optional `includeScreenshot` and `includeFullTree` arguments. `input_tap` supports node paths with explicit strategies, display x/y, normalized 0..1 coordinates, and screenshot coordinates with returned screenshot dimensions. Action tools accept `observeAfter` and `screenshotAfter`; `app_open_url` also accepts `packageName` to force a target handler such as Chrome. `apk_install` opens the system package installer for an APK accessible to DeepDroidPilot and still requires user confirmation. `android_sh` is a diagnostics shell under Android app-UID restrictions, not a root/shell-UID automation backend. When `visualStep` is explicitly enabled, text-only models also see `mobile_visual_step`, which captures an adb screenshot, asks an OpenAI-compatible vision model for one normalized action JSON object, and executes supported actions through `ctx.mobile`.

#### Token effect

Adds up to fourteen native tool schemas plus compact rendered outputs such as `input.tap ok in 7ms` followed by the Android result JSON. Failed outputs include code/message details and optional `Recovery hint:` text from the Android bridge. Screenshot observation adds one image block to `screen_observe` only when `includeScreenshot=true` is requested. The visual step returns screenshot path, model name, action JSON, and execution JSON; it does not log API keys.

#### KV Cache effect

Invalidates the request prefix when enabled tool flags or schema text change; bridge URL and token changes are execution-only.

## Known Limitations and Deferred Work

- The output carries Android result payloads as JSON text until the mobile bridge schema stabilizes.
- Memory tools currently rely on the Android bridge implementation for persistence, ranking, and redaction policy; vector recall is deferred.
- `screen_observe(includeScreenshot=true)` is host-side. It requires adb plus the attachment service; when attachment storage is unavailable, `screen_observe` keeps the textual observation and reports the screenshot error.
- `mobile_visual_step` is host-side and disabled by default. Tap actions are forwarded as normalized coordinates so the Android bridge can resolve the current display size.
