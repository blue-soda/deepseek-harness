<!-- 英文源文件由 scripts/gen-tool-catalog.ts 生成；本中文文件是通过双语配对维护的经评审对侧。
     更新时先运行 `pnpm run gen-tool-catalog` 更新英文，再更新本文件并运行 `pnpm run verify-translation-pairing --write docs/tool-catalog.md` 重新记录配对。 -->

# 工具 Schema 目录

[English](tool-catalog.md) | 中文

已发布插件向 `ctx.tools` 提供的所有面向模型的工具：模型通过系统提示词组装获得的 `name`、`description` 和 JSON Schema `parameters`。本目录是[子系统页面](subsystems/core.zh.md)（类型及每页生成的 `cordis-surface` 接线区域）的补充；本页列出的是向 agent（智能体）提供的*工具*。

英文源文件由系统**生成**，并通过 `pnpm run verify-tool-catalog`（`doc-sync`（文档同步门禁）的一部分）验证新鲜度；本中文文件作为经评审对侧通过双语配对维护。与 Cordis 目录（纯源码 AST 处理）不同，英文生成器会在真实上下文中**启动**每个工具插件并读取 `ctx.tools.schemas()`，因为工具 schema 无法通过静态分析完全确定，例如运行时展开的枚举、拼接的描述、由配置决定的名称以及使用原始 JSON Schema 的 MCP 工具。完整性守卫会 glob 匹配 `packages/*/tool-*`；如果生成器的启动 manifest（元数据清单）遗漏任何包，检查就会失败，因此新工具不会在无人察觉的情况下缺少文档。

范围：`packages/*/tool-*` 下已发布的产品工具，每个工具均使用其**默认**配置启动；但如果某个 Config 字段是**必填项**且没有默认值，生成器就必须作出选择，对应包的说明会记录本页展示的是哪个分支。注册的工具**名称**可以是加载时配置，例如 `tool-subagent` 的 `toolName`，因此部署可能以不同名称或额外名称提供某个包；如果存在随产品发布的别名，对应包的说明会予以记录。`examples/` 中的演示工具（例如 `echo`）不在范围内，这与 Cordis 目录仅涵盖包的范围一致。

<a id="tool-package-map"></a>

## 工具包映射

下表将模型可见的工具名称与其背后的插件包和服务 seam 对应起来。各包章节随后给出确切的 JSON Schema。

| 工具包 | 模型可见名称 | 依赖 | 写入／影响 | 随产品发布的别名 | 部署说明 |
| --- | --- | --- | --- | --- | --- |
| `@deepseek-ai/dsh-tool-banyan-ops` | `banyan_content_cache_evict`, `banyan_content_cache_inspect`, `banyan_content_cache_metrics`, `banyan_content_cache_warm`, `banyan_content_counters_rebuild`, `banyan_content_counters_rebuild_published`, `banyan_content_feed_rebuild_public`, `banyan_content_index_ensure`, `banyan_content_index_inspect`, `banyan_content_reindex`, `banyan_content_reindex_published`, `banyan_content_search`, `banyan_kafka_lag`, `banyan_knowledge_index_ensure`, `banyan_knowledge_index_inspect`, `banyan_knowledge_reindex_document`, `banyan_knowledge_reindex_documents`, `banyan_mcp_knowledge_search`, `banyan_mcp_rag_search`, `banyan_ops_audit_recent`, `banyan_ops_drill_kafka_consumer_stop`, `banyan_ops_drill_outbox_failure`, `banyan_ops_drill_stale_content_counters`, `banyan_ops_drill_stale_reaction_cache`, `banyan_ops_drill_upload_expired`, `banyan_ops_health`, `banyan_ops_repair_target`, `banyan_ops_request_summary`, `banyan_ops_requests_recent`, `banyan_ops_spans_recent`, `banyan_ops_status`, `banyan_ops_target_matrix`, `banyan_ops_trace_target`, `banyan_outbox_diagnostics`, `banyan_outbox_failed_recent`, `banyan_outbox_replay`, `banyan_outbox_retry_failed`, `banyan_reaction_cache_inspect`, `banyan_reaction_cache_rebuild`, `banyan_reaction_cache_rebuild_published`, `banyan_social_group_stats_rebuild`, `banyan_social_user_stats_rebuild`, `banyan_upload_cleanup` | `ctx.tools`, `ctx.systemPrompt` | `tool/call`, `tool/result` | - | - |
| `@deepseek-ai/dsh-tool-banyan-search` | `banyan_content_get`, `banyan_content_search`, `banyan_knowledge_get`, `banyan_knowledge_search`, `banyan_skill_package_get` | `ctx.tools`, `ctx.systemPrompt` | `tool/call`, `tool/result` | - | - |
| `@deepseek-ai/dsh-tool-mobile` | `android_sh`, `apk_install`, `app_close`, `app_list_installed`, `app_open`, `app_open_url`, `input_swipe`, `input_tap`, `input_type`, `memory_forget`, `memory_search`, `memory_write`, `screen_observe`, `screen_screenshot`, `user_confirm` | `ctx.tools`, `ctx.systemPrompt`, `ctx.mobile` | `tool/call`, `tool/result`, `mobile/tool-request`, `mobile/tool-result` | - | - |
| `@deepseek-ai/dsh-plugin-manager` | `plugin_manager` | `ctx.tools`, `ctx.pluginManager`, `ctx.sandboxPolicy` | `tool/call`, `tool/result`, `user/message` | - | - |
| `@deepseek-ai/dsh-mcp-resources` | `list_mcp_resource_templates`, `list_mcp_resources`, `read_mcp_resource` | `ctx.tools`, `ctx.mcpResources` | `tool/call`, `tool/result` | - | - |
| `@deepseek-ai/dsh-experimental-browser-use-stagehand-native` | `stagehand_act`、`stagehand_extract`、`stagehand_navigate`、`stagehand_observe`、`stagehand_screenshot`、`stagehand_tabs` | `ctx.browserUse`、`ctx.agents`、`ctx.tools`、`ctx.systemPrompt` | `tool/call`、`tool/result` | - | - |
| `@deepseek-ai/dsh-tool-ask-user` | `ask_user_question` | `ctx.tools`、`ctx.userQuestions` | `tool/call`、`tool/result after an answer or timeout`、`late user/message` | - | ask_user_question 默认保持原有阻塞行为；设置 `mode: timed` 后才启用前台超时与 pending 结果，同时问题仍可回答；timed 模式内 `timeout: -1` 让本次调用无限期阻塞。 |
| `@deepseek-ai/dsh-tools` | `run_code` | `ctx.tools`、`ctx.ptcRuntime (execution time)`、`ctx.systemPrompt` | `tool/call`、`one tool/ptc-dispatch-start + tool/ptc-dispatch pair per bridged sub-call`、`tool/result` | - | 在 `mode: ptc`／`mode: both` 下，它由工具注册表所有，作为可过滤能力层之外的保留传输机制（参见 PTC mode Agent Note）。在 `ptc` 下，它是注册表对协议格式（wire format）的唯一贡献；其他可见能力在使用已加载运行时语言生成的 SDK 章节中声明。程序通过 binding 调用这些能力，调用按照原生并发约定调度：启动顺序和策略遵循提交顺序，并发安全的函数体最多重叠执行 `maxParallelSubCalls` 个。调用会重新进入完整且受守卫保护的工具流水线，并将每个嵌套执行关联到此外层结果。 |
| `@deepseek-ai/dsh-plan-mode` | `exit_plan_mode` | `ctx.tools`、`ctx.systemPrompt`、`ctx.userQuestions (execution time, opportunistic)` | `tool/call`、`plan/mode inactive on an approved review`、`tool/result` | - | 规划未激活时，exit_plan_mode 仍保留在面向模型的 schema 中，这样状态转换不会在规划策略变更之外额外造成工具目录变动。其执行路径会拒绝规划模式之外的调用；在规划模式下，它通过用户交互 seam 提交计划（批准／根据反馈继续规划），批准后会在步骤边界记录规划模式已停用。 |
| `@deepseek-ai/dsh-tool-bash` | `bash` | `ctx.tools`、`ctx.shell`、`ctx.systemPrompt`、`ctx.shellEnv`、`ctx.jobs for run_in_background and the job-backed foreground path` | `tool/call`、`tool/result` | - | bash 工具是 bash 执行器 seam 面向模型的消费方。组合中有 job 注册表时，每次调用一启动就注册到通用 `ctx.jobs` 运行时，并通过 `job_*` 工具（来自 `@deepseek-ai/dsh-tool-jobs`）收集／停止；没有注册表或 `enableRunInBackground: false` 时，工具注册不带 `run_in_background` 参数的纯前台 schema。 |
| `@deepseek-ai/dsh-tool-present` | `present` | `ctx.tools`, `ctx.fs`, `ctx.sessionProjections` | `tool/call`, `deliverables/presented 在成功的最终结果之后`, `tool/result` | - | 交付归调用方 Session 所有；Web ui-deliverables 提供源文件打开与卡片。 |
| `@deepseek-ai/dsh-tool-pwsh` | `pwsh` | `ctx.tools`、`ctx.shell`、`ctx.systemPrompt`、`ctx.shellEnv`、`ctx.jobs for run_in_background and the job-backed foreground path` | `tool/call`、`tool/result` | - | pwsh 工具是 Windows 组合中 bash 执行器 seam 的 PowerShell 方言消费方（由 `@deepseek-ai/dsh-pwsh-local` 等 PowerShell 执行器为 `ctx.shell` 提供后端）；除沙箱接口外，它逐项对应 bash 工具调用。使用 `run_in_background` 的运行会注册到通用 `ctx.jobs` 运行时，并通过 `job_*` 工具收集／停止；托管的 `DSH_*` 环境来自 `@deepseek-ai/dsh-shell-env`。每次调用都在新进程中运行，不使用持久 PTY 会话。路径采用原生 `C:\...` 形式，变量采用 `$env:NAME`。 |
| `@deepseek-ai/dsh-tool-cordis` | `cordis_inspect_list`, `cordis_inspect_query` | `ctx.tools`, `ctx.cordisInspect` | `tool/call`, `tool/result` | - | 创造模式提供两个只读运行时检查工具。Cordis host runner 提供检查注册表；Client 查询需要已连接页面。持久化变更编写为组合包，再通过 plugin_manager 安装。 |
| `@deepseek-ai/dsh-tool-bash-persistent` | `bash` | `ctx.tools`、`ctx.terminals`、`an owning Agent at execution time` | `tool/call`、`PTY shell state`、`tool/result` | - | 一个按所有者隔离的持久 bash 工具；部署组合提供 PTY 后端，并可覆盖面向模型的环境描述。 |
| `@deepseek-ai/dsh-tool-pwsh-persistent` | `pwsh` | `ctx.tools`、`ctx.terminals`、`an owning Agent at execution time` | `tool/call`、`PTY shell state`、`tool/result` | - | 一个按所有者隔离的持久 pwsh 工具，持久 bash 工具的 Windows 对应物；部署组合提供 pwsh 方言的 PTY 后端，并可覆盖面向模型的环境描述。 |
| `@deepseek-ai/dsh-tool-str-replace-editor` | `str_replace_editor` | `ctx.tools`、`ctx.fs` | `tool/call`、`fs/observed after view presence/absence, edit absence, or successful mutation`、`tool/result` | - | 基于文件系统 seam 的独立查看／创建／唯一字面量替换／按行插入工具；可与任何 shell 或终端接口组合。 |
| `@deepseek-ai/dsh-tool-fs` | `edit`、`read`、`read_image`、`write` | `ctx.tools`、`ctx.fs`、`ctx.systemPrompt`、`ctx.attachments (image-tool registration)`、`ctx.llm + an image-capable route (image-tool execution)` | `tool/call`、`fs/write-intent or fs/edit-intent for mutations`、`fs/observed after read presence/absence or successful file operation`、`durable attachment (read_image)`、`tool/result` | - | 先读后写／编辑策略由 `@deepseek-ai/dsh-fs-observation-policy` 添加；它是一个 `fs/*` 事件门禁插件，不会改变 schema。加载这些工具的部署按预期也应加载该插件。没有 `ctx.attachments` 时图片工具不会注册；其 schema 与路由无关，执行时除非确切路由的模型声明图片输入，否则拒绝。 |
| `@deepseek-ai/dsh-tool-fs-search` | `glob`、`grep` | `ctx.tools`、`ctx.subprocess`、`ctx.systemPrompt` | `tool/call`、`tool/result` | - | glob 和 grep 是无条件可用的发现工具，通过 ctx.subprocess spawn 随包提供的 ripgrep 二进制文件（`@vscode/ripgrep`），并作为普通前台调用运行，绝不作为后台任务；无需在宿主机安装 `rg`，也不经过 shell 层。本目录使用 `sampleOverCapGlobResults: true`；部署必须显式选择该行为。结果超过上限时，会通过可选的 ctx.spillStore 后端保存完整的格式化列表；在共置部署中，如果后端公开本地路径，返回的定位信息可供后续读取／搜索。 |
| `@deepseek-ai/dsh-tool-terminal` | `terminal_close`、`terminal_list`、`terminal_open`、`terminal_read`、`terminal_send`、`terminal_signal` | `ctx.tools`、`ctx.terminals`、`ctx.systemPrompt`、`ctx.jobs at call time for run_in_background` | `tool/call`、`tool/result` | - | 这 6 个终端工具需要选择启用，用于补充一次性 bash／文件系统工具。`terminal_send(run_in_background: true)` 会注册到 `ctx.jobs`；schema 不包含 TUI、具名按键序列、BEL、调整尺寸、自动启动和跨 agent 共享。 |
| `@deepseek-ai/dsh-tool-goal` | `create_goal`、`get_goal`、`update_goal` | `ctx.tools`、`ctx.agents`、`ctx.goals`、`ctx.systemPrompt`、`a calling Agent in an authorized open turn` | `tool/call`、`goal/change for mutations`、`tool/result` | - | create、edit、pause 和 resume 要求直接来自人类的根权限；complete 和 blocked 也接受确切的当前 Goal Round。blocked 的默认下限是 3 个获准的 Round。 |
| `@deepseek-ai/dsh-tool-schedule` | `schedule_create`、`schedule_delete`、`schedule_list`、`schedule_update` | `ctx.tools`、`ctx.schedule` | `tool/call`、Schedule storage domain 创建、更新或删除、`tool/result` | - | preset 或 Agent scope 挂载本包；由 preset 决定哪些 agent 获得这四个管理工具。每次调用都作用于调用方 Agent 的 Session。接受 after_seconds、显式绝对 at、有界固定速率 every_seconds、带显式 IANA 时区的每日与每周本地时间，以及作为五字段表达式的 cron。管理使用宿主 storage domain；到期消息会恢复原 Session。 |
| `@deepseek-ai/dsh-tool-lsp` | `lsp` | `ctx.tools`、`ctx.lsp`、`ctx.systemPrompt` | `tool/call`、`tool/result` | - | lsp 工具将提供方选择和语言服务器子进程置于 ctx.lsp 之后，因此其模型可见 schema 在更换提供方时保持稳定。运行时要求已注册提供方，例如 `@deepseek-ai/dsh-lsp-stdio`；如果没有提供方，查询会返回结构化 `LSP_UNAVAILABLE` 错误，而不会改变 schema。 |
| `@deepseek-ai/dsh-tool-ralph` | `ralph` | `ctx.tools`、`ctx.workflowEngine`、`ctx.subagents`、`ctx.systemPrompt`、`a calling Agent (exec.agent parents every fresh round)` | `tool/call`、`tool/result`、`workflow and child session events during execution` | - | 固定的前台工作流会在每个 Round 启动一个全新的结构化子级；模型只能选择不可变目标和可选的 Round 上限。 |
| `@deepseek-ai/dsh-tool-skill` | `skill` | `ctx.tools`、`ctx.agents`、`ctx.skills` | `tool/call`、`tool/result`、`user/message replacement catalogs via agent.inject()` | - | - |
| `@deepseek-ai/dsh-tool-session-query` | `session_event_read`、`session_event_search`、`session_event_trace`、`session_search`、`session_trace` | `ctx.tools`、`ctx.systemPrompt`、`ctx.sessionQuery`、`a calling Agent for workspace authority` | `tool/call`、`tool/result` | - | 这 5 个只读工具会隐藏提供方游标，并根据不可变的调用 agent 会话为每个结果授权。该包需要选择启用；需要强制截止时间或限制行内输出的组合还会挂载通用超时或 spill 策略。 |
| `@deepseek-ai/dsh-tool-subagent` | `list_subagent_models`、`subagent` | `ctx.tools`、`ctx.subagents`、`ctx.systemPrompt`、`用于模型发现和所选路由校验的 ctx.llm` | `tool/call`、`tool/result`、`child session events through the chosen provider` | `subagent`、`subagent_fork` | 注册的委派工具名称取决于加载时 `toolName` 配置（默认为 `subagent`）；上述默认 schema 关闭模型选择，而发现 schema 则展示为已启用 Session 中可用的固定配套工具。Web preset 会在每个新顶层 Session 创建时读取插件页偏好，并为其子 Session 保留该决定；`subagent_fork` 始终使用固定路由。每个实例通过 `modelSelectionSettings`、`backgroundMode` 与 `enableRunInBackground` 独立控制是否读取模型选择设置及其后台行为。 |
| `@deepseek-ai/dsh-tool-subagent-control` | `interrupt_agent`、`list_agents`、`send_message` | `ctx.tools`、`ctx.subagents`、`ctx.agents and ctx.sessionProjections (list_agents only)` | `tool/call`、`tool/result`、`child session events through ctx.subagents` | - | 这些是控制可继续后台 subagent 的全局命名工具：绑定提供方的 `tool-subagent` 实例注册不同的委派工具；本包注册一次 `send_message` 和 `interrupt_agent`，另由 `list_agents` 通过单独加载的 `/list-agents` 插件提供，其目录行使用 sessionProjections 和实时 Agent 注册表。 |
| `@deepseek-ai/dsh-tool-jobs` | `job_kill`、`job_list`、`job_output` | `ctx.tools`、`ctx.jobs`、`ctx.systemPrompt` | `tool/call`、`tool/result`、`user/message via agent.inject() for background completion notices` | - | 与任务种类无关的后台任务控制器：后台 bash 命令、PTY 发送和 subagent 都通过相同的 3 个工具读取、列出和终止。加载该插件会挂接控制器，从而启用生产方的 `ctx.jobs.start()`。 |
| `@deepseek-ai/dsh-experimental-tool-agent-team` | `interrupt_agent`、`list_agents`、`send_message`、`spawn_teammate`、`team_task_create`、`team_task_get`、`team_task_list`、`team_task_update`、`wait_agent` | `ctx.tools`、`ctx.systemPrompt`、`ctx.agentTeams`、`an exact live Team member Agent` | `tool/call`、`team/member`、`team/message/queued`、`team/message/delivered`、`team/task`、`tool/result` | - | 这 9 个工具限定于隐式 Team Lead 与持久 teammate 作用域。随产品发布的 dsh-base bundle 默认禁用该包；文档中的 Agent Teams profile patch 会启用它，并禁用旧 continuable child 的同名控制工具。 |
| `@deepseek-ai/dsh-tool-todo` | `todo_write` | `ctx.tools`、`owning Agent session` | `tool/call`、`todo/write`、`tool/result` | - | todo_write 是会话所有的状态；UI 将最新的 todo/write 事件渲染为检查清单。`allowParallelInProgress` 是没有默认值的必填项，因此本目录明确选择 `true`，对应描述允许同时存在多个 `in_progress` 项。选择 `false` 的部署会获得同一工具，但描述会要求只能有 1 个活动任务。 |
| `@deepseek-ai/dsh-tool-workflow` | `workflow` | `ctx.tools`、`ctx.workflowEngine`、`ctx.systemPrompt`、`a calling Agent (exec.agent parents the script children)` | `tool/call`、`tool/result` | - | - |
| `@deepseek-ai/dsh-tool-workspace-dependencies` | `load_workspace_dependencies` | `ctx.tools` | `tool/call`, `tool/result` | - | - |
| `@deepseek-ai/dsh-tool-web` | `web_fetch`、`web_search` | `ctx.tools`、`ctx.web`、`ctx.systemPrompt` | `tool/call`、`tool/result` | - | web_search 和 web_fetch 将提供方选择置于 ctx.web 之后，使模型可见 schema 在更换后端时保持稳定。 |

