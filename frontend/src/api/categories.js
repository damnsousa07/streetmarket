// categories.js
// Serviço para interagir com as rotas de categorias e produtos da API.
// Utiliza o cliente API já configurado (importado de './client').

import { api } from './client';

// Obtém a lista de todas as categorias, ordenada alfabeticamente por nome.
// Retorna um array de objetos categoria.
export async function getCategories() {
    // Faz a requisição GET para o endpoint /Categories (nota: C maiúsculo)
    const res = await api.get('/Categories');

    // Garante que o resultado é sempre um array (mesmo se a resposta não for esperada)
    const list = Array.isArray(res.data) ? res.data : [];

    // Ordena a lista por nome, usando comparação local portuguesa
    // (ignora acentos e diferenças de maiúsculas/minúsculas)
    return list.sort((a, b) =>
        String(a?.nome ?? '').localeCompare(String(b?.nome ?? ''), 'pt', { sensitivity: 'base' })
    );
}

// Obtém todos os produtos e filtra-os pela categoria fornecida.
// Parâmetro: category_id (string ou número) – ID da categoria.
// Retorna um array de produtos que pertencem à categoria especificada.
export async function getProductsByCategory(category_id) {
    // Faz a requisição GET para /Products (P maiúsculo) – obtém todos os produtos
    const res = await api.get('/Products');

    // Garante que o resultado é sempre um array
    const all = Array.isArray(res.data) ? res.data : [];

    // Converte o ID da categoria para string (para comparação segura)
    const id = String(category_id);

    // Filtra os produtos cujo category_id corresponda ao ID fornecido
    return all.filter((p) => String(p?.category_id) === id);
}