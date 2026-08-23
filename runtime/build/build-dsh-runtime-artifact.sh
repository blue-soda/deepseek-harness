#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: build-dsh-runtime-artifact.sh [options]

Builds a configurable DSH runtime artifact for Android embedded Node.

Options:
  --dsh-repo URL             Git repository to clone. Env: DSH_REPO.
  --dsh-ref REF              Git ref/tag/commit to checkout. Env: DSH_REF.
  --dsh-source-dir DIR       Existing source checkout. Skips clone. Env: DSH_SOURCE_DIR.
  --prebuilt-runtime-dir DIR Existing deployed runtime. Skips clone/install/deploy.
  --out-dir DIR              Output directory. Env: ARTIFACT_DIR.
  --target-platform NAME     Target label, e.g. android-x64. Env: TARGET_PLATFORM.
  --prune-rules-file FILE    Pruning profile env file. Env: PRUNE_RULES_FILE.
  --prune-profile NAME       Profile under runtime/build/prune-rules. Env: PRUNE_PROFILE.
  --dsh-package NAME         pnpm filter package. Default: @deepseek-ai/dsh.
  --node-bin PATH            Node executable. Env: NODE_BIN.
  --pnpm-bin PATH            pnpm executable or pnpm.cjs. Env: PNPM_BIN.
  --pnpm-store DIR           Optional pnpm store dir. Env: PNPM_STORE_DIR.
  --build-command COMMAND    Build command run before deploy. Env: DSH_BUILD_COMMAND.
  --build-log-mode MODE      full or summary. Env: DSH_BUILD_LOG_MODE.
  --required-workspace-packages LIST
                            Space-separated workspace packages to copy into
                            the runtime if pnpm deploy omits them. Env:
                            DSH_RUNTIME_REQUIRED_WORKSPACE_PACKAGES.
  --skip-install             Skip pnpm install before deploy.
  --skip-build               Skip build before deploy.
  --offline                  Pass --offline to pnpm install/deploy.
  --keep-workdir             Do not delete temporary workdir.
  -h, --help                 Show this help.

Examples:
  DSH_REPO=https://github.com/deepseek-ai/deepseek-harness DSH_REF=master \
    runtime/build/build-dsh-runtime-artifact.sh

  runtime/build/build-dsh-runtime-artifact.sh \
    --dsh-repo https://github.com/deepseek-ai/deepseek-harness \
    --dsh-ref master \
    --target-platform android-x64
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DSH_REPO="${DSH_REPO:-https://github.com/deepseek-ai/deepseek-harness}"
DSH_REF="${DSH_REF:-master}"
DSH_SOURCE_DIR="${DSH_SOURCE_DIR:-}"
PREBUILT_RUNTIME_DIR="${PREBUILT_RUNTIME_DIR:-}"
OUT_DIR="${ARTIFACT_DIR:-$PROJECT_ROOT/build/dsh-runtime-artifacts}"
TARGET_PLATFORM="${TARGET_PLATFORM:-android-x64}"
PRUNE_PROFILE="${PRUNE_PROFILE:-mobile-slim}"
PRUNE_RULES_FILE="${PRUNE_RULES_FILE:-$SCRIPT_DIR/prune-rules/$PRUNE_PROFILE.env}"
DSH_PACKAGE="${DSH_PACKAGE:-@deepseek-ai/dsh}"
NODE_BIN="${NODE_BIN:-node}"
PNPM_BIN="${PNPM_BIN:-pnpm}"
PNPM_STORE_DIR="${PNPM_STORE_DIR:-}"
DSH_BUILD_COMMAND="${DSH_BUILD_COMMAND:-pnpm run build}"
DSH_BUILD_LOG_MODE="${DSH_BUILD_LOG_MODE:-summary}"
DSH_RUNTIME_REQUIRED_WORKSPACE_PACKAGES="${DSH_RUNTIME_REQUIRED_WORKSPACE_PACKAGES:-@deepseek-ai/*}"
SKIP_INSTALL=false
SKIP_BUILD=false
OFFLINE=false
KEEP_WORKDIR=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dsh-repo) DSH_REPO="$2"; shift 2 ;;
    --dsh-ref) DSH_REF="$2"; shift 2 ;;
    --dsh-source-dir) DSH_SOURCE_DIR="$2"; shift 2 ;;
    --prebuilt-runtime-dir) PREBUILT_RUNTIME_DIR="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    --target-platform) TARGET_PLATFORM="$2"; shift 2 ;;
    --prune-rules-file) PRUNE_RULES_FILE="$2"; shift 2 ;;
    --prune-profile) PRUNE_PROFILE="$2"; PRUNE_RULES_FILE="$SCRIPT_DIR/prune-rules/$2.env"; shift 2 ;;
    --dsh-package) DSH_PACKAGE="$2"; shift 2 ;;
    --node-bin) NODE_BIN="$2"; shift 2 ;;
    --pnpm-bin) PNPM_BIN="$2"; shift 2 ;;
    --pnpm-store) PNPM_STORE_DIR="$2"; shift 2 ;;
    --build-command) DSH_BUILD_COMMAND="$2"; shift 2 ;;
    --build-log-mode) DSH_BUILD_LOG_MODE="$2"; shift 2 ;;
    --required-workspace-packages) DSH_RUNTIME_REQUIRED_WORKSPACE_PACKAGES="$2"; shift 2 ;;
    --skip-install) SKIP_INSTALL=true; shift ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --offline) OFFLINE=true; shift ;;
    --keep-workdir) KEEP_WORKDIR=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

