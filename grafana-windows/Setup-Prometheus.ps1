<#
 One-time setup: downloads Prometheus for Windows (no Docker, no installer) and unzips it.
 It is installed OUTSIDE your project (in %LOCALAPPDATA%\k6-monitoring) so OneDrive and Git ignore it.
 Usage:  .\grafana-windows\Setup-Prometheus.ps1
#>
param([string]$Version = "3.5.0")

$ErrorActionPreference = "Stop"
if ($env:LOCALAPPDATA) { $base = Join-Path $env:LOCALAPPDATA "k6-monitoring" } else { $base = Join-Path $HOME ".local/share/k6-monitoring" }
$name = "prometheus-$Version.windows-amd64"
$dest = Join-Path $base $name

if (Test-Path (Join-Path $dest "prometheus.exe")) {
    Write-Host "Prometheus is already installed: $dest" -ForegroundColor Green
    return
}

New-Item -ItemType Directory -Force -Path $base | Out-Null
$zip = Join-Path $base "$name.zip"
$url = "https://github.com/prometheus/prometheus/releases/download/v$Version/$name.zip"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = "SilentlyContinue"   # makes the download much faster in Windows PowerShell 5.1

Write-Host "Downloading $url ..."
Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
Write-Host "Unzipping ..."
Expand-Archive -Path $zip -DestinationPath $base -Force
Remove-Item $zip

Write-Host "Installed: $dest" -ForegroundColor Green
Write-Host "Next: .\grafana-windows\Start-Prometheus.ps1"
