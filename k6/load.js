// LOAD TEST: normal expected traffic. Ramp up, hold, ramp down.
// Change the peak with:  -e PEAK=200   (default 100 virtual users)
import { sleep } from 'k6';
import { login, journey, STANDARD_THRESHOLDS } from './lib/common.js';

const PEAK = Number(__ENV.PEAK || 100);

export const options = {
  stages: [
    { duration: '1m', target: PEAK },   // ramp up
    { duration: '3m', target: PEAK },   // steady load
    { duration: '30s', target: 0 },     // ramp down
  ],
  thresholds: STANDARD_THRESHOLDS,
};

let auth = null; // one login per virtual user, reused by all of its iterations

export default function () {
  if (!auth) auth = login(__VU);
  journey(auth);
  sleep(Math.random() * 2 + 0.5); // think time 0.5 - 2.5 s
}
