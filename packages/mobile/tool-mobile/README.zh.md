# @deepseek-ai/dsh-tool-mobile

[English](README.md) | 中文

基于 `ctx.mobile` 的模型可见 Android 移动端工具。

## Session Log

每次带有所属 agent 的 Android 执行，都会在通用 `tool/call` 和 `tool/result` surface 记录旁追加 log-only mobile events。`mobile/bridge-connected` 或 `mobile/bridge-disconnected` 记录执行前的 bridge 可达性，`mobile/tool-request` 与 `mobile/tool-result` 保留 bridge 请求/结果事实，`mobile/approval-requested` 与 `mobile/approval-decided` 审计 Android `user_confirm` 决策。

## Model Experience

### Mobile System Prompt

#### What the model sees

这个包注册 `tool:mobile` system-prompt section，提示模型优先使用 node path、检索/写入长期记忆、在敏感效果前请求确认，并在 bridge 工具失败后遵循恢复提示。

##### Section text

```markdown
Use Android mobile tools to observe and operate the current phone through the local bridge. Prefer nodePath actions from screen_observe over coordinates. If your current model can read images, call screen_observe with includeScreenshot=true when the accessibility tree is incomplete or visual layout matters, then use ordinary mobile tools. If your current model is text-only, omit includeScreenshot or set it false; use mobile_visual_step only as a fallback when text observation is insufficient. Search memory before similar tasks, write durable preferences or task lessons after useful outcomes, request user_confirm before sensitive or irreversible effects, and follow recoveryHint guidance when a bridge tool fails.
```

#### Token effect

插件挂载时新增一个短 prompt section。

#### KV Cache effect

当插件被添加、移除或 prompt 文本变化时，使 request prefix 失效。

### Android Tool Suite

#### What the model sees

当对应配置开关启用时，模型会看到 `screen_observe`、`input_tap`、`input_swipe`、`input_type`、`app_open`、`app_open_url`、`app_close`、`user_confirm`、`memory_search`、`memory_write` 和 `memory_forget`。`screen_observe` 有可选参数 `includeScreenshot`：具备图像输入能力的主模型可以设为 `true`，从而收到 adb 截图 image block；文本模型应省略它或设为 `false`。当显式启用 `visualStep` 时，文本模型还会看到 `mobile_visual_step`；它会通过 adb 截图，请求一个 OpenAI-compatible 视觉模型返回单步归一化动作 JSON，并把支持的动作交给 `ctx.mobile` 执行。

#### Token effect

最多新增十一个 native tool schema，以及形如 `input.tap ok in 7ms` 后接 Android result JSON 的紧凑渲染输出。失败输出会包含 code/message 和 Android bridge 提供的可选 `Recovery hint:` 文本。截图观察只在请求 `includeScreenshot=true` 时为 `screen_observe` 额外增加一个 image block。视觉步骤返回截图路径、模型名、动作 JSON 和执行 JSON；不会记录 API key。

#### KV Cache effect

启用的工具开关或 schema 文本变化会使 request prefix 失效；bridge URL 和 token 变化只影响执行。

## Known Limitations and Deferred Work

- 在 mobile bridge schema 稳定前，输出以 JSON 文本携带 Android result payload。
- 记忆工具当前依赖 Android bridge 实现持久化、排序和脱敏策略；向量召回待后续接入。
- `screen_observe(includeScreenshot=true)` 位于主机侧。它需要 adb 和 attachment service；如果附件存储不可用，`screen_observe` 会保留文本观察并报告截图错误。
- `mobile_visual_step` 位于主机侧，默认关闭。它目前把模型返回的 0-1000 归一化坐标映射到配置的屏幕像素，因此非默认模拟器需要设置 `visionScreenWidth` 和 `visionScreenHeight`。
