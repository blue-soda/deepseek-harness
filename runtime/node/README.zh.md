# Android Node 运行时产物

[English](README.md) | 中文

此目录构建用于 Android 嵌入式 DSH 的原生 Node 运行时，产物独立于 DSH JavaScript 运行时。

生成的压缩包包含以下文件：

```text
usr/bin/node
usr/bin/curl
usr/bin/wget
usr/lib/libcares.so
usr/lib/libsqlite3.so*
usr/lib/libcrypto.so*
usr/lib/libssl.so*
usr/lib/libicudata.so*
usr/lib/libicui18n.so*
usr/lib/libicuuc.so*
usr/lib/libz.so*
usr/lib/libc++_shared.so
```

将 `usr/bin/node`、`usr/bin/curl` 和 `usr/bin/wget` 作为 `libdeepdroidpilot_node.so`、`libdeepdroidpilot_curl.so`、`libdeepdroidpilot_wget.so` 打包到 APK；Android 会将其提取至 `/data/app/.../lib`。`usr/lib` 安装至 `files/embedded-node-runtime/usr/lib`，供 `ProcessBuilder` 使用匹配的 `LD_LIBRARY_PATH` 启动 Node 和 shell 工具。安装运行时资源时，curl 和 wget 重新链接到 APK 提取的原生库，因为 Android 拒绝直接执行应用 files 目录中的原生程序。

在本地构建：

```powershell
python runtime\node\build-android-node-runtime.py --target-platform android-x64 --out-dir build\node-runtime-artifacts
python runtime\node\build-android-node-runtime.py --target-platform android-arm64 --out-dir build\node-runtime-artifacts
```

DeepDroidPilot 仓库将此产物与 DSH JavaScript 运行时共同使用。其 `Build Slim APK` 工作流下载或构建两种产物，运行 `scripts/prepare-embedded-runtime-assets.ps1`，再为对应 Android ABI 构建 APK。

GitHub 工作流 `Build Android Node Runtime Artifact` 接收单个 `target_platform` 标签。x86_64 使用 `android-x64`，aarch64 使用 `android-arm64`。需要两个 ABI 产物时，分别运行工作流。脚本下载所选架构兼容的 `nodejs-lts`、依赖以及可配置的额外命令包，如 `curl wget`。它根据包索引验证 SHA256，仅提取对应架构需要的命令及共享库，并检查 Node ELF machine 和保留程序的 `NEEDED` 共享库。

额外命令可以配置：

```powershell
python runtime\node\build-android-node-runtime.py `
  --target-platform android-arm64 `
  --extra-packages "curl wget" `
  --tool-binary-globs "usr/bin/curl usr/bin/wget"
```
