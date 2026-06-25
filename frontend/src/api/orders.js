import { api } from './client';

export async function createOrder(user_id, product_id, tamanho) {
  console.log('📦 createOrder chamado com:', { user_id, product_id, tamanho });
  try {
    const response = await api.post('/orders', {
      user_id,
      product_id,
      tamanho,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Erro no createOrder:', error.response?.data || error.message);
    throw error;
  }
}

export async function getUserOrders(user_id) {
  const response = await api.get(`/orders/user/${user_id}`);
  return response.data;
}

export async function getOrderById(order_id) {
  const response = await api.get(`/orders/${order_id}`);
  return response.data;
}

export async function getOrdersByUser(user_id) {
  return getUserOrders(user_id);
}

// NOVA FUNÇÃO: atualizar método de pagamento
export async function updatePaymentMethod(order_id, payment_method) {
  const response = await api.put(`/orders/${order_id}/payment`, { payment_method });
  return response.data;
}