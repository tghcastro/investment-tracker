#!/usr/bin/env bash
# Install RTK in WSL, persist PATH, and register the Cursor hook.
# Usage:
#   ./scripts/install-rtk-wsl.sh
#   RTK_TARGET_WINDOWS_HOME=1 ./scripts/install-rtk-wsl.sh   # also init into Windows ~/.claude

set -euo pipefail

RTK_INSTALL_URL="${RTK_INSTALL_URL:-https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh}"
INSTALL_DIR="${HOME}/.local/bin"
PATH_MARKER='# RTK (investment-tracker install-rtk-wsl.sh)'
PATH_LINE='export PATH="$HOME/.local/bin:$PATH"'

info() { printf '[rtk-wsl] %s\n' "$1"; }
warn() { printf '[rtk-wsl] WARN: %s\n' "$1" >&2; }

ensure_path_in_shell_rc() {
  local rc_file="$1"

  if [[ ! -f "$rc_file" ]]; then
    touch "$rc_file"
  fi

  if grep -Fq "$PATH_MARKER" "$rc_file"; then
    info "PATH already configured in ${rc_file}"
    return
  fi

  {
    echo ""
    echo "$PATH_MARKER"
    echo "$PATH_LINE"
  } >>"$rc_file"

  info "Added ~/.local/bin to PATH in ${rc_file}"
}

install_rtk() {
  if [[ -x "${INSTALL_DIR}/rtk" ]]; then
    info "RTK already installed at ${INSTALL_DIR}/rtk ($("${INSTALL_DIR}/rtk" --version))"
    return
  fi

  info "Installing RTK to ${INSTALL_DIR}..."
  curl -fsSL "$RTK_INSTALL_URL" | sh
}

init_rtk() {
  local home_dir="$1"
  local label="$2"

  info "Configuring RTK for ${label} (HOME=${home_dir})..."
  HOME="$home_dir" "${INSTALL_DIR}/rtk" init -g --agent cursor --auto-patch

  if [[ "${RTK_TARGET_WINDOWS_HOME:-0}" == "1" ]]; then
    HOME="$home_dir" "${INSTALL_DIR}/rtk" init -g --auto-patch
  fi
}

detect_windows_home() {
  local users_dir="/mnt/c/Users"
  local candidate=""

  if [[ ! -d "$users_dir" ]]; then
    return 1
  fi

  for candidate in "$users_dir"/*; do
    [[ -d "$candidate" ]] || continue
    case "$(basename "$candidate")" in
      Public|Default|Default\ User|All\ Users) continue ;;
    esac
    if [[ -d "${candidate}/.cursor" || -f "${candidate}/.local/bin/rtk.exe" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

main() {
  if [[ "$(uname -s)" != "Linux" ]]; then
    warn "Run this script inside WSL/Linux, not native Windows."
    exit 1
  fi

  install_rtk
  ensure_path_in_shell_rc "${HOME}/.bashrc"
  ensure_path_in_shell_rc "${HOME}/.zshrc"

  export PATH="${INSTALL_DIR}:${PATH}"

  init_rtk "${HOME}" "WSL home"

  if windows_home="$(detect_windows_home)"; then
    init_rtk "$windows_home" "Windows home (${windows_home})"
  else
    warn "Windows home not detected; skipped Windows-side RTK init."
    warn "Set RTK_TARGET_WINDOWS_HOME=1 and HOME=/mnt/c/Users/<you> to target manually."
  fi

  info "Verification (WSL):"
  "${INSTALL_DIR}/rtk" init --show

  info "Done. Restart Cursor, then run: rtk init --show"
  info "If PATH is missing in this shell: source ~/.zshrc  # or ~/.bashrc"
}

main "$@"
