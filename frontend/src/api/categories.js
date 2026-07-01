// ================================================================
// CATEGORIES.JS – Serviço de API para categorias
// ================================================================
// Este ficheiro contém funções para interagir com as rotas de
// categorias e produtos da API pública.
// Utiliza o cliente HTTP (Axios) configurado em client.js.
// ================================================================

// Importação do cliente HTTP (Axios) configurado
import { api } from './client';

// ================================================================
// FUNÇÃO: Obter todas as categorias (ordenadas alfabeticamente)
// ================================================================

// GET /Categories – Retorna a lista de todas as categorias
// Ordenadas por nome (A→Z) com comparação local portuguesa.
export async function getCategories() {
    // Faz a requisição GET para o endpoint /Categories
    // NOTA: O endpoint usa 'C' maiúsculo (conforme a rota no backend)
    const res = await api.get('/Categories');

    // Garante que o resultado é sempre um array (mesmo que a resposta não seja esperada)
    const list = Array.isArray(res.data) ? res.data : [];

    // Ordena a lista por nome, usando comparação local portuguesa
    // - 'sensitivity: base' ignora diferenças entre maiúsculas/minúsculas e acentos
    // - Exemplo: "Acessórios" e "acessorios" são considerados iguais para ordenação
    return list.sort((a, b) =>
        String(a?.nome ?? '').localeCompare(String(b?.nome ?? ''), 'pt', { sensitivity: 'base' })
    );
}

// ================================================================
// FUNÇÃO: Obter produtos de uma categoria específica
// ================================================================

// GET /Products – Retorna todos os produtos e filtra por categoria
// Esta função obtém TODOS os produtos e filtra no frontend.
export async function getProductsByCategory(category_id) {
    // Faz a requisição GET para /Products (P maiúsculo)
    const res = await api.get('/Products');

    // Garante que o resultado é sempre um array
    const all = Array.isArray(res.data) ? res.data : [];

    // Converte o ID da categoria para string (para comparação segura)
    const id = String(category_id);

    // Filtra os produtos cujo category_id corresponda ao ID fornecido
    return all.filter((p) => String(p?.category_id) === id);
}

// ================================================================
// NOTAS:
// ================================================================
// getCategories() é utilizada na página de categorias (/categories)
//    e nos dropdowns de filtro (Search, Admin, etc.).
//
// getProductsByCategory() é utilizada na página de categoria
//    (/categories/:category_id) para listar os produtos da categoria.
//
// Ambas as funções usam o mesmo cliente API (api) que já tem
//    a baseURL configurada (ex: http://localhost:3000).
// ================================================================