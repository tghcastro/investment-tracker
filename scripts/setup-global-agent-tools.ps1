$ErrorActionPreference = 'Stop'

# Caveman default mode (global)
$cavemanConfigDir = Join-Path $env:USERPROFILE '.config\caveman'
New-Item -ItemType Directory -Force -Path $cavemanConfigDir | Out-Null
@'
{
  "defaultMode": "ultra"
}
'@ | Set-Content -Path (Join-Path $cavemanConfigDir 'config.json') -Encoding UTF8

# User-level Cursor rule (all projects / agents in Cursor)
$cursorRulesDir = Join-Path $env:USERPROFILE '.cursor\rules'
New-Item -ItemType Directory -Force -Path $cursorRulesDir | Out-Null
@'
---
description: Always use caveman ultra communication mode
alwaysApply: true
---

# Caveman Ultra (always on)

ACTIVE EVERY RESPONSE. Mode: **ultra**. Off only if user says "stop caveman" or "normal mode".

Respond terse like smart caveman. All technical substance stay. Only fluff die.

## Ultra rules

- Abbreviate prose words (DB/auth/config/req/res/fn/impl)
- Strip conjunctions; use arrows for causality (X → Y)
- One word when one word enough
- Never abbreviate code symbols, function names, API names, error strings
- Code blocks, commits, PR bodies: write normal

## Auto-clarity

Drop caveman for security warnings, irreversible confirmations, ambiguous multi-step sequences, or when user asks to clarify. Resume after.

'@ | Set-Content -Path (Join-Path $cursorRulesDir 'caveman-ultra.mdc') -Encoding UTF8

# Persist default mode for caveman tooling
[Environment]::SetEnvironmentVariable('CAVEMAN_DEFAULT_MODE', 'ultra', 'User')

Write-Host 'Caveman ultra configured globally.'

# RTK: Windows binary + WSL hook/PATH (Cursor Shell preToolUse)
$rtkWindowsInstaller = Join-Path $PSScriptRoot 'install-rtk-windows.ps1'
$rtkPathScript = Join-Path $PSScriptRoot 'add-rtk-to-path.ps1'
$rtkWslInstaller = Join-Path $PSScriptRoot 'install-rtk-wsl.ps1'

if (Test-Path $rtkWindowsInstaller) {
  & $rtkWindowsInstaller
} else {
  Write-Host "Skipped RTK Windows install (missing $rtkWindowsInstaller)"
}

if (Test-Path $rtkPathScript) {
  & $rtkPathScript
}

if (Get-Command wsl -ErrorAction SilentlyContinue) {
  if (Test-Path $rtkWslInstaller) {
    & $rtkWslInstaller
  } else {
    Write-Host "Skipped RTK WSL install (missing $rtkWslInstaller)"
  }
} else {
  Write-Host 'Skipped RTK WSL install (wsl not available).'
}
