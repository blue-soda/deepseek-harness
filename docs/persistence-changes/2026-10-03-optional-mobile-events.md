---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-10-03-optional-mobile-events

English | [中文](2026-10-03-optional-mobile-events.zh.md)

## Summary

Add six log-only mobile bridge and approval event roots owned by the optional mobile tool plugin.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

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
## Compatibility

These are new event roots; existing persisted fields and the Session writer version are unchanged. Readers of this fork recognize the generated event inventory. Builds lacking these event definitions refuse non-ignorable mobile records, so disabling the runtime plugin does not make such logs portable to an official-only build.

<a id="verification"></a>
## Verification

The focused mobile tool tests pass for bridge reachability, request/result records, and approval decisions. The persistence history verifier classifies each added root as same-version allowed.

<a id="dev-note"></a>
## Dev Note

None.
