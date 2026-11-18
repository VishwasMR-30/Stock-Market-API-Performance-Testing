# Windows PowerShell helper.   Usage examples:
#   .\run-test.ps1 smoke
#   .\run-test.ps1 functional
#   .\run-test.ps1 load
#   .\run-test.ps1 load -e PEAK=200
# Runs the k6 script INSIDE Docker, sends live metrics to Grafana, and saves
# an HTML report + JSON summary into the results\ folder.
$Test  = if ($args.Count -gt 0) { $args[0] } else { "smoke" }
$Extra = if ($args.Count -gt 1) { $args[1..($args.Count - 1)] } else { @() }
docker compose run --rm `
  -e "K6_WEB_DASHBOARD_EXPORT=/results/$Test-report.html" `
  k6 run -o experimental-prometheus-rw `
  "--summary-export=/results/$Test-summary.json" `
  @Extra "/scripts/$Test.js"
