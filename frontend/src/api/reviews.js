// ================================================================
// REVIEWS.JS – Serviço de API para avaliações (reviews)
// ================================================================
// Este ficheiro contém funções para listar e criar reviews de produtos.
// Utiliza o cliente HTTP (Axios) configurado em client.js.
// A criação de reviews requer autenticação (token JWT).
// ================================================================

// Importação do cliente HTTP (Axios) configurado
import { api } from './client';

// ================================================================
// FUNÇÃO: Obter reviews de um produto
// ================================================================

// GET /reviews/:product_id – Retorna todas as reviews de um produto
// Ordenadas da mais recente para a mais antiga.
// Inclui o nome do utilizador que escreveu a review.
export async function getReviewsByProduct(product_id) {
  const response = await api.get(`/reviews/${product_id}`);
  return response.data; // array de reviews
}

// ================================================================
// FUNÇÃO: Criar uma nova review
// ================================================================

// POST /reviews – Cria uma review para um produto
// Requer autenticação (token JWT no header Authorization).
// Parâmetros:
//   user_id - ID do utilizador
//   product_id - ID do produto
//   rating - Classificação (1 a 5)
//   comentario - Texto da review (opcional)
export async function createReview({ user_id, product_id, rating, comentario }) {
  // Tenta obter o token de autenticação (duas chaves possíveis)
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  
  // Prepara os headers (Content-Type é JSON)
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  // Prepara o payload com os dados convertidos para número
  const payload = {
    user_id: Number(user_id),
    product_id: Number(product_id),
    rating: Number(rating),
    comentario: (comentario || '').trim(),
  };
  
  // Faz a requisição POST para /reviews
  const response = await api.post('/reviews', payload, { headers });
  return response.data;
}