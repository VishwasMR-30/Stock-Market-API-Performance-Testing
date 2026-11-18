// STRESS TEST: keep raising load beyond normal to find the BREAKING POINT.
// Thresholds do not abort the run, so you can see exactly where it degrades.
import { sleep } from 'k6';
import { login, journey } from './lib/common.js';

export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '1m', target: 200 },
    { duration: '1m', target: 400 },
    { duration: '1m', target: 600 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

let auth = null;

export default function () {
  if (!auth) auth = login(__VU);
  journey(auth);
  sleep(Math.random() + 0.5);
}
