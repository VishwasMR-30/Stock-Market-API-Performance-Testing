<#
 Proves that REAL k6 metrics are stored in Prometheus (the data Grafana reads). Prints PASS / FAIL lines.
 Usage:  .\grafana-windows\Verify-Metrics.ps1
#>
param([string]$PrometheusBase = "http://127.0.0.1:9090")

function Query([string]$expr) {
    $u = "$PrometheusBase/api/v1/query?query=" + [uri]::EscapeDataString($expr)
    return (Invoke-RestMethod -Uri $u -TimeoutSec 15).data.result
}
function Pass([string]$m) { Write-Host "PASS  $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL  $m" -ForegroundColor Red }

try {
    $ready = Invoke-WebRequest -Uri "$PrometheusBase/-/ready" -UseBasicParsing -TimeoutSec 5
    Pass "Prometheus is running at $PrometheusBase"
} catch {
    Fail "Prometheus is not reachable at $PrometheusBase. Start it with .\grafana-windows\Start-Prometheus.ps1"
    exit 1
}

$names = (Invoke-RestMethod -Uri "$PrometheusBase/api/v1/label/__name__/values").data | Where-Object { $_ -like "k6_*" }
if ($names.Count -gt 0) { Pass "$($names.Count) k6 metric names are stored (examples: $((($names | Select-Object -First 3) -join ", ")))" } else { Fail "No k6_* metrics found yet. Run a test with .\grafana-windows\Run-K6.ps1 -Test smoke" ; exit 1 }

foreach ($m in @("k6_vus", "k6_http_reqs_total", "k6_checks_rate", "k6_http_req_duration_seconds")) {
    if ($names -contains $m) { Pass "metric $m exists" } else { Fail "metric $m is missing" }
}

$hist = Query "count(last_over_time(k6_http_req_duration_seconds[7d]))"
if ($hist) { Pass "native histogram data present (needed for p95/p99)" } else { Fail "no native histogram data: check Prometheus was started with Start-Prometheus.ps1 and k6 with Run-K6.ps1" }

Write-Host ""
Write-Host "Runs stored in Prometheus (requests sent per test/build):" -ForegroundColor Cyan
$rows = Query "sum by (test, build) (last_over_time(k6_http_reqs_total[7d]))"
if ($rows) {
    foreach ($r in $rows) { Write-Host ("  {0,-12} {1,-8} {2,10} requests" -f $r.metric.test, $r.metric.build, [math]::Round([double]$r.value[1])) }
} else { Fail "no k6_http_reqs_total data" }
Write-Host ""
Write-Host "Compare these request counts with the 'http_reqs' line in the k6 terminal output of the same run: they should be identical."
