// ================================================================
// ORDERS.JS – Servico de API para encomendas
// ================================================================
// Contem funcoes para criar, listar e obter detalhes de encomendas,
// bem como atualizar o metodo de pagamento.
// Utiliza o cliente HTTP (Axios) configurado em client.js.
// ================================================================

import { api } from './client';

// ================================================================
// FUNCAO: Criar uma nova encomenda
// ================================================================

// POST /orders – Cria uma encomenda para o utilizador
// Parametros:
//   user_id - ID do utilizador
//   product_id - ID do produto
//   tamanho - Tamanho selecionado (ex: 'M', 'L', 'XL')
export async function createOrder(user_id, product_id, tamanho) {
  console.log('createOrder chamado com:', { user_id, product_id, tamanho });
  try {
    const response = await api.post('/orders', {
      user_id,
      product_id,
      tamanho,
    });
    return response.data;
  } catch (error) {
    console.error('Erro no createOrder:', error.response?.data || error.message);
    throw error;
  }
}

// ================================================================
// FUNCAO: Obter encomendas de um utilizador
// ================================================================

// GET /orders/user/:user_id – Retorna todas as encomendas do utilizador
export async function getUserOrders(user_id) {
  const response = await api.get(`/orders/user/${user_id}`);
  return response.data;
}

// ================================================================
// FUNCAO: Obter detalhes de uma encomenda especifica
// ================================================================

// GET /orders/:order_id – Retorna os detalhes de uma encomenda
export async function getOrderById(order_id) {
  const response = await api.get(`/orders/${order_id}`);
  return response.data;
}

// ================================================================
// FUNCAO: Obter encomendas de um utilizador (alias)
// ================================================================

// Alias para getUserOrders (mantido para compatibilidade)
export async function getOrdersByUser(user_id) {
  return getUserOrders(user_id);
}

// ================================================================
// FUNCAO: Atualizar metodo de pagamento
// ================================================================

// PUT /orders/:order_id/payment – Atualiza o metodo de pagamento
// Parametros:
//   order_id - ID da encomenda
//   payment_method - 'Debito' (Stripe) ou 'PayPal'
export async function updatePaymentMethod(order_id, payment_method) {
  const response = await api.put(`/orders/${order_id}/payment`, { payment_method });
  return response.data;
}