<a id="deepseek-aidsh-tool-banyan-ops"></a>

## `@deepseek-ai/dsh-tool-banyan-ops`

### `banyan_content_cache_evict`

Evict the Redis content detail cache for one Banyan content item. Use when a content detail page looks stale while the database row is expected to be authoritative.

```json
{
  "type": "object",
  "properties": {
    "contentId": {
      "type": "string",
      "description": "Banyan shared content ID."
    }
  },
  "required": [
    "contentId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_content_cache_inspect`

Read Redis content-detail cache metadata for one Banyan content item: enabled/available state, key, presence, TTL, and cached JSON byte size. Use before evicting or warming content cache.

```json
{
  "type": "object",
  "properties": {
    "contentId": {
      "type": "string",
      "description": "Banyan shared content ID."
    }
  },
  "required": [
    "contentId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_content_cache_metrics`

Read Banyan content-detail cache runtime metrics: total lookups, hits, misses, hitRate, loader calls, single-flight coalescing, and top hotspot candidates. Use before and after cache warm/repair drills.

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "description": "Maximum hotspot content rows to return. Defaults to 20, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_content_cache_warm`

Rebuild the Redis content detail cache for one Banyan content item from the authoritative database row. Use after evicting stale content cache or before a demo of a known hot content item.

```json
{
  "type": "object",
  "properties": {
    "contentId": {
      "type": "string",
      "description": "Banyan shared content ID."
    }
  },
  "required": [
    "contentId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_content_counters_rebuild`

Rebuild denormalized Banyan content like/favorite counters from authoritative reaction rows, then evict detail cache and refresh the search document. Use when counters or Elasticsearch ranking look stale.

```json
{
  "type": "object",
  "properties": {
    "contentId": {
      "type": "string",
      "description": "Banyan shared content ID."
    }
  },
  "required": [
    "contentId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_content_counters_rebuild_published`

Rebuild denormalized like/favorite counters for a bounded page of published Banyan content from authoritative reaction rows. Use after event projection outages or disaster recovery replay.

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "description": "Maximum published content rows to scan. Defaults to 200, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_content_feed_rebuild_public`

Rebuild the Redis public Banyan content feed projection from published public database rows. Use when the sharing feed is empty, missing recent public content, or out of order after Redis loss or projection outages.

```json
{
  "type": "object",
  "properties": {
    "kind": {
      "type": "string",
      "description": "Optional content kind to rebuild. Omit to rebuild all public feed kinds.",
      "enum": [
        "POST",
        "DSH_SKILL"
      ]
    },
    "limit": {
      "type": "integer",
      "description": "Maximum published content rows to scan. Defaults to 500, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_content_index_ensure`

Create the Banyan Elasticsearch content index if it is missing. Use before bulk reindexing or after local Elasticsearch resets.

```json
{
  "type": "object",
  "properties": {}
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_content_index_inspect`

Inspect the configured Banyan Elasticsearch content index through the audited backend API. Returns enabled, ok, exists, and documentCount. Use before ensure/reindex or when search results look missing or stale.

```json
{
  "type": "object",
  "properties": {}
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_content_reindex`

Reindex one Banyan content item into Elasticsearch from the authoritative database row. Use when search results are missing or stale.

```json
{
  "type": "object",
  "properties": {
    "contentId": {
      "type": "string",
      "description": "Banyan shared content ID."
    }
  },
  "required": [
    "contentId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_content_reindex_published`

Bulk reindex a bounded page of published Banyan content into Elasticsearch from authoritative database rows. Use after search index loss or projection outages.

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "description": "Maximum published content rows to scan. Defaults to 200, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_content_search`

Search Banyan shared content through the server search API. Use this for knowledge/content lookup before answering user questions about published posts or DSH skills.

```json
{
  "type": "object",
  "properties": {
    "q": {
      "type": "string",
      "description": "Search query. Empty string returns recent visible content."
    },
    "kind": {
      "type": "string",
      "description": "Optional content kind filter.",
      "enum": [
        "POST",
        "DSH_SKILL"
      ]
    },
    "scope": {
      "type": "string",
      "description": "Visibility scope. Defaults to public.",
      "enum": [
        "public",
        "friends",
        "self"
      ]
    },
    "spaceType": {
      "type": "string",
      "description": "Optional content space type for group-space search.",
      "enum": [
        "GROUP"
      ]
    },
    "spaceId": {
      "type": "string",
      "description": "Optional group subject id for group-space search."
    },
    "cursor": {
      "type": "string",
      "description": "Optional search_after cursor from the previous response."
    },
    "limit": {
      "type": "integer",
      "description": "Result limit. Defaults to 10, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_kafka_lag`

Inspect Kafka consumer lag for Banyan projection consumers through the audited backend API. Returns alertLevel, thresholdExceeded, warning/critical thresholds, per-partition committed/end offsets, lagging partition count, max lag partition, offsetSummary, and suggestedAction. Use when Canal/Kafka is healthy but Redis, Elasticsearch, notifications, or feed projections appear delayed.

```json
{
  "type": "object",
  "properties": {
    "groupId": {
      "type": "string",
      "description": "Optional Kafka consumer group id. Defaults to the Banyan Server consumer group."
    },
    "topic": {
      "type": "string",
      "description": "Optional Kafka topic. Defaults to the Banyan outbox topic."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_knowledge_index_ensure`

Create the Banyan Elasticsearch knowledge index if it is missing. Use before knowledge reindexing or after local Elasticsearch resets.

```json
{
  "type": "object",
  "properties": {}
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_knowledge_index_inspect`

Inspect the configured Banyan Elasticsearch knowledge index through the audited backend API. Returns enabled, ok, exists, and documentCount. Use before ensure/reindex or when Agentic RAG search looks missing or stale.

```json
{
  "type": "object",
  "properties": {}
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_knowledge_reindex_document`

Reindex one Banyan knowledge document into Elasticsearch from authoritative document chunks. Use when one Agentic RAG document is missing or stale.

```json
{
  "type": "object",
  "properties": {
    "documentId": {
      "type": "string",
      "description": "Banyan knowledge document ID."
    }
  },
  "required": [
    "documentId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_knowledge_reindex_documents`

Bulk reindex a bounded page of Banyan knowledge documents into Elasticsearch from authoritative document chunks. Use after search index loss, RAG ingestion outages, or local development resets.

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "description": "Maximum knowledge documents to scan. Defaults to 200, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_mcp_knowledge_search`

Call Banyan Server MCP tool banyan.knowledge.search for audited Agent knowledge citations. Use when answering from Banyan knowledge documents and cite returned document/chunk evidence.

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "RAG query text."
    },
    "workspaceId": {
      "type": "string",
      "description": "Banyan workspace id. Defaults to the backend default workspace when omitted."
    },
    "scope": {
      "type": "string",
      "description": "Permission scope. Defaults to workspace.",
      "enum": [
        "public",
        "workspace",
        "friends",
        "self"
      ]
    },
    "cursor": {
      "type": "string",
      "description": "Optional search_after cursor from the previous MCP response."
    },
    "limit": {
      "type": "integer",
      "description": "Citation limit. Defaults to 5, maximum enforced by Banyan Server."
    },
    "agentProfileId": {
      "type": "string",
      "description": "Optional Agent profile id to include in backend audit evidence."
    },
    "toolCallId": {
      "type": "string",
      "description": "Optional caller-stable tool call id for backend audit evidence."
    }
  },
  "required": [
    "query"
  ]
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_mcp_rag_search`

Call Banyan Server MCP tool banyan.rag.search for audited cross-corpus RAG citations from knowledge documents, shared posts, and shared DSH Skills. Use for resume-facing Agent RAG answers that need backend/citation evidence, quality verdicts, rubric dimensions, missing corpus coverage, failure reasons, and tuning suggestions.

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "RAG query text."
    },
    "workspaceId": {
      "type": "string",
      "description": "Banyan workspace id. Defaults to the backend default workspace when omitted."
    },
    "scope": {
      "type": "string",
      "description": "Permission scope. Defaults to workspace.",
      "enum": [
        "public",
        "workspace",
        "friends",
        "self"
      ]
    },
    "corpus": {
      "type": "string",
      "description": "Corpus selector. Defaults to all.",
      "enum": [
        "all",
        "knowledge",
        "content",
        "skills"
      ]
    },
    "spaceType": {
      "type": "string",
      "description": "Optional shared-content space type for group-space RAG.",
      "enum": [
        "GROUP"
      ]
    },
    "spaceId": {
      "type": "string",
      "description": "Optional group subject id for group-space RAG."
    },
    "knowledgeCursor": {
      "type": "string",
      "description": "Optional knowledge corpus cursor."
    },
    "contentCursor": {
      "type": "string",
      "description": "Optional shared post corpus cursor."
    },
    "skillCursor": {
      "type": "string",
      "description": "Optional shared DSH Skill corpus cursor."
    },
    "requiredCorpora": {
      "type": "array",
      "description": "Optional corpus coverage required for quality.pass.",
      "items": {
        "type": "string",
        "enum": [
          "knowledge",
          "content",
          "skills"
        ]
      }
    },
    "minCitationCount": {
      "type": "integer",
      "description": "Minimum citation count required for quality.pass."
    },
    "minStrongCitationCount": {
      "type": "integer",
      "description": "Minimum strong citation count required for quality.pass."
    },
    "requireAllQueryTerms": {
      "type": "boolean",
      "description": "Require every normalized query term to appear in returned citation text."
    },
    "limit": {
      "type": "integer",
      "description": "Citation limit. Defaults to 10, maximum enforced by Banyan Server."
    },
    "agentProfileId": {
      "type": "string",
      "description": "Optional Agent profile id to include in backend audit evidence."
    },
    "toolCallId": {
      "type": "string",
      "description": "Optional caller-stable tool call id for backend audit evidence."
    }
  },
  "required": [
    "query"
  ]
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_ops_audit_recent`

Read recent Banyan Server operations audit log entries. Use before or after maintenance to explain what changed, who requested it, and whether it was accepted.

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "description": "Maximum audit rows to return. Defaults to 50, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_ops_drill_kafka_consumer_stop`

Stop the Banyan Canal/Kafka outbox consumer for a controlled lag drill. Use only for explicit tests, then create or wait for outbox traffic, inspect lag, repair targetType KAFKA, and verify lag again.

```json
{
  "type": "object",
  "properties": {}
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_ops_drill_outbox_failure`

Inject a controlled Banyan outbox failure by marking one existing outbox event FAILED. Use only for explicit reliability drills, then verify recovery with trace -> repair -> trace.

```json
{
  "type": "object",
  "properties": {
    "eventId": {
      "type": "string",
      "description": "Existing Banyan outbox event id to mark FAILED."
    },
    "message": {
      "type": "string",
      "description": "Failure message to store on the event. Defaults to a drill marker."
    }
  },
  "required": [
    "eventId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_ops_drill_stale_content_counters`

Inject stale denormalized like/favorite counters for one Banyan content item. Use only for explicit cache/count repair drills, then verify recovery with trace -> repair -> trace.

```json
{
  "type": "object",
  "properties": {
    "contentId": {
      "type": "string",
      "description": "Banyan shared content ID."
    },
    "likeCount": {
      "type": "integer",
      "description": "Injected likeCount. Defaults to 999."
    },
    "favoriteCount": {
      "type": "integer",
      "description": "Injected favoriteCount. Defaults to 999."
    }
  },
  "required": [
    "contentId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_ops_drill_stale_reaction_cache`

