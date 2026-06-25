const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /orders – criar encomenda (com verificação de stock)
router.post('/', async (req, res) => {
  const { user_id, product_id, tamanho } = req.body;
  if (!user_id || !product_id || !tamanho) {
    return res.status(400).json({ message: 'Faltam dados obrigatórios.' });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const [products] = await connection.query(
      'SELECT stock FROM Products WHERE product_id = ? FOR UPDATE',
      [product_id]
    );
    if (products.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    if (products[0].stock <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Produto sem stock disponível.' });
    }

    const [orderResult] = await connection.query(
      'INSERT INTO FakeOrders (user_id, product_id, tamanho, status_id, data_compra) VALUES (?, ?, ?, 1, NOW())',
      [user_id, product_id, tamanho]
    );
    const orderId = orderResult.insertId;

    await connection.query(
      'UPDATE Products SET stock = stock - 1 WHERE product_id = ?',
      [product_id]
    );

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

// PUT /orders/:order_id/payment – atualizar método de pagamento
router.put('/:order_id/payment', async (req, res) => {
  const { order_id } = req.params;
  const { payment_method } = req.body;

  if (!payment_method) {
    return res.status(400).json({ message: 'Método de pagamento é obrigatório.' });
  }

  try {
    const [result] = await db.promise().query(
      'UPDATE FakeOrders SET payment_method = ? WHERE order_id = ?',
      [payment_method, order_id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Encomenda não encontrada.' });
    }
    res.json({ message: 'Método de pagamento atualizado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar método de pagamento.' });
  }
});

// GET /orders/user/:user_id – listar encomendas do utilizador
router.get('/user/:user_id', async (req, res) => {
  const { user_id } = req.params;
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

// GET /orders/:order_id – detalhe de uma encomenda
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
    if (rows.length === 0) return res.status(404).json({ message: 'Encomenda não encontrada.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao obter encomenda.' });
  }
});

module.exports = router;