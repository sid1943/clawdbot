#!/bin/bash
# webos-iptv — one-command setup
# Installs prerequisites, then hands off to the TypeScript setup script
# which discovers the TV, enables Dev Mode, builds, and deploys.
#
# Usage: ./setup.sh [tv-ip]
set -euo pipefail

GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
BOLD="\033[1m"
RESET="\033[0m"

info()  { echo -e "${GREEN}▸${RESET} $1"; }
warn()  { echo -e "${YELLOW}▸${RESET} $1"; }
error() { echo -e "${RED}✗${RESET} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "\n${BOLD}webOS IPTV — Automated Setup${RESET}\n"

# ─── Prerequisites ───────────────────────────────────────────
info "Checking prerequisites..."

# Node.js
if ! command -v node &>/dev/null; then
  if command -v brew &>/dev/null; then
    info "Installing Node.js via Homebrew..."
    brew install node
  else
    error "Node.js not found. Install via: brew install node"
  fi
fi
info "Node.js $(node -v)"

# Bun
if ! command -v bun &>/dev/null; then
  info "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi
info "Bun $(bun -v)"

# webOS CLI tools
if ! command -v ares-install &>/dev/null; then
  info "Installing webOS CLI tools..."
  npm install -g @webos-tools/cli
fi
info "ares-install ready"

# ─── Install deps ────────────────────────────────────────────
info "Installing project dependencies..."
bun install --silent 2>/dev/null || bun install

# ─── Hand off to TypeScript ──────────────────────────────────
# The TS script handles: TV discovery, SSAP pairing, Dev Mode,
# device registration, build, package, deploy.
exec bun run scripts/setup-tv.ts "$@"
