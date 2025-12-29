/**
 * Exemplo de teste de carga para o projeto AppHub
 * 
 * Como usar:
 * 1. Instalar k6: choco install k6 (Windows) ou brew install k6 (Mac)
 * 2. Configurar as URLs abaixo
 * 3. Executar: k6 run load-test-example.js
 * 
 * Para testar produção:
 * k6 run --env BASE_URL=https://seu-app.vercel.app --env API_URL=https://seu-backend.railway.app load-test-example.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Métricas customizadas
const errorRate = new Rate('errors');
const orderCreationTime = new Trend('order_creation_time');
const pixGenerationTime = new Trend('pix_generation_time');
const dashboardLoadTime = new Trend('dashboard_load_time');
const requestCount = new Counter('total_requests');

// Configuração do teste
export const options = {
  stages: [
    // Fase 1: Ramp-up gradual
    { duration: '30s', target: 10 },   // 0 → 10 usuários em 30s
    { duration: '1m', target: 10 },     // Mantém 10 usuários por 1min
    
    // Fase 2: Aumento moderado
    { duration: '30s', target: 25 },    // 10 → 25 usuários em 30s
    { duration: '1m', target: 25 },     // Mantém 25 usuários por 1min
    
    // Fase 3: Carga média
    { duration: '30s', target: 50 },    // 25 → 50 usuários em 30s
    { duration: '2m', target: 50 },     // Mantém 50 usuários por 2min
    
    // Fase 4: Carga alta (teste de stress)
    { duration: '30s', target: 100 },   // 50 → 100 usuários em 30s
    { duration: '2m', target: 100 },   // Mantém 100 usuários por 2min
    
    // Fase 5: Ramp-down
    { duration: '30s', target: 0 },     // 100 → 0 usuários em 30s
  ],
  
  thresholds: {
    // 95% das requisições devem completar em menos de 2 segundos
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    
    // Taxa de erro deve ser menor que 1%
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
    
    // Tempos específicos
    'order_creation_time': ['p(95)<3000'],
    'pix_generation_time': ['p(95)<5000'],
    'dashboard_load_time': ['p(95)<2000'],
  },
};

// URLs - Configure aqui ou via variáveis de ambiente
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:5000';

// Função principal de teste
export default function () {
  // Simular fluxo completo de um usuário
  
  // 1. Acessar dashboard (página inicial)
  const dashboardRes = http.get(`${BASE_URL}/dashboard`, {
    tags: { name: 'Dashboard' },
  });
  
  const dashboardSuccess = check(dashboardRes, {
    'dashboard loaded': (r) => r.status === 200,
    'dashboard response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  dashboardLoadTime.add(dashboardRes.timings.duration);
  requestCount.add(1);
  errorRate.add(!dashboardSuccess);
  
  sleep(1);
  
  // 2. Simular login (se necessário)
  // Nota: Ajuste conforme sua API de autenticação
  const loginPayload = JSON.stringify({
    email: `test${Math.floor(Math.random() * 10000)}@test.com`,
    password: 'test123',
  });
  
  const loginRes = http.post(`${API_URL}/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Login' },
  });
  
  const loginSuccess = check(loginRes, {
    'login successful or unauthorized': (r) => r.status === 200 || r.status === 401,
  });
  
  requestCount.add(1);
  errorRate.add(loginRes.status >= 500);
  
  // Se login bem-sucedido, continuar com ações autenticadas
  if (loginSuccess && loginRes.status === 200) {
    const token = loginRes.json('token') || loginRes.json('data.token');
    
    if (token) {
      // 3. Listar pedidos
      const ordersRes = http.get(`${API_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        tags: { name: 'ListOrders' },
      });
      
      check(ordersRes, {
        'orders listed': (r) => r.status === 200,
        'orders response time < 1s': (r) => r.timings.duration < 1000,
      });
      
      requestCount.add(1);
      errorRate.add(ordersRes.status >= 400);
      
      sleep(1);
      
      // 4. Criar pedido (simulação)
      const orderPayload = JSON.stringify({
        eventId: 'test-event-id',
        ticketTypeId: 'test-ticket-type-id',
        quantity: 1,
      });
      
      const orderStart = Date.now();
      const orderRes = http.post(`${API_URL}/orders`, orderPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        tags: { name: 'CreateOrder' },
      });
      const orderDuration = Date.now() - orderStart;
      
      const orderSuccess = check(orderRes, {
        'order created': (r) => r.status === 200 || r.status === 201,
      });
      
      orderCreationTime.add(orderDuration);
      requestCount.add(1);
      errorRate.add(!orderSuccess);
      
      if (orderSuccess && orderRes.status < 300) {
        const orderData = orderRes.json('data') || orderRes.json();
        const orderId = orderData._id || orderData.id;
        
        if (orderId) {
          sleep(2);
          
          // 5. Gerar PIX (simulação)
          const pixPayload = JSON.stringify({
            deviceId: 'test-device-id',
          });
          
          const pixStart = Date.now();
          const pixRes = http.post(
            `${API_URL}/payments/${orderId}/pix`,
            pixPayload,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              tags: { name: 'GeneratePix' },
            }
          );
          const pixDuration = Date.now() - pixStart;
          
          const pixSuccess = check(pixRes, {
            'pix generated': (r) => r.status === 200 || r.status === 201,
          });
          
          pixGenerationTime.add(pixDuration);
          requestCount.add(1);
          errorRate.add(!pixSuccess);
        }
      }
    }
  }
  
  // Pausa entre iterações (simular comportamento humano)
  sleep(Math.random() * 2 + 1); // 1-3 segundos
}

// Função executada após o teste
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = '\n';
  summary += `${indent}📊 RESUMO DO TESTE DE CARGA\n`;
  summary += `${indent}${'='.repeat(50)}\n\n`;
  
  // Métricas gerais
  summary += `${indent}✅ Requisições: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}⏱️  Tempo médio: ${(data.metrics.http_req_duration.values.avg / 1000).toFixed(2)}s\n`;
  summary += `${indent}⚡ Tempo p95: ${(data.metrics.http_req_duration.values['p(95)'] / 1000).toFixed(2)}s\n`;
  summary += `${indent}❌ Taxa de erro: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n\n`;
  
  // Métricas customizadas
  if (data.metrics.order_creation_time) {
    summary += `${indent}📦 Criação de pedido:\n`;
    summary += `${indent}   Média: ${(data.metrics.order_creation_time.values.avg / 1000).toFixed(2)}s\n`;
    summary += `${indent}   P95: ${(data.metrics.order_creation_time.values['p(95)'] / 1000).toFixed(2)}s\n\n`;
  }
  
  if (data.metrics.pix_generation_time) {
    summary += `${indent}💳 Geração de PIX:\n`;
    summary += `${indent}   Média: ${(data.metrics.pix_generation_time.values.avg / 1000).toFixed(2)}s\n`;
    summary += `${indent}   P95: ${(data.metrics.pix_generation_time.values['p(95)'] / 1000).toFixed(2)}s\n\n`;
  }
  
  // Status
  const errorRate = data.metrics.http_req_failed.values.rate;
  if (errorRate < 0.01) {
    summary += `${indent}✅ Status: SISTEMA ESTÁVEL\n`;
  } else if (errorRate < 0.05) {
    summary += `${indent}⚠️  Status: ATENÇÃO - Alguns erros detectados\n`;
  } else {
    summary += `${indent}❌ Status: CRÍTICO - Muitos erros detectados\n`;
  }
  
  return summary;
}

