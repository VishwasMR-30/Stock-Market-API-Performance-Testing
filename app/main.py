"""
Stock Market Monitoring API  -  the System Under Test (SUT) for the k6 project.

Everything is kept in memory so the app is simple and fast to start.
Prices are SIMULATED (random walk), so no external API / rate limits are involved.

SEEDED DEFECTS
--------------
When the environment variable SEEDED_DEFECTS=on (default), three defects are
deliberately planted so the tests have something to find. They are labelled
"SEEDED" in docs/DEFECT_LOG.md.  Run with SEEDED_DEFECTS=off for the fixed version.

  D1 (functional)  watchlist allows an 11th stock  (limit is 10)       -> off-by-one
  D2 (functional)  alert price 100000.01 is accepted (max is 100000)   -> wrong boundary
  D3 (performance) /stocks/{symbol}/history does heavy CPU work inside
                   an async handler, blocking the whole server under load
"""
import asyncio
import os
import random
import secrets
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Path, Query
from pydantic import BaseModel, Field

SEEDED = os.getenv("SEEDED_DEFECTS", "on").lower() == "on"
ENABLE_TEST_RESET = os.getenv("ENABLE_TEST_RESET", "true").lower() == "true"

# ---- business rules (these are the boundaries the tests probe) -------------
WATCHLIST_MAX = 10
ALERT_MIN, ALERT_MAX = 1.00, 100000.00
LIMIT_MIN, LIMIT_MAX = 1, 20
HISTORY_MIN, HISTORY_MAX = 1, 365
SYMBOL_PATTERN = r"^[A-Z]{2,10}$"

BASE_PRICES = {
    "RELIANCE": 2900.0, "TCS": 3900.0, "INFY": 1650.0, "HDFCBANK": 1700.0,
    "ICICIBANK": 1250.0, "SBIN": 820.0, "ITC": 470.0, "LT": 3600.0,
    "WIPRO": 540.0, "BHARTIARTL": 1500.0, "AXISBANK": 1150.0, "MARUTI": 12500.0,
    "SUNPHARMA": 1750.0, "TITAN": 3400.0, "ASIANPAINT": 2400.0, "HCLTECH": 1700.0,
    "KOTAKBANK": 1800.0, "NTPC": 360.0, "ONGC": 270.0, "ULTRACEMCO": 11500.0,
}
prices: dict[str, float] = dict(BASE_PRICES)

USERS = {f"user{i}": "password123" for i in range(1, 501)}   # user1..user500
tokens: dict[str, str] = {}                # token -> username
watchlists: dict[str, list[str]] = {}      # username -> [symbols]
alerts: dict[str, list[dict]] = {}         # username -> [alerts]


# ---- price simulator --------------------------------------------------------
async def price_ticker():
    while True:
        for sym in prices:
            prices[sym] = round(max(1.0, prices[sym] * (1 + random.uniform(-0.004, 0.004))), 2)
        await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(price_ticker())
    yield
    task.cancel()


app = FastAPI(title="Stock Market Monitoring API (k6 SUT)", lifespan=lifespan)


# ---- models -----------------------------------------------------------------
class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=32)
    password: str = Field(min_length=1, max_length=64)


class WatchIn(BaseModel):
    symbol: str = Field(pattern=SYMBOL_PATTERN)


class AlertIn(BaseModel):
    symbol: str = Field(pattern=SYMBOL_PATTERN)
    target_price: float
    direction: Literal["above", "below"]


# ---- auth -------------------------------------------------------------------
def current_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or malformed Authorization header")
    user = tokens.get(authorization[7:])
    if user is None:
        raise HTTPException(401, "Invalid token")
    return user


# ---- endpoints --------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "seeded_defects": SEEDED}


@app.post("/auth/login")
async def login(body: LoginIn):
    if USERS.get(body.username) != body.password:
        raise HTTPException(401, "Invalid username or password")
    token = secrets.token_hex(16)
    tokens[token] = body.username
    return {"token": token}


@app.get("/stocks")
async def list_stocks(limit: int = Query(10, ge=LIMIT_MIN, le=LIMIT_MAX),
                      offset: int = Query(0, ge=0)):
    items = [{"symbol": s, "price": p} for s, p in prices.items()]
    page = items[offset:offset + limit]
    return {"count": len(page), "items": page}


