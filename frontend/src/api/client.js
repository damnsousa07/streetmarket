// ================================================================
// CLIENT.JS – Configuracao do cliente HTTP (Axios)
// ================================================================
// Configura a instancia do Axios utilizada para todas as chamadas a API.
// A baseURL e definida a partir da variavel de ambiente VITE_API_URL.
// ================================================================

import axios from 'axios';

// Cria uma instancia do Axios com a configuracao base
// Esta instancia sera reutilizada em todos os servicos da API
export const api = axios.create({
    // URL base da API definida no ficheiro .env
    // Exemplo: 'http://localhost:3000'
    // Usada para todas as requisicoes, evitando repetir a URL completa
    baseURL: import.meta.env.VITE_API_URL,
});

// Notas:
// - A instancia 'api' pode ser usada para fazer pedidos GET, POST, PUT, DELETE
// - Exemplo: api.get('/products') -> GET para VITE_API_URL + '/products'
// - Os headers e outras configuracoes podem ser adicionados aqui se necessario