mkdir -p "$OUT_DIR"
OUT_DIR="$(cd "$OUT_DIR" && pwd)"

WORK_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/deep-droid-pilot-dsh-runtime.XXXXXX")"
if [[ "$KEEP_WORKDIR" != true ]]; then
  trap 'rm -rf "$WORK_ROOT"' EXIT
fi

run_node() {
  "$NODE_BIN" "$@"
}

run_pnpm() {
  local pnpm_args=()
  if [[ -n "$PNPM_STORE_DIR" ]]; then
    pnpm_args+=(--store-dir "$PNPM_STORE_DIR")
  fi
  if [[ "$OFFLINE" == true ]]; then
    pnpm_args+=(--offline)
  fi

  if [[ "$PNPM_BIN" == *.cjs ]]; then
    "$NODE_BIN" "$PNPM_BIN" "${pnpm_args[@]}" "$@"
  else
    "$PNPM_BIN" "${pnpm_args[@]}" "$@"
  fi
}

find_workspace_package_dir() {
  local package_name="$1"
  run_node - "$SOURCE_DIR" "$package_name" <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.argv[2];
const target = process.argv[3];
const ignored = new Set(['.git', 'node_modules', '.turbo', '.next', 'dist']);

function toNodePath(file) {
  if (process.platform !== 'win32') return file;
  return file.replace(/^\/([a-zA-Z])\//, (_, drive) => `${drive}:/`);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = walk(file);
      if (found) return found;
      continue;
    }
    if (entry.name !== 'package.json') continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (pkg.name === target) return path.dirname(file);
    } catch {
      // Keep scanning other package manifests.
    }
  }
  return '';
}

process.stdout.write(walk(toNodePath(root)));
NODE
}

find_workspace_packages_for_spec() {
  local package_spec="$1"
  if [[ "$package_spec" != *'*' ]]; then
    local package_dir
    package_dir="$(find_workspace_package_dir "$package_spec")"
    if [[ -n "$package_dir" ]]; then
      printf '%s\t%s\n' "$package_spec" "$package_dir"
    fi
    return 0
  fi

  run_node - "$SOURCE_DIR" "$package_spec" <<'NODE'
const fs = require('fs');
const path = require('path');

const rootArg = process.argv[2];
const spec = process.argv[3];
const root = process.platform === 'win32'
  ? rootArg.replace(/^\/([a-zA-Z])\//, (_, drive) => `${drive}:/`)
  : rootArg;
const ignored = new Set(['.git', 'node_modules', '.turbo', '.next', 'dist']);
const results = [];

function matches(name) {
  if (spec.endsWith('/*')) return name.startsWith(`${spec.slice(0, -1)}`);
  const escaped = spec.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('\\*', '.*');
  return new RegExp(`^${escaped}$`, 'u').test(name);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(file);
      continue;
    }
    if (entry.name !== 'package.json') continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (typeof pkg.name === 'string' && matches(pkg.name)) {
        results.push([pkg.name, path.dirname(file)]);
      }
    } catch {
      // Keep scanning other package manifests.
    }
  }
}

walk(root);
for (const [name, dir] of results.sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`${name}\t${dir}`);
}
NODE
}