@app.get("/stocks/{symbol}")
async def get_stock(symbol: str = Path(pattern=SYMBOL_PATTERN)):
    if symbol not in prices:
        raise HTTPException(404, "Unknown symbol")
    return {"symbol": symbol, "price": prices[symbol]}


# --- history: precomputed series ---------------------------------------------
def _make_series(symbol: str) -> list[float]:
    rnd = random.Random(symbol)
    p, out = BASE_PRICES[symbol], []
    for _ in range(HISTORY_MAX):
        p *= 1 + rnd.uniform(-0.01, 0.01)
        out.append(round(p, 2))
    return out


SERIES_CACHE = {s: _make_series(s) for s in BASE_PRICES}


def _slow_volatility(series: list[float]) -> float:
    """SEEDED D3: deliberately inefficient O(n^2 * k) work, run inside an async handler."""
    total = 0.0
    n = len(series)
    for i in range(n):
        for j in range(n):
            for k in range(22):
                total += abs(series[i] - series[j]) * (k + 1)
    return total / (n * n)


@app.get("/stocks/{symbol}/history")
async def history(symbol: str = Path(pattern=SYMBOL_PATTERN),
                  days: int = Query(30, ge=HISTORY_MIN, le=HISTORY_MAX)):
    if symbol not in prices:
        raise HTTPException(404, "Unknown symbol")
    series = SERIES_CACHE[symbol][-days:]
    if SEEDED:
        volatility = _slow_volatility(series)          # blocks the event loop (D3)
    else:
        volatility = max(series) - min(series)         # fixed: cheap O(n)
    ma5 = [round(sum(series[max(0, i - 4):i + 1]) / len(series[max(0, i - 4):i + 1]), 2)
           for i in range(len(series))]
    return {"symbol": symbol, "days": days, "volatility": round(volatility, 2),
            "closes": series, "ma5": ma5}


@app.post("/watchlist", status_code=201)
async def add_watch(body: WatchIn, user: str = Depends(current_user)):
    if body.symbol not in prices:
        raise HTTPException(404, "Unknown symbol")
    wl = watchlists.setdefault(user, [])
    if body.symbol in wl:
        raise HTTPException(409, "Symbol already in watchlist")
    limit = WATCHLIST_MAX + 1 if SEEDED else WATCHLIST_MAX      # SEEDED D1 (off-by-one)
    if len(wl) >= limit:
        raise HTTPException(409, f"Watchlist is full (max {WATCHLIST_MAX})")
    wl.append(body.symbol)
    return {"symbol": body.symbol, "size": len(wl)}


@app.get("/watchlist")
async def get_watch(user: str = Depends(current_user)):
    wl = watchlists.get(user, [])
    return {"count": len(wl), "items": [{"symbol": s, "price": prices[s]} for s in wl]}


@app.delete("/watchlist/{symbol}")
async def del_watch(symbol: str = Path(pattern=SYMBOL_PATTERN), user: str = Depends(current_user)):
    wl = watchlists.get(user, [])
    if symbol not in wl:
        raise HTTPException(404, "Symbol not in watchlist")
    wl.remove(symbol)
    return {"deleted": symbol}


@app.post("/alerts", status_code=201)
async def add_alert(body: AlertIn, user: str = Depends(current_user)):
    if body.symbol not in prices:
        raise HTTPException(404, "Unknown symbol")
    max_allowed = ALERT_MAX + 1 if SEEDED else ALERT_MAX       # SEEDED D2 (wrong boundary)
    if not (ALERT_MIN <= body.target_price <= max_allowed):
        raise HTTPException(422, f"target_price must be between {ALERT_MIN} and {ALERT_MAX}")
    alerts.setdefault(user, []).append(body.model_dump())
    return {"created": True, "total": len(alerts[user])}


@app.get("/alerts")
async def get_alerts(user: str = Depends(current_user)):
    return {"count": len(alerts.get(user, [])), "items": alerts.get(user, [])}


if ENABLE_TEST_RESET:
    @app.post("/test/reset")
    async def reset():
        """Test helper: wipes users' state so functional tests are repeatable."""
        tokens.clear()
        watchlists.clear()
        alerts.clear()
        return {"reset": True}
