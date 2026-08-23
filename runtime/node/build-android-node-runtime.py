#!/usr/bin/env python3
"""Build a minimal Android Node runtime artifact from Termux packages."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import tarfile
import tempfile
import time
import urllib.request
from pathlib import Path


TARGETS = {
    "android-x64": {
        "termux_arch": "x86_64",
        "android_abi": "x86_64",
        "elf_machine": "Advanced Micro Devices X86-64",
    },
    "android-arm64": {
        "termux_arch": "aarch64",
        "android_abi": "arm64-v8a",
        "elf_machine": "AArch64",
    },
}

TERMUX_PREFIX = "data/data/com.termux/files/"
DEFAULT_REPO_URL = "https://packages.termux.dev/apt/termux-main/"
DEFAULT_LIBRARY_GLOBS = [
    "usr/lib/*.so*",
    "usr/lib/libz.so*",
    "usr/lib/libcares.so*",
    "usr/lib/libsqlite3.so*",
    "usr/lib/libcrypto.so*",
    "usr/lib/libssl.so*",
    "usr/lib/libicudata.so*",
    "usr/lib/libicui18n.so*",
    "usr/lib/libicuuc.so*",
    "usr/lib/libc++_shared.so",
]
DEFAULT_EXTRA_PACKAGES = ["curl", "wget"]
DEFAULT_TOOL_BINARY_GLOBS = [
    "usr/bin/curl",
    "usr/bin/wget",
]
SYSTEM_LIBRARIES = {"libc.so", "libm.so", "libdl.so"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create node-runtime-android-*.tar.gz from Termux nodejs-lts packages."
    )
    parser.add_argument(
        "--target-platform",
        choices=sorted(TARGETS),
        default=os.environ.get("TARGET_PLATFORM", "android-x64"),
    )
    parser.add_argument("--out-dir", default=os.environ.get("ARTIFACT_DIR", "build/node-runtime-artifacts"))
    parser.add_argument("--repo-url", default=os.environ.get("TERMUX_REPO_URL", DEFAULT_REPO_URL))
    parser.add_argument("--suite", default=os.environ.get("TERMUX_SUITE", "stable"))
    parser.add_argument("--component", default=os.environ.get("TERMUX_COMPONENT", "main"))
    parser.add_argument("--package", default=os.environ.get("TERMUX_NODE_PACKAGE", "nodejs-lts"))
    parser.add_argument("--package-version", default=os.environ.get("TERMUX_NODE_PACKAGE_VERSION", ""))
    parser.add_argument(
        "--extra-packages",
        default=os.environ.get("NODE_RUNTIME_EXTRA_PACKAGES", " ".join(DEFAULT_EXTRA_PACKAGES)),
        help="Space-separated Termux packages to include in addition to Node, e.g. 'curl wget'.",
    )
    parser.add_argument(
        "--tool-binary-globs",
        default=os.environ.get("NODE_RUNTIME_TOOL_BINARY_GLOBS", " ".join(DEFAULT_TOOL_BINARY_GLOBS)),
        help="Space-separated normalized archive globs for command binaries to retain.",
    )
    parser.add_argument(
        "--library-globs",
        default=os.environ.get("NODE_RUNTIME_LIBRARY_GLOBS", " ".join(DEFAULT_LIBRARY_GLOBS)),
        help="Space-separated normalized archive globs to retain from dependency packages.",
    )
    parser.add_argument("--keep-workdir", action="store_true", default=os.environ.get("KEEP_WORKDIR") == "1")
    return parser.parse_args()


def fetch_bytes(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "deep-droid-pilot-runtime-builder"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def parse_packages_index(text: str) -> dict[str, dict[str, str]]:
    packages: dict[str, dict[str, str]] = {}
    for raw_stanza in text.split("\n\n"):
        stanza: dict[str, str] = {}
        key: str | None = None
        for line in raw_stanza.splitlines():
            if not line:
                continue
            if line.startswith(" ") and key is not None:
                stanza[key] += "\n" + line[1:]
                continue
            if ": " not in line:
                continue
            key, value = line.split(": ", 1)
            stanza[key] = value
        name = stanza.get("Package")
        if name:
            packages[name] = stanza
    return packages


def load_packages(repo_url: str, suite: str, component: str, arch: str) -> dict[str, dict[str, str]]:
    repo = repo_url.rstrip("/") + "/"
    base = f"{repo}dists/{suite}/{component}/binary-{arch}/Packages"
    try:
        data = gzip.decompress(fetch_bytes(base + ".gz")).decode("utf-8")
    except Exception:
        data = fetch_bytes(base).decode("utf-8")
    return parse_packages_index(data)


def dependency_names(depends: str | None) -> list[str]:
    if not depends:
        return []
    names: list[str] = []
    for group in depends.replace("\n", " ").split(","):
        alternatives = [part.strip() for part in group.split("|")]
        if not alternatives:
            continue
        name = re.sub(r"\s*\(.*?\)", "", alternatives[0]).strip()
        if name:
            names.append(name)
    return names


def resolve_closure(packages: dict[str, dict[str, str]], root_name: str) -> list[str]:
    resolved: list[str] = []
    seen: set[str] = set()

    def visit(name: str) -> None:
        if name in seen:
            return
        if name not in packages:
            raise RuntimeError(f"Package dependency not found in Termux index: {name}")
        seen.add(name)
        for dependency in dependency_names(packages[name].get("Depends")):
            visit(dependency)
        resolved.append(name)

    visit(root_name)
    return resolved


def verify_sha256(data: bytes, expected: str, label: str) -> None:
    actual = hashlib.sha256(data).hexdigest()
    if actual != expected:
        raise RuntimeError(f"SHA256 mismatch for {label}: expected {expected}, got {actual}")


def iter_ar_members(data: bytes) -> list[tuple[str, bytes]]:
    if not data.startswith(b"!<arch>\n"):
        raise RuntimeError("Not an ar archive")
    members: list[tuple[str, bytes]] = []
    pos = 8
    while pos + 60 <= len(data):
        header = data[pos : pos + 60]
        name = header[:16].decode("utf-8").strip().rstrip("/")
        size = int(header[48:58].decode("utf-8").strip())
        start = pos + 60
        end = start + size
        members.append((name, data[start:end]))
        pos = end + (size % 2)
    return members


def data_tar_from_deb(data: bytes) -> tuple[str, bytes]:
    for name, member_data in iter_ar_members(data):
        if name.startswith("data.tar"):
            return name, member_data
    raise RuntimeError("Deb archive does not contain data.tar.*")


def normalize_member_name(name: str) -> str | None:
    normalized = name.lstrip("./")
    if normalized.startswith(TERMUX_PREFIX):
        normalized = normalized[len(TERMUX_PREFIX) :]
    if normalized in {"", ".", "usr", "usr/bin", "usr/lib"}:
        return None
    if normalized.startswith("usr/"):
        return normalized
    return None


def member_matches(
    name: str,
    package_name: str,
    root_package: str,
    extra_packages: set[str],
    library_globs: list[str],
    tool_binary_globs: list[str],
) -> bool:
    if package_name == root_package and name == "usr/bin/node":
        return True
    if package_name in extra_packages and any(Path(name).match(pattern) for pattern in tool_binary_globs):
        return True
    return any(Path(name).match(pattern) for pattern in library_globs)


def safe_output_path(root: Path, relative: str) -> Path:
    target = (root / relative).resolve()
    if not target.is_relative_to(root.resolve()):
        raise RuntimeError(f"Refusing to write outside runtime root: {relative}")
    return target


def extract_selected_members(
    deb_data: bytes,
    package_name: str,
    root_package: str,
    extra_packages: set[str],
    runtime_root: Path,
    library_globs: list[str],
    tool_binary_globs: list[str],
) -> list[str]:
    tar_name, tar_data = data_tar_from_deb(deb_data)
    mode = "r:xz" if tar_name.endswith(".xz") else "r:gz" if tar_name.endswith(".gz") else "r:"
    extracted: list[str] = []
    pending_symlinks: list[tuple[str, str]] = []
    pending_hardlinks: list[tuple[str, str]] = []
    with tarfile.open(fileobj=io.BytesIO(tar_data), mode=mode) as archive:
        for member in archive.getmembers():
            normalized = normalize_member_name(member.name)
            if not normalized or not member_matches(
                normalized,
                package_name,
                root_package,
                extra_packages,
                library_globs,
                tool_binary_globs,
            ):
                continue
            target = safe_output_path(runtime_root, normalized)
            target.parent.mkdir(parents=True, exist_ok=True)
            if member.isdir():
                target.mkdir(exist_ok=True)
            elif member.issym():
                pending_symlinks.append((normalized, member.linkname))
            elif member.islnk():
                link_target = normalize_member_name(member.linkname) or member.linkname
                pending_hardlinks.append((normalized, link_target))
            elif member.isfile():
                file_obj = archive.extractfile(member)
                if file_obj is None:
                    continue
                target.write_bytes(file_obj.read())
                target.chmod(member.mode & 0o777)
            extracted.append(normalized)

    for normalized, linkname in pending_symlinks:
        target = safe_output_path(runtime_root, normalized)
        if target.exists() or target.is_symlink():
            target.unlink()
        try:
            os.symlink(linkname, target)
        except OSError:
            source = (target.parent / linkname).resolve()
            if not source.exists():
                raise
            shutil.copy2(source, target)

    for normalized, linkname in pending_hardlinks:
        target = safe_output_path(runtime_root, normalized)
        source = safe_output_path(runtime_root, linkname)
        if not source.exists():
            raise RuntimeError(f"Hardlink source missing for {normalized}: {linkname}")
        if target.exists() or target.is_symlink():
            target.unlink()
        try:
            relative_source = os.path.relpath(source, start=target.parent)
            os.symlink(relative_source, target)
        except OSError:
            shutil.copy2(source, target)

    return extracted


def run_readelf_needed(binary_path: Path) -> list[str]:
    readelf = shutil.which("readelf")
    if readelf is None:
        return []
    result = subprocess.run(
        [readelf, "-d", str(binary_path)],
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    return re.findall(r"Shared library: \[(.*?)\]", result.stdout)


def validate_runtime(runtime_root: Path, target: dict[str, str], tool_binary_globs: list[str]) -> dict[str, object]:
    node_path = runtime_root / "usr/bin/node"
    if not node_path.exists():
        raise RuntimeError("Selected runtime does not contain usr/bin/node")
    node_path.chmod(node_path.stat().st_mode | 0o755)

    binaries = [node_path]
    for pattern in tool_binary_globs:
        binaries.extend(sorted(runtime_root.glob(pattern)))
    binaries = sorted(set(binaries))

    needed_by_binary: dict[str, list[str]] = {}
    all_needed: set[str] = set()
    for binary in binaries:
        binary.chmod(binary.stat().st_mode | 0o755)
        needed = run_readelf_needed(binary)
        needed_by_binary[binary.relative_to(runtime_root).as_posix()] = needed
        all_needed.update(needed)

    missing = [
        library
        for library in sorted(all_needed)
        if library not in SYSTEM_LIBRARIES and not (runtime_root / "usr/lib" / library).exists()
    ]
    if missing:
        raise RuntimeError(f"Selected runtime is missing shared libraries: {', '.join(missing)}")

    machine = ""
    readelf = shutil.which("readelf")
    if readelf is not None:
        header = subprocess.run(
            [readelf, "-h", str(node_path)],
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        ).stdout
        match = re.search(r"Machine:\s*(.+)", header)
        machine = match.group(1).strip() if match else ""
        expected_machine = target.get("elf_machine")
        if expected_machine and expected_machine not in machine:
            raise RuntimeError(f"Unexpected Node ELF machine: expected {expected_machine}, got {machine}")

    return {"neededLibraries": sorted(all_needed), "neededLibrariesByBinary": needed_by_binary, "elfMachine": machine}


def dedupe_identical_files_with_symlinks(root: Path) -> dict[str, int]:
    groups: dict[tuple[int, str], list[Path]] = {}
    for file in root.rglob("*"):
        if not file.is_file() or file.is_symlink():
            continue
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        groups.setdefault((file.stat().st_size, digest), []).append(file)

    replaced_files = 0
    saved_bytes = 0
    for files in groups.values():
        if len(files) < 2:
            continue
        canonical = sorted(files, key=lambda item: (len(item.name), item.name), reverse=True)[0]
        for duplicate in files:
            if duplicate == canonical:
                continue
            duplicate_size = duplicate.stat().st_size
            duplicate.unlink()
            relative_target = os.path.relpath(canonical, start=duplicate.parent)
            try:
                os.symlink(relative_target, duplicate)
            except OSError:
                shutil.copy2(canonical, duplicate)
                continue
            replaced_files += 1
            saved_bytes += duplicate_size

    return {"replacedFiles": replaced_files, "savedBytes": saved_bytes}


def write_archive(runtime_root: Path, tar_path: Path) -> None:
    with tarfile.open(tar_path, "w:gz", dereference=False) as archive:
        archive.add(runtime_root / "usr", arcname="usr")


def directory_size(path: Path) -> int:
    total = 0
    for file in path.rglob("*"):
        if file.is_file() and not file.is_symlink():
            total += file.stat().st_size
    return total


def main() -> int:
    args = parse_args()
    target = TARGETS[args.target_platform]
    repo_url = args.repo_url.rstrip("/") + "/"
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    work_dir = Path(tempfile.mkdtemp(prefix="deep-droid-pilot-node-runtime."))
    library_globs = args.library_globs.split()
    extra_packages = [name for name in args.extra_packages.split() if name]
    tool_binary_globs = args.tool_binary_globs.split()

    try:
        packages = load_packages(repo_url, args.suite, args.component, target["termux_arch"])
        if args.package_version:
            actual_version = packages.get(args.package, {}).get("Version")
            if actual_version != args.package_version:
                raise RuntimeError(
                    f"{args.package} version mismatch for {args.target_platform}: "
                    f"expected {args.package_version}, got {actual_version}"
                )
        closure_names: list[str] = []
        for root_package in [args.package, *extra_packages]:
            for package_name in resolve_closure(packages, root_package):
                if package_name not in closure_names:
                    closure_names.append(package_name)
        extra_package_set = set(extra_packages)
        runtime_root = work_dir / "runtime"
        runtime_root.mkdir()
        downloaded: list[dict[str, object]] = []
        extracted_by_package: dict[str, list[str]] = {}

        for name in closure_names:
            stanza = packages[name]
            filename = stanza["Filename"]
            url = repo_url + filename
            data = fetch_bytes(url)
            verify_sha256(data, stanza["SHA256"], filename)
            extracted = extract_selected_members(
                data,
                name,
                args.package,
                extra_package_set,
                runtime_root,
                library_globs,
                tool_binary_globs,
            )
            if extracted:
                extracted_by_package[name] = sorted(extracted)
            downloaded.append(
                {
                    "package": name,
                    "version": stanza.get("Version", ""),
                    "filename": filename,
                    "sha256": stanza.get("SHA256", ""),
                    "selectedFiles": len(extracted),
                }
            )

        library_dedup = dedupe_identical_files_with_symlinks(runtime_root / "usr/lib")
        validation = validate_runtime(runtime_root, target, tool_binary_globs)
        stamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
        package_version = packages[args.package].get("Version", "unknown").replace(":", "_")
        basename = f"node-runtime.{args.target_platform}.{package_version}.{stamp}"
        tar_path = out_dir / f"{basename}.tar.gz"
        sha_path = out_dir / f"{basename}.tar.gz.sha256"
        manifest_path = out_dir / f"{basename}.manifest.json"

        write_archive(runtime_root, tar_path)
        sha256 = hashlib.sha256(tar_path.read_bytes()).hexdigest()
        sha_path.write_text(f"{sha256}  {tar_path.name}\n", encoding="utf-8")

        manifest = {
            "ok": True,
            "artifactKind": "node-runtime",
            "targetPlatform": args.target_platform,
            "termuxArch": target["termux_arch"],
            "androidAbi": target["android_abi"],
            "repoUrl": repo_url,
            "suite": args.suite,
            "component": args.component,
            "rootPackage": args.package,
            "rootPackageVersion": packages[args.package].get("Version", ""),
            "rootPackageVersionPinned": args.package_version or None,
            "extraPackages": [
                {"package": name, "version": packages[name].get("Version", "")}
                for name in extra_packages
            ],
            "toolBinaryGlobs": tool_binary_globs,
            "packageClosure": downloaded,
            "selectedFilesByPackage": extracted_by_package,
            "neededLibraries": validation["neededLibraries"],
            "neededLibrariesByBinary": validation["neededLibrariesByBinary"],
            "elfMachine": validation["elfMachine"],
            "libraryDedup": library_dedup,
            "runtimeBytes": directory_size(runtime_root),
            "usrLibBytes": directory_size(runtime_root / "usr/lib"),
            "nodeBytes": (runtime_root / "usr/bin/node").stat().st_size,
            "tarBytes": tar_path.stat().st_size,
            "sha256": sha256,
            "createdAtUtc": stamp,
        }
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

        print(f"artifact={tar_path}")
        print(f"manifest={manifest_path}")
        print(f"sha256={sha_path}")
        print(json.dumps(manifest, indent=2, ensure_ascii=False))
        return 0
    finally:
        if args.keep_workdir:
            print(f"workdir={work_dir}")
        else:
            shutil.rmtree(work_dir, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
