$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$wslScript = Join-Path $repoRoot 'scripts/install-rtk-wsl.sh'

if (-not (Test-Path $wslScript)) {
  throw "Missing WSL installer: $wslScript"
}

$driveLetter = $repoRoot.Substring(0, 1).ToLower()
$repoTail = $repoRoot.Substring(2).Replace('\', '/')
$wslRepo = "/mnt/$driveLetter$repoTail"

Write-Host "Running RTK WSL setup via Ubuntu..."
wsl -d Ubuntu -e bash -lc "cd '$wslRepo' && chmod +x scripts/install-rtk-wsl.sh && ./scripts/install-rtk-wsl.sh"

Write-Host ""
Write-Host "RTK WSL setup finished. Restart Cursor if it was open."
