// ================================================================
// ADMIN.JS – Serviço de API para o painel de administração
// ================================================================
// Este ficheiro contém todas as funções para comunicar com as rotas
// administrativas do backend (produtos, categorias, encomendas, notificações).
// Todas as funções incluem a chave de administrador (x-admin-key) no header.
// ================================================================

// Importação do cliente HTTP (Axios) configurado
import { api } from './client';

// ----- FUNÇÃO AUXILIAR: Obtém a chave de administrador do localStorage -----
function getAdminKey() {
  return localStorage.getItem('admin_key') || '';
}

// ================================================================
// ADMIN ORDERS (Encomendas)
// ================================================================

// GET /admin/Orders – Lista todas as encomendas (com filtros opcionais)
export async function getAdminOrders(queryString = '') {
  const key = getAdminKey();
  const res = await api.get(`/admin/Orders${queryString ? `?${queryString}` : ''}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

// PUT /admin/Orders/:order_id/status – Atualiza o estado de uma encomenda
export async function updateAdminOrderStatus(order_id, status_id) {
  const key = getAdminKey();
  const res = await api.put(
    `/admin/Orders/${order_id}/status`,
    { status_id },
    { headers: { 'x-admin-key': key } }
  );
  return res.data;
}

// ================================================================
// ADMIN PRODUCTS (Produtos)
// ================================================================

// GET /admin/Products – Lista todos os produtos (com paginação e filtros)
export async function getAdminProducts(queryString = '') {
  const key = getAdminKey();
  const res = await api.get(`/admin/Products${queryString ? `?${queryString}` : ''}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

// POST /admin/Products – Cria um novo produto (com FormData para imagens)
export async function createAdminProduct(formData) {
  const key = getAdminKey();
  const res = await api.post('/admin/Products', formData, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

// PUT /admin/Products/:id – Atualiza um produto existente (com FormData)
export async function updateAdminProduct(id, formData) {
  const key = getAdminKey();
  const res = await api.put(`/admin/Products/${id}`, formData, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

// DELETE /admin/Products/:id – Apaga um produto
export async function deleteAdminProduct(id) {
  const key = getAdminKey();
  const res = await api.delete(`/admin/Products/${id}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

// GET /admin/Products/:id – Obtém os detalhes de um produto específico
export async function getAdminProductById(id) {
  const key = getAdminKey();
  const res = await api.get(`/admin/Products/${id}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

// ================================================================
// ADMIN CATEGORIES (Categorias)
// ================================================================

// GET /admin/Categories – Lista todas as categorias (com pesquisa e ordenação)
export async function getAdminCategories(queryString = '') {
  const key = getAdminKey();
  const res = await api.get(`/admin/Categories${queryString ? `?${queryString}` : ''}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

// POST /admin/Categories – Cria uma nova categoria (com imagem em FormData)
export async function createAdminCategory(formData) {
  const key = getAdminKey();
  const res = await api.post('/admin/Categories', formData, {
    headers: { 'x-admin-key': key },
    // NOTA: O browser define o content-type automaticamente, com o boundary
  });
  return res.data;
}

// PUT /admin/Categories/:id – Atualiza uma categoria existente (com imagem em FormData)
export async function updateAdminCategory(id, formData) {
  const key = getAdminKey();
  
  // Logs para depuração (mostram o que está a ser enviado)
  console.log('🔵 updateAdminCategory chamado com ID:', id);
  for (let [key, value] of formData.entries()) {
    if (key === 'image' && value instanceof File) {
      console.log(`🔵 FormData: ${key} = File: ${value.name} (${value.size} bytes)`);
    } else {
      console.log(`🔵 FormData: ${key} = ${value}`);
    }
  }
  
  const res = await api.put(`/admin/Categories/${id}`, formData, {
    headers: { 'x-admin-key': key },
  });
  console.log('🔵 Resposta do update:', res.data);
  return res.data;
}

// DELETE /admin/Categories/:id – Apaga uma categoria
export async function deleteAdminCategory(id) {
  const key = getAdminKey();
  const res = await api.delete(`/admin/Categories/${id}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

// ================================================================
// ADMIN NOTIFICATIONS (Notificações)
// ================================================================

// GET /admin/Notifications – Lista notificações (com pesquisa e filtros)
export async function getAdminNotifications(queryString = '') {
  const key = getAdminKey();
  const res = await api.get(`/admin/Notifications${queryString ? `?${queryString}` : ''}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

// ================================================================
// NOTAS GERAIS:
// ================================================================
// Todas as funções incluem o header 'x-admin-key' para autenticação.
// As funções que recebem FormData (create/update) não têm Content-Type definido
//    para que o browser defina automaticamente com o boundary correto.
// As funções de listagem aceitam queryString para filtros, paginação e ordenação.
// ================================================================