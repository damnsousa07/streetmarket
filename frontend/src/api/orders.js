import { api } from './client';

export async function createOrder(user_id, product_id) {
  const res = await api.post('/orders', { user_id, product_id });
  return res.data;
}

export async function getOrdersByUser(user_id) {
  const res = await api.get(`/orders/user/${user_id}`);
  return res.data;
}
