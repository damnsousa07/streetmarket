import { api } from './client';

function getAdminKey() {
  return localStorage.getItem('admin_key') || '';
}

// =======================
// ADMIN ORDERS
// =======================
export async function getAdminOrders(queryString = '') {
  const key = getAdminKey();
  const res = await api.get(`/admin/Orders${queryString ? `?${queryString}` : ''}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

export async function updateAdminOrderStatus(order_id, status_id) {
  const key = getAdminKey();
  const res = await api.put(
    `/admin/Orders/${order_id}/status`,
    { status_id },
    { headers: { 'x-admin-key': key } }
  );
  return res.data;
}

// =======================
// ADMIN PRODUCTS
// =======================
export async function getAdminProducts(queryString = '') {
  const key = getAdminKey();
  const res = await api.get(`/admin/Products${queryString ? `?${queryString}` : ''}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}
// ✅ Criar produto com FormData (múltiplas imagens)
export async function createAdminProduct(formData) {
  const key = getAdminKey();
  const res = await api.post('/admin/Products', formData, {
    headers: {
      'x-admin-key': key,
      // Não definir Content-Type – o axios define automaticamente como multipart/form-data
    },
  });
  return res.data;
}

// ✅ Atualizar produto com FormData (adicionar novas imagens)
export async function updateAdminProduct(id, formData) {
  const key = getAdminKey();
  const res = await api.put(`/admin/Products/${id}`, formData, {
    headers: {
      'x-admin-key': key,
    },
  });
  return res.data;
}

export async function deleteAdminProduct(id) {
  const key = getAdminKey();
  const res = await api.delete(`/admin/Products/${id}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

// =======================
// ADMIN CATEGORIES
// =======================
export async function getAdminCategories(queryString = '') {
  const key = getAdminKey();
  const res = await api.get(`/admin/Categories${queryString ? `?${queryString}` : ''}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

export async function createAdminCategory(payload) {
  const key = getAdminKey();
  const res = await api.post('/admin/Categories', payload, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

export async function updateAdminCategory(id, payload) {
  const key = getAdminKey();
  const res = await api.put(`/admin/Categories/${id}`, payload, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

export async function deleteAdminCategory(id) {
  const key = getAdminKey();
  const res = await api.delete(`/admin/Categories/${id}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

// =======================
// ADMIN NOTIFICATIONS
// =======================
export async function getAdminNotifications(queryString = '') {
  const key = getAdminKey();
  const res = await api.get(`/admin/Notifications${queryString ? `?${queryString}` : ''}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

export async function getAdminProductById(id) {
  const key = getAdminKey();
  const res = await api.get(`/admin/Products/${id}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}