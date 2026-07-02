// ================================================================
// CATEGORIES.JS – Rotas publicas de categorias
// ================================================================
// Contem as rotas para listar categorias na parte publica da aplicacao.
// ================================================================

const express = require('express');
const router = express.Router();
const db = require('../db');

// ================================================================
// ROTA: Listar todas as categorias
// ================================================================

// GET /categories – Retorna a lista de todas as categorias
router.get('/', async (req, res) => {
    try {
        // Busca todas as categorias ordenadas por nome de A a Z
        // A ordenacao e importante para consistencia visual na pagina publica
        const [rows] = await db.promise().query(
            'SELECT * FROM Categories ORDER BY nome ASC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Erro ao listar categorias:', err);
        res.status(500).json({ message: 'Erro ao listar categorias.' });
    }
});

// ================================================================
// ROTA: Obter uma categoria especifica
// ================================================================

// GET /categories/:id – Retorna os detalhes de uma categoria pelo ID
// Utilizada para ver detalhes ou produtos de uma categoria especifica
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.promise().query(
            'SELECT * FROM Categories WHERE category_id = ?',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Categoria nao encontrada.' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Erro ao obter categoria:', err);
        res.status(500).json({ message: 'Erro ao obter categoria.' });
    }
});

module.exports = router;