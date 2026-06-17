// Importa o módulo express para criar rotas
const express = require('express');
// Cria um objeto router para definir as rotas deste ficheiro
const router = express.Router();
// Importa a ligação à base de dados (MySQL)
const db = require('../db');

// Rota GET para listar todas as categorias (pública, não requer autenticação)
router.get('/', async (req, res) => {
  try {
    // Query SQL para buscar todas as categorias, ordenadas por nome (A → Z)
    const [rows] = await db.promise().query(
      'SELECT category_id, nome, descricao FROM Categories ORDER BY nome ASC'
    );
    // Devolve os dados em formato JSON com status 200 (OK)
    res.json(rows);
  } catch (err) {
    // Regista o erro no console do servidor para depuração
    console.error(err);
    // Devolve erro 500 com mensagem genérica para o cliente
    res.status(500).json({ message: 'Erro ao listar categorias.' });
  }
});

// Exporta o router para ser usado no ficheiro principal (index.js)
module.exports = router;