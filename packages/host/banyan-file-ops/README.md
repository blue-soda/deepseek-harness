# @blue-soda/dsh-host-banyan-file-ops

English | [中文](README.zh.md)

Banyan host-side filesystem operations for DeepSeek Harness.

The plugin provides `ctx.banyanFileOps`, currently used by the Banyan client to
copy an Agent workspace before switching that Agent's future sessions to a new
workspace path, and to install shared Banyan Skill packages into the user's DSH
skill root. Filesystem mutation stays on the DSH Host side; the browser UI only
calls the typed Host RPC exposed by `@deepseek-ai/dsh-host-apiproxy`.

The copy operation is intentionally conservative: it rejects same/nested source
and target paths and skips common generated/heavy directories such as
`node_modules`, `.git`, `dist`, and `build`.

The Skill installer is also constrained: it writes one safe directory below
`${DSH_HOME:-~/.dsh}/skills` by default, always owns `SKILL.md`, validates every
relative file path, and rejects an existing Skill unless `overwrite` is set.
