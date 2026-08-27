# @blue-soda/dsh-host-banyan-file-ops

[English](README.md) | 中文

Banyan 的 DeepSeek Harness Host 侧文件操作插件。

该插件提供 `ctx.banyanFileOps`，目前用于 Banyan 客户端在切换 Agent
工作区前复制原工作区内容，也用于把 Banyan 分享的 Skill 包安装到用户的 DSH
skill root。文件系统变更保留在 DSH Host 侧执行，浏览器 UI 只调用
`@deepseek-ai/dsh-host-apiproxy` 暴露的 Host RPC。

复制操作默认偏保守：拒绝源目录和目标目录相同或互相嵌套，并跳过
`node_modules`、`.git`、`dist`、`build` 等常见生成目录或重型目录。

Skill 安装同样受约束：默认只写入 `${DSH_HOME:-~/.dsh}/skills` 下的一个安全目录，
由 Host 生成 `SKILL.md`，校验所有相对文件路径；目标 Skill 已存在时默认拒绝，
除非显式传入 `overwrite`。
