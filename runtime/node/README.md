# Android Node Runtime Artifact

This directory builds the Android native Node runtime used by the embedded DSH
path. The artifact is intentionally separate from the DSH JavaScript runtime.

The generated archive contains:

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

`usr/bin/node`, `usr/bin/curl`, and `usr/bin/wget` should be copied into the APK
as native libraries named `libdeepdroidpilot_node.so`,
`libdeepdroidpilot_curl.so`, and `libdeepdroidpilot_wget.so`; Android will
extract them under `/data/app/.../lib`. The `usr/lib` directory is installed
into `files/embedded-node-runtime/usr/lib` so `ProcessBuilder` can launch Node
and Android shell tools with a matching `LD_LIBRARY_PATH`. During runtime asset
installation, `usr/bin/curl` and `usr/bin/wget` are recreated as links to the
APK-extracted native libraries because Android refuses to execute native
binaries directly from the app `files/` directory.

Build locally:

```powershell
python runtime\node\build-android-node-runtime.py --target-platform android-x64 --out-dir build\node-runtime-artifacts
python runtime\node\build-android-node-runtime.py --target-platform android-arm64 --out-dir build\node-runtime-artifacts
```

The DeepDroidPilot app repository consumes this artifact together with a DSH
JavaScript runtime artifact. Its `Build Slim APK` workflow downloads or builds
both runtime artifacts, runs `scripts/prepare-embedded-runtime-assets.ps1`, and
then builds the APK for the matching Android ABI.

The GitHub workflow `Build Android Node Runtime Artifact` accepts a single
`target_platform` label. Choose `android-x64` for x86_64 or `android-arm64` for
aarch64. Run the workflow once per target when both standalone ABI artifacts
are needed.
The script downloads Android-compatible `nodejs-lts` and its dependency
closure for the selected architecture, plus configurable extra command packages
such as `curl wget`. It verifies package SHA256 values from the package index,
extracts only retained command binaries and runtime shared libraries for that
same architecture, and checks the Node ELF machine plus `NEEDED` shared
libraries for retained executables.

The extra commands are configurable:

```powershell
python runtime\node\build-android-node-runtime.py `
  --target-platform android-arm64 `
  --extra-packages "curl wget" `
  --tool-binary-globs "usr/bin/curl usr/bin/wget"
```
