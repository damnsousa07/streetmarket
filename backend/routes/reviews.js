// ================================================================
// REVIEWS.JS – Rotas de avaliacoes (reviews) de produtos
// ================================================================
// Contem as rotas para criar e listar reviews de produtos.
// A criacao esta restrita a utilizadores que:
// 1. Tenham encomenda do produto com status "Recebido" (status_id = 3)
// 2. Ainda nao tenham escrito review para esse produto
// ================================================================

const express = require('express');
const router = express.Router();
const db = require('../db');

// ================================================================
// ROTA: Criar uma nova review
// ================================================================

// POST /reviews – Cria uma review para um produto
// Validacoes: utilizador existe, produto existe, sem review duplicada,
// e encomenda recebida (status_id = 3)
router.post('/', async (req, res) => {
  const { user_id, product_id, rating, comentario } = req.body;

  // Validacoes basicas
  if (!user_id || !product_id || rating == null) {
    return res.status(400).json({ message: 'Preenche todos os campos obrigatorios!' });
  }

  const uid = Number(user_id);
  const pid = Number(product_id);
  const rt = Number(rating);

  // Valida se user_id e product_id sao numeros inteiros positivos
  if (!Number.isInteger(uid) || uid <= 0 || !Number.isInteger(pid) || pid <= 0) {
    return res.status(400).json({ message: 'user_id ou product_id invalido.' });
  }

  // Valida se rating esta entre 1 e 5
  if (!Number.isFinite(rt) || rt < 1 || rt > 5) {
    return res.status(400).json({ message: 'rating invalido (1 a 5).' });
  }

  try {
    // Verifica se o utilizador existe
    const [users] = await db.promise().query(
      'SELECT 1 FROM Users WHERE user_id = ?',
      [uid]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilizador nao encontrado!' });
    }

    // Verifica se o produto existe
    const [products] = await db.promise().query(
      'SELECT 1 FROM Products WHERE product_id = ?',
      [pid]
    );
    if (products.length === 0) {
      return res.status(404).json({ message: 'Produto nao encontrado!' });
    }

    // Verifica se ja existe review deste utilizador para este produto
    // Impede reviews duplicadas do mesmo utilizador para o mesmo produto
    const [existing] = await db.promise().query(
      'SELECT review_id FROM Reviews WHERE user_id = ? AND product_id = ? LIMIT 1',
      [uid, pid]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Ja fizeste uma review para este produto.' });
    }

    // Verifica se o utilizador tem encomenda recebida (status_id = 3)
    // Apenas permite reviews para produtos que o utilizador ja recebeu
    const [receivedOrders] = await db.promise().query(
      `SELECT order_id
       FROM FakeOrders
       WHERE user_id = ? AND product_id = ? AND status_id = 3
       LIMIT 1`,
      [uid, pid]
    );
    if (receivedOrders.length === 0) {
      return res.status(403).json({
        message: 'So podes avaliar produtos que ja recebeste (estado "Recebido").'
      });
    }

    // Insere a review na base de dados com data atual
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

// ================================================================
// ROTA: Listar reviews de um produto
// ================================================================

// GET /reviews/:product_id – Retorna todas as reviews de um produto
// Ordena da mais recente para a mais antiga.
// Inclui o nome do utilizador via JOIN com a tabela Users.
router.get('/:product_id', async (req, res) => {
  const { product_id } = req.params;
  const pid = Number(product_id);

  // Valida se product_id e um numero inteiro positivo
  if (!Number.isInteger(pid) || pid <= 0) {
    return res.status(400).json({ message: 'product_id invalido.' });
  }

  try {
    // Verifica se o produto existe
    const [products] = await db.promise().query(
      'SELECT 1 FROM Products WHERE product_id = ?',
      [pid]
    );
    if (products.length === 0) {
      return res.status(404).json({ message: 'Produto nao encontrado!' });
    }

    // Busca as reviews do produto com nome do utilizador
    // JOIN com Users para obter o nome de quem escreveu a review
    // ORDER BY DESC para mostrar as mais recentes primeiro
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

// ================================================================
// EXPORTACAO DO ROUTER
// ================================================================
module.exports = router;