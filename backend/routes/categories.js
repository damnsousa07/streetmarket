// ================================================================
// CATEGORIES.JS – Rotas públicas de categorias
// ================================================================
// Este ficheiro contém as rotas para listar categorias na página pública.
// Estas rotas NÃO requerem autenticação.
// ================================================================

// Importação dos módulos necessários
const express = require('express');        // Framework para construir a API
const router = express.Router();           // Cria um router para definir as rotas
const db = require('../db');               // Ligação à base de dados MySQL

// ================================================================
// ROTA PÚBLICA: Listar todas as categorias (com imagem_url)
// ================================================================

// GET /categories – Retorna todas as categorias ordenadas por nome (A→Z)
// Esta rota é utilizada na página pública de categorias (/categories)
// para exibir a lista de categorias com as suas imagens.
router.get('/', async (req, res) => {
  try {
    // Query: seleciona todas as categorias (inclui o campo image_url)
    // Ordena por nome em ordem alfabética (A→Z) para facilitar a navegação
    const [rows] = await db.promise().query('SELECT * FROM Categories ORDER BY nome ASC');
    
    // Retorna os dados em JSON para o frontend consumir
    res.json(rows);
  } catch (err) {
    // Em caso de erro, regista no console e devolve erro 500
    console.error(err);
    res.status(500).json({ message: 'Erro ao listar categorias.' });
  }
});

// ================================================================
// EXPORTAÇÃO DO ROUTER
// ================================================================
// Exporta o router para ser utilizado no index.js
module.exports = router;