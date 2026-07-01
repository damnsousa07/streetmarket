// ================================================================
// ORDERS.JS – Serviço de API para encomendas
// ================================================================
// Este ficheiro contém funções para criar, listar e obter detalhes
// de encomendas, bem como atualizar o método de pagamento.
// Utiliza o cliente HTTP (Axios) configurado em client.js.
// ================================================================

// Importação do cliente HTTP (Axios) configurado
import { api } from './client';

// ================================================================
// FUNÇÃO: Criar uma nova encomenda
// ================================================================

// POST /orders – Cria uma encomenda para o utilizador
// Parâmetros:
//   user_id - ID do utilizador
//   product_id - ID do produto
//   tamanho - Tamanho selecionado (ex: 'M', 'L', 'XL')
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

// ================================================================
// FUNÇÃO: Obter encomendas de um utilizador
// ================================================================

// GET /orders/user/:user_id – Retorna todas as encomendas do utilizador
export async function getUserOrders(user_id) {
  const response = await api.get(`/orders/user/${user_id}`);
  return response.data;
}

// ================================================================
// FUNÇÃO: Obter detalhes de uma encomenda específica
// ================================================================

// GET /orders/:order_id – Retorna os detalhes de uma encomenda
export async function getOrderById(order_id) {
  const response = await api.get(`/orders/${order_id}`);
  return response.data;
}

// ================================================================
// FUNÇÃO: Obter encomendas de um utilizador (alias)
// ================================================================

// Alias para getUserOrders (mantido para compatibilidade)
export async function getOrdersByUser(user_id) {
  return getUserOrders(user_id);
}

// ================================================================
// FUNÇÃO: Atualizar método de pagamento
// ================================================================

// PUT /orders/:order_id/payment – Atualiza o método de pagamento
// Parâmetros:
//   order_id - ID da encomenda
//   payment_method - 'Débito' (Stripe) ou 'PayPal'
export async function updatePaymentMethod(order_id, payment_method) {
  const response = await api.put(`/orders/${order_id}/payment`, { payment_method });
  return response.data;
}