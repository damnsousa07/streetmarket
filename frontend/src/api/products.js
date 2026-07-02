// ================================================================
// PRODUCTS.JS – Servico de API para produtos
// ================================================================
// Contem funcoes para obter produtos, detalhes, marcas e pesquisar produtos com filtros.
// Utiliza o cliente HTTP (Axios) configurado em client.js.
// ================================================================

import { api } from './client';

// ================================================================
// FUNCAO: Obter produtos com paginacao e filtros
// ================================================================

// GET /products – Retorna uma lista paginada de produtos
// Parametros (filters):
//   page - Numero da pagina (default: 1)
//   limit - Produtos por pagina (default: 12)
//   q - Termo de pesquisa (nome ou marca)
//   category_id - ID da categoria
//   brand - Marca
//   gender - Genero (Masculino, Feminino, Unisexo)
//   min_price - Preco minimo
//   max_price - Preco maximo
//   sort - Ordenacao (ex: 'price_asc', 'name_desc')
//   in_stock - Filtrar apenas produtos em stock (true/false)
export async function getProducts(filters = {}) {
  console.log('getProducts - FILTROS RECEBIDOS:', filters);
  
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
  if (filters.in_stock !== undefined && filters.in_stock !== null) {
    params.append('in_stock', filters.in_stock);
    console.log('getProducts - in_stock ADICIONADO AO URL:', filters.in_stock);
  } else {
    console.log('getProducts - in_stock NAO FOI ADICIONADO (undefined ou null)');
  }

  const url = `/products?${params.toString()}`;
  console.log('getProducts - URL FINAL:', url);
  
  const response = await api.get(url);
  console.log('getProducts - RESPOSTA:', response.data);
  return response.data;
}

// ================================================================
// FUNCAO: Obter detalhes de um produto especifico
// ================================================================

// GET /products/:id – Retorna os detalhes de um produto
// Parametros:
//   id - ID do produto
//   userId - ID do utilizador (opcional, para verificar permissao de review)
export async function getProductById(id, userId = null) {
  const params = new URLSearchParams();
  if (userId) {
    params.append('userId', userId);
  }
  const url = `/products/${id}${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await api.get(url);
  return response.data;
}

// ================================================================
// FUNCAO: Obter marcas distintas
// ================================================================

// GET /products/brands – Retorna todas as marcas distintas
// Utilizado para popular os dropdowns de filtro de marcas.
export async function getBrands() {
  const response = await api.get('/products/brands');
  return response.data;
}

// ================================================================
// FUNCAO: Pesquisar produtos (alias)
// ================================================================

// Alias para getProducts (mantido para compatibilidade)
export async function searchProducts(filters) {
  console.log('searchProducts - FILTROS:', filters);
  return getProducts(filters);
}