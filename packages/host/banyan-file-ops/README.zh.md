# @blue-soda/dsh-host-banyan-file-ops

[English](README.md) | 中文

Banyan 的 DeepSeek Harness Host 侧文件操作插件。

该插件提供 `ctx.banyanFileOps`，目前用于 Banyan 客户端在切换 Agent
工作区前复制原工作区内容。文件系统变更保留在 DSH Host 侧执行，浏览器 UI
只调用 `@deepseek-ai/dsh-host-apiproxy` 暴露的 Host RPC。

复制操作默认偏保守：拒绝源目录和目标目录相同或互相嵌套，并跳过
`node_modules`、`.git`、`dist`、`build` 等常见生成目录或重型目录。
