# Performance Evaluation and Load Testing of a Stock Market Monitoring Application Using Grafana k6

ISE2501 · Software Testing & Quality Assurance · CA3 · Option 1: Specialized Tool Exploration & Program Unit/API Testing

A complete, runnable lab: a **Stock Market Monitoring REST API** (the System Under Test) plus **Grafana k6** test scripts, with live results in **Grafana** dashboards.

| Student | Role | Owns |
|---|---|---|
| Student A (Lead Tool Architect) | k6, Docker, Prometheus, Grafana, CI, reports | `k6/`, `docker-compose.yml`, `grafana/`, `prometheus/`, `.github/`, `run-test.*` |
| Student B (Lead Test Designer) | SUT, formal test design | `app/`, `docs/TEST_MATRIX.md`, `docs/DEFECT_LOG.md` |

---

## 1. The idea in plain English

* **The app (SUT)** is a small stock-price API: login, list stocks, get a price, keep a watchlist, set price alerts, see price history. Prices are simulated, so no outside service is needed.
* **k6** pretends to be many users at once ("virtual users", VUs) and measures how fast and how reliably the app answers.
* **Grafana** draws that data as live graphs. k6 sends its numbers to **Prometheus** (a database), and Grafana reads them from there.
* We run **two kinds of tests**:
  1. **Functional / API tests** (`functional.js`): 38 test cases using boundary value analysis and equivalence partitioning. *Is the answer correct?*
  2. **Performance tests** (smoke, load, stress, spike, soak): *Is it fast and stable under many users?*
* The app ships with **3 deliberately planted ("seeded") defects** so your tests have something to find. Turn them off with `SEEDED_DEFECTS=off` to get the fixed version and prove the fix with a retest.

```
 k6 (virtual users) --HTTP--> Stock API (FastAPI)
        |
        +--metrics--> Prometheus --> Grafana dashboard (live graphs)
        +--> results/*.html and *.json  (reports for your slides)
```

## 2. Words you must know (for the viva)

| Term | Meaning |
|---|---|
| VU (virtual user) | One simulated user running your script in a loop |
| Check | An assertion in the script (e.g. "status is 200"). Failed checks = failed test cases |
| Threshold | A pass/fail rule for the whole test, e.g. `p(95) < 500ms`. If crossed, k6 exits with an error |
| p95 / p99 | 95% / 99% of requests were faster than this value. Better than average because it exposes slow outliers |
| Throughput | Requests handled per second |
| Smoke / Load / Stress / Spike / Soak | Does it work? / normal traffic / beyond capacity / sudden jump / long duration |
| Think time | `sleep()` between actions, like a real person reading the screen |

## 3. What to install (one time)