Inject stale Redis reaction-cache like/favorite count values for one Banyan content item. Use only for explicit cache/count repair drills, then prove stale reads and recovery with inspect -> trace -> repair -> trace.

```json
{
  "type": "object",
  "properties": {
    "contentId": {
      "type": "string",
      "description": "Banyan shared content ID."
    },
    "likeCount": {
      "type": "integer",
      "description": "Injected cached likeCount. Defaults to 999."
    },
    "favoriteCount": {
      "type": "integer",
      "description": "Injected cached favoriteCount. Defaults to 999."
    },
    "viewerUserId": {
      "type": "string",
      "description": "Optional Banyan internal user id for inspecting viewer bitmap state alongside count keys."
    }
  },
  "required": [
    "contentId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_ops_drill_upload_expired`

Inject an expired pending upload drill by moving one pending Banyan upload object into the cleanup window and optionally creating a stale local dev-upload file. Use only for explicit upload cleanup drills, then verify recovery with trace -> cleanup or repair -> trace.

```json
{
  "type": "object",
  "properties": {
    "uploadObjectId": {
      "type": "string",
      "description": "Existing pending Banyan upload object id."
    },
    "expiredSecondsAgo": {
      "type": "integer",
      "description": "How far in the past the upload expiry should be moved. Defaults to 60 seconds."
    },
    "createLocalFile": {
      "type": "boolean",
      "description": "Whether the backend should seed a stale local dev-upload file so cleanup can prove file deletion. Defaults to true."
    }
  },
  "required": [
    "uploadObjectId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_ops_health`

Actively check Banyan infrastructure health over the audited backend API. Returns Redis, Elasticsearch, and Kafka UP/DOWN/SKIPPED states with latency and concise error messages.

```json
{
  "type": "object",
  "properties": {}
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_ops_repair_target`

Run Banyan Server supported target-scoped repair actions after tracing CONTENT, KNOWLEDGE_DOCUMENT, KNOWLEDGE_RAG, or SEARCH_INDEX. Returns a before trace, executed steps, and after trace so the ops Agent can explain what changed; call banyan_ops_trace_target again afterward to verify the target after-state.

```json
{
  "type": "object",
  "properties": {
    "targetType": {
      "type": "string",
      "description": "Target type, for example CONTENT, KNOWLEDGE_DOCUMENT, KNOWLEDGE_RAG, or SEARCH_INDEX."
    },
    "targetId": {
      "type": "string",
      "description": "Target id, such as a content id, knowledge document id, workspace id, or search index name."
    },
    "limit": {
      "type": "integer",
      "description": "Maximum target outbox rows or indexed rows to repair. Defaults to 50, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_ops_request_summary`

Read a compact Banyan Server HTTP request summary grouped by normalized route and derived business target. Use to identify slow or failed API chains before calling banyan_ops_trace_target or repair tools.

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "description": "Maximum recent request trace rows to summarize. Defaults to 100, maximum enforced by Banyan Server."
    },
    "slowThresholdMs": {
      "type": "integer",
      "description": "Requests at or above this duration count as slow. Defaults to 500 ms."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_ops_requests_recent`

Read recent Banyan Server HTTP request trace entries. Use to see API method, path, status, durationMs, actorUserId, and derived businessTarget evidence without mixing them into the maintenance audit log.

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "description": "Maximum request trace rows to return. Defaults to 50, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_ops_spans_recent`

Read recent Banyan Server internal service span entries. Use to inspect RAG corpus fan-out, target repair steps, durationMs, success status, and businessTarget evidence without mixing spans into the maintenance audit log.

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "description": "Maximum service span rows to return. Defaults to 50, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_ops_status`

Read a Banyan Server operations snapshot: entity counts, outbox progress, Redis reaction-cache settings, Elasticsearch settings, Canal consumer flag, and Kafka outbox topic.

```json
{
  "type": "object",
  "properties": {}
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_ops_target_matrix`

Read a compact target.txt capability matrix from Banyan Server. Use this first when triaging system readiness, deciding which backend/Agent highlight needs evidence, or avoiding context-heavy raw logs.

```json
{
  "type": "object",
  "properties": {
    "evidenceLimit": {
      "type": "integer",
      "description": "Maximum recent audit/request rows the backend may consider when building compact signals. Defaults to 25."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_ops_trace_target`

Read one Banyan execution-chain report for a target such as CONTENT, KNOWLEDGE_DOCUMENT, KNOWLEDGE_RAG, SEARCH_INDEX, AGENT_PROFILE, AGENT_RUN, or CONVERSATION. Returns matching ops audit rows, HTTP request rows, service span rows, outbox rows, status counts, observations, and suggested repair tools.

```json
{
  "type": "object",
  "properties": {
    "targetType": {
      "type": "string",
      "description": "Target type, for example CONTENT, KNOWLEDGE_DOCUMENT, KNOWLEDGE_RAG, SEARCH_INDEX, AGENT_PROFILE, AGENT_RUN, or CONVERSATION."
    },
    "targetId": {
      "type": "string",
      "description": "Target id, such as a content id, knowledge document id, workspace id, search index name, agent profile id, AgentRun id, or conversation id."
    },
    "auditLimit": {
      "type": "integer",
      "description": "Maximum matching audit rows to return. Defaults to 20, maximum enforced by Banyan Server."
    },
    "outboxLimit": {
      "type": "integer",
      "description": "Maximum matching outbox rows to return. Defaults to 50, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_outbox_diagnostics`

Read grouped Banyan outbox backlog diagnostics. Returns NEW and FAILED counts grouped by status, aggregate type, and event type so an ops Agent can identify whether Redis, Elasticsearch, notifications, social stats, or another projection lane is stuck.

```json
{
  "type": "object",
  "properties": {}
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_outbox_failed_recent`

Read recent failed Banyan outbox projection events, including aggregate, event type, attempts, and last error. Use this before retrying failed projections.

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "description": "Maximum failed outbox events to return. Defaults to 50, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_outbox_replay`

Replay stored Banyan outbox events through the backend projection pipeline. Use after Canal/Kafka consumer outages, cache loss, or local development resets.

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "description": "Maximum outbox events to scan. Defaults to 200, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_outbox_retry_failed`

Retry only failed Banyan outbox projections. Use when ops status reports failedEvents > 0 before doing a broader replay.

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "description": "Maximum failed outbox events to retry. Defaults to 200, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_reaction_cache_inspect`

Read Redis reaction-cache metadata for one Banyan content item: enabled/available state, count-key presence, cached like/favorite counts, bitmap sizing, and optional viewer bitmap state. Use before rebuilding reaction cache.

```json
{
  "type": "object",
  "properties": {
    "contentId": {
      "type": "string",
      "description": "Banyan shared content ID."
    },
    "viewerUserId": {
      "type": "string",
      "description": "Optional Banyan internal user id to inspect viewer like/favorite bitmap bits."
    }
  },
  "required": [
    "contentId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_reaction_cache_rebuild`

Rebuild Redis reaction bitmap/cache data for one Banyan content item from authoritative database reactions. Use after detecting stale like/favorite counters.

```json
{
  "type": "object",
  "properties": {
    "contentId": {
      "type": "string",
      "description": "Banyan shared content ID."
    }
  },
  "required": [
    "contentId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_reaction_cache_rebuild_published`

Rebuild Redis reaction bitmap/cache data for a bounded page of published Banyan content from authoritative database reactions. Use after Redis cache loss or a local reset.

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "description": "Maximum published content rows to scan. Defaults to 200, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_social_group_stats_rebuild`

Rebuild one Banyan group social stats projection, especially memberCount, from authoritative conversation participants. Use when group profile counts look stale after Outbox/Canal lag.

```json
{
  "type": "object",
  "properties": {
    "conversationId": {
      "type": "string",
      "description": "Banyan group conversation id."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_social_user_stats_rebuild`

Rebuild one Banyan user social stats projection, especially friendCount, from authoritative friend relation rows. Use when a profile or social graph count looks stale after Outbox/Canal lag.

```json
{
  "type": "object",
  "properties": {
    "userId": {
      "type": "string",
      "description": "Banyan internal user id, not the public uid."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

### `banyan_upload_cleanup`

Abandon expired pending Banyan upload objects and delete any stale local dev-upload files. Use when storage grows unexpectedly or ops status shows many pending uploads.

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "description": "Maximum expired pending upload objects to scan. Defaults to 200, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-ops/src/index.ts`](../packages/extensions/tool-banyan-ops/src/index.ts)

<a id="deepseek-aidsh-tool-banyan-search"></a>

## `@deepseek-ai/dsh-tool-banyan-search`

### `banyan_content_get`

Fetch one visible Banyan content item by ID, including full Markdown body and attachment metadata. Use after banyan_content_search identifies a relevant item.

```json
{
  "type": "object",
  "properties": {
    "contentId": {
      "type": "string",
      "description": "Banyan shared content ID."
    }
  },
  "required": [
    "contentId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-search/src/index.ts`](../packages/extensions/tool-banyan-search/src/index.ts)

### `banyan_content_search`

Search visible Banyan shared content through the server search API. Use this to retrieve relevant posts or DSH skill shares before answering Banyan knowledge questions.

```json
{
  "type": "object",
  "properties": {
    "q": {
      "type": "string",
      "description": "Search query. Empty string returns recent visible content."
    },
    "kind": {
      "type": "string",
      "description": "Optional content kind filter.",
      "enum": [
        "POST",
        "DSH_SKILL"
      ]
    },
    "scope": {
      "type": "string",
      "description": "Visibility scope. Defaults to public.",
      "enum": [
        "public",
        "friends",
        "self"
      ]
    },
    "cursor": {
      "type": "string",
      "description": "Optional search_after cursor from the previous response."
    },
    "limit": {
      "type": "integer",
      "description": "Result limit. Defaults to 10, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-search/src/index.ts`](../packages/extensions/tool-banyan-search/src/index.ts)

### `banyan_knowledge_get`

Fetch one visible Banyan knowledge document by ID, including the full Markdown body and chunk count. Use after banyan_knowledge_search identifies a relevant document.

```json
{
  "type": "object",
  "properties": {
    "documentId": {
      "type": "string",
      "description": "Banyan knowledge document ID."
    }
  },
  "required": [
    "documentId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-search/src/index.ts`](../packages/extensions/tool-banyan-search/src/index.ts)

### `banyan_knowledge_search`

Search visible Banyan knowledge chunks through the server knowledge API. Use this for Agentic RAG over personal or team Markdown knowledge before answering project, document, or workflow questions.

```json
{
  "type": "object",
  "properties": {
    "q": {
      "type": "string",
      "description": "Search query. Empty string returns recent visible knowledge chunks."
    },
    "workspaceId": {
      "type": "string",
      "description": "Optional Banyan workspace ID."
    },
    "scope": {
      "type": "string",
      "description": "Visibility scope. Defaults to workspace.",
      "enum": [
        "public",
        "workspace",
        "self"
      ]
    },
    "limit": {
      "type": "integer",
      "description": "Result limit. Defaults to 10, maximum enforced by Banyan Server."
    }
  }
}
```

Source: [`packages/extensions/tool-banyan-search/src/index.ts`](../packages/extensions/tool-banyan-search/src/index.ts)

### `banyan_skill_package_get`

Fetch one visible Banyan DSH skill share as a normalized import package: SKILL.md content, parsed name/description, recommended directory name, and references/scripts/templates attachments. Use after banyan_content_search finds a DSH_SKILL item.

```json
{
  "type": "object",
  "properties": {
    "contentId": {
      "type": "string",
      "description": "Banyan DSH_SKILL content ID."
    }
  },
  "required": [
    "contentId"
  ]
}
```

Source: [`packages/extensions/tool-banyan-search/src/index.ts`](../packages/extensions/tool-banyan-search/src/index.ts)

<a id="deepseek-aidsh-tool-mobile"></a>

## `@deepseek-ai/dsh-tool-mobile`

### `android_sh`

Run a bounded Android /system/bin/sh command in the Banyan Android bridge workspace through the Android bridge. This is best for read-only diagnostics and small shell logic, not normal phone control. It runs as an Android app UID, not root or shell; system-service commands such as dumpsys/settings/input/am/pm may require approval or max mode and can still be denied. Prefer dedicated tools for screen observation, screenshots, app opening, tapping, typing, URL opening, APK installation, and app closing. Use mode="safe" for ordinary read-only diagnostics, mode="approval" when a command needs explicit user approval, and mode="max" only when the user has asked for the highest app-UID permissions Android can grant.

