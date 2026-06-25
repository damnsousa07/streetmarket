// products.js
import { api } from './client';

// Obtém lista de produtos com paginação e filtros
// filters: { page, limit, q, category_id, brand, min_price, max_price, sort }
export async function getProducts(filters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.q) params.append('q', filters.q);
  if (filters.category_id) params.append('category_id', filters.category_id);
  if (filters.brand) params.append('brand', filters.brand);
  if (filters.min_price) params.append('min_price', filters.min_price);
  if (filters.max_price) params.append('max_price', filters.max_price);
  if (filters.sort) params.append('sort', filters.sort);

  const response = await api.get(`/products?${params.toString()}`);
  return response.data; // { data: [...], meta: { total, totalPages, currentPage, limit } }
}

export async function getProductById(id) {
  const response = await api.get(`/products/${id}`);
  return response.data;
}

// Para compatibilidade com a rota /search (redireciona para a principal)
export async function searchProducts(filters) {
  return getProducts(filters);
}