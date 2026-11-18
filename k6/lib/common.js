// Shared helpers used by every k6 script.
import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const SYMBOLS = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'ITC', 'LT', 'WIPRO', 'BHARTIARTL',
  'AXISBANK', 'MARUTI', 'SUNPHARMA', 'TITAN', 'ASIANPAINT', 'HCLTECH', 'KOTAKBANK', 'NTPC', 'ONGC', 'ULTRACEMCO',
];

export const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Log in as user<id> and return the auth headers. 'name' tag keeps metrics grouped.
export function login(id) {
  const uid = ((id - 1) % 500) + 1; // the SUT has user1..user500
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ username: `user${uid}`, password: 'password123' }),
    { headers: JSON_HEADERS, tags: { name: 'POST /auth/login' } },
  );
  const ok = check(res, {
    'login: status 200': (r) => r.status === 200,
    'login: token returned': (r) => r.status === 200 && !!r.json('token'),
  });
  if (!ok) return null;
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${res.json('token')}` };
}

// One realistic "user journey" used by the load / stress / spike / soak tests.
export function journey(auth) {
  const sym = pick(SYMBOLS);

  let r = http.get(`${BASE_URL}/stocks?limit=10`, { tags: { name: 'GET /stocks' } });
  check(r, { 'list stocks: 200': (x) => x.status === 200 });

  r = http.get(`${BASE_URL}/stocks/${sym}`, { tags: { name: 'GET /stocks/:symbol' } });
  check(r, { 'stock detail: 200': (x) => x.status === 200, 'stock detail: has price': (x) => x.status === 200 && x.json('price') > 0 });

  if (auth) {
    r = http.post(`${BASE_URL}/watchlist`, JSON.stringify({ symbol: sym }), { headers: auth, tags: { name: 'POST /watchlist' }, responseCallback: http.expectedStatuses(201, 409) });
    // 201 = added, 409 = already there / list full: both are valid business outcomes under load
    check(r, { 'watchlist add: 201 or 409': (x) => x.status === 201 || x.status === 409 });

    r = http.get(`${BASE_URL}/watchlist`, { headers: auth, tags: { name: 'GET /watchlist' } });
    check(r, { 'watchlist get: 200': (x) => x.status === 200 });
  }

  // ~10% of users open the heavier history chart
  if (Math.random() < 0.1) {
    r = http.get(`${BASE_URL}/stocks/${sym}/history?days=365`, { tags: { name: 'GET /stocks/:symbol/history' } });
    check(r, { 'history: 200': (x) => x.status === 200 });
  }
}

// Thresholds shared by the performance tests = the pass/fail criteria (NFRs).
export const STANDARD_THRESHOLDS = {
  http_req_failed: ['rate<0.01'],                 // fewer than 1% failed requests
  http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500 ms, 99% under 1 s
  checks: ['rate>0.99'],                          // more than 99% of checks pass
  'http_req_duration{name:GET /stocks/:symbol}': ['p(95)<100'],
  'http_req_duration{name:GET /stocks/:symbol/history}': ['p(95)<300'],
};
