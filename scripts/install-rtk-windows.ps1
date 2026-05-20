$ErrorActionPreference = 'Stop'
$binDir = Join-Path $env:USERPROFILE '.local\bin'
New-Item -ItemType Directory -Force -Path $binDir | Out-Null
$zip = Join-Path $env:TEMP 'rtk-win.zip'
$url = 'https://github.com/rtk-ai/rtk/releases/download/v0.40.0/rtk-x86_64-pc-windows-msvc.zip'
Invoke-WebRequest -Uri $url -OutFile $zip
$extractDir = Join-Path $env:TEMP 'rtk-extract'
if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
Expand-Archive -Path $zip -DestinationPath $extractDir -Force
$rtkExe = Get-ChildItem $extractDir -Recurse -Filter 'rtk.exe' | Select-Object -First 1
Copy-Item $rtkExe.FullName (Join-Path $binDir 'rtk.exe') -Force
& (Join-Path $binDir 'rtk.exe') --version
