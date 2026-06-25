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

export async function createAdminProduct(formData) {
  const key = getAdminKey();
  const res = await api.post('/admin/Products', formData, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

export async function updateAdminProduct(id, formData) {
  const key = getAdminKey();
  const res = await api.put(`/admin/Products/${id}`, formData, {
    headers: { 'x-admin-key': key },
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
// ADMIN CATEGORIES (CORRIGIDO)
// =======================
export async function getAdminCategories(queryString = '') {
  const key = getAdminKey();
  const res = await api.get(`/admin/Categories${queryString ? `?${queryString}` : ''}`, {
    headers: { 'x-admin-key': key },
  });
  return res.data;
}

// CRIAÇÃO – aceita FormData
export async function createAdminCategory(formData) {
  const key = getAdminKey();
  const res = await api.post('/admin/Categories', formData, {
    headers: { 'x-admin-key': key },
    // Não definir Content-Type – o browser define com boundary
  });
  return res.data;
}

// EDIÇÃO – aceita FormData (URL CORRETO)
export async function updateAdminCategory(id, formData) {
  const key = getAdminKey();
  console.log('🔵 updateAdminCategory chamado com ID:', id);
  // Log do FormData para depuração
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