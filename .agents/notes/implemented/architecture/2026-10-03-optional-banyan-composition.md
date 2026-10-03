# Agent Note: Optional Banyan composition

Status: implemented

English | [中文](2026-10-03-optional-banyan-composition.zh.md)

## Problem

Banyan capabilities include Agent tools, Host file operations, and Android providers. A preset alone cannot distribute Host services or undo direct changes to the shared conversation renderer and API implementation. Keeping those changes in shared packages makes official updates and a replacement Banyan client depend on product-specific code.

## Decision

The optional Banyan bundle owns Host contributions and declarative presets. Official base and Web bundles do not depend on Banyan packages. Mobile log events are declared by the mobile tool consumer through Session type augmentation; the core event catalog remains generated. Host file operations expose their own Typert Remote namespace instead of adding operations to an official controller. Official renderers, model adapters, and session persistence retain upstream implementations.

## Alternatives considered

**Preset-only distribution.** Presets scope Agent plugins but cannot supply Host services, package installation, or provider overrides for an entire embedded deployment.

**Retain the legacy RPC and renderer patches.** Keeping a second API implementation and product CSS in shared packages would preserve an obsolete client interface while increasing the changes each official update must reconcile.

## Consequences

Disabling the bundle removes its Host services and preset declarations. Acquired preset revisions can outlive declaration removal until their sessions release them. Existing Banyan clients require migration to the current official APIs and optional file-operation namespace. Android packaging and bridge integration require separate device qualification; successful Host tests do not establish Android deployment compatibility. Banyan visual customization belongs to a separately mounted client plugin.
