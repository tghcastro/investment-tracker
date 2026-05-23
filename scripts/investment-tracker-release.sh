#!/usr/bin/env bash
# Release Investment Tracker: git tag, GitHub release, Docker Hub images.
#
# Usage:
#   ./scripts/investment-tracker-release.sh <tag>
#   ./scripts/investment-tracker-release.sh v1.0.0
#
# From Windows (WSL):
#   wsl -d Ubuntu -e bash -lc 'cd /mnt/d/workspace/investment-tracker && ./scripts/investment-tracker-release.sh v1.0.0'
#
# Git:
#   Creates annotated tag <tag> and pushes to origin (unless disabled).
#
# GitHub:
#   Creates a GitHub release for <tag> via gh CLI (unless disabled).
#
# Docker images:
#   tghcastro/investment-tracker:api-<tag>
#   tghcastro/investment-tracker:web-<tag>
#
# Env:
#   DOCKER_IMAGE              default: tghcastro/investment-tracker
#   DOCKER_PUSH=0             build only, skip docker push
#   GIT_REMOTE                default: origin
#   GIT_TAG=0                 skip git tag create/push
#   GIT_PUSH=0                create tag locally only, skip git push
#   GH_RELEASE=0              skip GitHub release
#   GH_RELEASE_DRAFT=1        create draft release
#   GH_RELEASE_GENERATE_NOTES=1 append auto-generated PR/commit notes
#   GH_RELEASE_NOTES          extra release notes text
#   GH_RELEASE_NOTES_FILE     extra release notes file
#   SKIP_GIT_CLEAN=1          allow dirty working tree
#   VITE_API_URL              passed to web build (default: empty)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOCKER_IMAGE="${DOCKER_IMAGE:-tghcastro/investment-tracker}"
VITE_API_URL="${VITE_API_URL:-}"
DOCKER_PUSH="${DOCKER_PUSH:-1}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_TAG="${GIT_TAG:-1}"
GIT_PUSH="${GIT_PUSH:-1}"
GH_RELEASE="${GH_RELEASE:-1}"
GH_RELEASE_DRAFT="${GH_RELEASE_DRAFT:-0}"
GH_RELEASE_GENERATE_NOTES="${GH_RELEASE_GENERATE_NOTES:-0}"
SKIP_GIT_CLEAN="${SKIP_GIT_CLEAN:-0}"

info() { printf '[release] %s\n' "$1"; }
err() { printf '[release] ERROR: %s\n' "$1" >&2; }

