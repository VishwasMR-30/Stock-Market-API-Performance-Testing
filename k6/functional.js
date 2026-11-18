// FUNCTIONAL / API TEST SUITE (run with 1 user, once).
// Techniques: Boundary Value Analysis (BVA), Equivalence Partitioning (EP),
// negative validation, and syntax/type checks. Each check name starts with its Test Case ID
// (see docs/TEST_MATRIX.md). The run FAILS if any test case fails.
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, SYMBOLS, JSON_HEADERS } from './lib/common.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: { checks: ['rate==1'] },   // every test case must pass
};

const url = (p) => `${BASE_URL}${p}`;
const post = (p, body, headers) => http.post(url(p), JSON.stringify(body), { headers: headers || JSON_HEADERS });

// tc('TC-01', 'description', response, expectedStatus, optionalExtraCheck)
function tc(id, desc, res, status, extra) {
  const name = `${id} ${desc} (expect ${status})`;
  check(res, {
    [name]: (r) => r.status === status && (extra ? extra(r) : true),
  });
}

export function setup() {
  http.post(url('/test/reset')); // clean state so the suite is repeatable
}

export default function () {
  // ---------- AUTH (EP + negative) ----------
  let r = post('/auth/login', { username: 'user1', password: 'password123' });
  tc('TC-01', 'login valid credentials', r, 200, (x) => !!x.json('token'));
  const token = r.status === 200 ? r.json('token') : '';
  const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  tc('TC-02', 'login wrong password', post('/auth/login', { username: 'user1', password: 'wrong' }), 401);
  tc('TC-03', 'login unknown user', post('/auth/login', { username: 'nobody', password: 'password123' }), 401);
  tc('TC-04', 'login empty username', post('/auth/login', { username: '', password: 'password123' }), 422);
  tc('TC-05', 'login missing password field', post('/auth/login', { username: 'user1' }), 422);

  // ---------- LIST STOCKS: limit valid range 1..20 (BVA) ----------
  const list = (n) => http.get(url(`/stocks?limit=${n}`));
  tc('TC-06', 'limit=0 (min-1)', list(0), 422);
  tc('TC-07', 'limit=1 (min)', list(1), 200, (x) => x.json('count') === 1);
  tc('TC-08', 'limit=2 (min+1)', list(2), 200, (x) => x.json('count') === 2);
  tc('TC-09', 'default limit (nominal 10)', http.get(url('/stocks')), 200, (x) => x.json('count') === 10);
  tc('TC-10', 'limit=19 (max-1)', list(19), 200, (x) => x.json('count') === 19);
  tc('TC-11', 'limit=20 (max)', list(20), 200, (x) => x.json('count') === 20);
  tc('TC-12', 'limit=21 (max+1)', list(21), 422);

  // ---------- STOCK DETAIL: symbol = 2..10 capital letters (EP) ----------
  tc('TC-13', 'valid symbol TCS', http.get(url('/stocks/TCS')), 200, (x) => x.json('price') > 0);
  tc('TC-14', 'lowercase symbol', http.get(url('/stocks/tcs')), 422);
  tc('TC-15', 'symbol too short (1 char)', http.get(url('/stocks/A')), 422);
  tc('TC-16', 'symbol too long (11 chars)', http.get(url('/stocks/ABCDEFGHIJK')), 422);
  tc('TC-17', 'valid format but unknown symbol', http.get(url('/stocks/ZZZZ')), 404);
  tc('TC-18', 'symbol containing digits', http.get(url('/stocks/TCS1')), 422);

  // ---------- WATCHLIST: auth + max size 10 (BVA) ----------
  tc('TC-19', 'watchlist without token', post('/watchlist', { symbol: 'TCS' }), 401);
  tc('TC-20', 'watchlist with invalid token', post('/watchlist', { symbol: 'TCS' }, { 'Content-Type': 'application/json', Authorization: 'Bearer fake' }), 401);
  tc('TC-21', 'add valid symbol (1st item)', post('/watchlist', { symbol: SYMBOLS[0] }, auth), 201);
  tc('TC-22', 'add duplicate symbol', post('/watchlist', { symbol: SYMBOLS[0] }, auth), 409);
  tc('TC-23', 'add unknown symbol', post('/watchlist', { symbol: 'ZZZZ' }, auth), 404);
  for (let i = 1; i < 9; i++) post('/watchlist', { symbol: SYMBOLS[i] }, auth);        // items 2..9
  tc('TC-24', 'add 10th item (max)', post('/watchlist', { symbol: SYMBOLS[9] }, auth), 201);
  tc('TC-25', 'add 11th item (max+1) must be refused', post('/watchlist', { symbol: SYMBOLS[10] }, auth), 409);
  tc('TC-26', 'delete existing symbol', http.del(url(`/watchlist/${SYMBOLS[0]}`), null, { headers: auth }), 200);
  tc('TC-27', 'delete symbol not in watchlist', http.del(url('/watchlist/ZZZZ'), null, { headers: auth }), 404);

  // ---------- ALERTS: target_price valid range 1.00..100000.00 (BVA + type) ----------
  const alert = (price, dir) => post('/alerts', { symbol: 'TCS', target_price: price, direction: dir || 'above' }, auth);
  tc('TC-28', 'target_price 0.99 (min-1 step)', alert(0.99), 422);
  tc('TC-29', 'target_price 1.00 (min)', alert(1.0), 201);
  tc('TC-30', 'target_price 1.01 (min+1 step)', alert(1.01), 201);
  tc('TC-31', 'target_price 100000.00 (max)', alert(100000.0), 201);
  tc('TC-32', 'target_price 100000.01 (max+1 step) must be refused', alert(100000.01), 422);
  tc('TC-33', 'invalid direction "sideways"', alert(100, 'sideways'), 422);
  tc('TC-34', 'target_price is a string (type check)', alert('abc'), 422);

  // ---------- HISTORY: days valid range 1..365 (BVA) ----------
  const hist = (d) => http.get(url(`/stocks/TCS/history?days=${d}`));
  tc('TC-35', 'history days=0 (min-1)', hist(0), 422);
  tc('TC-36', 'history days=1 (min)', hist(1), 200, (x) => x.json('closes').length === 1);
  tc('TC-37', 'history days=365 (max)', hist(365), 200, (x) => x.json('closes').length === 365);
  tc('TC-38', 'history days=366 (max+1)', hist(366), 422);
}
