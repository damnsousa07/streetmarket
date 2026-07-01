// ================================================================
// PRODUCTS.JS – Serviço de API para produtos
// ================================================================
// Este ficheiro contém funções para obter produtos, detalhes,
// marcas e pesquisar produtos com filtros.
// Utiliza o cliente HTTP (Axios) configurado em client.js.
// ================================================================

// Importação do cliente HTTP (Axios) configurado
import { api } from './client';

// ================================================================
// FUNÇÃO: Obter produtos com paginação e filtros
// ================================================================

// GET /products – Retorna uma lista paginada de produtos
// Parâmetros (filters):
//   page - Número da página (default: 1)
//   limit - Produtos por página (default: 12)
//   q - Termo de pesquisa (nome ou marca)
//   category_id - ID da categoria
//   brand - Marca
//   gender - Género (Masculino, Feminino, Unisexo)
//   min_price - Preço mínimo
//   max_price - Preço máximo
//   sort - Ordenação (ex: 'price_asc', 'name_desc')
export async function getProducts(filters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.q) params.append('q', filters.q);
  if (filters.category_id) params.append('category_id', filters.category_id);
  if (filters.brand) params.append('brand', filters.brand);
  if (filters.gender) params.append('gender', filters.gender);
  if (filters.min_price) params.append('min_price', filters.min_price);
  if (filters.max_price) params.append('max_price', filters.max_price);
  if (filters.sort) params.append('sort', filters.sort);

  const response = await api.get(`/products?${params.toString()}`);
  return response.data; // { data: [...], meta: { total, totalPages, currentPage, limit } }
}

// ================================================================
// FUNÇÃO: Obter detalhes de um produto específico
// ================================================================

// GET /products/:id – Retorna os detalhes de um produto
// Parâmetros:
//   id - ID do produto
//   userId - ID do utilizador (opcional, para verificar permissão de review)
export async function getProductById(id, userId = null) {
  const params = new URLSearchParams();
  if (userId) {
    params.append('userId', userId);
  }
  const url = `/products/${id}${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await api.get(url);
  return response.data; // Produto com imagens, canReview, userReview
}

// ================================================================
// FUNÇÃO: Obter marcas distintas
// ================================================================

// GET /products/brands – Retorna todas as marcas distintas
// Utilizado para popular os dropdowns de filtro de marcas.
export async function getBrands() {
  const response = await api.get('/products/brands');
  return response.data; // array de strings (nomes das marcas)
}

// ================================================================
// FUNÇÃO: Pesquisar produtos (alias)
// ================================================================

// Alias para getProducts (mantido para compatibilidade)
// Algumas partes do código podem usar searchProducts em vez de getProducts.
export async function searchProducts(filters) {
  return getProducts(filters);
}