package_target_dir() {
  local node_modules_dir="$1"
  local package_name="$2"
  if [[ "$package_name" == @*/* ]]; then
    printf '%s/%s/%s\n' "$node_modules_dir" "${package_name%%/*}" "${package_name#*/}"
  else
    printf '%s/%s\n' "$node_modules_dir" "$package_name"
  fi
}

relative_symlink_target() {
  local target="$1"
  local link_dir="$2"
  run_node - "$target" "$link_dir" <<'NODE'
const path = require('path');
let target = process.argv[2];
let linkDir = process.argv[3];
if (process.platform === 'win32') {
  target = target.replace(/^\/([a-zA-Z])\//, (_, drive) => `${drive}:/`);
  linkDir = linkDir.replace(/^\/([a-zA-Z])\//, (_, drive) => `${drive}:/`);
}
let relative = path.relative(linkDir, target);
if (!relative.startsWith('.')) relative = `.${path.sep}${relative}`;
process.stdout.write(relative.split(path.sep).join('/'));
NODE
}

find_runtime_package_instance() {
  local package_name="$1"
  local package_path
  if [[ "$package_name" == @*/* ]]; then
    package_path="${package_name%%/*}/${package_name#*/}"
  else
    package_path="$package_name"
  fi
  find "$RUNTIME_DIR/node_modules/.pnpm" -path "*/node_modules/$package_path" -type d -print -quit 2>/dev/null || true
}

copy_workspace_package_to_runtime_target() {
  local source_package_dir="$1"
  local target_package_dir="$2"
  rm -rf "$target_package_dir"
  mkdir -p "$target_package_dir"
  (
    cd "$source_package_dir"
    tar \
      --exclude='./.git' \
      --exclude='./node_modules' \
      --exclude='./src' \
      --exclude='./test' \
      --exclude='./tests' \
      --exclude='./__tests__' \
      --exclude='./docs' \
      --exclude='./doc' \
      --exclude='./examples' \
      --exclude='./example' \
      --exclude='./fixtures' \
      -cf - .
  ) | (
    cd "$target_package_dir"
    tar -xf -
  )
}

repair_runtime_workspace_packages() {
  [[ -n "$SOURCE_DIR" ]] || return 0
  [[ -n "$DSH_RUNTIME_REQUIRED_WORKSPACE_PACKAGES" ]] || return 0

  local packages_file
  packages_file="$WORK_ROOT/required-workspace-packages.tsv"
  : > "$packages_file"

  local package_spec package_name source_package_dir root_target deployed_target link_target copied found
  for package_spec in $DSH_RUNTIME_REQUIRED_WORKSPACE_PACKAGES; do
    found=0
    while IFS=$'\t' read -r package_name source_package_dir; do
      [[ -n "$package_name" && -n "$source_package_dir" ]] || continue
      found=1
      printf '%s\t%s\n' "$package_name" "$source_package_dir" >> "$packages_file"

      copied=0
      root_target="$(package_target_dir "$RUNTIME_DIR/node_modules" "$package_name")"
      if [[ ! -e "$root_target" ]]; then
        mkdir -p "$(dirname "$root_target")"
        deployed_target="$(find_runtime_package_instance "$package_name")"
        if [[ -n "$deployed_target" ]]; then
          link_target="$(relative_symlink_target "$deployed_target" "$(dirname "$root_target")")"
          ln -s "$link_target" "$root_target"
        else
          copy_workspace_package_to_runtime_target "$source_package_dir" "$root_target"
        fi
        copied=$((copied + 1))
      fi

      if [[ "$copied" -gt 0 ]]; then
        echo "repaired_workspace_package=$package_name copied_root_targets=$copied"
      fi
    done < <(find_workspace_packages_for_spec "$package_spec")

    if [[ "$found" -eq 0 ]]; then
      echo "WARN: required workspace package spec matched nothing: $package_spec" >&2
      continue
    fi
  done

  sort -u "$packages_file" -o "$packages_file"

  run_node - "$RUNTIME_DIR" "$packages_file" <<'NODE'
const fs = require('fs');
const path = require('path');

function toNodePath(file) {
  if (process.platform !== 'win32') return file;
  return file.replace(/^\/([a-zA-Z])\//, (_, drive) => `${drive}:/`);
}

const runtimeDir = fs.realpathSync(toNodePath(process.argv[2]));
const packagesFile = toNodePath(process.argv[3]);
const rootNodeModules = path.join(runtimeDir, 'node_modules');
const pnpmDir = path.join(rootNodeModules, '.pnpm');
const workspaceNames = new Set();
const rootTargets = new Map();
let created = 0;

function packageTargetDir(nodeModulesDir, packageName) {
  if (packageName.startsWith('@')) {
    const [scope, name] = packageName.split('/');
    return path.join(nodeModulesDir, scope, name);
  }
  return path.join(nodeModulesDir, packageName);
}

for (const line of fs.readFileSync(packagesFile, 'utf8').split(/\r?\n/u)) {
  if (!line.trim()) continue;
  const [name] = line.split('\t');
  if (!name) continue;
  workspaceNames.add(name);
  rootTargets.set(name, packageTargetDir(rootNodeModules, name));
}

function readPackageJson(packageDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

function dependencyNames(pkg) {
  const names = new Set();
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const name of Object.keys(pkg?.[field] ?? {})) {
      names.add(name);
    }
  }
  return names;
}

function relativeLinkTarget(target, linkDir) {
  let relative = path.relative(linkDir, target);
  if (!relative.startsWith('.')) relative = `.${path.sep}${relative}`;
  return relative.split(path.sep).join('/');
}

function linkWorkspacePackage(contextDir, packageName) {
  const target = packageTargetDir(contextDir, packageName);
  try {
    fs.lstatSync(target);
    return false;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const rootTarget = rootTargets.get(packageName);
  if (!rootTarget || !fs.existsSync(rootTarget)) {
    console.error(`WARN: repaired workspace root target missing: ${packageName} -> ${rootTarget}`);
    return false;
  }

  const linkDir = path.dirname(target);
  fs.mkdirSync(linkDir, { recursive: true });
  fs.symlinkSync(relativeLinkTarget(rootTarget, linkDir), target);
  created += 1;
  return true;
}

function listContextPackageNames(contextDir) {
  const names = new Set();
  let entries;
  try {
    entries = fs.readdirSync(contextDir, { withFileTypes: true });
  } catch {
    return names;
  }

  for (const entry of entries) {
    if (entry.name === '.bin' || entry.name === '.pnpm') continue;
    const entryPath = path.join(contextDir, entry.name);
    if (entry.name.startsWith('@')) {
      let scoped;
      try {
        scoped = fs.readdirSync(entryPath, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const child of scoped) {
        names.add(`${entry.name}/${child.name}`);
      }
      continue;
    }
    names.add(entry.name);
  }
  return names;
}

function contextPackageDir(contextDir, packageName) {
  const direct = packageTargetDir(contextDir, packageName);
  if (fs.existsSync(direct)) return direct;
  return rootTargets.get(packageName) ?? direct;
}

function repairContext(contextDir) {
  const queue = [...listContextPackageNames(contextDir)];
  const seen = new Set();

  while (queue.length > 0) {
    const packageName = queue.shift();
    if (!packageName || seen.has(packageName)) continue;
    seen.add(packageName);

    const pkg = readPackageJson(contextPackageDir(contextDir, packageName));
    if (!pkg) continue;

    for (const depName of dependencyNames(pkg)) {
      if (!workspaceNames.has(depName)) continue;
      if (linkWorkspacePackage(contextDir, depName)) {
        queue.push(depName);
      } else if (!seen.has(depName)) {
        queue.push(depName);
      }
    }
  }
}

function collectNodeModulesContexts() {
  const contexts = new Set([rootNodeModules]);
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules') {
        contexts.add(file);
      }
      walk(file);
    }
  }
  if (fs.existsSync(pnpmDir)) walk(pnpmDir);
  return [...contexts].sort();
}

for (const contextDir of collectNodeModulesContexts()) {
  repairContext(contextDir);
}

console.log(`repaired_workspace_context_symlinks=${created}`);
NODE
}

materialize_external_runtime_symlinks() {
  [[ -d "$RUNTIME_DIR/node_modules" ]] || return 0

  run_node - "$RUNTIME_DIR" <<'NODE'
const fs = require('fs');
const path = require('path');

const rootArg = process.argv[2];
const root = fs.realpathSync(process.platform === 'win32'
  ? rootArg.replace(/^\/([a-zA-Z])\//, (_, drive) => `${drive}:/`)
  : rootArg);
const nodeModules = path.join(root, 'node_modules');
const skipNames = new Set([
  '.git',
  'node_modules',
  'src',
  'test',
  'tests',
  '__tests__',
  'docs',
  'doc',
  'examples',
  'example',
  'fixtures',
]);
const links = [];
const brokenLinks = [];

function isInsideRoot(file) {
  return file === root || file.startsWith(root + path.sep);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) {
      const rawTarget = fs.readlinkSync(file);
      let target;
      try {
        target = fs.realpathSync(file);
      } catch (error) {
        brokenLinks.push({ link: file, target: rawTarget, error: error.message });
        continue;
      }
      if (path.isAbsolute(rawTarget) || !isInsideRoot(target)) {
        links.push({ link: file, target });
      }
      continue;
    }
    if (stat.isDirectory()) {
      walk(file);
    }
  }
}

function copyRecursive(source, destination) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) {
    copyRecursive(fs.realpathSync(source), destination);
    return;
  }
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      if (skipNames.has(entry.name)) continue;
      copyRecursive(path.join(source, entry.name), path.join(destination, entry.name));
    }
    return;
  }
  if (stat.isFile()) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    fs.chmodSync(destination, stat.mode);
  }
}

