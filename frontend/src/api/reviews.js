// reviews.js
// Serviço para interagir com as rotas de reviews/avaliações da API.
// Inclui helpers para tentar múltiplos endpoints (fallback).

import { api } from './client';

// ------------------------------------------------------------
// Helper interno: tenta fazer GET em vários endpoints até um funcionar.
// Se todos falharem, lança o último erro.
// Uso interno – não exportado.
async function tryGet(urls) {
    let lastErr;
    for (const u of urls) {
        try {
            const res = await api.get(u);
            return res.data;   // Retorna os dados do primeiro endpoint que funcionar
        } catch (e) {
            lastErr = e;       // Guarda o erro para lançar depois, se todos falharem
        }
    }
    throw lastErr;             // Nenhum endpoint funcionou – lança o erro
}

// Helper interno: tenta fazer POST em vários endpoints até um funcionar.
// Se todos falharem, lança o último erro.
// Uso interno – não exportado.
async function tryPost(urls, payload) {
    let lastErr;
    for (const u of urls) {
        try {
            const res = await api.post(u, payload);
            return res.data;   // Retorna os dados do primeiro endpoint que funcionar
        } catch (e) {
            lastErr = e;       // Guarda o erro para lançar depois, se todos falharem
        }
    }
    throw lastErr;             // Nenhum endpoint funcionou – lança o erro
}

// ------------------------------------------------------------
// Obtém todas as reviews de um produto específico.
// Parâmetro: product_id (string ou número) – ID do produto.
// Retorna os dados da resposta (array de reviews).
// Tenta vários endpoints com fallback (PAP-friendly).
export async function getReviewsByProduct(product_id) {
    // Converte para número para garantir consistência
    const id = Number(product_id);

    // Tenta os endpoints por ordem: o mais provável primeiro, depois fallbacks
    return tryGet([
        `/reviews/product/${id}`,     // muito comum
        `/reviews/${id}`,             // fallback alternativo
        `/products/${id}/reviews`,    // fallback (estilo REST)
    ]);
}

// Cria uma nova review para um produto.
// Parâmetros (objeto):
//   user_id (string/número) – ID do utilizador que faz a review
//   product_id (string/número) – ID do produto avaliado
//   rating (string/número) – classificação (ex: 1 a 5)
//   comentario (string) – texto da avaliação (opcional)
// Retorna os dados da resposta (a review criada).
// Tenta vários endpoints com fallback (PAP-friendly).
export async function createReview({ user_id, product_id, rating, comentario }) {
    // Monta o payload com valores convertidos e tratados
    const payload = {
        user_id: Number(user_id),
        product_id: Number(product_id),
        rating: Number(rating),
        comentario: (comentario || '').trim(), // Remove espaços em branco
    };

    // Tenta os endpoints por ordem: o mais provável primeiro, depois fallbacks
    return tryPost(
        [
            `/reviews`,                 // muito comum (POST para /reviews)
            `/reviews/create`,          // fallback (algumas APIs usam /create)
            `/products/${Number(product_id)}/reviews`, // fallback (REST aninhado)
        ],
        payload
    );
}