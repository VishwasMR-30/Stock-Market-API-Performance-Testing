# Slide-by-slide guide (follows the professor's 10-slide structure)

Fill in the evidence with **your own** screenshots and numbers.

**Slide 1 - Title**
- Title: *Comparative Tool Exploration & Automated Test Execution* (use the professor's wording) and add the subtitle *Performance Evaluation and Load Testing of a Stock Market Monitoring Application Using Grafana k6*.
- Course: Software Testing & Quality Assurance (ISE2501). Names, roll numbers, section, roles (Student A / B).
- Tool and SUT stack: *Grafana k6 + Grafana + Prometheus + Docker | SUT: Python 3.12 + FastAPI REST API*.

**Slide 2 - Tool profile**
- What: k6 is an open-source load testing tool (AGPL-3.0). Engine written in Go, tests scripted in JavaScript. Grafana is the visualization platform; k6 sends metrics via Prometheus.
- Problem solved: manual / functional tests cannot show behaviour under hundreds of simultaneous users. k6 gives repeatable, scriptable load with built-in pass/fail thresholds.
- Why over alternatives: tests are code (version-controlled, reviewable), light on resources vs GUI-based tools, CI friendly.
- Adoption: used for performance testing in CI/CD pipelines; here a GitHub Actions workflow runs functional + smoke tests on every push.

**Slide 3 - SUT architecture**
- Describe the API (endpoints table from README section 8), business rules (symbol format, limits), error paths (401, 404, 409, 422).
- Diagram: k6 -> Stock API; k6 -> Prometheus -> Grafana (the box diagram in the README). Mention the price simulator.

**Slide 4 - Test strategy and matrix**
- Strategies: boundary value analysis, equivalence partitioning, negative validation, syntax/type checks, plus 5 load profiles.
- Table: pick ~8-10 rows from `docs/TEST_MATRIX.md` (columns: Test Case ID | Scenario | Input | Expected | Author). Say "38 functional cases + 5 performance scenarios, full table in repo".

**Slide 5 - Configuration and implementation**
- Snippets: the `tc()` helper and 2-3 test cases from `functional.js`; the `options` block with `stages` and `thresholds` from `load.js`.
- Features to highlight: `check()`, `thresholds` (pass/fail gates), `stages` ramping, request `tags` for per-endpoint metrics, environment variables (`BASE_URL`, `PEAK`), parameterised users (`__VU`), `setup()` for clean state.
- Mocks: k6 has no mocking; the SUT's built-in price simulator replaces a real market-data API.

**Slide 6 - Live execution log**
- Screenshot 1: `functional` on the buggy build (36/38, TC-25 and TC-32 red). Screenshot 2: same suite on fixed build (38/38).
- Screenshot 3: `load` terminal summary (thresholds, checks %, duration). Mention total duration and check pass rate.

**Slide 7 - Defects and edge cases**
- Use `docs/DEFECT_LOG.md`: D1, D2, D3 with severity, priority, steps, root cause, fix. State they are **seeded**.
- Add anything real you saw from `stress.js` (where errors began) or `spike.js` (recovery time).

**Slide 8 - Performance insights**
- Grafana dashboard screenshot during load: VUs, req/s, p95 per endpoint, error rate.
- Small table: p90/p95/p99, req/s, error rate for **buggy vs fixed** build. Highlight the history endpoint and how it slowed even `GET /stocks/:symbol`.
- Stress result: the VU count where p95 or errors crossed the limit. Be honest that limits are for your laptop.

**Slide 9 - Tool evaluation**
- Pros: tests as JavaScript code, thresholds as gates, tiny footprint, great Grafana integration, CI ready, built-in HTML report.
- Limitations: no browser rendering by default (protocol level only), laptop limits large VU counts, Prometheus/Grafana setup overhead, learning the metric names, JavaScript only (not full Node.js).
- Verdict / enterprise: use for API performance gates in CI; run big loads from cloud or distributed runners.

**Slide 10 - Contributions and references**
- Student A: k6 scripts, Docker/Prometheus/Grafana, CI, reports. Student B: SUT, test matrix, defect log, validation rules. Give a % split (e.g. 50 / 50) and be ready to defend it.
- GitHub link (public repo with README). References: see README section 10.
