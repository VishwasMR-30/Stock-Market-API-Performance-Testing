// SMOKE TEST: 1 user for 30 s. "Does the system work at all?" Run this first.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, login, journey, JSON_HEADERS } from './lib/common.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate==1'],
  },
};

export default function () {
  const health = http.get(`${BASE_URL}/health`, { tags: { name: 'GET /health' } });
  check(health, { 'health: 200': (r) => r.status === 200 });

  const auth = login(1);
  journey(auth);

  const alert = http.post(
    `${BASE_URL}/alerts`,
    JSON.stringify({ symbol: 'TCS', target_price: 4000, direction: 'above' }),
    { headers: auth, tags: { name: 'POST /alerts' } },
  );
  check(alert, { 'alert create: 201': (r) => r.status === 201 });
  sleep(1);
}