walk(nodeModules);

for (const { link } of brokenLinks) {
  fs.rmSync(link, { force: true });
}

for (const { link, target } of links) {
  const temp = `${link}.materialized-${process.pid}`;
  fs.rmSync(temp, { recursive: true, force: true });
  copyRecursive(target, temp);
  fs.rmSync(link, { recursive: true, force: true });
  fs.renameSync(temp, link);
}

console.log(`materialized_external_symlinks=${links.length}`);
console.log(`removed_broken_runtime_symlinks=${brokenLinks.length}`);
NODE
}

check_dsh_version() {
  local stage="$1"
  local version_file="/tmp/dsh-runtime-version.$$"
  if ! "$NODE_BIN" "$RUNTIME_DIR/lib/bin.js" --version >"$version_file"; then
    echo "DSH runtime version check failed at stage: $stage" >&2
    echo "Known cordis-plugin-group paths:" >&2
    find "$RUNTIME_DIR" -maxdepth 10 -path '*cordis-plugin-group*' -print | head -80 >&2 || true
    rm -f "$version_file"
    return 1
  fi
  DSH_VERSION="$(cat "$version_file")"
  rm -f "$version_file"
}

if [[ -n "$PREBUILT_RUNTIME_DIR" ]]; then
  SOURCE_DIR=""
  COMMIT="${DSH_COMMIT:-prebuilt}"
  PACKAGE_MANAGER="${PACKAGE_MANAGER:-unknown}"
  RUNTIME_DIR="$WORK_ROOT/dsh-runtime"
  cp -a "$PREBUILT_RUNTIME_DIR"/. "$RUNTIME_DIR"
