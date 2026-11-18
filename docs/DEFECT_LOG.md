# Defect Log

All three defects below are **SEEDED**: planted on purpose in `app/main.py` (switch `SEEDED_DEFECTS=on|off`) so the
test suite has something to find. Say this clearly on Slide 7. The reference numbers come from one sandbox run;
**replace them with the numbers from your own machine** (they will differ, the pattern will not).

## D1 - Watchlist accepts an 11th stock  (SEEDED, functional)
| Field | Detail |
|---|---|
| Found by | TC-25 (BVA max+1) |
| Severity / Priority | Medium / Medium |
| Steps to reproduce | 1. Log in. 2. Add 10 different symbols (all `201`). 3. Add an 11th symbol. |
| Expected | `409` "Watchlist is full (max 10)" |
| Actual | `201 Created`, watchlist has 11 items |
| Root cause | Off-by-one: the limit check used `WATCHLIST_MAX + 1` instead of `WATCHLIST_MAX` |
| Fix | Compare against `WATCHLIST_MAX` exactly. Retest: TC-24 pass, TC-25 pass |

## D2 - Alert price above the maximum is accepted  (SEEDED, functional)
| Field | Detail |
|---|---|
| Found by | TC-32 (BVA max+1 step) |
| Severity / Priority | Medium / Low |
| Steps to reproduce | `POST /alerts` with `target_price = 100000.01` and a valid token |
| Expected | `422` (allowed range is 1.00 to 100000.00) |
| Actual | `201 Created` |
| Root cause | Upper bound check used `ALERT_MAX + 1` instead of `ALERT_MAX` |
| Fix | Use `<= ALERT_MAX`. Retest: TC-31 and TC-32 both pass |

## D3 - History endpoint slows the WHOLE server under load  (SEEDED, performance)
| Field | Detail |
|---|---|
| Found by | `load.js` per-endpoint thresholds, `stress.js`, Grafana p95 panel |
| Severity / Priority | High / High |
| Steps to reproduce | Run `load.js` (100 users) with `SEEDED_DEFECTS=on`; ~10% of users call `GET /stocks/:symbol/history?days=365` |
| Expected | `history` p95 < 300 ms; simple endpoints stay fast (< 100 ms) |
| Actual (reference run, 100 users) | history p95 ~ 400-450 ms **FAIL**; even the trivial `GET /stocks/:symbol` slowed from ~1 ms to 28-136 ms. Throughput dropped ~17% |
| Root cause | CPU-heavy O(n^2) calculation executed inside an `async def` handler. It blocks the single event loop, so *every* request waits behind it |
| Fix | Replace with an O(n) calculation on a precomputed series. Retest: history p95 ~ 2 ms, all thresholds pass |
| Lesson | One slow endpoint can degrade the entire service; per-endpoint metrics (tags) make it visible |

## Your own "unexpected behaviours" (optional, adds marks)
Log anything real you notice, for example the breaking point found by `stress.js`, or how long recovery took after `spike.js`.
