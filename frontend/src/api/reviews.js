// ================================================================
// REVIEWS.JS – Servico de API para avaliacoes (reviews)
// ================================================================
// Contem funcoes para listar e criar reviews de produtos.
// Utiliza o cliente HTTP (Axios) configurado em client.js.
// A criacao de reviews requer autenticacao (token JWT).
// ================================================================

import { api } from './client';

// ================================================================
// FUNCAO: Obter reviews de um produto
// ================================================================

// GET /reviews/:product_id – Retorna todas as reviews de um produto
// Ordenadas da mais recente para a mais antiga.
// Inclui o nome do utilizador que escreveu a review.
export async function getReviewsByProduct(product_id) {
  const response = await api.get(`/reviews/${product_id}`);
  return response.data;
}

// ================================================================
// FUNCAO: Criar uma nova review
// ================================================================

// POST /reviews – Cria uma review para um produto
// Requer autenticacao (token JWT no header Authorization).
// Parametros:
//   user_id - ID do utilizador
//   product_id - ID do produto
//   rating - Classificacao (1 a 5)
//   comentario - Texto da review (opcional)
export async function createReview({ user_id, product_id, rating, comentario }) {
  // Tenta obter o token de autenticacao (suporta duas chaves possiveis)
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  
  // Prepara os headers (Content-Type e Authorization se token existir)
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  // Prepara o payload convertendo os dados para numero e limpando o texto
  const payload = {
    user_id: Number(user_id),
    product_id: Number(product_id),
    rating: Number(rating),
    comentario: (comentario || '').trim(),
  };
  
  // Faz a requisicao POST para /reviews
  const response = await api.post('/reviews', payload, { headers });
  return response.data;
}