elif [[ -n "$DSH_SOURCE_DIR" ]]; then
  SOURCE_DIR="$(cd "$DSH_SOURCE_DIR" && pwd)"
else
  SOURCE_DIR="$WORK_ROOT/source"
  git clone "$DSH_REPO" "$SOURCE_DIR"
  git -C "$SOURCE_DIR" checkout "$DSH_REF"
fi

if [[ -n "$SOURCE_DIR" ]]; then
  COMMIT="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
  PACKAGE_MANAGER="$(run_node - "$SOURCE_DIR/package.json" <<'NODE'
const file = process.argv[2];
const nodePath = process.platform === 'win32'
  ? file.replace(/^\/([a-zA-Z])\//, (_, drive) => `${drive}:/`)
  : file;
const p = require(nodePath);
console.log(p.packageManager || '');
NODE
)"
fi
NODE_VERSION="$(run_node --version)"
PNPM_VERSION="$(run_pnpm --version)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUNTIME_DIR="${RUNTIME_DIR:-$WORK_ROOT/dsh-runtime}"
ARTIFACT_BASENAME="dsh-runtime.${TARGET_PLATFORM}.${COMMIT:0:12}.${STAMP}"
TAR_PATH="$OUT_DIR/$ARTIFACT_BASENAME.tar.gz"
MANIFEST_PATH="$OUT_DIR/$ARTIFACT_BASENAME.manifest.json"
SHA_PATH="$TAR_PATH.sha256"

echo "source_dir=$SOURCE_DIR"
echo "prebuilt_runtime_dir=$PREBUILT_RUNTIME_DIR"
echo "commit=$COMMIT"
echo "package_manager=$PACKAGE_MANAGER"
echo "node_version=$NODE_VERSION"
echo "pnpm_version=$PNPM_VERSION"
echo "target_platform=$TARGET_PLATFORM"
echo "prune_rules_file=$PRUNE_RULES_FILE"
echo "build_command=$DSH_BUILD_COMMAND"
echo "build_log_mode=$DSH_BUILD_LOG_MODE"
echo "required_workspace_packages=$DSH_RUNTIME_REQUIRED_WORKSPACE_PACKAGES"

