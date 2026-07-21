#!/usr/bin/env bash
#
# Build the four judge language images (SELF_HOSTED_JUDGE.md Phase 2).
#
#   ./build.sh                   build all
#   ./build.sh cpp java          build a subset
#   ./build.sh --print-digests   print FROM lines pinned by digest, for Phase 6
#
# Tags must match LANGUAGE_SPECS in src/judge/local/languages.ts.
set -euo pipefail

cd "$(dirname "$0")"

declare -a NAMES=(cpp python node java)
declare -a TAGS=(
  "code-arena-judge-cpp:gcc9"
  "code-arena-judge-python:3.8"
  "code-arena-judge-node:12"
  "code-arena-judge-java:13"
)

print_digests() {
  echo "# Paste these into the Dockerfiles to pin by digest (Phase 6)."
  for i in "${!NAMES[@]}"; do
    local base
    base=$(grep -m1 '^FROM ' "${NAMES[$i]}.Dockerfile" | awk '{print $2}')
    if digest=$(docker inspect --format='{{index .RepoDigests 0}}' "$base" 2>/dev/null); then
      echo "FROM ${digest}"
    else
      echo "# ${base} not pulled locally — run a build first"
    fi
  done
}

if [[ "${1:-}" == "--print-digests" ]]; then
  print_digests
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "error: docker daemon unreachable. Start Docker and retry." >&2
  exit 1
fi

# Build everything by default, or just the languages named on the command line.
declare -a SELECTED=()
if [[ $# -eq 0 ]]; then
  SELECTED=("${NAMES[@]}")
else
  SELECTED=("$@")
fi

failed=0
for name in "${SELECTED[@]}"; do
  idx=-1
  for i in "${!NAMES[@]}"; do
    [[ "${NAMES[$i]}" == "$name" ]] && idx=$i && break
  done
  if [[ $idx -lt 0 ]]; then
    echo "error: unknown language '${name}' (expected one of: ${NAMES[*]})" >&2
    exit 2
  fi

  tag="${TAGS[$idx]}"
  echo "==> building ${tag} from ${name}.Dockerfile"
  if docker build -f "${name}.Dockerfile" -t "${tag}" .; then
    echo "    ok: ${tag}"
  else
    # Keep going so one archived base image doesn't hide the state of the rest.
    echo "    FAILED: ${tag}" >&2
    failed=$((failed + 1))
  fi
done

if [[ $failed -gt 0 ]]; then
  echo >&2
  echo "${failed} image(s) failed to build." >&2
  echo "If it was java: openjdk:13-jdk-slim is an archived non-LTS tag. See the" >&2
  echo "note in java.Dockerfile before substituting a different JDK." >&2
  exit 1
fi

echo
echo "All images built. Smoke-test with:"
echo "  pnpm run judge-local -- --lang cpp"
