const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `prod-${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT * FROM Products');
    for (let product of rows) {
      const [images] = await db.promise().query(
        'SELECT image_url FROM ProductsImages WHERE product_id = ? ORDER BY order_index ASC, is_primary DESC, created_at ASC LIMIT 1',
        [product.product_id]
      );
      product.imagem = images[0]?.image_url || null;
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao obter produtos' });
  }
});

router.get('/search', async (req, res) => {
  let { q, category_id, min_price, max_price, sort } = req.query;
  if (min_price === '') min_price = undefined;
  if (max_price === '') max_price = undefined;

  let sql = 'SELECT * FROM Products WHERE 1=1';
  const params = [];

  if (q && q.trim() !== '') {
    sql += ' AND (nome LIKE ? OR marca LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category_id && category_id !== '') {
    sql += ' AND category_id = ?';
    params.push(category_id);
  }
  if (min_price !== undefined) {
    const min = Number(min_price);
    if (!isNaN(min)) {
      sql += ' AND preco >= ?';
      params.push(min);
    }
  }
  if (max_price !== undefined) {
    const max = Number(max_price);
    if (!isNaN(max)) {
      sql += ' AND preco <= ?';
      params.push(max);
    }
  }

  switch (sort) {
    case 'price_asc': sql += ' ORDER BY preco ASC'; break;
    case 'price_desc': sql += ' ORDER BY preco DESC'; break;
    case 'name_asc': sql += ' ORDER BY nome ASC'; break;
    case 'name_desc': sql += ' ORDER BY nome DESC'; break;
    default: sql += ' ORDER BY product_id DESC';
  }

  try {
    const [rows] = await db.promise().query(sql, params);
    for (let product of rows) {
      const [images] = await db.promise().query(
        'SELECT image_url FROM ProductsImages WHERE product_id = ? ORDER BY order_index ASC, is_primary DESC, created_at ASC LIMIT 1',
        [product.product_id]
      );
      product.imagem = images[0]?.image_url || null;
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro na pesquisa' });
  }
});

router.get('/:id', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { id } = req.params;
  try {
    const [rows] = await db.promise().query('SELECT * FROM Products WHERE product_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Produto não encontrado' });
    const product = rows[0];

    const [images] = await db.promise().query(
      'SELECT image_id, image_url, is_primary, order_index FROM ProductsImages WHERE product_id = ? ORDER BY order_index ASC, is_primary DESC, created_at ASC',
      [id]
    );
    product.images = images;
    product.imagem = images[0]?.image_url || null;

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao obter produto' });
  }
});

router.post('/', upload.array('images', 6), async (req, res) => {
  const { nome, marca, preco, descricao, category_id, tamanhos } = req.body;
  if (!nome || !marca || !preco || !category_id) {
    return res.status(400).json({ message: 'Preenche todos os campos obrigatórios!' });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO Products (nome, marca, preco, descricao, category_id, tamanhos) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, marca, preco, descricao || null, category_id, tamanhos || null]
    );
    const productId = result.insertId;

    if (req.files && req.files.length) {
      for (let idx = 0; idx < req.files.length; idx++) {
        const file = req.files[idx];
        const imageUrl = `/uploads/${file.filename}`;
        const isPrimary = idx === 0;
        await connection.query(
          'INSERT INTO ProductsImages (product_id, image_url, is_primary, order_index) VALUES (?, ?, ?, ?)',
          [productId, imageUrl, isPrimary, idx]
        );
      }
      await connection.query(
        `UPDATE Products 
         SET imagem = (
             SELECT image_url FROM ProductsImages 
             WHERE product_id = ? 
             ORDER BY order_index ASC, is_primary DESC, created_at ASC LIMIT 1
         ) 
         WHERE product_id = ?`,
        [productId, productId]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'Produto adicionado com sucesso!', productId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Erro ao adicionar produto' });
  } finally {
    connection.release();
  }
});

router.put('/:id', upload.array('newImages', 6), async (req, res) => {
  const { id } = req.params;
  const { nome, marca, preco, descricao, category_id, tamanhos, imagesToDelete } = req.body;

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      'UPDATE Products SET nome = ?, marca = ?, preco = ?, descricao = ?, category_id = ?, tamanhos = ? WHERE product_id = ?',
      [nome, marca, preco, descricao || null, category_id, tamanhos || null, id]
    );

    if (imagesToDelete && imagesToDelete.length) {
      await connection.query('DELETE FROM ProductsImages WHERE image_id IN (?) AND product_id = ?', [imagesToDelete, id]);
    }

    if (req.files && req.files.length) {
      const [maxOrder] = await connection.query(
        'SELECT COALESCE(MAX(order_index), -1) AS maxIdx FROM ProductsImages WHERE product_id = ?',
        [id]
      );
      let nextOrder = maxOrder[0].maxIdx + 1;
      for (let idx = 0; idx < req.files.length; idx++) {
        const file = req.files[idx];
        const imageUrl = `/uploads/${file.filename}`;
        const [totalImages] = await connection.query(
          'SELECT COUNT(*) AS total FROM ProductsImages WHERE product_id = ?',
          [id]
        );
        const isPrimary = totalImages[0].total === 0 && idx === 0;
        await connection.query(
          'INSERT INTO ProductsImages (product_id, image_url, is_primary, order_index) VALUES (?, ?, ?, ?)',
          [id, imageUrl, isPrimary, nextOrder + idx]
        );
      }
    }

    await connection.query(
      `UPDATE Products 
       SET imagem = (
           SELECT image_url FROM ProductsImages 
           WHERE product_id = ? 
           ORDER BY order_index ASC, is_primary DESC, created_at ASC LIMIT 1
       ) 
       WHERE product_id = ?`,
      [id, id]
    );

    await connection.commit();
    res.json({ message: 'Produto atualizado com sucesso!' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar produto' });
  } finally {
    connection.release();
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.promise().query('DELETE FROM Products WHERE product_id = ?', [id]);
    res.json({ message: 'Produto apagado com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao apagar produto' });
  }
});

module.exports = router;