if [[ -z "$PREBUILT_RUNTIME_DIR" && "$SKIP_INSTALL" != true ]]; then
  (
    cd "$SOURCE_DIR"
    run_pnpm install --frozen-lockfile --config.minimumReleaseAge=0 --config.minimum-release-age=0
  )
fi

if [[ -z "$PREBUILT_RUNTIME_DIR" && "$SKIP_BUILD" != true ]]; then
  (
    cd "$SOURCE_DIR"
    BUILD_LOG="$WORK_ROOT/dsh-build.log"
    if ! bash -lc "$DSH_BUILD_COMMAND" >"$BUILD_LOG" 2>&1; then
      echo "DSH build failed. Full build log follows:" >&2
      cat "$BUILD_LOG" >&2
      exit 1
    fi
    if [[ "$DSH_BUILD_LOG_MODE" == "full" ]]; then
      cat "$BUILD_LOG"
    else
      echo "DSH build completed. Last 80 log lines:"
      tail -80 "$BUILD_LOG"
    fi
  )
fi

if [[ -z "$PREBUILT_RUNTIME_DIR" ]]; then
  (
    cd "$SOURCE_DIR"
    run_pnpm --filter "$DSH_PACKAGE" deploy --legacy --prod "$RUNTIME_DIR"
  )
fi

if [[ ! -f "$RUNTIME_DIR/lib/bin.js" ]]; then
  echo "DSH entrypoint not found after deploy: $RUNTIME_DIR/lib/bin.js" >&2
  echo "The DSH repository likely needs a build step before pnpm deploy. Current build command: $DSH_BUILD_COMMAND" >&2
  find "$RUNTIME_DIR" -maxdepth 3 -type f | sort | head -80 >&2 || true
  exit 3
fi

repair_runtime_workspace_packages
check_dsh_version "after deploy" || exit 4

bash "$SCRIPT_DIR/prune-dsh-runtime.sh" \
  --runtime-dir "$RUNTIME_DIR" \
  --rules-file "$PRUNE_RULES_FILE" \
  --target-platform "$TARGET_PLATFORM"

materialize_external_runtime_symlinks
check_dsh_version "after pruning" || exit 4

# Android app sandboxes may reject restoring hardlinks from tar archives. Expand
# hardlinks into regular files so the artifact can be extracted with toybox tar.
tar --hard-dereference -czf "$TAR_PATH" -C "$RUNTIME_DIR" .
sha256sum "$TAR_PATH" > "$SHA_PATH"

RUNTIME_BYTES="$(du -sb "$RUNTIME_DIR" | awk '{print $1}')"
NODE_MODULES_BYTES="$(du -sb "$RUNTIME_DIR/node_modules" | awk '{print $1}')"
TAR_BYTES="$(stat -c '%s' "$TAR_PATH")"
SHA256="$(awk '{print $1}' "$SHA_PATH")"

cat > "$MANIFEST_PATH" <<EOF
{
  "ok": true,
  "artifactKind": "dsh-runtime",
  "targetPlatform": "$TARGET_PLATFORM",
  "dshRepo": "$DSH_REPO",
  "dshRef": "$DSH_REF",
  "prebuiltRuntimeDir": "$PREBUILT_RUNTIME_DIR",
  "commit": "$COMMIT",
  "dshPackage": "$DSH_PACKAGE",
  "dshVersion": "$DSH_VERSION",
  "requiredWorkspacePackages": "$DSH_RUNTIME_REQUIRED_WORKSPACE_PACKAGES",
  "packageManager": "$PACKAGE_MANAGER",
  "nodeVersion": "$NODE_VERSION",
  "pnpmVersion": "$PNPM_VERSION",
  "pruneProfile": "$PRUNE_PROFILE",
  "pruneRulesFile": "$PRUNE_RULES_FILE",
  "tarHardlinksDereferenced": true,
  "runtimeBytes": $RUNTIME_BYTES,
  "nodeModulesBytes": $NODE_MODULES_BYTES,
  "tarBytes": $TAR_BYTES,
  "sha256": "$SHA256",
  "createdAtUtc": "$STAMP"
}
EOF

echo "artifact=$TAR_PATH"
echo "manifest=$MANIFEST_PATH"
echo "sha256=$SHA_PATH"
cat "$MANIFEST_PATH"