```json
{
  "type": "object",
  "properties": {
    "command": {
      "type": "string",
      "description": "Shell command passed to /system/bin/sh -c."
    },
    "cwd": {
      "type": "string",
      "description": "Relative working directory under the Banyan Android bridge workspace. Absolute paths are rejected."
    },
    "mode": {
      "type": "string",
      "description": "One of safe, approval, or max. Defaults to safe."
    },
    "timeoutMs": {
      "type": "integer",
      "description": "Command timeout in milliseconds."
    },
    "maxOutputBytes": {
      "type": "integer",
      "description": "Maximum bytes captured separately from stdout and stderr."
    }
  },
  "required": [
    "command"
  ]
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

### `apk_install`

Open Android system package installer for an APK that is accessible to Banyan. This does not silently install the APK; the user must confirm the Android installer prompt. Prefer this over coordinate tapping inside system install dialogs.

```json
{
  "type": "object",
  "properties": {
    "filePath": {
      "type": "string",
      "description": "APK file path in the Banyan app private files directory."
    },
    "contentUri": {
      "type": "string",
      "description": "Optional Android content:// URI for an APK that the app can grant to the installer."
    },
    "observeAfter": {
      "type": "boolean",
      "description": "Set true to include a denoised screen_observe node tree after the action, or false to suppress the tool default. input_tap already returns a short postActionSummary by default; input_swipe/app_open/app_open_url return a denoised observation by default."
    },
    "screenshotAfter": {
      "type": "boolean",
      "description": "Set true to include a screen_screenshot result in this action result after the action completes."
    }
  }
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

### `app_close`

Move the current Android foreground app to the background with the system Home action.

```json
{
  "type": "object",
  "properties": {
    "observeAfter": {
      "type": "boolean",
      "description": "Set true to include a denoised screen_observe node tree after the action, or false to suppress the tool default. input_tap already returns a short postActionSummary by default; input_swipe/app_open/app_open_url return a denoised observation by default."
    },
    "screenshotAfter": {
      "type": "boolean",
      "description": "Set true to include a screen_screenshot result in this action result after the action completes."
    }
  }
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

### `app_list_installed`

List launchable Android apps installed on the device. Use this to discover packageName values before app_open, especially on customized Android ROMs where app store/browser package names vary.

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Optional case-insensitive filter matched against app label, packageName, or launch activity."
    },
    "limit": {
      "type": "integer",
      "description": "Maximum number of apps to return. Defaults to the bridge limit."
    }
  }
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

### `app_open`

Open an Android app by package name and return a denoised post-launch observation by default. If you do not know the package name, call app_list_installed first instead of guessing.

```json
{
  "type": "object",
  "properties": {
    "packageName": {
      "type": "string",
      "description": "Android package name to launch."
    },
    "observeAfter": {
      "type": "boolean",
      "description": "Set true to include a denoised screen_observe node tree after the action, or false to suppress the tool default. input_tap already returns a short postActionSummary by default; input_swipe/app_open/app_open_url return a denoised observation by default."
    },
    "screenshotAfter": {
      "type": "boolean",
      "description": "Set true to include a screen_screenshot result in this action result after the action completes."
    }
  },
  "required": [
    "packageName"
  ]
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

### `app_open_url`

Open an HTTP or HTTPS URL on the Android device and return a denoised post-launch observation by default, optionally forcing a target app package such as com.android.chrome to avoid the system resolver choosing the wrong handler.

```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "HTTP or HTTPS URL to open."
    },
    "packageName": {
      "type": "string",
      "description": "Optional installed Android package that should handle the URL."
    },
    "observeAfter": {
      "type": "boolean",
      "description": "Set true to include a denoised screen_observe node tree after the action, or false to suppress the tool default. input_tap already returns a short postActionSummary by default; input_swipe/app_open/app_open_url return a denoised observation by default."
    },
    "screenshotAfter": {
      "type": "boolean",
      "description": "Set true to include a screen_screenshot result in this action result after the action completes."
    }
  },
  "required": [
    "url"
  ]
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

### `input_swipe`

Swipe on the Android screen between two display coordinates. By default this returns a denoised post-action observation; set observeAfter=false to suppress it or screenshotAfter=true when visual confirmation is needed.

```json
{
  "type": "object",
  "properties": {
    "startX": {
      "type": "integer",
      "description": "Start x coordinate."
    },
    "startY": {
      "type": "integer",
      "description": "Start y coordinate."
    },
    "endX": {
      "type": "integer",
      "description": "End x coordinate."
    },
    "endY": {
      "type": "integer",
      "description": "End y coordinate."
    },
    "durationMs": {
      "type": "integer",
      "description": "Swipe duration in milliseconds."
    },
    "observeAfter": {
      "type": "boolean",
      "description": "Set true to include a denoised screen_observe node tree after the action, or false to suppress the tool default. input_tap already returns a short postActionSummary by default; input_swipe/app_open/app_open_url return a denoised observation by default."
    },
    "screenshotAfter": {
      "type": "boolean",
      "description": "Set true to include a screen_screenshot result in this action result after the action completes."
    }
  },
  "required": [
    "startX",
    "startY",
    "endX",
    "endY"
  ]
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

### `input_tap`

Tap an Android UI nodePath/clickTarget from screen_observe, or explicit coordinates. Prefer nodePath. Use strategy="center" for switches, tabs, or controls where Accessibility click is unreliable. Use display x/y only for original Android display pixels. Use normalizedX/normalizedY for 0..1 display-relative coordinates. Use screenshotX/screenshotY together with returnedWidth/returnedHeight when the point was measured on the returned screenshot image; do not manually scale. This action returns a compact result plus postActionSummary by default unless observeAfter=false; set observeAfter=true for a denoised node-tree observation.

```json
{
  "type": "object",
  "properties": {
    "nodePath": {
      "type": "string",
      "description": "Preferred accessible node path from screen_observe."
    },
    "x": {
      "type": "integer",
      "description": "Fallback display-space x coordinate in original Android pixels."
    },
    "y": {
      "type": "integer",
      "description": "Fallback display-space y coordinate in original Android pixels."
    },
    "normalizedX": {
      "type": "number",
      "description": "Fallback x coordinate in normalized display space, from 0.0 left to 1.0 right."
    },
    "normalizedY": {
      "type": "number",
      "description": "Fallback y coordinate in normalized display space, from 0.0 top to 1.0 bottom."
    },
    "screenshotX": {
      "type": "number",
      "description": "Fallback x coordinate measured on the returned screenshot image."
    },
    "screenshotY": {
      "type": "number",
      "description": "Fallback y coordinate measured on the returned screenshot image."
    },
    "returnedWidth": {
      "type": "number",
      "description": "Width of the returned screenshot image used with screenshotX/screenshotY."
    },
    "returnedHeight": {
      "type": "number",
      "description": "Height of the returned screenshot image used with screenshotX/screenshotY."
    },
    "originalWidth": {
      "type": "number",
      "description": "Optional original display width from screen_screenshot; inferred by the bridge when omitted."
    },
    "originalHeight": {
      "type": "number",
      "description": "Optional original display height from screen_screenshot; inferred by the bridge when omitted."
    },
    "strategy": {
      "type": "string",
      "description": "NodePath tap strategy: accessibility_then_center (default), accessibility, or center."
    },
    "observeAfter": {
      "type": "boolean",
      "description": "Set true to include a denoised screen_observe node tree after the action, or false to suppress the tool default. input_tap already returns a short postActionSummary by default; input_swipe/app_open/app_open_url return a denoised observation by default."
    },
    "screenshotAfter": {
      "type": "boolean",
      "description": "Set true to include a screen_screenshot result in this action result after the action completes."
    }
  }
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

### `input_type`

Type text into an Android editable nodePath from screen_observe. Defaults to replace=true, which clears/replaces the existing field text via Accessibility ACTION_SET_TEXT; set replace=false only when you intentionally want to append. Set observeAfter=true when you need the updated node tree.

```json
{
  "type": "object",
  "properties": {
    "nodePath": {
      "type": "string",
      "description": "Editable node path from screen_observe."
    },
    "text": {
      "type": "string",
      "description": "Text to input."
    },
    "replace": {
      "type": "boolean",
      "description": "Defaults to true. When true, replace the existing field text; when false, append to the current field text."
    },
    "observeAfter": {
      "type": "boolean",
      "description": "Set true to include a denoised screen_observe node tree after the action, or false to suppress the tool default. input_tap already returns a short postActionSummary by default; input_swipe/app_open/app_open_url return a denoised observation by default."
    },
    "screenshotAfter": {
      "type": "boolean",
      "description": "Set true to include a screen_screenshot result in this action result after the action completes."
    }
  },
  "required": [
    "nodePath",
    "text"
  ]
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

### `memory_forget`

Forget one durable Android-local memory by id. Ask the user to confirm before deleting user-visible memories.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Memory id returned by memory_search or memory_write."
    }
  },
  "required": [
    "id"
  ]
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

### `memory_search`

Search durable Android-local memories for preferences, task trajectories, and knowledge relevant to the current task.

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query for prior preferences or task lessons."
    },
    "limit": {
      "type": "integer",
      "description": "Maximum number of memories to return."
    }
  },
  "required": [
    "query"
  ]
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

### `memory_write`

Write a durable Android-local memory after a useful user preference, task lesson, or reusable fact is known.

```json
{
  "type": "object",
  "properties": {
    "text": {
      "type": "string",
      "description": "Memory text. Do not include secrets or one-time verification codes."
    },
    "kind": {
      "type": "string",
      "description": "Memory kind: preference, task_trajectory, or knowledge."
    },
    "metadata": {
      "type": "object",
      "description": "Optional string metadata such as app, topic, or tool names.",
      "additionalProperties": true
    },
    "sourceTaskId": {
      "type": "string",
      "description": "Optional task/session id that produced the memory."
    }
  },
  "required": [
    "text"
  ]
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

### `screen_observe`

Observe the current Android foreground app. Default output is a denoised accessibility node tree plus clickTargets; set summary=true for a short topTexts/clickTargets summary. Image-capable models may set includeScreenshot=true to also receive a screenshot image. Prefer clickTargets/nodePath over coordinates. If measuring a point on the returned screenshot, pass screenshotX/screenshotY with returnedWidth/returnedHeight to input_tap and do not manually scale.

```json
{
  "type": "object",
  "properties": {
    "includeScreenshot": {
      "type": "boolean",
      "description": "Set true only when the current main model can read image input and visual layout or OCR-like screen reading is needed. Omit or set false for text-only models."
    },
    "summary": {
      "type": "boolean",
      "description": "Set true to return only a compact summary with topTexts and clickTargets instead of the denoised node tree."
    },
    "includeFullTree": {
      "type": "boolean",
      "description": "Set true only when the default denoised accessibility node summary hides a needed node. This can be large."
    }
  }
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

### `screen_screenshot`

Capture the current Android screen through the Banyan Android bridge and return it as a durable image attachment when attachments are available.

```json
{
  "type": "object",
  "properties": {}
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

### `user_confirm`

Ask the Android user to approve or reject a sensitive action before continuing.

```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Short confirmation title shown to the user."
    },
    "detail": {
      "type": "string",
      "description": "Specific action and risk the user is approving."
    },
    "timeoutMs": {
      "type": "integer",
      "description": "Approval timeout in milliseconds."
    }
  },
  "required": [
    "title",
    "detail"
  ]
}
```

Source: [`packages/mobile/tool-mobile/src/index.ts`](../packages/mobile/tool-mobile/src/index.ts)

<a id="deepseek-aidsh-plugin-manager"></a>

## `@deepseek-ai/dsh-plugin-manager`

### `plugin_manager`

列出当前 profile 中的插件或组合包，启用或禁用它们，安装组合包或移除已安装的组合包。每项操作都要求 danger-full-access 权限或本次调用的批准。批准不改变会话权限模式。变更影响该 profile 的所有会话。先列出条目以获取准确标识。包安装可能运行已获批准的构建脚本。支持热更新的 profile 立即应用变更；仅启动时加载的 profile 需要重启。不兼容的 DSH peer 依赖会阻止安装和激活。版本豁免可能导致崩溃和数据丢失：授权前必须警告用户，并获得用户对精确插件版本与运行时版本组合的明确许可。

```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "description": "Management operation.",
      "enum": [
        "list_plugins",
        "list_bundles",
        "set_plugin",
        "set_bundle",
        "install_bundle",
        "remove_bundle",
        "list_version_exemptions",
        "set_version_exemption"
      ]
    },
    "target": {
      "type": "string",
      "description": "Plugin entry id, bundle package name, or installation spec, according to action."
    },
    "enabled": {
      "type": "boolean",
      "description": "Required for set operations; defaults to true for installation. For set_version_exemption, true grants and false revokes."
    },
    "runtimeVersion": {
      "type": "string",
      "description": "For set_version_exemption: exact DSH version from list_version_exemptions. Target must be the manifest package-name@version, not an alias or version range."
    },
    "acceptRisk": {
      "type": "boolean",
      "description": "For granting an exemption: true only after warning the user about possible crashes and data loss and receiving explicit permission for this exact plugin/runtime pair. General installation permission is not enough."
    },
    "approvedBuilds": {
      "type": "array",
      "description": "For install_bundle: pass names from pendingBuilds only after the user explicitly approves running their install scripts in the conversation. This grants persistent permission for this profile.",
      "items": {
        "type": "string"
      }
    },
    "registry": {
      "type": "string",
      "description": "For install_bundle: the npm registry URL asked first, when the user names one; otherwise the configured registry is asked, and its configured fallbacks while a registry is unreachable."
    },
    "offset": {
      "type": "number",
      "description": "Zero-based list offset; defaults to 0."
    },
    "limit": {
      "type": "number",
      "description": "List page size, from 1 to 100; defaults to 25."
    }
  },
  "required": [
    "action"
  ]
}
```

来源： [`packages/boot/plugin-manager/src/tools.ts`](../packages/boot/plugin-manager/src/tools.ts)

<a id="deepseek-aidsh-mcp-resources"></a>

## `@deepseek-ai/dsh-mcp-resources`

### `list_mcp_resource_templates`

列出 MCP 服务器提供的参数化资源 URI 模板。

```json
{
  "type": "object",
  "properties": {
    "server": {
      "type": "string",
      "description": "Configured MCP server name."
    },
    "cursor": {
      "type": "string",
      "description": "Continuation cursor returned by this server."
    }
  },
  "required": [
    "server"
  ]
}
```

来源： [`packages/mcp/mcp-resources/src/tools.ts`](../packages/mcp/mcp-resources/src/tools.ts)

### `list_mcp_resources`

列出 MCP 服务器提供的资源。

```json
{
  "type": "object",
  "properties": {
    "server": {
      "type": "string",
      "description": "Configured MCP server name."
    },
    "cursor": {
      "type": "string",
      "description": "Continuation cursor returned by this server."
    }
  },
  "required": [
    "server"
  ]
}
```

来源： [`packages/mcp/mcp-resources/src/tools.ts`](../packages/mcp/mcp-resources/src/tools.ts)

### `read_mcp_resource`

按 URI 从指定服务器读取 MCP 资源。使用已列出的 URI 或展开后的资源模板。

```json
{
  "type": "object",
  "properties": {
    "server": {
      "type": "string",
      "description": "Configured MCP server name."
    },
    "uri": {
      "type": "string",
      "description": "Resource URI to read."
    }
  },
  "required": [
    "server",
    "uri"
  ]
}
```

来源： [`packages/mcp/mcp-resources/src/tools.ts`](../packages/mcp/mcp-resources/src/tools.ts)

<a id="deepseek-aidsh-experimental-browser-use-stagehand-native"></a>

## `@deepseek-ai/dsh-experimental-browser-use-stagehand-native`

### `stagehand_act`

使用配置的 Stagehand 模型执行一次自然语言浏览器操作。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "pageId": {
      "type": "string",
      "minLength": 1
    },
    "instruction": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "instruction"
  ],
  "additionalProperties": false
}
```

来源：[`packages/experimental/browser-use-stagehand-native/src/index.ts`](../packages/experimental/browser-use-stagehand-native/src/index.ts)

### `stagehand_extract`

使用配置的 Stagehand 模型与可选的 JSON Schema 提取页面数据。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "pageId": {
      "type": "string",
      "minLength": 1
    },
    "instruction": {
      "type": "string",
      "minLength": 1
    },
    "schema": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {
        "$ref": "#/$defs/__schema0"
      }
    }
  },
  "required": [
    "instruction"
  ],
  "additionalProperties": false,
  "$defs": {
    "__schema0": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "number"
        },
        {
          "type": "boolean"
        },
        {
          "type": "null"
        },
        {
          "type": "array",
          "items": {
            "$ref": "#/$defs/__schema0"
          }
        },
        {
          "type": "object",
          "propertyNames": {
            "type": "string"
          },
          "additionalProperties": {
            "$ref": "#/$defs/__schema0"
          }
        }
      ]
    }
  }
}
```

来源：[`packages/experimental/browser-use-stagehand-native/src/index.ts`](../packages/experimental/browser-use-stagehand-native/src/index.ts)

### `stagehand_navigate`

将 Stagehand 浏览器标签页导航至指定 URL。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "pageId": {
      "type": "string",
      "minLength": 1
    },
    "url": {
      "type": "string",
      "format": "uri"
    }
  },
  "required": [
    "url"
  ],
  "additionalProperties": false
}
```

来源：[`packages/experimental/browser-use-stagehand-native/src/index.ts`](../packages/experimental/browser-use-stagehand-native/src/index.ts)

### `stagehand_observe`

使用配置的 Stagehand 模型查找符合指令的浏览器操作。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "pageId": {
      "type": "string",
      "minLength": 1
    },
    "instruction": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "instruction"
  ],
  "additionalProperties": false
}
```

来源：[`packages/experimental/browser-use-stagehand-native/src/index.ts`](../packages/experimental/browser-use-stagehand-native/src/index.ts)

### `stagehand_screenshot`

截取 Stagehand 标签页图像以供视觉检查。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "pageId": {
      "type": "string",
      "minLength": 1
    },
    "fullPage": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "fullPage"
  ],
  "additionalProperties": false
}
```

来源：[`packages/experimental/browser-use-stagehand-native/src/index.ts`](../packages/experimental/browser-use-stagehand-native/src/index.ts)

### `stagehand_tabs`

