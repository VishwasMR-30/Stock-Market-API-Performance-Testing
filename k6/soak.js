// SOAK TEST: moderate load for a long time to detect slow degradation (memory leaks etc).
// Default 30 minutes. Shorter run:  -e SOAK_DURATION=5m
import { sleep } from 'k6';
import { login, journey, STANDARD_THRESHOLDS } from './lib/common.js';

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: __ENV.SOAK_DURATION || '30m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: STANDARD_THRESHOLDS,
};

let auth = null;

export default function () {
  if (!auth) auth = login(__VU);
  journey(auth);
  sleep(Math.random() * 2 + 1);
}
