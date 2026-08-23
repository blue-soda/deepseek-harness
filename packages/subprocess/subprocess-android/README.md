# @deepseek-ai/dsh-subprocess-android

Android bridge implementation of `ctx.subprocess`.

This provider runs short-lived commands through DeepDroidPilot's Android bridge `shell.exec` tool. It is intentionally smaller than `@deepseek-ai/dsh-subprocess-local`: foreground collect-mode commands work, while raw stdio pipes and PTY terminals fail loud until the Android bridge grows a long-lived process-handle protocol.

The provider maps `bash -c <command>` and `sh -c <command>` requests onto Android `/system/bin/sh -c <command>`, so the existing DSH bash executor can run on Android without bundling GNU Bash. Other argv requests are quoted and executed through `/system/bin/sh`.
