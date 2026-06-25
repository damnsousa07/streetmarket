const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /categories – lista todas as categorias com image_url
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT * FROM Categories ORDER BY nome ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao listar categorias.' });
  }
});

module.exports = router;