列出、创建、选择或关闭 Stagehand 浏览器标签页。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "action": {
          "type": "string",
          "const": "list"
        }
      },
      "required": [
        "action"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "action": {
          "type": "string",
          "const": "new"
        },
        "url": {
          "type": "string",
          "format": "uri"
        }
      },
      "required": [
        "action"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "action": {
          "type": "string",
          "enum": [
            "select",
            "close"
          ]
        },
        "pageId": {
          "type": "string",
          "minLength": 1
        }
      },
      "required": [
        "action",
        "pageId"
      ],
      "additionalProperties": false
    }
  ],
  "type": "object"
}
```

来源：[`packages/experimental/browser-use-stagehand-native/src/index.ts`](../packages/experimental/browser-use-stagehand-native/src/index.ts)

<a id="deepseek-aidsh-tool-ask-user"></a>

## `@deepseek-ai/dsh-tool-ask-user`

### `ask_user_question`

继续操作前，如果需要确认、选择或缺失的信息，请向用户提出简明问题。

```json
{
  "type": "object",
  "properties": {
    "questions": {
      "type": "array",
      "description": "Questions to ask the user before continuing.",
      "items": {
        "type": "object",
        "additionalProperties": true,
        "properties": {
          "id": {
            "type": "string",
            "description": "Stable id for this question; echoed in the answer."
          },
          "question": {
            "type": "string",
            "description": "The specific question to ask the user."
          },
          "header": {
            "type": "string",
            "description": "Optional short heading for the question, such as \"Confirm\" or \"Choose Mode\"."
          },
          "options": {
            "type": "array",
            "description": "Optional choices to show the user. If you recommend one, put it first and append \"(Recommended)\" to that label.",
            "items": {
              "type": "object",
              "additionalProperties": true,
              "properties": {
                "label": {
                  "type": "string",
                  "description": "Short user-facing option label."
                },
                "description": {
                  "type": "string",
                  "description": "One sentence explaining the tradeoff or impact."
                }
              },
              "required": [
                "label"
              ]
            }
          },
          "multi_select": {
            "type": "boolean",
            "description": "Whether the user may select more than one option. Defaults to false."
          }
        },
        "required": [
          "id",
          "question"
        ]
      }
    }
  },
  "required": [
    "questions"
  ]
}
```

来源：[`packages/interaction/tool-ask-user/src/index.ts`](../packages/interaction/tool-ask-user/src/index.ts)

ask_user_question 默认保持原有阻塞行为；设置 `mode: timed` 后才启用前台超时与 pending 结果，同时问题仍可回答；timed 模式内 `timeout: -1` 让本次调用无限期阻塞。

<a id="deepseek-aidsh-tools"></a>

## `@deepseek-ai/dsh-tools`

### `run_code`

针对可用工具执行 TypeScript 程序。接受两个必填参数：`description`，简要说明该程序做什么；以及 `code`，即异步函数的**函数体**（仅使用可擦除语法；支持顶层 `await` 和 `return`）。请根据系统提示词中的声明，以 `await tools.name(args)` 形式调用工具。只有打印或返回的内容属于程序输出，请谨慎筛选。含图片的子工具结果会在运行结束后附加。

```json
{
  "type": "object",
  "properties": {
    "description": {
      "type": "string",
      "description": "Clear, concise description of what this program does in active voice, 5-10 words (shown in the UI). Provide `description` before `code` in the arguments. Examples: \"Count TODO markers across packages\"; \"Read failing test and its fixture\"; \"Rename config key in every cordis.yml\"."
    },
    "code": {
      "type": "string",
      "description": "The program: the body of an async TypeScript function."
    },
    "timeoutMs": {
      "type": "number",
      "description": "Positive elapsed-time budget in milliseconds, capped by the deployment maximum."
    },
    "sandbox_permissions": {
      "type": "string",
      "description": "Wider sandbox mode for this complete program execution; requires justification and approval.",
      "enum": [
        "workspace-write",
        "danger-full-access"
      ]
    },
    "justification": {
      "type": "string",
      "description": "Reason this complete program needs wider access, shown to the user for approval. Use the language of the user’s current request."
    }
  },
  "required": [
    "description",
    "code"
  ]
}
```

来源：[`packages/core/tools/src/ptc.ts`](../packages/core/tools/src/ptc.ts)

在 `mode: ptc`／`mode: both` 下，它由工具注册表所有，作为可过滤能力层之外的保留传输机制（参见 PTC mode Agent Note）。在 `ptc` 下，它是注册表对协议格式的唯一贡献；其他可见能力在使用已加载运行时语言生成的 SDK 章节中声明。程序通过 binding 调用这些能力，调用按照原生并发约定调度：启动顺序和策略遵循提交顺序，并发安全的函数体最多重叠执行 `maxParallelSubCalls` 个。调用会重新进入完整且受守卫保护的工具流水线，并将每个嵌套执行关联到此外层结果。

<a id="deepseek-aidsh-plan-mode"></a>

## `@deepseek-ai/dsh-plan-mode`

### `exit_plan_mode`

仅在规划模式下使用。提交计划供用户评审，并在获批后退出规划模式。用户可以批准（从你的下一步骤起执行计划），也可以要求继续规划；其反馈会通过工具结果返回，请修改后再次提交。

```json
{
  "type": "object",
  "properties": {
    "plan": {
      "type": "string",
      "description": "The complete plan, as markdown, starting with a # heading that names it."
    }
  },
  "required": [
    "plan"
  ]
}
```

来源：[`packages/plan/plan-mode/src/index.ts`](../packages/plan/plan-mode/src/index.ts)

规划未激活时，exit_plan_mode 仍保留在面向模型的 schema 中，这样状态转换不会在规划策略变更之外额外造成工具目录变动。其执行路径会拒绝规划模式之外的调用；在规划模式下，它通过用户交互 seam 提交计划（批准／根据反馈继续规划），批准后会在步骤边界记录规划模式已停用。

<a id="deepseek-aidsh-tool-bash"></a>

## `@deepseek-ai/dsh-tool-bash`

### `bash`

执行 bash 命令（`bash -c`）并返回 stdout/stderr。每次调用都在新 shell 中运行；请传入 `workdir`，不要使用 `cd`。托管的 `$DSH_*` 变量公开当前 harness 环境信息。较长的输出会截断，只保留尾部；如可用，完整输出会保存到文件并报告其路径。请在参数中先提供 `description`，再提供 `command`。在任何删除或移动之前，请确认解析后的绝对目标路径正是预期路径；绝不要对未经检查的计算路径执行此类操作。未设置的变量会展开为空字符串，因此请用 `${VAR:?}` 保护此类路径中的变量。命令可能在文件沙箱中运行；被阻止的文件操作报告为 `[sandbox: file access denied under <mode> mode]`，这是策略拒绝：请勿换一种方式重试。

```json
{
  "type": "object",
  "properties": {
    "description": {
      "type": "string",
      "description": "Clear, concise description of what this command does in active voice, 5-10 words (shown in the UI). Examples: \"ls\" → \"List files in current directory\"; \"git status\" → \"Show working tree status\"; \"npm install\" → \"Install package dependencies\"."
    },
    "command": {
      "type": "string",
      "description": "The bash command to execute."
    },
    "timeoutMs": {
      "type": "number",
      "description": "Timeout in milliseconds. The executor applies its configured default and cap; on expiry the command moves to the background as a job instead of being killed."
    },
    "workdir": {
      "type": "string",
      "description": "Working directory for this command. Defaults to the session workspace; a relative path is resolved against it."
    },
    "run_in_background": {
      "type": "boolean",
      "description": "Run in the background and return a job id immediately (collect with job_output, stop with job_kill). No timeout applies."
    }
  },
  "required": [
    "description",
    "command"
  ]
}
```

来源：[`packages/shell/tool-bash/src/index.ts`](../packages/shell/tool-bash/src/index.ts)

bash 工具是 bash 执行器 seam 面向模型的消费方。组合中有 job 注册表时，每次调用一启动就注册到通用 `ctx.jobs` 运行时，并通过 `job_*` 工具（来自 `@deepseek-ai/dsh-tool-jobs`）收集／停止；没有注册表或 `enableRunInBackground: false` 时，工具注册不带 `run_in_background` 参数的纯前台 schema。

<a id="deepseek-aidsh-tool-present"></a>

## `@deepseek-ai/dsh-tool-present`

### `present`

将已有文件声明为交付给用户的最终交付物。当用户需要独立文件时使用，尤其是 Office 文档、电子表格和演示文稿；如果最终回复已经足够，优先使用最终回复。用户打开的是当前文件；不复制其内容。

```json
{
  "type": "object",
  "properties": {
    "files": {
      "type": "array",
      "description": "Usually the 1-2 most important deliverables; at most 4 per call.",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "path": {
            "type": "string",
            "description": "Path of an existing regular file. Relative paths use the Session working directory."
          },
          "description": {
            "type": "string",
            "description": "Brief description for the user."
          }
        },
        "required": [
          "path"
        ]
      }
    }
  },
  "required": [
    "files"
  ]
}
```

来源： [`packages/deliverables/tool-present/src/index.ts`](../packages/deliverables/tool-present/src/index.ts)

交付归调用方 Session 所有；Web ui-deliverables 提供源文件打开与卡片。

<a id="deepseek-aidsh-tool-pwsh"></a>

## `@deepseek-ai/dsh-tool-pwsh`

### `pwsh`

执行 PowerShell 命令（`pwsh -Command`）并返回 stdout/stderr。每次调用都在新的 pwsh 进程中运行；请传入 `workdir`，不要使用 `cd`。路径采用 Windows 原生形式（`C:\...`）；使用 `$env:NAME` 读取环境变量。托管的 `$env:DSH_*` 变量公开当前 harness 环境信息。较长的输出会截断，只保留尾部；如可用，完整输出会保存到文件并报告其路径。在 Windows 上，被强制终止的命令会以 `[exit code: 1]` 结算且不带信号标记，请将其视为中断，而不是命令失败。请在参数中先提供 `description`，再提供 `command`。在任何删除或移动之前，请确认解析后的绝对目标路径正是预期路径；绝不要对未经检查的计算路径执行此类操作。不要给 `$HOME` 等自动变量赋值；变量名不区分大小写，因此 `$home` 就是同一个只读变量。命令可能在文件沙箱中运行；被阻止的文件操作报告为 `[sandbox: file access denied under <mode> mode]`，这是策略拒绝：请勿换一种方式重试。

```json
{
  "type": "object",
  "properties": {
    "description": {
      "type": "string",
      "description": "Clear, concise description of what this command does in active voice, 5-10 words (shown in the UI). Examples: \"ls\" → \"List files in current directory\"; \"git status\" → \"Show working tree status\"; \"Get-Process\" → \"List running processes\"."
    },
    "command": {
      "type": "string",
      "description": "The PowerShell command to execute."
    },
    "timeoutMs": {
      "type": "number",
      "description": "Timeout in milliseconds. The executor applies its configured default and cap; on expiry the command moves to the background as a job instead of being killed."
    },
    "workdir": {
      "type": "string",
      "description": "Working directory for this command. Defaults to the session workspace; a relative path is resolved against it."
    },
    "run_in_background": {
      "type": "boolean",
      "description": "Run in the background and return a job id immediately (collect with job_output, stop with job_kill). No timeout applies."
    }
  },
  "required": [
    "description",
    "command"
  ]
}
```

来源：[`packages/shell/tool-pwsh/src/index.ts`](../packages/shell/tool-pwsh/src/index.ts)

pwsh 工具是 Windows 组合中 bash 执行器 seam 的 PowerShell 方言消费方（由 `@deepseek-ai/dsh-pwsh-local` 等 PowerShell 执行器为 `ctx.shell` 提供后端）；除沙箱接口外，它逐项对应 bash 工具调用。使用 `run_in_background` 的运行会注册到通用 `ctx.jobs` 运行时，并通过 `job_*` 工具收集／停止；托管的 `DSH_*` 环境来自 `@deepseek-ai/dsh-shell-env`。每次调用都在新进程中运行，不使用持久 PTY 会话。路径采用原生 `C:\...` 形式，变量采用 `$env:NAME`。

<a id="deepseek-aidsh-tool-cordis"></a>

## `@deepseek-ai/dsh-tool-cordis`

### `cordis_inspect_list`

列出 Host 当前已知的所有 Cordis Inspect Provider，包括本地 Host Provider 和 Client 同步的最新清单。每项包含平台、用途、只读方法以及输入输出 schema。编写或配置插件前先调用本工具，再从结果选择 cordis_inspect_query 的 provider 和方法。不要猜测名称，也不要把 Inspect 方法当作插件代码可调用的业务 Service。

```json
{
  "type": "object",
  "properties": {}
}
```

来源： [`packages/extensions/tool-cordis/src/index.ts`](../packages/extensions/tool-cordis/src/index.ts)

### `cordis_inspect_query`

执行 Inspect Provider 声明的只读查询。platform、provider 和 method 必须来自 cordis_inspect_list，input 必须符合该方法的 schema。编写插件代码前，用本工具读取准确的 Service 方法、Event 模式、插件 Config schema、Tool schema、主题 token，或实时 Slot 树与 props。Host 查询在本地运行。Client 查询在配置的超时内等待页面首个有效响应；否则返回 Client 错误，或提示重新连接后重试。本工具不能调用业务 Service 方法或修改运行时。

```json
{
  "type": "object",
  "properties": {
    "platform": {
      "type": "string",
      "description": "Runtime platform that owns the Provider.",
      "enum": [
        "host",
        "client"
      ]
    },
    "provider": {
      "type": "string",
      "description": "Exact Provider ID returned by cordis_inspect_list."
    },
    "method": {
      "type": "string",
      "description": "Exact method name declared by the Provider manifest."
    },
    "input": {
      "description": "Optional query input; it must satisfy the method input schema."
    }
  },
  "required": [
    "platform",
    "provider",
    "method"
  ]
}
```

来源： [`packages/extensions/tool-cordis/src/index.ts`](../packages/extensions/tool-cordis/src/index.ts)

创造模式提供两个只读运行时检查工具。Cordis host runner 提供检查注册表；Client 查询需要已连接页面。持久化变更编写为组合包，再通过 plugin_manager 安装。

<a id="deepseek-aidsh-tool-bash-persistent"></a>

## `@deepseek-ai/dsh-tool-bash-persistent`

### `bash`

在持久 bash shell 中运行命令。包括当前目录和已导出环境变量在内的状态会在此 agent 的多次调用之间保留。

```json
{
  "type": "object",
  "properties": {
    "command": {
      "type": "string",
      "description": "The bash command to run. Relative path is preferred in the command."
    }
  },
  "required": [
    "command"
  ]
}
```

来源：[`packages/shell/tool-bash-persistent/src/index.ts`](../packages/shell/tool-bash-persistent/src/index.ts)

一个按所有者隔离的持久 bash 工具；部署组合提供 PTY 后端，并可覆盖面向模型的环境描述。

<a id="deepseek-aidsh-tool-pwsh-persistent"></a>

## `@deepseek-ai/dsh-tool-pwsh-persistent`

### `pwsh`

在持久 PowerShell shell 中运行命令。包括当前目录和已导出环境变量在内的状态会在此 agent 的多次调用之间保留。

```json
{
  "type": "object",
  "properties": {
    "command": {
      "type": "string",
      "description": "The PowerShell command to run. Relative path is preferred in the command."
    }
  },
  "required": [
    "command"
  ]
}
```

来源：[`packages/shell/tool-pwsh-persistent/src/index.ts`](../packages/shell/tool-pwsh-persistent/src/index.ts)

一个按所有者隔离的持久 pwsh 工具，持久 bash 工具的 Windows 对应物；部署组合提供 pwsh 方言的 PTY 后端，并可覆盖面向模型的环境描述。

<a id="deepseek-aidsh-tool-str-replace-editor"></a>

## `@deepseek-ai/dsh-tool-str-replace-editor`

### `str_replace_editor`

用于查看、创建和编辑文件的自定义编辑工具：

* 状态会在命令调用以及与用户的讨论之间持久保留
* 如果 `path` 是文件，`view` 会显示应用 `cat -n` 后的结果。如果 `path` 是目录，`view` 会列出最多向下 2 层的非隐藏文件和目录
* 如果指定的 `create` 命令目标 `path` 已作为文件存在，则不能使用该命令
* 如果 `command` 产生较长输出，输出会被截断并标记为 `<response clipped>`
* 当前命令不使用某个参数时，值为 `null` 的占位参数视为未提供。必填参数仍须提供值；删除匹配内容时应省略 `str_replace.new_str`，而不是将其设为 `null`

使用 `str_replace` 命令时请注意：

* `old_str` 参数应与原文件中一行或多行连续内容**完全**匹配。请留意空白字符！
* 如果 `old_str` 参数在文件中不唯一，则不会执行替换。请确保在 `old_str` 中包含足够的上下文，使其唯一
* `new_str` 参数应包含用于替换 `old_str` 的已编辑行

```json
{
  "type": "object",
  "properties": {
    "command": {
      "type": "string",
      "description": "The commands to run. Allowed options are: `view`, `create`, `str_replace`, `insert`.",
      "enum": [
        "view",
        "create",
        "str_replace",
        "insert"
      ]
    },
    "path": {
      "type": "string",
      "description": "Absolute path to file or directory, e.g. `/repo/file.py` or `/repo`."
    },
    "file_text": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "description": "Required string parameter of `create` command, with the content of the file to be created. A null placeholder is treated as omitted by commands that do not use this parameter."
    },
    "insert_line": {
      "oneOf": [
        {
          "type": "integer"
        },
        {
          "type": "null"
        }
      ],
      "description": "Required integer parameter of `insert` command. The `new_str` will be inserted AFTER the line `insert_line` of `path`. A null placeholder is treated as omitted by commands that do not use this parameter."
    },
    "new_str": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "description": "Optional string parameter of `str_replace` command containing the new string (if omitted, no string will be added). Required string parameter of `insert` command containing the string to insert. A null placeholder is accepted only by commands that do not use this parameter."
    },
    "old_str": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "description": "Required string parameter of `str_replace` command containing the string in `path` to replace. A null placeholder is treated as omitted by commands that do not use this parameter."
    },
    "view_range": {
      "oneOf": [
        {
          "type": "array",
          "items": {
            "type": "integer"
          }
        },
        {
          "type": "null"
        }
      ],
      "description": "Optional parameter of `view` command when `path` points to a file. If omitted or null, the full file is shown. If provided, the file will be shown in the indicated line number range, e.g. [11, 12] will show lines 11 and 12. Indexing at 1 to start. Setting `[start_line, -1]` shows all lines from `start_line` to the end of the file."
    }
  },
  "required": [
    "command",
    "path"
  ]
}
```

来源：[`packages/fs/tool-str-replace-editor/src/index.ts`](../packages/fs/tool-str-replace-editor/src/index.ts)

基于文件系统 seam 的独立查看／创建／唯一字面量替换／按行插入工具；可与任何 shell 或终端接口组合。

<a id="deepseek-aidsh-tool-fs"></a>

## `@deepseek-ai/dsh-tool-fs`

### `edit`

通过替换字面量文本来编辑现有 UTF-8 文本文件。

```json
{
  "type": "object",
  "properties": {
    "file_path": {
      "type": "string",
      "description": "Path to edit, resolved by the filesystem backend. Provide `file_path` before `old_string` and `new_string` in the arguments."
    },
    "old_string": {
      "type": "string",
      "description": "Literal text to replace."
    },
    "new_string": {
      "type": "string",
      "description": "Literal replacement text. Use an empty string to delete the match."
    },
    "replace_all": {
      "type": "boolean",
      "description": "Replace all matches. Defaults to false; when false, old_string must appear exactly once."
    }
  },
  "required": [
    "file_path",
    "old_string",
    "new_string"
  ]
}
```

来源：[`packages/fs/tool-fs/src/index.ts`](../packages/fs/tool-fs/src/index.ts)

### `read`

读取 UTF-8 文本文件，并返回带行号的内容。

```json
{
  "type": "object",
  "properties": {
    "file_path": {
      "type": "string",
      "description": "Path to read, resolved by the filesystem backend."
    },
    "offset": {
      "type": "number",
      "description": "1-based first line to return. Defaults to 1."
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of lines to return. Defaults to 2000."
    }
  },
  "required": [
    "file_path"
  ]
}
```

来源：[`packages/fs/tool-fs/src/index.ts`](../packages/fs/tool-fs/src/index.ts)

### `read_image`

读取 PNG/JPEG/WebP/GIF 文件并返回图像本身。大图会自动缩小；不要为了查看图片而安装图片库或创建缩略图。

```json
{
  "type": "object",
  "properties": {
    "file_path": {
      "type": "string",
      "description": "Path to the image file, resolved by the filesystem backend."
    }
  },
  "required": [
    "file_path"
  ]
}
```

来源：[`packages/fs/tool-fs/src/index.ts`](../packages/fs/tool-fs/src/index.ts)

### `write`

创建或完全替换 UTF-8 文本文件。

```json
{
  "type": "object",
  "properties": {
    "file_path": {
      "type": "string",
      "description": "Path to write, resolved by the filesystem backend. Provide `file_path` before `content` in the arguments."
    },
    "content": {
      "type": "string",
      "description": "Full UTF-8 text content to write."
    }
  },
  "required": [
    "file_path",
    "content"
  ]
}
```

来源：[`packages/fs/tool-fs/src/index.ts`](../packages/fs/tool-fs/src/index.ts)

先读后写／编辑策略由 `@deepseek-ai/dsh-fs-observation-policy` 添加；它是一个 `fs/*` 事件门禁插件，不会改变 schema。加载这些工具的部署按预期也应加载该插件。没有 `ctx.attachments` 时图片工具不会注册；其 schema 与路由无关，执行时除非确切路由的模型声明图片输入，否则拒绝。

<a id="deepseek-aidsh-tool-fs-search"></a>

## `@deepseek-ai/dsh-tool-fs-search`

### `glob`

查找路径匹配 glob 模式的文件（不含目录），包括隐藏文件和被忽略的文件。最多按修改时间顺序返回 100 条路径；更大的结果会从顶层条目中抽样，并报告完整列表的保存位置。

```json
{
  "type": "object",
  "properties": {
    "pattern": {
      "type": "string",
      "description": "Glob pattern to match file paths against (e.g. \"**/*.ts\", \"src/**/*.test.js\"). A pattern with no \"/\" matches the basename at any depth, so \"*\" and \"*.ts\" both search the whole tree; include a separator to anchor the depth."
    },
    "path": {
      "type": "string",
      "description": "Directory to search in. Defaults to the session workspace; a relative path resolves against it."
    }
  },
  "required": [
    "pattern"
  ]
}
```

来源：[`packages/fs/tool-fs-search/src/index.ts`](../packages/fs/tool-fs-search/src/index.ts)

### `grep`

使用 ripgrep 正则表达式搜索文件内容。返回带行号的匹配行，并按文件分组。最多返回 250 条匹配；更大的结果会报告完整匹配列表的保存位置。

```json
{
  "type": "object",
  "properties": {
    "pattern": {
      "type": "string",
      "description": "Regular expression to search for (ripgrep syntax)."
    },
    "path": {
      "type": "string",
      "description": "File or directory to search. Defaults to the session workspace; a relative path resolves against it."
    },
    "include": {
      "type": "string",
      "description": "One glob filter for which files to search (e.g. \"*.ts\", \"*.{js,jsx}\"). Not a list; negation is not supported."
    }
  },
  "required": [
    "pattern"
  ]
}
```

来源：[`packages/fs/tool-fs-search/src/index.ts`](../packages/fs/tool-fs-search/src/index.ts)

glob 和 grep 是无条件可用的发现工具，通过 ctx.subprocess spawn 随包提供的 ripgrep 二进制文件（`@vscode/ripgrep`），并作为普通前台调用运行，绝不作为后台任务；无需在宿主机安装 `rg`，也不经过 shell 层。本目录使用 `sampleOverCapGlobResults: true`；部署必须显式选择该行为。结果超过上限时，会通过可选的 ctx.spillStore 后端保存完整的格式化列表；在共置部署中，如果后端公开本地路径，返回的定位信息可供后续读取／搜索。

<a id="deepseek-aidsh-tool-terminal"></a>

## `@deepseek-ai/dsh-tool-terminal`

### `terminal_close`

关闭一个持久终端，并等待其捕获且所有的进程树完全退出。

```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Terminal session id."
    }
  },
  "required": [
    "sessionId"
  ]
}
```

来源：[`packages/terminal/tool-terminal/src/index.ts`](../packages/terminal/tool-terminal/src/index.ts)

### `terminal_list`

列出当前 agent 所有的持久终端会话。

```json
{
  "type": "object",
  "properties": {}
}
```

来源：[`packages/terminal/tool-terminal/src/index.ts`](../packages/terminal/tool-terminal/src/index.ts)

### `terminal_open`

通过已注册的后端类型创建按所有者隔离的持久终端会话。需要在多次工具调用之间保留 shell 或 REPL 状态时，请使用此工具。

```json
{
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "description": "Registered terminal backend type, usually \"shell\"."
    },
    "name": {
      "type": "string",
      "description": "Optional owner-local display name such as \"main\" or \"gdb\"."
    },
    "cwd": {
      "type": "string",
      "description": "Initial working directory. Defaults to the deployment workspace root."
    }
  },
  "required": [
    "type"
  ]
}
```

来源：[`packages/terminal/tool-terminal/src/index.ts`](../packages/terminal/tool-terminal/src/index.ts)

### `terminal_read`

从持久终端读取一页有界的保留输出，不发送输入。

```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Terminal session id."
    },
    "offset": {
      "type": "number",
      "description": "Newest-relative line offset (default 0)."
    },
    "count": {
      "type": "number",
      "description": "Requested line count (default 500; backend caps apply)."
    }
  },
  "required": [
    "sessionId"
  ]
}
```

来源：[`packages/terminal/tool-terminal/src/index.ts`](../packages/terminal/tool-terminal/src/index.ts)

### `terminal_send`

向持久终端发送文本。默认会提交 Enter，并等待提示符、stdin 等待、输出静默、超时或会话退出。后台模式会返回供 job_output／job_kill 使用的 job id。

```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Terminal session id returned by terminal_open or terminal_list."
    },
    "text": {
      "type": "string",
      "description": "UTF-8 text to write to the terminal."
    },
    "submit": {
      "type": "boolean",
      "description": "Submit Enter after text (default true). Set false for control characters or incomplete REPL input."
    },
    "run_in_background": {
      "type": "boolean",
      "description": "Return a job id immediately; collect with job_output or stop with job_kill."
    }
  },
  "required": [
    "sessionId",
    "text"
  ]
}
```

来源：[`packages/terminal/tool-terminal/src/index.ts`](../packages/terminal/tool-terminal/src/index.ts)

### `terminal_signal`

向持久终端当前的前台进程组发送允许的信号。

```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Terminal session id."
    },
    "signal": {
      "type": "string",
      "description": "Signal to deliver. Shell-targeted SIGKILL is rejected; use terminal_close.",
      "enum": [
        "SIGINT",
        "SIGTERM",
        "SIGKILL",
        "SIGTSTP",
        "SIGHUP"
      ]
    }
  },
  "required": [
    "sessionId",
    "signal"
  ]
}
```

来源：[`packages/terminal/tool-terminal/src/index.ts`](../packages/terminal/tool-terminal/src/index.ts)

这 6 个终端工具需要选择启用，用于补充一次性 bash／文件系统工具。`terminal_send(run_in_background: true)` 会注册到 `ctx.jobs`；schema 不包含 TUI、具名按键序列、BEL、调整尺寸、自动启动和跨 agent 共享。

<a id="deepseek-aidsh-tool-goal"></a>

## `@deepseek-ai/dsh-tool-goal`

### `create_goal`

创建一个持久化目标，使当前会话跨自动延续 Round 持续工作。当直接人类请求是长期目标时使用，即使用户没有说「目标」；不要用于单轮工作。

```json
{
  "type": "object",
  "properties": {
    "objective": {
      "type": "string",
      "description": "The concrete completion objective inferred from the direct human request."
    },
    "max_goal_rounds": {
      "type": "number",
      "description": "Optional positive safe-integer limit on automatic continuation rounds."
    }
  },
  "required": [
    "objective"
  ]
}
```

来源：[`packages/goal/tool-goal/src/index.ts`](../packages/goal/tool-goal/src/index.ts)

### `get_goal`

读取当前会话目标，包括 update_goal 所需的 id 和 revision。

```json
{
  "type": "object",
  "properties": {}
}
```

来源：[`packages/goal/tool-goal/src/index.ts`](../packages/goal/tool-goal/src/index.ts)

### `update_goal`

更新当前目标。

```json
{
  "type": "object",
  "properties": {
    "goal_id": {
      "type": "string",
      "description": "Exact id returned by get_goal."
    },
    "revision": {
      "type": "number",
      "description": "Exact positive revision returned by get_goal."
    },
    "action": {
      "type": "string",
      "description": "edit, pause, and resume require a direct top-level human request. complete and blocked are also allowed during an automatic continuation of this goal; blocked is rejected before the configured minimum round count.",
      "enum": [
        "edit",
        "pause",
        "resume",
        "complete",
        "blocked"
      ]
    },
    "objective": {
      "type": "string",
      "description": "Replacement objective; valid only with action edit."
    },
    "max_goal_rounds": {
      "type": "number",
      "description": "Replacement cap; valid only with action edit."
    },
    "blocked_reason": {
      "type": "string",
      "description": "Required only with action blocked: the concrete condition that persisted across rounds and blocks progress."
    }
  },
  "required": [
    "goal_id",
    "revision",
    "action"
  ]
}
```

来源：[`packages/goal/tool-goal/src/index.ts`](../packages/goal/tool-goal/src/index.ts)

create、edit、pause 和 resume 要求直接来自人类的根权限；complete 和 blocked 也接受确切的当前 Goal Round。blocked 的默认下限是 3 个获准的 Round。

<a id="deepseek-aidsh-tool-schedule"></a>

## `@deepseek-ai/dsh-tool-schedule`

### `schedule_create`

在当前会话中创建一条提醒，到期时投递 prompt。请恰好提供一个时间参数：after_seconds、at、every_seconds、daily、weekly 或 cron。时区中不存在的本地时间会被跳过；重复出现的本地时间只在较早的时刻触发一次。停机后，重复提醒只投递最近错过的一次。崩溃后可能重复投递。

```json
{
  "type": "object",
  "properties": {
    "prompt": {
      "type": "string",
      "description": "Reminder content to present when the target becomes due."
    },
    "title": {
      "type": "string",
      "description": "Task name of at most 120 characters, shown on the task card and in task lists."
    },
    "after_seconds": {
      "type": "number",
      "description": "Delay in whole seconds."
    },
    "every_seconds": {
      "type": "number",
      "description": "Fixed-rate interval in whole seconds, at least 60, aligned to the creation time; changing it with schedule_update re-aligns it to the save time."
    },
    "daily": {
      "type": "object",
      "description": "Every day at a local time.",
      "additionalProperties": false,
      "properties": {
        "time": {
          "type": "string",
          "description": "HH:mm:ss with optional 1-3 fractional digits, for example 23:00:00."
        },
        "time_zone": {
          "type": "string",
          "description": "UTC or IANA Area/Location, for example Asia/Shanghai."
        }
      },
      "required": [
        "time",
        "time_zone"
      ]
    },
    "weekly": {
      "type": "object",
      "description": "On the given weekdays at a local time.",
      "additionalProperties": false,
      "properties": {
        "time": {
          "type": "string",
          "description": "HH:mm:ss with optional 1-3 fractional digits, for example 09:00:00."
        },
        "time_zone": {
          "type": "string",
          "description": "UTC or IANA Area/Location, for example Asia/Shanghai."
        },
        "weekdays": {
          "type": "array",
          "description": "ISO weekdays, Monday 1 through Sunday 7, without repetitions.",
          "items": {
            "type": "integer"
          }
        }
      },
      "required": [
        "time",
        "time_zone",
        "weekdays"
      ]
    },
    "cron": {
      "type": "object",
      "description": "Five-field Vixie cron expression in a time zone.",
      "additionalProperties": false,
      "properties": {
        "expression": {
          "type": "string",
          "description": "minute hour day-of-month month day-of-week, for example \"*/15 9-17 * * 1-5\". When both day fields are restricted, a date matches if either one matches."
        },
        "time_zone": {
          "type": "string",
          "description": "UTC or IANA Area/Location, for example Asia/Shanghai."
        }
      },
      "required": [
        "expression",
        "time_zone"
      ]
    },
    "at": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "date": {
              "type": "string"
            },
            "time": {
              "type": "string"
            },
            "time_zone": {
              "type": "string"
            }
          },
          "required": [
            "date",
            "time",
            "time_zone"
          ]
        }
      ],
      "description": "Absolute target: an RFC 3339 date-time with offset, or a local date, time, and IANA time_zone."
    }
  },
  "required": [
    "prompt",
    "title"
  ]
}
```

来源：[`packages/schedule/tool-schedule/src/index.ts`](../packages/schedule/tool-schedule/src/index.ts)

### `schedule_delete`

删除当前会话中的一条提醒，活动或已结束的均可。删除不会撤回已经入队的提醒消息。

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Exact schedule id."
    }
  },
  "required": [
    "id"
  ]
}
```

