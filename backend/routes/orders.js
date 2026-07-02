// ================================================================
// ORDERS.JS – Rotas de encomendas (publicas e internas)
// ================================================================
// Contem as rotas para gerir encomendas: criacao, pagamento, listagem e detalhe.
// ================================================================

const express = require('express');
const router = express.Router();
const db = require('../db');

// ================================================================
// ROTA: Criar uma nova encomenda
// ================================================================

// POST /orders – Cria uma encomenda para um utilizador
// Chamada quando o utilizador clica em "Comprar" no ProductDetails.
// Apenas verifica o stock, nao decrementa (apenas na confirmacao do pagamento).
router.post('/', async (req, res) => {
  const { user_id, product_id, tamanho } = req.body;
  
  // Validacao: todos os campos sao obrigatorios
  if (!user_id || !product_id || !tamanho) {
    return res.status(400).json({ message: 'Faltam dados obrigatorios.' });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // Verifica o stock do produto com FOR UPDATE para bloquear a linha
    // Isto evita que dois utilizadores comprem o mesmo produto em simultaneo
    const [products] = await connection.query(
      'SELECT stock FROM Products WHERE product_id = ? FOR UPDATE',
      [product_id]
    );
    
    if (products.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Produto nao encontrado.' });
    }
    
    if (products[0].stock <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Produto sem stock disponivel.' });
    }

    // Cria a encomenda com status_id = 1 (Pendente)
    // O stock NAO e decrementado aqui. Sera decrementado quando o pagamento for confirmado.
    // Isto evita que o stock seja bloqueado para compras nao concluidas.
    const [orderResult] = await connection.query(
      'INSERT INTO FakeOrders (user_id, product_id, tamanho, status_id, data_compra) VALUES (?, ?, ?, 1, NOW())',
      [user_id, product_id, tamanho]
    );
    const orderId = orderResult.insertId;

    await connection.commit();
    res.status(201).json({ message: 'Encomenda criada.', order_id: orderId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Erro ao criar encomenda.' });
  } finally {
    connection.release();
  }
});

// ================================================================
// ROTA: Atualizar metodo de pagamento da encomenda
// ================================================================

// PUT /orders/:order_id/payment – Atualiza o metodo de pagamento
// Chamada apos o pagamento ser bem-sucedido para guardar o metodo usado.
router.put('/:order_id/payment', async (req, res) => {
  const { order_id } = req.params;
  const { payment_method } = req.body;

  if (!payment_method) {
    return res.status(400).json({ message: 'Metodo de pagamento e obrigatorio.' });
  }

  try {
    const [result] = await db.promise().query(
      'UPDATE FakeOrders SET payment_method = ? WHERE order_id = ?',
      [payment_method, order_id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Encomenda nao encontrada.' });
    }
    
    res.json({ message: 'Metodo de pagamento atualizado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar metodo de pagamento.' });
  }
});

// ================================================================
// ROTA: Listar encomendas de um utilizador
// ================================================================

// GET /orders/user/:user_id – Retorna todas as encomendas de um utilizador
// Utilizada na pagina /orders para mostrar o historico de compras.
// Inclui dados do produto e o estado da encomenda via JOINs.
router.get('/user/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    // Query com JOINs para obter dados do produto e estado
    // Products: nome, preco, imagem
    // OrderStatus: nome do estado (Pendente, Enviado, Recebido)
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
       ORDER BY fo.data_compra DESC`,
      [user_id]
    );
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao listar encomendas.' });
  }
});

// ================================================================
// ROTA: Detalhe de uma encomenda especifica
// ================================================================

// GET /orders/:order_id – Retorna os detalhes de uma encomenda
// Utilizada na pagina de checkout ou na pagina de encomendas.
router.get('/:order_id', async (req, res) => {
  const { order_id } = req.params;

  try {
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
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Encomenda nao encontrada.' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao obter encomenda.' });
  }
});

// ================================================================
// EXPORTACAO DO ROUTER
// ================================================================
module.exports = router;