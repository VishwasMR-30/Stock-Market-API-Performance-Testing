# Grafana monitoring dashboard for the k6 project (Windows, no Docker)

This adds a real Grafana dashboard to your existing project **without changing your k6 scripts, backend, or any existing file**.
Everything new lives in `grafana-windows\` and this file.

## 1. How the data gets from k6 to Grafana

```
 k6 (virtual users) --HTTP--> Stock API (FastAPI)
   |
   | pushes its metrics every ~5 s ("Prometheus remote write")
   v
 Prometheus  (database for time-series, http://127.0.0.1:9090)
   ^
   | Grafana READS from it (a "data source")
 Grafana (http://localhost:3000)  -->  your dashboard
```

* **k6 does not talk to Grafana.** It pushes numbers into **Prometheus**, and Grafana draws what Prometheus stores.
* The required **data source is Prometheus**. In Grafana you add it once (URL `http://127.0.0.1:9090`).
* k6 setting used: output `experimental-prometheus-rw`, with `K6_PROMETHEUS_RW_SERVER_URL`, `K6_FEATURES=native-histograms` and `K6_PROMETHEUS_RW_STALE_MARKERS=true`. `Run-K6.ps1` sets all of this for you.
* **Native histograms** are why p95/p99 are correct *per moment*. Without them k6 sends only running values since the test started, which never recover after a spike. I tested both; native histograms behave correctly.
* Every run is labelled automatically: `test` (load, stress...), `build` (seeded or fixed, read from `/health`) and `run` (a time stamp). This is how the dashboard can compare tests, and `run` keeps re-runs from mixing.

## 2. Audit of your existing files (nothing was changed or deleted)

| Existing file | Verdict |
|---|---|
| `k6\*.js`, `k6\lib\common.js` | Byte-identical to the originals. **Used unchanged.** None of them tags a run with a test name, so comparison is done with k6's `--tag` option instead of editing them. |
| `prometheus\prometheus.yml` | **Compatible. Used unchanged.** (`scrape_configs: []` is valid; k6 pushes, Prometheus does not scrape.) I started Prometheus 3.5.0 with it. |
| `grafana\provisioning\datasources\prometheus.yml` | **Not usable locally.** Its URL is `http://prometheus:9090`, a Docker-only hostname. Not needed: you add the data source in the Grafana screen. |
| `grafana\dashboards\k6-stock-dashboard.json` | **Not used.** It hard-codes a data source id (`prometheus`) that a Grafana you install by hand does not have, has no test/build filters, no comparison, and averages per-endpoint averages. |
| `docker-compose.yml`, `Dockerfile`, `run-test.ps1` | Docker only. Ignored, not deleted. |

## 3. One-time setup

Open **Windows PowerShell** in your project folder. If your zip is in Downloads, extract it into the project (it only adds new files):

```powershell
cd "C:\Users\Vishwas M R\OneDrive\Desktop\StockMarketPerformanceTesting\stock-k6-project"
Expand-Archive -Path "$HOME\Downloads\grafana-windows-addon.zip" -DestinationPath . -Force
Get-ChildItem .\grafana-windows -Recurse | Unblock-File
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass     # lasts only for this window
```
Repeat the `Set-ExecutionPolicy` line in every new PowerShell window.

**A. Install Prometheus** (about 150 MB download, 300 MB on disk, stored outside OneDrive in `%LOCALAPPDATA%\k6-monitoring`):
```powershell
.\grafana-windows\Setup-Prometheus.ps1
```

**B. Install Grafana** (official installer): open https://grafana.com/grafana/download?platform=windows, choose **Grafana OSS**, download the **Windows installer (.msi)** and run it with the defaults. It installs a Windows service on port 3000. Check it:
```powershell
Get-Service | Where-Object { $_.Name -like "*rafana*" }      # Status should be Running
```
Open http://localhost:3000 and log in with `admin` / `admin` (it asks you to set a new password).
(I could not confirm an official `winget` package for Grafana OSS, so use the installer.)

## 4. Start everything (three PowerShell windows)

**Window 1: the API** (`"on"` = seeded defects, `"off"` = fixed; press Ctrl+C before switching):
```powershell
cd "C:\Users\Vishwas M R\OneDrive\Desktop\StockMarketPerformanceTesting\stock-k6-project"
$env:SEEDED_DEFECTS = "on"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level warning
```
Do not use `--reload` for tests: saving any file would restart the API and wipe its data.

**Window 2: Prometheus** (leave it open):
```powershell
cd "C:\Users\Vishwas M R\OneDrive\Desktop\StockMarketPerformanceTesting\stock-k6-project"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\grafana-windows\Start-Prometheus.ps1
```

**Window 3: you work here.** Check both are up:
```powershell
cd "C:\Users\Vishwas M R\OneDrive\Desktop\StockMarketPerformanceTesting\stock-k6-project"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
curl.exe http://127.0.0.1:8000/health        # {"status":"ok","seeded_defects":true}
curl.exe http://127.0.0.1:9090/-/ready       # Prometheus Server is Ready.
```

## 5. Connect Grafana and import the dashboard

1. Open http://localhost:3000, then the menu (☰) → **Connections → Data sources → Add data source → Prometheus**.
2. **URL:** `http://127.0.0.1:9090` → **Save & test**. You should see a green "Successfully queried the Prometheus API". (Menu names differ slightly between Grafana versions.)
3. Menu → **Dashboards → New → Import → Upload dashboard JSON file** → choose `grafana-windows\k6-stock-windows-dashboard.json`.
4. In the **Prometheus** drop-down choose the data source you just made → **Import**.
5. Top right: set the time range to **Last 1 hour** (or longer if you want all your runs in the comparison section).

The panels stay empty until you run a test. That is normal.

## 6. Run the tests (Window 3)

```powershell
.\grafana-windows\Run-K6.ps1 -Test smoke          # 30 s: first end-to-end check
.\grafana-windows\Verify-Metrics.ps1              # section 7: PASS lines expected
```
Then, in this order (restart Window 1 with `"off"` at the marked point):

| Step | API mode | Command | Time |
|---|---|---|---|
| 1 | on | `.\grafana-windows\Run-K6.ps1 -Test functional` | seconds |
| 2 | on | `.\grafana-windows\Run-K6.ps1 -Test load` | 4.5 min |
| 3 | **restart with off** | `.\grafana-windows\Run-K6.ps1 -Test functional` | seconds |
| 4 | off | `.\grafana-windows\Run-K6.ps1 -Test load` | 4.5 min |
| 5 | off | `.\grafana-windows\Run-K6.ps1 -Test stress` | 5 min |
| 6 | off | `.\grafana-windows\Run-K6.ps1 -Test spike` | 3 min |
| 7 | off | `.\grafana-windows\Run-K6.ps1 -Test soak -SoakDuration 5m` | 8 min |

Options: `-Peak 200` (load test peak users). Each run saves `results\<test>-<build>-<run>-report.html` (HTML report) and `...-summary.json`, and k6 shows its own live view at http://127.0.0.1:5665 while it runs. k6 exit code 99 means "a threshold failed" (a valid result on the seeded build); 0 means all thresholds passed.
Run `functional` only when no load test is running (it resets all users' data).

## 7. Verify that real metrics are appearing (do these in order)

1. **k6 terminal** shows `output: Prometheus remote write (http://127.0.0.1:9090/api/v1/write)` and no errors.
2. **Script check:** `.\grafana-windows\Verify-Metrics.ps1` prints `PASS` lines and a table of runs with their request counts. **Each count must equal the `http_reqs` line k6 printed for that run.** If they match, the data is real.
3. **Prometheus itself:** open http://127.0.0.1:9090 → type `k6_vus` → **Execute** → **Graph** (during a test you see the line).
4. **Grafana Explore:** ☰ → **Explore** → pick the Prometheus data source → query `k6_http_reqs_total` → you see series with the labels `test`, `build`, `run`.
5. **Dashboard:** panels fill within about 5-10 seconds of a test starting. After a run, compare **p95 latency (whole run)** with k6's `p(95)` and **Total requests** with `http_reqs`: p95 agrees within a few percent (histogram buckets), requests exactly.

## 8. What each panel shows (your 7 requirements)

| Requirement | Panel | Real k6 metric used |
|---|---|---|
| Virtual Users over time | Virtual Users over time | `k6_vus` |
| Requests per second | Requests per second | `rate(k6_http_reqs_total)` |
| Average response time | Average response time | `histogram_avg(k6_http_req_duration_seconds)` |
| P95 and P99 latency | p95 and p99 latency (+ per endpoint) | `histogram_quantile(...)` on `k6_http_req_duration_seconds` |
| Request failure rate | HTTP request failure rate | `k6_http_reqs_total{expected_response="false"}` / all |
| Passed vs failed checks | Passed vs failed checks | `k6_checks_rate` |
| Comparison of load / stress / spike / soak | "Test comparison" section: bar charts plus a summary table | all of the above, per run |

The top "Headline numbers" row and the filters (**Test type**, **Build**, **Run**) follow the selection and the time range.

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `...ps1 cannot be loaded because running scripts is disabled` | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, then run the script again |
| `Run-K6.ps1`: "API is not reachable" | Start Window 1 first; check `curl.exe http://127.0.0.1:8000/health` |
| k6 prints a "remote write" connection error | Prometheus (Window 2) is not running or is on another port |
| Verify says "No k6_* metrics" | Run a test first, then retry |
| Grafana data source test fails | Use `http://127.0.0.1:9090`; confirm Window 2 is running |
| Panels show "No data" | Time range too short or before your run; pick **Last 3 hours**; check the **Test type/Build/Run** filters are on **All** |
| Latency panels empty but others fine | Prometheus must be started with `Start-Prometheus.ps1` (it enables native histograms) |
| Comparison section empty | It only shows `load`, `stress`, `spike`, `soak`; run those with `Run-K6.ps1` |
| `k6` is not recognized | Reopen PowerShell after installing k6; check `k6 version` |
| Port 9090/3000/5665 in use | Close the other program; for Prometheus edit the port in `Start-Prometheus.ps1` and the data source URL |

## 10. Known limits (be honest about these on the slides)

* Peak VUs are sampled about every 5 s, so a very short peak can read slightly below k6's own `vus_max` (I saw 283 vs 300 on a short stress run).
* k6 exports checks only as a pass rate, so "Passed vs failed checks" is the **average pass rate across distinct checks**, not a count of assertions.
* p95/p99 come from histogram buckets: expect agreement with k6's own numbers within a few percent, not to the last digit.
* The comparison section lists one bar per run. If you run `load` three times you get three bars; use the **Run** filter to pick.
* Prometheus keeps data for 30 days. To start clean: stop Prometheus and delete the folder `%LOCALAPPDATA%\k6-monitoring\prometheus-data`.
* If Grafana cannot be installed, you are not blocked: k6's live view (http://127.0.0.1:5665) and the `results\*-report.html` files are real evidence too.

## 11. What was tested, and what was not

Tested on real data: every one of the 29 dashboard queries ran against Prometheus 3.5.0 filled by k6 v2.3.0 (load, stress, spike, soak on the fixed build; load and functional on the seeded build; smoke repeated twice) and returned data; request counts matched k6's own output exactly; averages exactly; p95 within about 2%; re-running a test stays exact; your `prometheus.yml` loads unchanged; three of the scripts ran under PowerShell 7 (the real download and unzip of the Windows Prometheus build; a k6 run with the Prometheus push and the HTML report; the verify script). `Start-Prometheus.ps1` was only dry-run (it prints its command), because a Windows `prometheus.exe` cannot execute in my environment; the same version and flags were tested with the Linux build.

**Not tested:** the dashboard inside an actual Grafana (I could not install Grafana in my environment, so the layout and the data-source import are checked structurally only), and the scripts under Windows PowerShell 5.1 on Windows (they use only 5.1-compatible syntax). If a panel looks wrong, send me a screenshot and the panel name.
