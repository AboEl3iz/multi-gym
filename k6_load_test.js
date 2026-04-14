import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 500 },  // Stay at 500 users (Huge traffic)
    { duration: '30s', target: 0 },  // Ramp down
  ],
};

export default function () {
  // Hit health check
  const resHealth = http.get('http://localhost:3001/health');
  check(resHealth, { 'health returned 200': (r) => r.status === 200 });

  // Hit a non-existent route to trigger a 404 metrics label
  const resBad = http.get('http://localhost:3001/non-existent-route');
  check(resBad, { 'bad route returned 404': (r) => r.status === 404 });

  sleep(1);
}