来源：[`packages/schedule/tool-schedule/src/index.ts`](../packages/schedule/tool-schedule/src/index.ts)

### `schedule_list`

列出当前会话中的活动提醒。

```json
{
  "type": "object",
  "properties": {}
}
```

来源：[`packages/schedule/tool-schedule/src/index.ts`](../packages/schedule/tool-schedule/src/index.ts)

### `schedule_update`

原地修改一条提醒并保留其 id。提供新的 title、prompt，或至多一个时间参数；未提供的字段保持原值。需要相对延迟时请新建一条提醒。

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Schedule id returned by schedule_list."
    },
    "title": {
      "type": "string",
      "description": "New task name of at most 120 characters."
    },
    "prompt": {
      "type": "string",
      "description": "New reminder content."
    },
    "every_seconds": {
      "type": "number",
      "description": "Fixed-rate interval in whole seconds, at least 60, aligned to the creation time; changing it with schedule_update re-aligns it to the save time."
    },
    "daily": {
      "type": "object",
      "description": "Every day at a local time.",
      "additionalProperties": false,
      "properties": {
        "time": {
          "type": "string",
          "description": "HH:mm:ss with optional 1-3 fractional digits, for example 23:00:00."
        },
        "time_zone": {
          "type": "string",
          "description": "UTC or IANA Area/Location, for example Asia/Shanghai."
        }
      },
      "required": [
        "time",
        "time_zone"
      ]
    },
    "weekly": {
      "type": "object",
      "description": "On the given weekdays at a local time.",
      "additionalProperties": false,
      "properties": {
        "time": {
          "type": "string",
          "description": "HH:mm:ss with optional 1-3 fractional digits, for example 09:00:00."
        },
        "time_zone": {
          "type": "string",
          "description": "UTC or IANA Area/Location, for example Asia/Shanghai."
        },
        "weekdays": {
          "type": "array",
          "description": "ISO weekdays, Monday 1 through Sunday 7, without repetitions.",
          "items": {
            "type": "integer"
          }
        }
      },
      "required": [
        "time",
        "time_zone",
        "weekdays"
      ]
    },
    "cron": {
      "type": "object",
      "description": "Five-field Vixie cron expression in a time zone.",
      "additionalProperties": false,
      "properties": {
        "expression": {
          "type": "string",
          "description": "minute hour day-of-month month day-of-week, for example \"*/15 9-17 * * 1-5\". When both day fields are restricted, a date matches if either one matches."
        },
        "time_zone": {
          "type": "string",
          "description": "UTC or IANA Area/Location, for example Asia/Shanghai."
        }
      },
      "required": [
        "expression",
        "time_zone"
      ]
    },
    "at": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "date": {
              "type": "string"
            },
            "time": {
              "type": "string"
            },
            "time_zone": {
              "type": "string"
            }
          },
          "required": [
            "date",
            "time",
            "time_zone"
          ]
        }
      ],
      "description": "Absolute target: an RFC 3339 date-time with offset, or a local date, time, and IANA time_zone."
    }
  },
  "required": [
    "id"
  ]
}
```

Source: [`packages/schedule/tool-schedule/src/index.ts`](../packages/schedule/tool-schedule/src/index.ts)

preset 或 Agent scope 挂载本包；由 preset 决定哪些 agent 获得这四个管理工具。每次调用都作用于调用方 Agent 的 Session。接受 after_seconds、显式绝对 at、有界固定速率 every_seconds、带显式 IANA 时区的每日与每周本地时间，以及作为五字段表达式的 cron。管理使用宿主 storage domain；到期消息会恢复原 Session。

<a id="deepseek-aidsh-tool-lsp"></a>

## `@deepseek-ai/dsh-tool-lsp`

### `lsp`

查询语言服务器，以精确导航代码。operation 可取 goToDefinition、findReferences、goToImplementation 或 hover。line 和 character 是从 1 开始的 UTF-16 光标坐标。findReferences 包含声明。

```json
{
  "type": "object",
  "properties": {
    "operation": {
      "type": "string",
      "description": "goToDefinition, findReferences, goToImplementation, or hover.",
      "enum": [
        "goToDefinition",
        "findReferences",
        "goToImplementation",
        "hover"
      ]
    },
    "file_path": {
      "type": "string",
      "description": "The source file to query, relative to the workspace or absolute."
    },
    "line": {
      "type": "number",
      "description": "One-based line of the cursor."
    },
    "character": {
      "type": "number",
      "description": "One-based UTF-16 column of the cursor."
    }
  },
  "required": [
    "operation",
    "file_path",
    "line",
    "character"
  ]
}
```

来源：[`packages/lsp/tool-lsp/src/index.ts`](../packages/lsp/tool-lsp/src/index.ts)

lsp 工具将提供方选择和语言服务器子进程置于 ctx.lsp 之后，因此其模型可见 schema 在更换提供方时保持稳定。运行时要求已注册提供方，例如 `@deepseek-ai/dsh-lsp-stdio`；如果没有提供方，查询会返回结构化 `LSP_UNAVAILABLE` 错误，而不会改变 schema。

<a id="deepseek-aidsh-tool-ralph"></a>

## `@deepseek-ai/dsh-tool-ralph`

### `ralph`

围绕一个不可变目标运行使用全新 agent 的前台 Ralph 循环。仅当直接人类明确要求 Ralph 或使用全新 agent 迭代时使用。每个 Round 都会启动一个全新子级，该子级看不到父级对话或先前子会话；共享工作区充当长期记忆，Round 之间只传递有界的结构化报告。当工作进程报告完成、报告具体阻塞项或达到 Round 上限时，调用返回。普通的长期同会话工作应使用 goal 工具。

```json
{
  "type": "object",
  "properties": {
    "objective": {
      "type": "string",
      "description": "The immutable completion objective for every fresh Ralph round."
    },
    "maxRounds": {
      "type": "number",
      "description": "Optional positive safe-integer round cap, bounded by the deployment ceiling."
    }
  },
  "required": [
    "objective"
  ]
}
```

来源：[`packages/workflow/tool-ralph/src/index.ts`](../packages/workflow/tool-ralph/src/index.ts)

固定的前台工作流会在每个 Round 启动一个全新的结构化子级；模型只能选择不可变目标和可选的 Round 上限。

<a id="deepseek-aidsh-tool-skill"></a>

## `@deepseek-ai/dsh-tool-skill`

### `skill`

加载某项 skill（技能）的完整说明。在执行点名某项 skill 或与会话 skill 目录中某项 skill 明确匹配的任务前，请调用此工具。

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "The exact skill name from the available skills list."
    }
  },
  "required": [
    "name"
  ]
}
```

