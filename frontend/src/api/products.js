// products.js
// Serviço para interagir com as rotas de produtos da API.

import { api } from './client';

// Obtém a lista de todos os produtos.
// Retorna um array de objetos produto.
export async function getProducts() {
    // Faz a requisição GET para /products
    const response = await api.get('/products');
    return response.data;
}

// Obtém os detalhes de um produto específico pelo seu ID.
// Parâmetro: id (string ou número) – ID do produto.
// Retorna o objeto produto.
export async function getProductById(id) {
    // Faz a requisição GET para /products/{id}
    const response = await api.get(`/products/${id}`);
    return response.data;
}

// Pesquisa produtos com base em filtros fornecidos.
// Parâmetro: filters (objeto) com as propriedades:
//   q (string) – termo de pesquisa
//   category_id (string/número) – ID da categoria
//   min_price (número) – preço mínimo
//   max_price (número) – preço máximo
//   sort (string) – critério de ordenação
// Retorna os dados da resposta (array de produtos filtrados).
export async function searchProducts(filters) {
    // Cria um objeto URLSearchParams para construir a query string
    const params = new URLSearchParams();
    if (filters.q) params.append('q', filters.q);
    if (filters.category_id) params.append('category_id', filters.category_id);
    if (filters.min_price) params.append('min_price', filters.min_price);
    if (filters.max_price) params.append('max_price', filters.max_price);
    if (filters.sort) params.append('sort', filters.sort);

    // Faz a requisição GET para /products/search com os parâmetros
    const response = await api.get(`/products/search?${params.toString()}`);
    return response.data;
}