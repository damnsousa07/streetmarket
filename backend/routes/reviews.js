// ================================================================
// REVIEWS.JS – Rotas de avaliações (reviews) de produtos
// ================================================================
// Este ficheiro contém as rotas para criar e listar reviews de produtos.
// A criação de reviews está restrita a utilizadores que:
// 1. Tenham uma encomenda do produto com status "Recebido" (status_id = 3)
// 2. Ainda não tenham escrito uma review para esse produto
// ================================================================

// Importação dos módulos necessários
const express = require('express');        // Framework para construir a API
const router = express.Router();           // Cria um router para definir as rotas
const db = require('../db');               // Ligação à base de dados MySQL

// ================================================================
// ROTA: Criar uma nova review (apenas para produtos recebidos)
// ================================================================

// POST /reviews – Cria uma review para um produto
// Validações:
// - Utilizador existe
// - Produto existe
// - Utilizador não tem outra review para este produto
// - Utilizador tem encomenda recebida (status_id = 3)
router.post('/', async (req, res) => {
  // Extrai os dados do corpo da requisição
  const { user_id, product_id, rating, comentario } = req.body;

  // ----- 1. VALIDAÇÕES BÁSICAS -----
  // Verifica se os campos obrigatórios foram fornecidos
  if (!user_id || !product_id || rating == null) {
    return res.status(400).json({ message: 'Preenche todos os campos obrigatórios!' });
  }

  // Converte os valores para número (garantir tipo correto)
  const uid = Number(user_id);
  const pid = Number(product_id);
  const rt = Number(rating);

  // Valida se user_id e product_id são números inteiros positivos
  if (!Number.isInteger(uid) || uid <= 0 || !Number.isInteger(pid) || pid <= 0) {
    return res.status(400).json({ message: 'user_id ou product_id inválido.' });
  }

  // Valida se rating está entre 1 e 5
  if (!Number.isFinite(rt) || rt < 1 || rt > 5) {
    return res.status(400).json({ message: 'rating inválido (1 a 5).' });
  }

  try {
    // ----- 2. VERIFICA SE O UTILIZADOR EXISTE -----
    // Consulta leve (SELECT 1) apenas para confirmar existência
    const [users] = await db.promise().query(
      'SELECT 1 FROM Users WHERE user_id = ?',
      [uid]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilizador não encontrado!' });
    }

    // ----- 3. VERIFICA SE O PRODUTO EXISTE -----
    const [products] = await db.promise().query(
      'SELECT 1 FROM Products WHERE product_id = ?',
      [pid]
    );
    if (products.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado!' });
    }

    // ----- 4. VERIFICA SE JÁ EXISTE REVIEW DESTE UTILIZADOR PARA ESTE PRODUTO -----
    // Impede que o mesmo utilizador escreva mais do que uma review por produto
    const [existing] = await db.promise().query(
      'SELECT review_id FROM Reviews WHERE user_id = ? AND product_id = ? LIMIT 1',
      [uid, pid]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Já fizeste uma review para este produto.' });
    }

    // ----- 5. VERIFICA SE O UTILIZADOR TEM ENCOMENDA RECEBIDA (status_id = 3) -----
    // Apenas permite reviews para produtos que o utilizador já recebeu
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

    // ----- 6. INSERE A REVIEW NA BASE DE DADOS -----
    // 'NOW()' insere a data/hora atual do servidor
    await db.promise().query(
      'INSERT INTO Reviews (user_id, product_id, rating, comentario, data) VALUES (?, ?, ?, ?, NOW())',
      [uid, pid, rt, (comentario || '').toString()]
    );

    // Retorna sucesso
    res.status(201).json({ message: 'Review criada com sucesso!' });
  } catch (err) {
    // Em caso de erro, regista no console e devolve erro 500
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// ================================================================
// ROTA: Listar reviews de um produto
// ================================================================

// GET /reviews/:product_id – Retorna todas as reviews de um produto
// Ordena da mais recente para a mais antiga (para mostrar as últimas primeiro).
// Inclui o nome do utilizador que escreveu a review (via JOIN).
router.get('/:product_id', async (req, res) => {
  const { product_id } = req.params;  // Obtém o ID do produto da URL
  const pid = Number(product_id);     // Converte para número

  // Valida se product_id é um número inteiro positivo
  if (!Number.isInteger(pid) || pid <= 0) {
    return res.status(400).json({ message: 'product_id inválido.' });
  }

  try {
    // ----- 1. VERIFICA SE O PRODUTO EXISTE -----
    const [products] = await db.promise().query(
      'SELECT 1 FROM Products WHERE product_id = ?',
      [pid]
    );
    if (products.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado!' });
    }

    // ----- 2. BUSCA AS REVIEWS DO PRODUTO -----
    // Junção (JOIN) com a tabela Users para obter o nome do utilizador
    // Ordenação DESC para mostrar as mais recentes primeiro
    const [reviews] = await db.promise().query(
      `SELECT r.review_id, r.user_id, r.rating, r.comentario, r.data, u.nome AS user_nome
       FROM Reviews r
       JOIN Users u ON r.user_id = u.user_id
       WHERE r.product_id = ?
       ORDER BY r.data DESC`,  // Mais recentes primeiro
      [pid]
    );

    // Devolve a lista de reviews em JSON
    res.status(200).json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// ================================================================
// EXPORTAÇÃO DO ROUTER
// ================================================================
// Exporta o router para ser utilizado no index.js (montado em /reviews)
module.exports = router;