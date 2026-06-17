const express = require('express');
const router = express.Router();
const db = require('../db');

// Criar uma review (apenas se o user RECEBEU o produto e ainda não avaliou)
router.post('/', async (req, res) => {
  const { user_id, product_id, rating, comentario } = req.body;

  // validações básicas
  if (!user_id || !product_id || rating == null) {
    return res.status(400).json({ message: 'Preenche todos os campos obrigatórios!' });
  }

  const uid = Number(user_id);
  const pid = Number(product_id);
  const rt = Number(rating);

  if (!Number.isInteger(uid) || uid <= 0 || !Number.isInteger(pid) || pid <= 0) {
    return res.status(400).json({ message: 'user_id ou product_id inválido.' });
  }

  if (!Number.isFinite(rt) || rt < 1 || rt > 5) {
    return res.status(400).json({ message: 'rating inválido (1 a 5).' });
  }

  try {
    // 1) Verificar se o utilizador existe
    const [users] = await db.promise().query(
      'SELECT user_id FROM Users WHERE user_id = ?',
      [uid]
    );
    if (users.length === 0) return res.status(404).json({ message: 'Utilizador não encontrado!' });

    // 2) Verificar se o produto existe
    const [products] = await db.promise().query(
      'SELECT product_id FROM Products WHERE product_id = ?',
      [pid]
    );
    if (products.length === 0) return res.status(404).json({ message: 'Produto não encontrado!' });

    // 3) Bloquear se já existe review deste user para este produto
    const [existing] = await db.promise().query(
      'SELECT review_id FROM Reviews WHERE user_id = ? AND product_id = ? LIMIT 1',
      [uid, pid]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Já fizeste uma review para este produto.' });
    }

    // 4) Permitir apenas se existir encomenda RECEBIDA (status_id = 3)
    const [receivedOrders] = await db.promise().query(
      `SELECT order_id
       FROM FakeOrders
       WHERE user_id = ? AND product_id = ? AND status_id = 3
       LIMIT 1`,
      [uid, pid]
    );

    if (receivedOrders.length === 0) {
      return res.status(403).json({
        message: 'Só podes avaliar produtos que já recebeste (estado "Recebido").'
      });
    }

    // 5) Inserir review
    await db.promise().query(
      'INSERT INTO Reviews (user_id, product_id, rating, comentario, data) VALUES (?, ?, ?, ?, NOW())',
      [uid, pid, rt, (comentario || '').toString()]
    );

    res.status(201).json({ message: 'Review criada com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// Listar reviews de um produto
router.get('/:product_id', async (req, res) => {
  const { product_id } = req.params;
  const pid = Number(product_id);

  if (!Number.isInteger(pid) || pid <= 0) {
    return res.status(400).json({ message: 'product_id inválido.' });
  }

  try {
    // Verificar se o produto existe
    const [products] = await db.promise().query(
      'SELECT product_id FROM Products WHERE product_id = ?',
      [pid]
    );
    if (products.length === 0) return res.status(404).json({ message: 'Produto não encontrado!' });

    // Buscar reviews
    const [reviews] = await db.promise().query(
      `SELECT r.review_id, r.user_id, r.rating, r.comentario, r.data, u.nome AS user_nome
       FROM Reviews r
       JOIN Users u ON r.user_id = u.user_id
       WHERE r.product_id = ?
       ORDER BY r.data DESC`,
      [pid]
    );

    res.status(200).json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});

module.exports = router;
