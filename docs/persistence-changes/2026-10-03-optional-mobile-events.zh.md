---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-10-03-optional-mobile-events

[English](2026-10-03-optional-mobile-events.md) | 中文

## 概述

增加六个由可选移动工具插件拥有的仅记日志的桥接和审批事件。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

```yaml persistence-change
schemaVersion: 1
id: 2026-10-03-optional-mobile-events
baseline: false
changes:
  - root: "event:mobile/approval-decided"
    previous: null
    after: "02d0cb6ebf9aaa73729d81198409da944b114dae1c7b862280b4acc7951a5f37"
    decision: same-version
  - root: "event:mobile/approval-requested"
    previous: null
    after: "ae87d6c26b3011e8a25ff957a486dafb271d1a4d10862b269ed497dad4b5e331"
    decision: same-version
  - root: "event:mobile/bridge-connected"
    previous: null
    after: "b69e98a0e34b90603b94a166725876da0d1417390bf9352e71d61a2b5a7baecd"
    decision: same-version
  - root: "event:mobile/bridge-disconnected"
    previous: null
    after: "ab011825be9b92d18195e58c885dfd2895368ab013d75975fb1f2ea7e30e2f8f"
    decision: same-version
  - root: "event:mobile/tool-request"
    previous: null
    after: "f731c2c102f2f5ca0f3dd694528e972c65d2a685bc05ecadefded4d094606db2"
    decision: same-version
  - root: "event:mobile/tool-result"
    previous: null
    after: "440c961020e5999cc362405bc9850120037f5cd0ae9938fd6ae08ec72bd8ce31"
    decision: same-version
```

<a id="compatibility"></a>
## 兼容性

这些是新事件类型，现有持久化字段与 Session 写入版本不变。本 fork 的读取方认识生成的事件目录。不包含这些定义的构建会拒绝不可忽略的移动事件，因此禁用运行时插件并不能使此类日志可移植到纯官方构建。

<a id="verification"></a>
## 验证

移动工具定向测试已通过桥接可达性、请求与结果记录、审批决策检查。持久化历史校验器将每个新增事件类型判定为允许保持版本。

<a id="dev-note"></a>
## 开发备注

无。