来源：[`packages/skill/tool-skill/src/index.ts`](../packages/skill/tool-skill/src/index.ts)

<a id="deepseek-aidsh-tool-session-query"></a>

## `@deepseek-ai/dsh-tool-session-query`

### `session_event_read`

从一个已获授权的会话中读取一个完整且未删节的事件，以及可选的相邻原始事件概述。

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "Target session id. Omit for the current session."
    },
    "seq": {
      "type": "integer",
      "description": "Target event sequence number."
    },
    "before": {
      "type": "integer",
      "description": "Number of preceding raw events to summarize. Omit for none."
    },
    "after": {
      "type": "integer",
      "description": "Number of following raw events to summarize. Omit for none."
    }
  },
  "required": [
    "seq"
  ]
}
```

来源：[`packages/session-query/tool-session-query/src/index.ts`](../packages/session-query/tool-session-query/src/index.ts)

### `session_event_search`

在一个已获授权的会话中搜索先前事件；如果搜索当前会话，则排除执行此次调用的步骤。

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "Target session id. Omit for the current session."
    },
    "query": {
      "type": "string",
      "description": "Literal full-text query over the target session."
    },
    "seq_from": {
      "type": "integer",
      "description": "Inclusive event sequence lower bound."
    },
    "seq_to": {
      "type": "integer",
      "description": "Inclusive event sequence upper bound."
    },
    "time_from": {
      "type": "string",
      "description": "Inclusive timezone-qualified ISO 8601 event-time lower bound."
    },
    "time_to": {
      "type": "string",
      "description": "Inclusive timezone-qualified ISO 8601 event-time upper bound."
    },
    "event_types": {
      "type": "array",
      "description": "Event types to include.",
      "items": {
        "type": "string"
      }
    },
    "surfaces": {
      "type": "array",
      "description": "Event surfaces to include.",
      "items": {
        "type": "string",
        "enum": [
          "current",
          "shadowed",
          "log-only"
        ]
      }
    }
  },
  "required": [
    "query"
  ]
}
```

来源：[`packages/session-query/tool-session-query/src/index.ts`](../packages/session-query/tool-session-query/src/index.ts)

### `session_event_trace`

读取已获授权会话中某个事件的所有直接替换关系，以及该事件与其引用的来源事件之间的关系。

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "Target session id. Omit for the current session."
    },
    "seq": {
      "type": "integer",
      "description": "Target event sequence number."
    }
  },
  "required": [
    "seq"
  ]
}
```

来源：[`packages/session-query/tool-session-query/src/index.ts`](../packages/session-query/tool-session-query/src/index.ts)

### `session_search`

搜索调用方工作区中的先前会话，并从每个会话返回匹配度最高的事件。

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Literal full-text query over prior session history."
    },
    "session_ids": {
      "type": "array",
      "description": "Optional session ids to include.",
      "items": {
        "type": "string"
      }
    },
    "created_at_from": {
      "type": "string",
      "description": "Inclusive timezone-qualified ISO 8601 creation-time lower bound."
    },
    "created_at_to": {
      "type": "string",
      "description": "Inclusive timezone-qualified ISO 8601 creation-time upper bound."
    },
    "parent_session_ids": {
      "type": "array",
      "description": "Optional direct parent session ids.",
      "items": {
        "type": "string"
      }
    },
    "include_root_sessions": {
      "type": "boolean",
      "description": "Include sessions with no parent in the parent filter."
    },
    "availability": {
      "type": "array",
      "description": "Require at least one selected source availability.",
      "items": {
        "type": "string",
        "enum": [
          "live",
          "persisted"
        ]
      }
    },
    "event_seq_from": {
      "type": "integer",
      "description": "Inclusive event sequence lower bound."
    },
    "event_seq_to": {
      "type": "integer",
      "description": "Inclusive event sequence upper bound."
    },
    "event_time_from": {
      "type": "string",
      "description": "Inclusive timezone-qualified ISO 8601 event-time lower bound."
    },
    "event_time_to": {
      "type": "string",
      "description": "Inclusive timezone-qualified ISO 8601 event-time upper bound."
    },
    "event_types": {
      "type": "array",
      "description": "Event types to include.",
      "items": {
        "type": "string"
      }
    },
    "event_surfaces": {
      "type": "array",
      "description": "Event surfaces to include.",
      "items": {
        "type": "string",
        "enum": [
          "current",
          "shadowed",
          "log-only"
        ]
      }
    }
  },
  "required": [
    "query"
  ]
}
```

来源：[`packages/session-query/tool-session-query/src/index.ts`](../packages/session-query/tool-session-query/src/index.ts)

### `session_trace`

读取围绕一个会话的已授权会话谱系，包括完整可见的祖先和后代关系。

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "Target session id. Omit for the current session."
    }
  }
}
```

来源：[`packages/session-query/tool-session-query/src/index.ts`](../packages/session-query/tool-session-query/src/index.ts)

这 5 个只读工具会隐藏提供方游标，并根据不可变的调用 agent 会话为每个结果授权。该包需要选择启用；需要强制截止时间或限制行内输出的组合还会挂载通用超时或 spill 策略。

<a id="deepseek-aidsh-tool-subagent"></a>

## `@deepseek-ai/dsh-tool-subagent`

### `list_subagent_models`

发现 subagent 可用的 LLM 路由，不更改当前 Agent。无参数调用会列出已注册提供方；提供 `provider` 时会列出其公布的模型；同时提供 `provider` 和 `model` 时会检查该精确模型及其推理强度。目录条目只提供建议：adapter 可能接受未列出的模型 id。把返回的 id 用于委派工具的 `provider`、`model` 与 `reasoning_effort` 字段。

```json
{
  "type": "object",
  "properties": {
    "provider": {
      "type": "string",
      "description": "Registered LLM provider id. Omit to list providers."
    },
    "model": {
      "type": "string",
      "description": "Exact model id to inspect. Requires provider; omit to list that provider's advertised models."
    }
  }
}
```

来源：[`packages/subagent/tool-subagent/src/list-models.ts`](../packages/subagent/tool-subagent/src/list-models.ts)

### `subagent`

将一项自包含任务委派给 subagent（在自身上下文中工作的独立 agent），用它卸载聚焦且独立的工作，例如研究、限定范围的实现或分析，以免消耗当前对话的上下文。subagent 会返回结果，但不会返回中间步骤。此调用默认等待结果。

```json
{
  "type": "object",
  "properties": {
    "description": {
      "type": "string",
      "description": "A short (3-5 word) description of the delegated task, for display."
    },
    "prompt": {
      "type": "string",
      "description": "The complete, self-contained task for the subagent. It does not share this conversation's context, so include everything it needs."
    },
    "run_in_background": {
      "type": "boolean",
      "description": "Run as a background job and return its id (collect with job_output, stop with job_kill). Defaults to false."
    }
  },
  "required": [
    "description",
    "prompt"
  ]
}
```

来源：[`packages/subagent/tool-subagent/src/index.ts`](../packages/subagent/tool-subagent/src/index.ts)

注册的委派工具名称取决于加载时 `toolName` 配置（默认为 `subagent`）；上述默认 schema 关闭模型选择，而发现 schema 则展示为已启用 Session 中可用的固定配套工具。Web preset 会在每个新顶层 Session 创建时读取插件页偏好，并为其子 Session 保留该决定；`subagent_fork` 始终使用固定路由。每个实例通过 `modelSelectionSettings`、`backgroundMode` 与 `enableRunInBackground` 独立控制是否读取模型选择设置及其后台行为。

<a id="deepseek-aidsh-tool-subagent-control"></a>

## `@deepseek-ai/dsh-tool-subagent-control`

### `interrupt_agent`

请 subagent 停止当前工作。此调用不等待其停止即返回。之后可以用 send_message 继续与直接子级的对话。它启动的 subagent 会继续运行。

```json
{
  "type": "object",
  "properties": {
    "agent_id": {
      "type": "string",
      "description": "The id of an agent created under you: your direct child or a deeper descendant."
    }
  },
  "required": [
    "agent_id"
  ]
}
```

来源：[`packages/subagent/tool-subagent-control/src/index.ts`](../packages/subagent/tool-subagent-control/src/index.ts)

### `list_agents`

列出你启动的 subagent 及其 id、标签和状态。running 表示正在工作；inactive 表示当前未在工作。subagent 完成时你会收到通知，无需反复查看状态。使用 send_message 继续对话。

```json
{
  "type": "object",
  "properties": {
    "scope": {
      "type": "string",
      "description": "children (default) lists direct children, which accept send_message in any status. descendants lists the whole tree below you with each entry's parent session id and depth; entries deeper than 1 accept only interrupt_agent.",
      "enum": [
        "children",
        "descendants"
      ]
    }
  }
}
```

来源：[`packages/subagent/tool-subagent-control/src/list-agents.ts`](../packages/subagent/tool-subagent-control/src/list-agents.ts)

### `send_message`

向某个 agent 发送消息。工作中的 agent 会在下一个 step 收到消息；空闲的 agent 会以该消息开始新一轮。返回投递确认，而不是该 agent 的答案。

```json
{
  "type": "object",
  "properties": {
    "agent_id": {
      "type": "string",
      "description": "The agent id of your direct continuable child, or your direct parent when you are a resident continuable child."
    },
    "message": {
      "type": "string",
      "description": "The message to deliver to the agent."
    }
  },
  "required": [
    "agent_id",
    "message"
  ]
}
```

来源：[`packages/subagent/tool-subagent-control/src/index.ts`](../packages/subagent/tool-subagent-control/src/index.ts)

这些是控制可继续后台 subagent 的全局命名工具：绑定提供方的 `tool-subagent` 实例注册不同的委派工具；本包注册一次 `send_message` 和 `interrupt_agent`，另由 `list_agents` 通过单独加载的 `/list-agents` 插件提供，其目录行使用 sessionProjections 和实时 Agent 注册表。

<a id="deepseek-aidsh-tool-jobs"></a>

## `@deepseek-ai/dsh-tool-jobs`

### `job_kill`

请求取消正在运行的后台任务。

```json
{
  "type": "object",
  "properties": {
    "job_id": {
      "type": "string",
      "description": "Job id returned by the tool that started the background work."
    },
    "reason": {
      "type": "string",
      "description": "Optional short reason, recorded in the log and forwarded to the job."
    }
  },
  "required": [
    "job_id"
  ]
}
```

来源：[`packages/jobs/tool-jobs/src/index.ts`](../packages/jobs/tool-jobs/src/index.ts)

### `job_list`

列出你的后台任务（包括正在运行和已完成的任务）及其 id、种类和状态。

```json
{
  "type": "object",
  "properties": {}
}
```

来源：[`packages/jobs/tool-jobs/src/index.ts`](../packages/jobs/tool-jobs/src/index.ts)

### `job_output`

读取后台任务：流式任务返回自上次读取以来的输出，已完成的最终输出任务返回其结果。

```json
{
  "type": "object",
  "properties": {
    "job_id": {
      "type": "string",
      "description": "Job id returned by the tool that started the background work."
    },
    "wait": {
      "type": "boolean",
      "description": "Block until the job finishes or the timeout expires; a timed-out wait leaves the job running. Defaults to false."
    },
    "timeout_ms": {
      "type": "number",
      "description": "Max wait in milliseconds with wait: true. Defaults to and is capped by configuration."
    }
  },
  "required": [
    "job_id"
  ]
}
```

来源：[`packages/jobs/tool-jobs/src/index.ts`](../packages/jobs/tool-jobs/src/index.ts)

与任务种类无关的后台任务控制器：后台 bash 命令、PTY 发送和 subagent 都通过相同的 3 个工具读取、列出和终止。加载该插件会挂接控制器，从而启用生产方的 `ctx.jobs.start()`。

<a id="deepseek-aidsh-experimental-tool-agent-team"></a>

## `@deepseek-ai/dsh-experimental-tool-agent-team`

### `interrupt_agent`

中断一名 teammate 的当前 turn，同时保留其待处理 inbox。仅 Team Lead 可用。

```json
{
  "type": "object",
  "properties": {
    "target": {
      "type": "string",
      "description": "Teammate target returned by spawn_teammate or list_agents."
    }
  },
  "required": [
    "target"
  ]
}
```

来源：[`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `list_agents`

