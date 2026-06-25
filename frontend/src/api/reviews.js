// reviews.js
import { api } from './client';

export async function getReviewsByProduct(product_id) {
  const response = await api.get(`/reviews/${product_id}`);
  return response.data;
}

export async function createReview({ user_id, product_id, rating, comentario }) {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const payload = {
    user_id: Number(user_id),
    product_id: Number(product_id),
    rating: Number(rating),
    comentario: (comentario || '').trim(),
  };
  const response = await api.post('/reviews', payload, { headers });
  return response.data;
}