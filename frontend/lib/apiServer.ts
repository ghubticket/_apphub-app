/**
 * API Client Server-Side
 * Para uso em Server Components e generateMetadata
 * Faz requisições diretas ao backend (sem proxy)
 */

import axios from 'axios';

// URL da API backend (server-side)
const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.ghubtech.com.br/api';

const apiServer = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiServer;

