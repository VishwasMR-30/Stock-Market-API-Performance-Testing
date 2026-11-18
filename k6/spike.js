// SPIKE TEST: sudden jump in users, like the market opening at 9:15 AM.
import { sleep } from 'k6';
import { login, journey } from './lib/common.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 },    // quiet morning
    { duration: '10s', target: 500 },   // market opens: sudden spike
    { duration: '1m', target: 500 },    // stay at spike
    { duration: '10s', target: 20 },    // back to normal
    { duration: '1m', target: 20 },     // recovery period
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

let auth = null;

export default function () {
  if (!auth) auth = login(__VU);
  journey(auth);
  sleep(Math.random() + 0.5);
}
