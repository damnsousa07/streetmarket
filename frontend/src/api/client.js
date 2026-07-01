// ================================================================
// CLIENT.JS – Configuração do cliente HTTP (Axios)
// ================================================================
// Este ficheiro configura a instância do Axios que será utilizada
// para todas as chamadas à API.
// A baseURL é definida a partir da variável de ambiente VITE_API_URL.
// ================================================================

import axios from 'axios';

// Cria uma instância do Axios com a configuração base
export const api = axios.create({
    // URL base da API (definida no ficheiro .env ou variável de ambiente)
    // Exemplo: 'http://localhost:3000/api'
    baseURL: import.meta.env.VITE_API_URL,
});

// A partir daqui, podes usar 'api' para fazer pedidos GET, POST, PUT, DELETE, etc.
// Exemplo: api.get('/Products') -> faz GET para VITE_API_URL + '/Products'a