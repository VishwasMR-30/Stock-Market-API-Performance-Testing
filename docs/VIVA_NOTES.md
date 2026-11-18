# Likely viva questions

1. **What does k6 do and what does Grafana do?** k6 generates load and measures; Grafana only visualizes stored metrics. Different jobs.
2. **Why Prometheus in the middle?** k6 pushes metrics (remote write) into Prometheus, which stores time-series data; Grafana queries it.
3. **Difference between load, stress, spike, soak?** Normal traffic / beyond capacity to find the breaking point / sudden surge / long run to expose leaks and degradation.
4. **What is a VU?** A simulated user running the script in a loop. Not the same as requests per second.
5. **Why p95 instead of average?** Averages hide slow outliers; p95 says 95% of users were at least this fast.
6. **What is a threshold?** A pass/fail rule on a metric. If crossed, k6 returns a non-zero exit code, so CI fails.
7. **Check vs threshold?** Check = per-response assertion (a test case); threshold = rule over the whole run's metrics.
8. **Which test techniques did you use?** BVA (min-1..max+1), equivalence partitioning, negative testing, type/syntax checks.
9. **Why are some 409 responses not errors?** They are valid business outcomes (duplicate or full watchlist). We told k6 to treat 409 as expected there, otherwise the error rate is misleading.
10. **Explain defect D3.** CPU-heavy code inside an `async` handler blocks the event loop, so all requests queue behind it. Tagged per-endpoint metrics exposed it. Fix: cheap O(n) calculation on precomputed data.
11. **Are the defects real?** No, they are seeded on purpose (`SEEDED_DEFECTS=on`), labelled as such, to evaluate whether the suite detects faults.
12. **Why simulate prices?** Repeatable results and no third-party rate limits; load tests must not hit someone else's server.
13. **Limits of your results?** Single laptop, in-memory single-process app, load generator and app share the same CPU. Numbers show relative behaviour (buggy vs fixed), not production capacity.
14. **How does CI help?** GitHub Actions runs the functional and smoke tests on every push, so regressions are caught automatically.
