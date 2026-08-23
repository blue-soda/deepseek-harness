#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: prune-dsh-runtime.sh --runtime-dir DIR [--rules-file FILE] [--target-platform NAME]

Prunes a pnpm-deployed DSH runtime for an embedded Android target.

Options:
  --runtime-dir DIR        Runtime directory containing lib/bin.js and node_modules.
  --rules-file FILE        Shell env file defining PRUNE_* lists.
  --target-platform NAME   Target platform label for logs/manifest metadata.
  -h, --help               Show this help.
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="${RUNTIME_DIR:-}"
RULES_FILE="${PRUNE_RULES_FILE:-$SCRIPT_DIR/prune-rules/android-host-slim.env}"
TARGET_PLATFORM="${TARGET_PLATFORM:-android-x64}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runtime-dir) RUNTIME_DIR="$2"; shift 2 ;;
    --rules-file) RULES_FILE="$2"; shift 2 ;;
    --target-platform) TARGET_PLATFORM="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$RUNTIME_DIR" ]]; then
  echo "--runtime-dir is required" >&2
  exit 2
fi

RUNTIME_DIR="$(cd "$RUNTIME_DIR" && pwd)"
PNPM_DIR="$RUNTIME_DIR/node_modules/.pnpm"

if [[ ! -f "$RUNTIME_DIR/lib/bin.js" ]]; then
  echo "DSH entrypoint not found: $RUNTIME_DIR/lib/bin.js" >&2
  exit 3
fi
if [[ ! -d "$PNPM_DIR" ]]; then
  echo "pnpm directory not found: $PNPM_DIR" >&2
  exit 3
fi
if [[ ! -f "$RULES_FILE" ]]; then
  echo "rules file not found: $RULES_FILE" >&2
  exit 3
fi

# shellcheck source=/dev/null
source "$RULES_FILE"

before_kb="$(du -sk "$RUNTIME_DIR/node_modules" | awk '{print $1}')"
removed_entries=0
removed_files=0
removed_dirs=0
removed_symlinks=0

for pattern in ${PRUNE_PNPM_ENTRY_PATTERNS:-}; do
  while IFS= read -r -d '' entry; do
    rm -rf "$entry"
    removed_entries=$((removed_entries + 1))
  done < <(find "$PNPM_DIR" -mindepth 1 -maxdepth 1 -name "$pattern" -print0 2>/dev/null)
done

for glob in ${PRUNE_FILE_GLOBS:-}; do
  while IFS= read -r -d '' file; do
    rm -f "$file"
    removed_files=$((removed_files + 1))
  done < <(find "$RUNTIME_DIR/node_modules" -type f -name "$glob" -print0 2>/dev/null)
done

for dir_name in ${PRUNE_DIR_NAMES:-}; do
  while IFS= read -r -d '' dir; do
    rm -rf "$dir"
    removed_dirs=$((removed_dirs + 1))
  done < <(find "$RUNTIME_DIR/node_modules" -type d -name "$dir_name" -print0 2>/dev/null)
done

for pty in "$PNPM_DIR"/node-pty@*/node_modules/node-pty/prebuilds; do
  [[ -d "$pty" ]] || continue
  for prebuild_dir in ${PRUNE_NODE_PTY_PREBUILD_DIRS:-}; do
    rm -rf "$pty/$prebuild_dir"
  done
done

if [[ "${PRUNE_REMOVE_BROKEN_SYMLINKS:-false}" == "true" ]]; then
  while IFS= read -r -d '' link; do
    rm -f "$link"
    removed_symlinks=$((removed_symlinks + 1))
  done < <(find "$RUNTIME_DIR/node_modules" -xtype l -print0 2>/dev/null)
fi

after_kb="$(du -sk "$RUNTIME_DIR/node_modules" | awk '{print $1}')"
saved_kb=$((before_kb - after_kb))

cat <<EOF
target_platform=$TARGET_PLATFORM
runtime_dir=$RUNTIME_DIR
rules_file=$RULES_FILE
before_node_modules_kb=$before_kb
after_node_modules_kb=$after_kb
saved_node_modules_kb=$saved_kb
removed_pnpm_entries=$removed_entries
removed_files=$removed_files
removed_dirs=$removed_dirs
removed_broken_symlinks=$removed_symlinks
EOF
