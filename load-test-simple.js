/**
 * Teste de carga SIMPLES - Apenas endpoints principais
 * 
 * Uso rápido:
 * k6 run load-test-simple.js
 * 
 * Com URLs de produção:
 * k6 run --env API_URL=https://seu-backend.railway.app load-test-simple.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // 20 usuários
    { duration: '2m', target: 50 },    // 50 usuários
    { duration: '1m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

const API_URL = __ENV.API_URL || 'http://localhost:5000';

export default function () {
  // Teste 1: Health check ou endpoint público
  const healthRes = http.get(`${API_URL}/health`);
  check(healthRes, {
    'health check ok': (r) => r.status === 200,
  });

  sleep(1);

  // Teste 2: Listar pedidos (pode falhar se não autenticado - ok)
  const ordersRes = http.get(`${API_URL}/orders`);
  check(ordersRes, {
    'orders endpoint responds': (r) => r.status < 500, // Qualquer status < 500 é ok
  });

  sleep(2);
}

