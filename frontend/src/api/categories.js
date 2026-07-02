// ================================================================
// CATEGORIES.JS – Servico de API para categorias
// ================================================================
// Contem funcoes para interagir com as rotas de categorias e produtos da API publica.
// Utiliza o cliente HTTP (Axios) configurado em client.js.
// ================================================================

import { api } from './client';

// ================================================================
// FUNCAO: Obter todas as categorias (ordenadas alfabeticamente)
// ================================================================

// GET /categories – Retorna a lista de todas as categorias
// Ordenadas por nome (A-Z) com comparacao local portuguesa.
export async function getCategories() {
    // Nota: Endpoint corrigido de '/Categories' (maiusculo) para '/categories' (minusculo)
    const res = await api.get('/categories');

    // Garante que o resultado e sempre um array
    const list = Array.isArray(res.data) ? res.data : [];
    
    // Ordena por nome usando comparacao local portuguesa
    // 'sensitivity: base' ignora diferencas entre maiusculas/minusculas e acentos
    return list.sort((a, b) =>
        String(a?.nome ?? '').localeCompare(String(b?.nome ?? ''), 'pt', { sensitivity: 'base' })
    );
}

// ================================================================
// FUNCAO: Obter produtos de uma categoria especifica
// ================================================================

// GET /products – Retorna todos os produtos e filtra por categoria no frontend
export async function getProductsByCategory(category_id) {
    // Endpoint corrigido de '/Products' (maiusculo) para '/products' (minusculo)
    const res = await api.get('/products');

    const all = Array.isArray(res.data) ? res.data : [];
    const id = String(category_id);
    
    // Filtra produtos cujo category_id corresponde ao ID fornecido
    return all.filter((p) => String(p?.category_id) === id);
}