列出 Lead 与所有持久 teammate，以及可用于寻址的 target 和当前可用状态。inactive 表示没有轮次在执行，不表示任务结果。provisioning 与 failed 描述成员创建状态。

```json
{
  "type": "object",
  "properties": {}
}
```

来源：[`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `send_message`

向另一名 Team member 发送一条持久消息。running target 会在最近的步骤边界收到消息；inactive target 会启动或恢复一个 turn。

```json
{
  "type": "object",
  "properties": {
    "target": {
      "type": "string",
      "description": "Member target returned by spawn_teammate or list_agents, including lead."
    },
    "message": {
      "type": "string",
      "description": "Self-contained message for the target."
    }
  },
  "required": [
    "target",
    "message"
  ]
}
```

来源：[`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `spawn_teammate`

创建一名具名、持久的 teammate。只有 Team Lead 可以调用此工具。

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Unique lower-kebab-case teammate name."
    },
    "description": {
      "type": "string",
      "description": "Short description of the delegated responsibility."
    },
    "prompt": {
      "type": "string",
      "description": "Complete initial task for the teammate."
    },
    "context": {
      "type": "string",
      "description": "fresh starts without Lead history; fork inherits completed Lead turns. Defaults to fresh.",
      "enum": [
        "fresh",
        "fork"
      ]
    }
  },
  "required": [
    "name",
    "description",
    "prompt"
  ]
}
```

来源：[`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `team_task_create`

在共享 Team 任务板上创建一个无 owner 的 pending task。

```json
{
  "type": "object",
  "properties": {
    "subject": {
      "type": "string",
      "description": "Concise task title."
    },
    "description": {
      "type": "string",
      "description": "Complete task details and acceptance criteria."
    },
    "blocked_by": {
      "type": "array",
      "description": "Task ids that must complete first.",
      "items": {
        "type": "string"
      }
    },
    "write_scopes": {
      "type": "array",
      "description": "Advisory workspace-relative file or directory prefixes this task expects to modify.",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "subject",
    "description"
  ]
}
```

来源：[`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `team_task_get`

在修改或执行共享任务前，读取其完整的最新值。

```json
{
  "type": "object",
  "properties": {
    "task_id": {
      "type": "string",
      "description": "Shared task id."
    }
  },
  "required": [
    "task_id"
  ]
}
```

来源：[`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `team_task_list`

列出共享任务，包括 readiness、owner、revision、blocker 与 write-scope warning。

```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "description": "Optional exact status filter.",
      "enum": [
        "pending",
        "in_progress",
        "completed"
      ]
    },
    "owner": {
      "type": "string",
      "description": "Optional member target from spawn_teammate or list_agents, matching ownerName; use unowned for tasks without an owner."
    },
    "ready": {
      "type": "boolean",
      "description": "Optional readiness filter."
    },
    "cursor": {
      "type": "integer",
      "description": "Zero-based result offset. Defaults to 0."
    },
    "limit": {
      "type": "integer",
      "description": "Number of rows, 1 through 100. Defaults to 50."
    }
  }
}
```

来源：[`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `team_task_update`

使用 team_task_get 或 team_task_list 返回的最新 revision，对共享任务操作执行 compare-and-set。

```json
{
  "type": "object",
  "properties": {
    "task_id": {
      "type": "string",
      "description": "Shared task id."
    },
    "expected_revision": {
      "type": "integer",
      "description": "Current task revision used as the CAS precondition."
    },
    "action": {
      "type": "string",
      "description": "Task transition to apply.",
      "enum": [
        "claim",
        "release",
        "edit",
        "set_dependencies",
        "complete",
        "reopen",
        "reassign",
        "delete"
      ]
    },
    "subject": {
      "type": "string",
      "description": "Replacement title for edit."
    },
    "description": {
      "type": "string",
      "description": "Replacement details for edit."
    },
    "blocked_by": {
      "type": "array",
      "description": "Complete blocker list for set_dependencies.",
      "items": {
        "type": "string"
      }
    },
    "write_scopes": {
      "type": "array",
      "description": "Replacement advisory write scopes for edit.",
      "items": {
        "type": "string"
      }
    },
    "owner": {
      "type": "string",
      "description": "Member target from spawn_teammate or list_agents for Lead-only reassign; omit to unassign."
    }
  },
  "required": [
    "task_id",
    "expected_revision",
    "action"
  ]
}
```

来源：[`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `wait_agent`

等待本次调用开始后下一次 teammate 状态、mailbox 或共享任务变更。它绝不会唤醒 inactive member；若没有其他 member 正在 running 或 provisioning，则立即返回 noProgress。唤醒或超时后应重新列出状态，而不是轮询。

```json
{
  "type": "object",
  "properties": {
    "timeout_ms": {
      "type": "integer",
      "description": "Wait duration in milliseconds, from 10000 through 3600000. Defaults to 30000."
    }
  }
}
```

来源：[`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

这 10 个工具限定于隐式 Team Lead 与持久 teammate 作用域。随产品发布的 dsh-base bundle 默认禁用该包；文档中的 Agent Teams profile patch 会启用它，并禁用旧 continuable child 的同名控制工具。


<a id="deepseek-aidsh-tool-todo"></a>

## `@deepseek-ai/dsh-tool-todo`

### `todo_write`

记录并更新任务列表，用于规划多步骤工作并展示进度；简单的单步骤任务无需使用。开始前为每个具体步骤添加一项 todo。只要工作尚未完成，就将正在处理的 todo 标记为 `in_progress`，仅在工作并行运行时同时标记多项。某项 todo 完成后立即标记为 `completed`。

```json
{
  "type": "object",
  "properties": {
    "todos": {
      "type": "array",
      "description": "The COMPLETE task list, replacing any previous list.",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "content": {
            "type": "string",
            "description": "What the task is — a short imperative line."
          },
          "status": {
            "type": "string",
            "description": "pending (not started) | in_progress (now) | completed (done).",
            "enum": [
              "pending",
              "in_progress",
              "completed"
            ]
          }
        },
        "required": [
          "content",
          "status"
        ]
      }
    }
  },
  "required": [
    "todos"
  ]
}
```

来源：[`packages/todo/tool-todo/src/index.ts`](../packages/todo/tool-todo/src/index.ts)

todo_write 是会话所有的状态；UI 将最新的 todo/write 事件渲染为检查清单。`allowParallelInProgress` 是没有默认值的必填项，因此本目录明确选择 `true`，对应描述允许同时存在多个 `in_progress` 项。选择 `false` 的部署会获得同一工具，但描述会要求只能有 1 个活动任务。

<a id="deepseek-aidsh-tool-workflow"></a>

## `@deepseek-ai/dsh-tool-workflow`

### `workflow`

运行用于大规模编排 subagent 的 JavaScript 工作流脚本。当工作会分散到许多相互独立的部分时，请使用此工具，例如审查大量文件、执行迁移、开展多角度研究或对发现进行对抗式验证；此时应将编排写成脚本，而不是逐轮委派。

脚本函数体提供以下钩子：

- `agent(prompt, opts?): Promise<any>`：运行一个 subagent 直至完成。不提供 `opts.schema` 时，解析为子级最终文本；提供 `opts.schema` 时，它必须是以对象为根、且**只能**使用 type/properties/required/additionalProperties/items/enum/const/oneOf 的 JSON Schema，此时解析为通过校验的对象。子级失败时解析为 `null`，可使用 `.filter(Boolean)` 过滤。其他选项包括 `label`（显示名称）、`phase`（进度组），以及相互独立的 `provider`／`model` LLM（大语言模型）目标覆盖项。
- `pipeline(items, ...stages): Promise<any[]>`：让每个条目分别经过各阶段，阶段之间**没有**屏障；多阶段工作优先使用它。每个阶段接收 `(prev, item, index)`。阶段异常会将该**条目**变为 `null`，并跳过它的剩余阶段。
- `parallel(thunks): Promise<any[]>`：并发运行零参数函数并等待**全部**完成。它会形成屏障，仅当某个阶段确实需要汇总全部先前结果时使用。抛出异常的 thunk 解析为 `null`。
- `phase(title)`：开始一个进度阶段；`log(message)`：说明进度；`args`：工具调用的 `args` 输入，原样提供。

如果误用钩子（参数错误、未知选项、不受支持的 schema、触发上限），整个脚本会终止，而不会产生 `null`。脚本没有文件系统、网络、定时器或 Node.js API；具体工作由 agent 完成。

```json
{
  "type": "object",
  "properties": {
    "script": {
      "type": "string",
      "description": "The plain JavaScript body, not TypeScript and without an `export const meta` statement; top-level await is allowed. End with `return <value>`; the JSON-serializable value is this tool's result."
    },
    "meta": {
      "type": "object",
      "description": "The workflow identity as plain JSON, not code.",
      "additionalProperties": true,
      "properties": {
        "name": {
          "type": "string",
          "description": "Short kebab-case workflow name."
        },
        "description": {
          "type": "string",
          "description": "One-line description of what the workflow does."
        },
        "whenToUse": {
          "type": "string",
          "description": "Optional guidance on when this workflow applies."
        },
        "phases": {
          "type": "array",
          "description": "Optional phase declarations matched by phase() calls.",
          "items": {
            "type": "object",
            "additionalProperties": true,
            "properties": {
              "title": {
                "type": "string",
                "description": "The phase title phase() calls match by exact string."
              },
              "detail": {
                "type": "string",
                "description": "Optional one-line description of the phase."
              },
              "provider": {
                "type": "string",
                "description": "Optional provider override this phase is expected to use."
              },
              "model": {
                "type": "string",
                "description": "Optional model override this phase is expected to use."
              }
            },
            "required": [
              "title"
            ]
          }
        }
      },
      "required": [
        "name",
        "description"
      ]
    },
    "args": {
      "type": "object",
      "description": "Optional JSON input exposed to the script as the `args` global (wrap a bare list as a field, e.g. {\"files\": [...]}).",
      "additionalProperties": true
    },
    "run_in_background": {
      "type": "boolean",
      "description": "Run as a background job: return a job id immediately instead of waiting; the return value arrives with the completion notice."
    }
  },
  "required": [
    "script",
    "meta"
  ]
}
```

来源：[`packages/workflow/tool-workflow/src/index.ts`](../packages/workflow/tool-workflow/src/index.ts)

<a id="deepseek-aidsh-tool-workspace-dependencies"></a>

## `@deepseek-ai/dsh-tool-workspace-dependencies`

### `load_workspace_dependencies`

获取随包附带的 Python 和库目录的绝对路径，以及随包 Python 发行版的版本。payload 提供 Node.js 和 pnpm 时才返回对应路径。Python 含 numpy、pandas、python-docx、python-pptx、openpyxl、Pillow、lxml 与 XlsxWriter。除非用户或工作区指令选择了别的环境，Office 文件请使用这些库。返回 Node.js 和 pnpm 路径时，用该 Node 可执行文件和 pnpm 脚本路径运行 pnpm。本工具不改 PATH，也不改包管理器设置。

```json
{
  "type": "object",
  "properties": {}
}
```

来源：[`packages/skill/tool-workspace-dependencies/src/index.ts`](../packages/skill/tool-workspace-dependencies/src/index.ts)

<a id="deepseek-aidsh-tool-web"></a>

## `@deepseek-ai/dsh-tool-web`

### `web_fetch`

获取指定 HTTP(S) URL 的内容，并将其解码为文本后返回。

```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "The HTTP(S) URL to fetch."
    }
  },
  "required": [
    "url"
  ]
}
```

来源：[`packages/web/tool-web/src/index.ts`](../packages/web/tool-web/src/index.ts)

### `web_search`

在 Web 上搜索最新信息。返回可选的摘要答案和来源 URL 列表。

```json
{
  "type": "object",
  "properties": {
    "queries": {
      "type": "array",
      "description": "1–4 search queries; their results are merged.",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "queries"
  ]
}
```

来源：[`packages/web/tool-web/src/index.ts`](../packages/web/tool-web/src/index.ts)

web_search 和 web_fetch 将提供方选择置于 ctx.web 之后，使模型可见 schema 在更换后端时保持稳定。
