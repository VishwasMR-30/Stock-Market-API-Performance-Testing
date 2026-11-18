<#
 Runs one k6 test, sends the live metrics to Prometheus (-> Grafana), and saves an HTML report + JSON summary in results\.
 It asks the API whether the seeded defects are ON or OFF and labels the run automatically (build=seeded / build=fixed),
 so the labels in Grafana can never be wrong.

 Examples:
   .\grafana-windows\Run-K6.ps1 -Test functional
   .\grafana-windows\Run-K6.ps1 -Test load
   .\grafana-windows\Run-K6.ps1 -Test load -Peak 200
   .\grafana-windows\Run-K6.ps1 -Test soak -SoakDuration 5m
 Your k6 scripts are used exactly as they are.
#>
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("functional", "smoke", "load", "stress", "spike", "soak")]
    [string]$Test,
    [string]$BaseUrl       = "http://127.0.0.1:8000",
    [string]$PrometheusUrl = "http://127.0.0.1:9090/api/v1/write",
    [string]$Peak          = "",
    [string]$SoakDuration  = "",
    [switch]$NoPrometheus
)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/health" -TimeoutSec 5
} catch {
    Write-Host "The API is not reachable at $BaseUrl. Start it first (see the guide, step 'Start the API')." -ForegroundColor Red
    exit 1
}
if ($health.seeded_defects) { $build = "seeded" } else { $build = "fixed" }
$run   = Get-Date -Format "MMdd-HHmmss"
$label = "$Test-$build-$run"
New-Item -ItemType Directory -Force -Path "results" | Out-Null

# k6 -> Prometheus settings (documented k6 options)
$env:K6_PROMETHEUS_RW_SERVER_URL                = $PrometheusUrl
$env:K6_FEATURES                                = "native-histograms"
$env:K6_PROMETHEUS_RW_STALE_MARKERS             = "true"
# k6's built-in live dashboard (http://127.0.0.1:5665 while the test runs) + HTML report file
$env:K6_WEB_DASHBOARD        = "true"
$env:K6_WEB_DASHBOARD_EXPORT = "results/$label-report.html"

$k6args = @("run", "-e", "BASE_URL=$BaseUrl")
if ($Peak)         { $k6args += @("-e", "PEAK=$Peak") }
if ($SoakDuration) { $k6args += @("-e", "SOAK_DURATION=$SoakDuration") }
if (-not $NoPrometheus) {
    $k6args += @("-o", "experimental-prometheus-rw", "--tag", "test=$Test", "--tag", "build=$build", "--tag", "run=$run")
}
$k6args += @("--summary-export=results/$label-summary.json", "k6/$Test.js")

Write-Host ""
Write-Host "Running '$Test' against the $build build ($BaseUrl)" -ForegroundColor Cyan
Write-Host "  Grafana label : test=$Test, build=$build, run=$run"
Write-Host "  Report files  : results\$label-report.html and results\$label-summary.json"
Write-Host ""

& k6 @k6args
$code = $LASTEXITCODE

Write-Host ""
if ($code -eq 0)      { Write-Host "k6 exit code 0: the test ran and all thresholds passed." -ForegroundColor Green }
elseif ($code -eq 99) { Write-Host "k6 exit code 99: the test ran, but at least one threshold failed. This is a valid test result (expected on the seeded build)." -ForegroundColor Yellow }
else                  { Write-Host "k6 exit code $code : the test did not run correctly. Read the messages above." -ForegroundColor Red }
exit $code