usage() {
  cat <<EOF
Usage: $(basename "$0") <tag>

Create git tag, GitHub release, build Docker images, push tag + images.

  tag    Release tag (e.g. v1.0.0, latest, 20250523)

Git:
  Annotated tag: <tag>
  Remote: ${GIT_REMOTE}

GitHub:
  Release: <tag> (via gh CLI)

Docker:
  ${DOCKER_IMAGE}:api-<tag>
  ${DOCKER_IMAGE}:web-<tag>

Requires \`docker login\` before docker push and \`gh auth login\` for GitHub release.

Env:
  DOCKER_IMAGE              Hub repository (default: tghcastro/investment-tracker)
  DOCKER_PUSH=0             build only, skip docker push
  GIT_REMOTE                git remote for tag push (default: origin)
  GIT_TAG=0                 skip git tag create/push
  GIT_PUSH=0                create tag locally only
  GH_RELEASE=0              skip GitHub release
  GH_RELEASE_DRAFT=1        create draft release
  GH_RELEASE_GENERATE_NOTES=1 append auto-generated notes
  GH_RELEASE_NOTES          extra release notes text
  GH_RELEASE_NOTES_FILE     extra release notes file
  SKIP_GIT_CLEAN=1          allow uncommitted changes
  VITE_API_URL              web build arg (default: empty)
EOF
}

require_linux() {
  if [[ "$(uname -s)" != "Linux" ]]; then
    err "Run inside WSL/Linux, not native Windows."
    exit 1
  fi
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    err "docker not found in PATH."
    exit 1
  fi
}

require_git() {
  if ! command -v git >/dev/null 2>&1; then
    err "git not found in PATH."
    exit 1
  fi

  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    err "Not inside a git repository."
    exit 1
  fi
}

require_gh() {
  if ! command -v gh >/dev/null 2>&1; then
    err "gh CLI not found. Install GitHub CLI or set GH_RELEASE=0."
    exit 1
  fi

  if ! gh auth status >/dev/null 2>&1; then
    err "gh not authenticated. Run: gh auth login (or set GH_RELEASE=0)."
    exit 1
  fi
}

ensure_clean_tree() {
  if [[ "$SKIP_GIT_CLEAN" == "1" ]]; then
    warn_dirty_tree
    return
  fi

  if ! git diff --quiet || ! git diff --cached --quiet; then
    err "Working tree has uncommitted changes. Commit/stash first or set SKIP_GIT_CLEAN=1."
    exit 1
  fi
}

warn_dirty_tree() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    info "WARN: working tree dirty (SKIP_GIT_CLEAN=1)"
  fi
}

ensure_tag_available() {
  local tag="$1"

  if git rev-parse "$tag" >/dev/null 2>&1; then
    err "Git tag already exists: ${tag}"
    exit 1
  fi
}

create_git_tag() {
  local tag="$1"

  if [[ "$GIT_TAG" == "0" ]]; then
    info "GIT_TAG=0 -> skip git tag"
    return
  fi

  ensure_clean_tree
  ensure_tag_available "$tag"

  info "Creating annotated git tag ${tag}"
  git tag -a "$tag" -m "Release ${tag}"
}

push_git_tag() {
  local tag="$1"

  if [[ "$GIT_TAG" == "0" ]]; then
    return
  fi

  if [[ "$GIT_PUSH" == "0" ]]; then
    info "GIT_PUSH=0 -> skip git tag push"
    return
  fi

  info "Pushing git tag ${tag} -> ${GIT_REMOTE}"
  git push "$GIT_REMOTE" "$tag"
}

build_docker_images() {
  local tag="$1"
  local api_image="${DOCKER_IMAGE}:api-${tag}"
  local web_image="${DOCKER_IMAGE}:web-${tag}"

  info "Building API -> ${api_image}"
  docker build -f docker/api/Dockerfile -t "$api_image" .

  info "Building web -> ${web_image}"
  docker build \
    -f docker/web/Dockerfile \
    --build-arg "VITE_API_URL=${VITE_API_URL}" \
    -t "$web_image" \
    .

  printf '%s\n' "$api_image" "$web_image"
}

push_docker_images() {
  local api_image="$1"
  local web_image="$2"

  if [[ "$DOCKER_PUSH" == "0" ]]; then
    info "DOCKER_PUSH=0 -> skip docker push"
    return
  fi

  info "Pushing ${api_image}"
  docker push "$api_image"

  info "Pushing ${web_image}"
  docker push "$web_image"
}

create_github_release() {
  local tag="$1"
  local api_image="$2"
  local web_image="$3"
  local notes_file=""
  local -a args=()

  if [[ "$GH_RELEASE" == "0" ]]; then
    info "GH_RELEASE=0 -> skip GitHub release"
    return
  fi

  if [[ "$GIT_TAG" == "0" || "$GIT_PUSH" == "0" ]]; then
    info "Git tag not pushed -> skip GitHub release"
    return
  fi

  require_gh

  if gh release view "$tag" >/dev/null 2>&1; then
    err "GitHub release already exists: ${tag}"
    exit 1
  fi

  notes_file="$(mktemp)"
  {
    printf '## Docker images\n\n'
    printf -- '- `%s`\n' "$api_image"
    printf -- '- `%s`\n' "$web_image"

    if [[ -n "${GH_RELEASE_NOTES:-}" ]]; then
      printf '\n%s\n' "$GH_RELEASE_NOTES"
    elif [[ -n "${GH_RELEASE_NOTES_FILE:-}" && -f "$GH_RELEASE_NOTES_FILE" ]]; then
      printf '\n'
      cat "$GH_RELEASE_NOTES_FILE"
    fi
  } >"$notes_file"

  args=(
    release create "$tag"
    --title "Release ${tag}"
    --notes-file "$notes_file"
  )

  if [[ "$GH_RELEASE_DRAFT" == "1" ]]; then
    args+=(--draft)
  fi

  if [[ "$GH_RELEASE_GENERATE_NOTES" == "1" ]]; then
    args+=(--generate-notes)
  fi

  info "Creating GitHub release ${tag}"
  gh "${args[@]}"
  rm -f "$notes_file"
}

main() {
  local tag="${1:-}"

  if [[ -z "$tag" || "$tag" == "-h" || "$tag" == "--help" ]]; then
    usage
    [[ -z "$tag" ]] && exit 1 || exit 0
  fi

  require_linux
  require_docker
  require_git

  mapfile -t images < <(build_docker_images "$tag")
  create_git_tag "$tag"
  push_docker_images "${images[0]}" "${images[1]}"
  push_git_tag "$tag"
  create_github_release "$tag" "${images[0]}" "${images[1]}"

  info "Release ${tag} complete."
}

main "$@"
