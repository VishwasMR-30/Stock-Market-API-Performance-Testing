<#
 Starts Prometheus in THIS window (leave the window open; Ctrl+C stops it).
 - listens on http://127.0.0.1:9090
 - accepts metrics pushed by k6 (remote-write receiver)
 - native histograms ON (gives true p95/p99 per moment)
 - uses YOUR existing prometheus\prometheus.yml unchanged
 Usage:  .\grafana-windows\Start-Prometheus.ps1          (add -DryRun to only print the command)
#>
param([string]$Version = "3.5.0", [switch]$DryRun)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if ($env:LOCALAPPDATA) { $base = Join-Path $env:LOCALAPPDATA "k6-monitoring" } else { $base = Join-Path $HOME ".local/share/k6-monitoring" }
$dest   = Join-Path $base "prometheus-$Version.windows-amd64"
$exe    = Join-Path $dest "prometheus.exe"
$config = Join-Path $root "prometheus/prometheus.yml"
$data   = Join-Path $base "prometheus-data"

if (-not (Test-Path $config)) { throw "Config not found: $config (run this from your project; the file prometheus\prometheus.yml must exist)" }
if (-not $DryRun -and -not (Test-Path $exe)) { throw "prometheus.exe not found. Run .\grafana-windows\Setup-Prometheus.ps1 first." }

$argList = @(
    "--config.file=$config",
    "--storage.tsdb.path=$data",
    "--web.enable-remote-write-receiver",
    "--enable-feature=native-histograms",
    "--web.listen-address=127.0.0.1:9090",
    "--storage.tsdb.retention.time=30d"
)

if ($DryRun) {
    Write-Host "$exe"
    $argList | ForEach-Object { Write-Host "   $_" }
    return
}

Write-Host "Starting Prometheus on http://127.0.0.1:9090  (leave this window open, Ctrl+C to stop)" -ForegroundColor Green
& $exe @argList