1. **Docker Desktop** (https://www.docker.com/products/docker-desktop/): start it and wait until it says "running". This is the only essential install.
2. **Git** (https://git-scm.com/) and a **GitHub account** to publish the repo.
3. *(Optional, for the no-Docker path)* Python 3.12 and k6 (`winget install k6` on Windows).

## 4. Quick start (Docker, recommended)

Open a terminal (Windows: PowerShell) inside this folder.

```powershell
# 1. Start the lab: API + Prometheus + Grafana   (first time takes a few minutes)
docker compose up -d --build

# 2. Check the API:      http://localhost:8000/docs     (interactive API page)
#    Open Grafana:       http://localhost:3000          (dashboard appears, no login)

# 3. Run the functional test suite (38 test cases) - shows the 2 seeded functional bugs
.\run-test.ps1 functional

# 4. Run a smoke test, then the load test, and WATCH Grafana while it runs
.\run-test.ps1 smoke
.\run-test.ps1 load
```

macOS/Linux: use `./run-test.sh load` instead of `.\run-test.ps1 load`.
If PowerShell blocks the script: `powershell -ExecutionPolicy Bypass -File .\run-test.ps1 load`.

Pass extra k6 options after the test name, for example `.\run-test.ps1 load -e PEAK=200` (peak users) or `.\run-test.ps1 soak -e SOAK_DURATION=5m` (short soak).

**Where the evidence goes:** every run saves `results/<test>-report.html` (open it in a browser: graphs + tables) and `results/<test>-summary.json`. The terminal output and the Grafana dashboard are your screenshots for Slides 6 and 8.

### Switching between the buggy and the fixed build

```powershell
$env:SEEDED_DEFECTS="off"          # fixed version   (use "on" for the version with planted bugs)
docker compose up -d --force-recreate sut
curl http://localhost:8000/health   # shows "seeded_defects": false
```

## 5. Recommended workflow (do it in this order)

| Step | What | Command | Evidence to keep |
|---|---|---|---|
| 1 | Start the lab | `docker compose up -d --build` | screenshot of `/docs` page |
| 2 | **Functional, buggy build** | `.\run-test.ps1 functional` | terminal: 36/38 pass, TC-25 and TC-32 FAIL |
| 3 | **Load, buggy build** | `.\run-test.ps1 load` | Grafana p95 graph + terminal showing the history threshold failing |
| 4 | Fix (`SEEDED_DEFECTS=off`) and recreate `sut` | see above | note the root causes in `docs/DEFECT_LOG.md` |
| 5 | **Functional, fixed build** | `.\run-test.ps1 functional` | terminal: 38/38 pass |
| 6 | **Load, fixed build** | `.\run-test.ps1 load` | Grafana graph with the improvement |
| 7 | Stress and spike | `.\run-test.ps1 stress` then `spike` | breaking point and recovery |
| 8 | Soak (short) | `.\run-test.ps1 soak -e SOAK_DURATION=5m` | flat latency over time |
| 9 | Push to GitHub, CI runs automatically | `git push` | green tick in the Actions tab |
| 10 | Build slides | `docs/SLIDES_GUIDE.md` | |

## 6. Without Docker (simpler, no Grafana)

```powershell
pip install -r app/requirements.txt
uvicorn app.main:app --port 8000              # terminal 1: the API
k6 run k6/functional.js                        # terminal 2
$env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="results/load-report.html"
k6 run k6/load.js                              # HTML report with graphs in results/
```
Set `$env:SEEDED_DEFECTS="off"` before starting uvicorn for the fixed build. You can still use Grafana later; it only adds live dashboards.

## 7. Project structure

```
app/main.py                  the Stock Market API (SUT) with seeded defects
k6/lib/common.js             shared helpers, user journey, thresholds
k6/functional.js             38 test cases (BVA, EP, negative, type checks)
k6/smoke|load|stress|spike|soak.js    performance tests
docker-compose.yml           API + Prometheus + Grafana + k6
grafana/                     auto-loaded datasource and dashboard
.github/workflows/           CI: functional + smoke on every push
docs/TEST_MATRIX.md          formal test matrix (Slide 4)
docs/DEFECT_LOG.md           defect report (Slide 7)
docs/SLIDES_GUIDE.md         what to put on each of the 10 slides
docs/VIVA_NOTES.md           likely viva questions with answers
results/                     generated reports (commit your final ones)
```

## 8. API summary

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{username, password}` (`user1`..`user500` / `password123`) returns a token |
| GET | `/stocks?limit=1..20` | list prices |
| GET | `/stocks/{SYMBOL}` | symbol = 2 to 10 capital letters |
| GET | `/stocks/{SYMBOL}/history?days=1..365` | heavier endpoint (the performance defect lives here) |
| POST / GET / DELETE | `/watchlist` | token required, max 10 symbols |
| POST / GET | `/alerts` | token required, `target_price` 1.00 to 100000.00 |
| POST | `/test/reset` | test helper: clears state |

## 9. Troubleshooting

* *Grafana graphs empty:* run a test first, and set the time range to "Last 15 minutes". Check http://localhost:9090 is up.
* *`docker compose` not found:* start Docker Desktop and wait for it to finish starting.
* *Port already in use (8000/3000/9090):* close the other program or change the left side of `ports:` in `docker-compose.yml`.
* *k6 says thresholds crossed:* that is a normal "test failed" result, not a crash. It is exactly what you want to screenshot on the buggy build.
* *Results differ from the reference numbers in docs:* normal; they depend on your machine. Use your own numbers on the slides.

## 10. References

* Grafana k6 documentation: https://grafana.com/docs/k6/latest/
* k6 Prometheus remote write output: https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/
* Grafana documentation: https://grafana.com/docs/grafana/latest/
* FastAPI documentation: https://fastapi.tiangolo.com/
