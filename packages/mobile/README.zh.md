# mobile/ - Android 移动端能力族

[English](README.md) | 中文

这个能力族提供与具体传输无关的 Android bridge 执行接口，以及消费该接口的模型可见工具。

| 包 | 职责 | ctx key |
|---|---|---|
| [`mobile/`](mobile/README.zh.md) | 定义 Android provider 注册、选择、共享错误，以及 `health()` / `execute()` | `ctx.mobile` |
| [`mobile-bridge-http/`](mobile-bridge-http/README.zh.md) | 调用 DeepDroidPilot 的 localhost HTTP bridge | 注册到 `ctx.mobile` |
| [`tool-mobile/`](tool-mobile/README.zh.md) | 向模型暴露 Android 观察、输入、打开应用和确认工具 | 注册到 `ctx.tools` |

`@deepseek-ai/dsh-mobile` 拥有能力 seam。Provider 只注册传输；Consumer 拥有模型可见名称、schema、提示词指导和渲染。
