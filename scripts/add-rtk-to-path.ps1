$ErrorActionPreference = 'Stop'
$bin = Join-Path $env:USERPROFILE '.local\bin'
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -notlike "*$bin*") {
  [Environment]::SetEnvironmentVariable('Path', "$bin;$userPath", 'User')
  Write-Host "Added $bin to user PATH"
} else {
  Write-Host "RTK bin already on user PATH"
}
$env:Path = "$bin;$env:Path"
& (Join-Path $bin 'rtk.exe') init --show
