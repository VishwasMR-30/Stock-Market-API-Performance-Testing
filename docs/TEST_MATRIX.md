# Formal Test Matrix (38 functional / API test cases)

Implemented in `k6/functional.js`. Each k6 check name starts with the Test Case ID, so the terminal output maps 1:1 to this table.

**Techniques:** EP = Equivalence Partitioning, BVA = Boundary Value Analysis (min-1, min, min+1, nominal, max-1, max, max+1), Negative = invalid / unauthorised use, Syntax / Type = malformed input.

**Author:** Student B designed the cases, Student A automated them in k6. Edit this column to match your real split.

**Result columns** are from an actual run of the suite: *seeded* = `SEEDED_DEFECTS=on`, *fixed* = `SEEDED_DEFECTS=off`.

| Test Case ID | Scenario / Objective | Technique | Input Data | Expected Result | Author | Seeded build | Fixed build |
|---|---|---|---|---|---|---|---|
| TC-01 | Login with valid credentials | EP valid | user1 / password123 | 200 + token returned | B | Pass | Pass |
| TC-02 | Login with wrong password | Negative | user1 / wrong | 401 | B | Pass | Pass |
| TC-03 | Login with unknown user | Negative | nobody / password123 | 401 | B | Pass | Pass |
| TC-04 | Login with empty username | BVA (length 0) | '' / password123 | 422 | B | Pass | Pass |
| TC-05 | Login with missing password field | Syntax | {username only} | 422 | B | Pass | Pass |
| TC-06 | List stocks, limit just below minimum | BVA min-1 | limit=0 | 422 | B | Pass | Pass |
| TC-07 | List stocks, minimum limit | BVA min | limit=1 | 200, 1 item | B | Pass | Pass |
| TC-08 | List stocks, just above minimum | BVA min+1 | limit=2 | 200, 2 items | B | Pass | Pass |
| TC-09 | List stocks, default (nominal) | BVA nominal | no limit given | 200, 10 items | B | Pass | Pass |
| TC-10 | List stocks, just below maximum | BVA max-1 | limit=19 | 200, 19 items | B | Pass | Pass |
| TC-11 | List stocks, maximum limit | BVA max | limit=20 | 200, 20 items | B | Pass | Pass |
| TC-12 | List stocks, just above maximum | BVA max+1 | limit=21 | 422 | B | Pass | Pass |
| TC-13 | Get price of a valid symbol | EP valid | TCS | 200, price > 0 | B | Pass | Pass |
| TC-14 | Symbol in lowercase | EP invalid (format) | tcs | 422 | B | Pass | Pass |
| TC-15 | Symbol too short | BVA length min-1 | A | 422 | B | Pass | Pass |
| TC-16 | Symbol too long | BVA length max+1 | ABCDEFGHIJK (11 chars) | 422 | B | Pass | Pass |
| TC-17 | Valid format but unknown symbol | EP invalid (business) | ZZZZ | 404 | B | Pass | Pass |
| TC-18 | Symbol containing digits | EP invalid (format) | TCS1 | 422 | B | Pass | Pass |
| TC-19 | Add to watchlist without token | Negative (auth) | no Authorization header | 401 | B | Pass | Pass |
| TC-20 | Add to watchlist with fake token | Negative (auth) | Bearer fake | 401 | B | Pass | Pass |
| TC-21 | Add a valid symbol (1st item) | EP valid | RELIANCE | 201 | B | Pass | Pass |
| TC-22 | Add duplicate symbol | Negative | RELIANCE again | 409 | B | Pass | Pass |
| TC-23 | Add unknown symbol | Negative | ZZZZ | 404 | B | Pass | Pass |
| TC-24 | Add 10th item (limit is 10) | BVA max | 10th distinct symbol | 201 | B | Pass | Pass |
| TC-25 | Add 11th item | BVA max+1 | 11th distinct symbol | 409 (refused) | B | **FAIL** | Pass |
| TC-26 | Delete symbol in watchlist | EP valid | RELIANCE | 200 | B | Pass | Pass |
| TC-27 | Delete symbol not in watchlist | Negative | ZZZZ | 404 | B | Pass | Pass |
| TC-28 | Alert price just below minimum | BVA min-1 | target_price=0.99 | 422 | B | Pass | Pass |
| TC-29 | Alert price minimum | BVA min | target_price=1.00 | 201 | B | Pass | Pass |
| TC-30 | Alert price just above minimum | BVA min+1 | target_price=1.01 | 201 | B | Pass | Pass |
| TC-31 | Alert price maximum | BVA max | target_price=100000.00 | 201 | B | Pass | Pass |
| TC-32 | Alert price just above maximum | BVA max+1 | target_price=100000.01 | 422 (refused) | B | **FAIL** | Pass |
| TC-33 | Alert with invalid direction | EP invalid | direction='sideways' | 422 | B | Pass | Pass |
| TC-34 | Alert price of wrong type | Type check | target_price='abc' | 422 | B | Pass | Pass |
| TC-35 | History, days just below minimum | BVA min-1 | days=0 | 422 | B | Pass | Pass |
| TC-36 | History, minimum days | BVA min | days=1 | 200, 1 data point | B | Pass | Pass |
| TC-37 | History, maximum days | BVA max | days=365 | 200, 365 data points | B | Pass | Pass |
| TC-38 | History, days just above maximum | BVA max+1 | days=366 | 422 | B | Pass | Pass |

## Performance test scenarios (k6 scripts)

| ID | Script | Type | Load profile | Pass criteria (thresholds) |
|---|---|---|---|---|
| PT-01 | `smoke.js` | Smoke | 1 user, 30 s | 0 failed checks, p95 < 500 ms |
| PT-02 | `load.js` | Load | ramp to 100 users, hold 3 min | p95 < 500 ms, p99 < 1 s, errors < 1%, checks > 99%; stock detail p95 < 100 ms; history p95 < 300 ms |
| PT-03 | `stress.js` | Stress | 100 -> 200 -> 400 -> 600 users | errors < 5%, p95 < 1.5 s (find the breaking point) |
| PT-04 | `spike.js` | Spike | 20 -> 500 users in 10 s, hold 1 min | errors < 5%, p95 < 2 s, then recovery |
| PT-05 | `soak.js` | Soak | 50 users for 30 min | same as load test; no degradation over time |
