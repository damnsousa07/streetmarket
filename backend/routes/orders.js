// ================================================================
// ORDERS.JS – Rotas de encomendas (públicas e internas)
// ================================================================
// Este ficheiro contém as rotas para gerir encomendas:
// - Criação de encomenda (com verificação de stock)
// - Atualização do método de pagamento
// - Listagem de encomendas do utilizador
// - Detalhe de uma encomenda específica
// ================================================================

// Importação dos módulos necessários
const express = require('express');        // Framework para construir a API
const router = express.Router();           // Cria um router para definir as rotas
const db = require('../db');               // Ligação à base de dados MySQL

// ================================================================
// ROTA: Criar uma nova encomenda (com verificação de stock)
// ================================================================

// POST /orders – Cria uma encomenda para um utilizador
// Esta rota é chamada quando o utilizador clica em "Comprar" no ProductDetails.
// Utiliza transação para garantir consistência dos dados.
router.post('/', async (req, res) => {
  // Extrai os dados do corpo da requisição
  const { user_id, product_id, tamanho } = req.body;
  
  // Validação: todos os campos são obrigatórios
  if (!user_id || !product_id || !tamanho) {
    return res.status(400).json({ message: 'Faltam dados obrigatórios.' });
  }

  // Obtém uma ligação à base de dados para usar transação
  const connection = await db.promise().getConnection();
  try {
    // Inicia a transação (atomicidade: tudo ou nada)
    await connection.beginTransaction();

    // 1. Verifica o stock do produto (com FOR UPDATE para bloquear a linha)
    const [products] = await connection.query(
      'SELECT stock FROM Products WHERE product_id = ? FOR UPDATE',
      [product_id]
    );
    
    // Se o produto não existir, desfaz a transação e retorna erro
    if (products.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    
    // Se o stock for insuficiente (<= 0), desfaz a transação e retorna erro
    if (products[0].stock <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Produto sem stock disponível.' });
    }

    // 2. Cria a encomenda com status_id = 1 (Pendente)
    const [orderResult] = await connection.query(
      'INSERT INTO FakeOrders (user_id, product_id, tamanho, status_id, data_compra) VALUES (?, ?, ?, 1, NOW())',
      [user_id, product_id, tamanho]
    );
    const orderId = orderResult.insertId;

    // 3. Decrementa o stock do produto (stock = stock - 1)
    await connection.query(
      'UPDATE Products SET stock = stock - 1 WHERE product_id = ?',
      [product_id]
    );

    // Confirma a transação (commit)
    await connection.commit();
    res.status(201).json({ message: 'Encomenda criada.', order_id: orderId });
  } catch (err) {
    // Em caso de erro, desfaz todas as alterações (rollback)
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Erro ao criar encomenda.' });
  } finally {
    // Liberta a ligação de volta ao pool
    connection.release();
  }
});

// ================================================================
// ROTA: Atualizar método de pagamento da encomenda
// ================================================================

// PUT /orders/:order_id/payment – Atualiza o método de pagamento
// Esta rota é chamada após o pagamento ser bem-sucedido
// para guardar se foi pago com 'Débito' (Stripe) ou 'PayPal'.
router.put('/:order_id/payment', async (req, res) => {
  const { order_id } = req.params;          // ID da encomenda (da URL)
  const { payment_method } = req.body;      // Método de pagamento (do corpo)

  // Validação: método de pagamento é obrigatório
  if (!payment_method) {
    return res.status(400).json({ message: 'Método de pagamento é obrigatório.' });
  }

  try {
    // Atualiza a coluna payment_method na tabela FakeOrders
    const [result] = await db.promise().query(
      'UPDATE FakeOrders SET payment_method = ? WHERE order_id = ?',
      [payment_method, order_id]
    );
    
    // Se nenhuma linha foi afetada, a encomenda não existe
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Encomenda não encontrada.' });
    }
    
    res.json({ message: 'Método de pagamento atualizado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar método de pagamento.' });
  }
});

// ================================================================
// ROTA: Listar encomendas de um utilizador
// ================================================================

// GET /orders/user/:user_id – Retorna todas as encomendas de um utilizador
// Esta rota é utilizada na página /orders para mostrar o histórico de compras.
// Inclui dados do produto (nome, preço, imagem) e o estado da encomenda.
router.get('/user/:user_id', async (req, res) => {
  const { user_id } = req.params;  // ID do utilizador (da URL)

  try {
    // Query com JOINs para obter dados relacionados:
    // - Products: nome, preço, imagem
    // - OrderStatus: nome do estado (Pendente, Enviado, Recebido, etc.)
    const [rows] = await db.promise().query(
      `SELECT fo.*, 
              p.nome AS product_nome, 
              p.preco AS preco, 
              p.imagem, 
              os.nome AS status
       FROM FakeOrders fo
       JOIN Products p ON fo.product_id = p.product_id
       JOIN OrderStatus os ON fo.status_id = os.status_id
       WHERE fo.user_id = ?
       ORDER BY fo.data_compra DESC`,  // Mais recentes primeiro
      [user_id]
    );
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao listar encomendas.' });
  }
});

// ================================================================
// ROTA: Detalhe de uma encomenda específica
// ================================================================

// GET /orders/:order_id – Retorna os detalhes de uma encomenda
// Esta rota pode ser usada para ver o detalhe de uma encomenda específica
// (ex: na página de checkout ou na página de encomendas).
router.get('/:order_id', async (req, res) => {
  const { order_id } = req.params;  // ID da encomenda (da URL)

  try {
    // Query semelhante à anterior, mas filtrada por order_id
    const [rows] = await db.promise().query(
      `SELECT fo.*, 
              p.nome AS product_nome, 
              p.preco AS preco, 
              p.imagem, 
              os.nome AS status
       FROM FakeOrders fo
       JOIN Products p ON fo.product_id = p.product_id
       JOIN OrderStatus os ON fo.status_id = os.status_id
       WHERE fo.order_id = ?`,
      [order_id]
    );
    
    // Se não encontrar, retorna 404
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Encomenda não encontrada.' });
    }
    
    res.json(rows[0]);  // Retorna apenas o primeiro (e único) resultado
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao obter encomenda.' });
  }
});

// ================================================================
// EXPORTAÇÃO DO ROUTER
// ================================================================
// Exporta o router para ser utilizado no index.js (montado em /orders)
module.exports = router;