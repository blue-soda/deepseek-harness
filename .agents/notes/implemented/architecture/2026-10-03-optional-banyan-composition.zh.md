# Agent Note: 可选 Banyan 组合

Status: implemented

[English](2026-10-03-optional-banyan-composition.md) | 中文

## 问题

Banyan 能力包括 Agent 工具、Host 文件操作和 Android 提供者。单独的 preset 不能分发 Host 服务，也不能撤销对共享对话渲染器和 API 实现的直接修改。把这些修改保留在共享包中，会让官方更新和替换后的 Banyan 客户端依赖产品特化代码。

## 决策

可选 Banyan bundle 拥有 Host 扩展和声明式 preset。官方 base 与 Web bundle 不依赖 Banyan 包。手机日志事件由手机工具消费者通过 Session 类型扩展声明；核心事件目录继续由生成器维护。Host 文件操作提供自己的 Typert Remote 命名空间，而不向官方 controller 增加操作。官方渲染器、模型适配器和会话持久化保留上游实现。

## 考虑过的替代方案

**只分发 preset。** Preset 可以限定 Agent 插件的作用域，但不能提供 Host 服务、包安装和整个内嵌部署的提供者覆盖。

**保留旧 RPC 和渲染器补丁。** 在共享包中保留第二套 API 实现和产品 CSS，虽然能保留旧客户端接口，却增加每次官方更新需要协调的改动。

## 后果

禁用 bundle 会移除其 Host 服务和 preset 声明。已取得的 preset 版本可能在声明移除后继续存在，直到会话释放它。现有 Banyan 客户端需要迁移到当前官方 API 和可选文件操作命名空间。Android 打包和桥接集成需要单独进行设备验证；Host 测试通过不能证明 Android 部署兼容。Banyan 视觉定制属于独立挂载的客户端插件。
