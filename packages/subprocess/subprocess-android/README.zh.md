# @deepseek-ai/dsh-subprocess-android

`ctx.subprocess` 的 Android bridge 实现。

该 provider 通过 DeepDroidPilot 的 Android bridge `shell.exec` 工具执行短生命周期命令。它有意比 `@deepseek-ai/dsh-subprocess-local` 更小：前台 collect-mode 命令可用；raw stdio pipe 和 PTY terminal 会明确失败，直到 Android bridge 补上长生命周期进程句柄协议。

它会把 `bash -c <command>` 与 `sh -c <command>` 请求映射到 Android `/system/bin/sh -c <command>`，因此现有 DSH bash executor 可以在不内置 GNU Bash 的情况下运行在 Android 上。其他 argv 请求会经过 shell quoting 后交给 `/system/bin/sh` 执行。
