// ================================================================
// PRODUCTS.JS – Rotas publicas de produtos
// ================================================================
// Contem as rotas para listar, pesquisar e visualizar produtos na parte publica.
// Inclui paginacao, filtros, marcas e verificacao de reviews.
// ================================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// ================================================================
// CONFIGURACAO DO UPLOAD DE IMAGENS (MULTER)
// ================================================================

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configuracao do armazenamento para upload de imagens
// Gera nomes unicos para evitar conflitos
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

// ================================================================
// ROTA: Listar produtos com paginacao e filtros
// ================================================================

// GET /products – Retorna uma lista paginada de produtos
// Suporta: pesquisa, categoria, marca, genero, preco, ordenacao e stock
router.get('/', async (req, res) => {
  try {
    // Paginacao
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    // Filtros da query string
    const search = req.query.q ? `%${req.query.q}%` : null;
    const category_id = req.query.category_id ? parseInt(req.query.category_id) : null;
    const brand = req.query.brand || null;
    const gender = req.query.gender || null;
    const min_price = req.query.min_price ? parseFloat(req.query.min_price) : null;
    const max_price = req.query.max_price ? parseFloat(req.query.max_price) : null;
    const sort = req.query.sort || 'id_desc';
    const in_stock = req.query.in_stock === 'true' ? true : false;

    // Query base
    let sql = 'SELECT * FROM Products WHERE 1=1';
    const params = [];

    // Adiciona filtros conforme parametros fornecidos
    if (search) {
      sql += ' AND (nome LIKE ? OR marca LIKE ?)';
      params.push(search, search);
    }
    if (category_id !== null) {
      sql += ' AND category_id = ?';
      params.push(category_id);
    }
    if (brand) {
      sql += ' AND marca = ?';
      params.push(brand);
    }
    if (gender) {
      sql += ' AND gender = ?';
      params.push(gender);
    }
    if (min_price !== null) {
      sql += ' AND preco >= ?';
      params.push(min_price);
    }
    if (max_price !== null) {
      sql += ' AND preco <= ?';
      params.push(max_price);
    }

    // Filtro de stock
    if (in_stock) {
      sql += ' AND stock > 0';
    }

    // Ordenacao
    switch (sort) {
      case 'name_asc': sql += ' ORDER BY nome ASC'; break;
      case 'name_desc': sql += ' ORDER BY nome DESC'; break;
      case 'price_asc': sql += ' ORDER BY preco ASC'; break;
      case 'price_desc': sql += ' ORDER BY preco DESC'; break;
      default: sql += ' ORDER BY product_id DESC';
    }

    // Contagem total
    const countSql = sql.replace(/ORDER BY.*$/, '');
    const [countResult] = await db.promise().query(countSql, params);
    const total = countResult.length;

    // Aplica paginacao
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await db.promise().query(sql, params);

    // Busca imagem principal de cada produto
    for (let product of rows) {
      const [images] = await db.promise().query(
        'SELECT image_url FROM ProductsImages WHERE product_id = ? ORDER BY order_index ASC, is_primary DESC, created_at ASC LIMIT 1',
        [product.product_id]
      );
      product.imagem = images[0]?.image_url || null;
    }

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: rows,
      meta: {
        total,
        totalPages,
        currentPage: page,
        limit,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao obter produtos' });
  }
});

// ================================================================
// ROTA: Listar marcas distintas
// ================================================================

// GET /products/brands – Retorna marcas distintas para dropdowns
router.get('/brands', async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT DISTINCT marca FROM Products WHERE marca IS NOT NULL AND marca != "" ORDER BY marca ASC'
    );
    const brands = rows.map(row => row.marca);
    res.json(brands);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao listar marcas.' });
  }
});

// ================================================================
// ROTA: Pesquisa (redireciona para a rota principal)
// ================================================================

// GET /products/search – Redireciona para /products com os mesmos parametros
router.get('/search', async (req, res) => {
  const query = req.query;
  const queryString = new URLSearchParams(query).toString();
  res.redirect(`/products?${queryString}`);
});

// ================================================================
// ROTA: Detalhe de um produto
// ================================================================

// GET /products/:id – Retorna detalhes de um produto especifico
// Inclui imagens e verificacao de permissao para review
router.get('/:id', async (req, res) => {
  // Headers para evitar cache
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { id } = req.params;
  const userId = req.query.userId ? parseInt(req.query.userId) : null;

  console.log('userId (query):', userId);
  console.log('product_id:', id);

  try {
    // Busca o produto
    const [rows] = await db.promise().query('SELECT * FROM Products WHERE product_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Produto nao encontrado' });
    const product = rows[0];

    // Busca imagens do produto
    const [images] = await db.promise().query(
      'SELECT image_id, image_url, is_primary, order_index FROM ProductsImages WHERE product_id = ? ORDER BY order_index ASC, is_primary DESC, created_at ASC',
      [id]
    );
    product.images = images;
    product.imagem = images[0]?.image_url || null;

    // Verifica se o utilizador pode escrever review
    let canReview = false;
    let userReview = null;

    if (userId) {
      // Verifica se existe encomenda recebida (status_id = 3)
      const [orders] = await db.promise().query(
        `SELECT * FROM FakeOrders 
         WHERE user_id = ? AND product_id = ? AND status_id = 3`,
        [userId, id]
      );
      console.log('Encomendas recebidas:', orders);
      if (orders.length > 0) {
        canReview = true;
        // Verifica se ja escreveu review
        const [reviews] = await db.promise().query(
          'SELECT * FROM Reviews WHERE user_id = ? AND product_id = ?',
          [userId, id]
        );
        if (reviews.length > 0) {
          canReview = false;
          userReview = reviews[0];
        }
      }
    }

    product.canReview = canReview;
    product.userReview = userReview;

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao obter produto' });
  }
});

// ================================================================
// ROTA: Criar um novo produto (admin)
// ================================================================

// POST /products – Cria um novo produto com imagens
// Utilizada pelo painel administrativo
router.post('/', upload.array('images', 6), async (req, res) => {
  const { nome, marca, preco, descricao, category_id, tamanhos, gender, stock } = req.body;
  
  if (!nome || !marca || !preco || !category_id) {
    return res.status(400).json({ message: 'Preenche todos os campos obrigatorios!' });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // Insere o produto
    const [result] = await connection.query(
      'INSERT INTO Products (nome, marca, preco, descricao, category_id, tamanhos, gender, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nome, marca, preco, descricao || null, category_id, tamanhos || null, gender || 'Unisexo', stock || 0]
    );
    const productId = result.insertId;

    // Insere imagens se houver
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
      // Sincroniza campo imagem com a primeira imagem
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

// ================================================================
// ROTA: Atualizar um produto (admin)
// ================================================================

// PUT /products/:id – Atualiza um produto existente
// Suporta adicao/remocao de imagens e reordenacao
router.put('/:id', upload.array('newImages', 6), async (req, res) => {
  const { id } = req.params;
  const { nome, marca, preco, descricao, category_id, tamanhos, imagesToDelete, imagesOrder, gender, stock } = req.body;

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // Atualiza dados do produto
    await connection.query(
      'UPDATE Products SET nome = ?, marca = ?, preco = ?, descricao = ?, category_id = ?, tamanhos = ?, gender = ?, stock = ? WHERE product_id = ?',
      [nome, marca, preco, descricao || null, category_id, tamanhos || null, gender || 'Unisexo', stock || 0, id]
    );

    // Elimina imagens marcadas
    if (imagesToDelete && imagesToDelete.length) {
      const ids = JSON.parse(imagesToDelete);
      
      // Busca URLs antes de apagar
      const [imagesToRemove] = await connection.query(
        'SELECT image_url FROM ProductsImages WHERE image_id IN (?) AND product_id = ?',
        [ids, id]
      );
      
      // Apaga registos
      await connection.query(
        'DELETE FROM ProductsImages WHERE image_id IN (?) AND product_id = ?',
        [ids, id]
      );
      
      // Apaga ficheiros do disco
      for (const img of imagesToRemove) {
        if (img.image_url) {
          const relativePath = img.image_url.replace(/^\/uploads\//, '');
          const filePath = path.join(__dirname, '../uploads', relativePath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Imagem removida: ${filePath}`);
          }
        }
      }
      console.log(`Imagens eliminadas: ${ids.join(', ')}`);
    }

    // Reordena imagens existentes
    if (imagesOrder) {
      const orderArray = JSON.parse(imagesOrder);
      for (let idx = 0; idx < orderArray.length; idx++) {
        await connection.query(
          'UPDATE ProductsImages SET order_index = ? WHERE image_id = ? AND product_id = ?',
          [idx, orderArray[idx], id]
        );
      }
    }

    // Adiciona novas imagens
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

    // Atualiza campo imagem com a primeira disponivel
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

// ================================================================
// ROTA: Apagar um produto (admin)
// ================================================================

// DELETE /products/:id – Apaga produto e imagens do disco
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Busca imagens antes de apagar
    const [images] = await db.promise().query(
      'SELECT image_url FROM ProductsImages WHERE product_id = ?',
      [id]
    );
    
    // Apaga produto da base de dados
    await db.promise().query('DELETE FROM Products WHERE product_id = ?', [id]);

    // Apaga ficheiros de imagem do disco
    for (const img of images) {
      if (img.image_url) {
        const relativePath = img.image_url.replace(/^\/uploads\//, '');
        const filePath = path.join(__dirname, '../uploads', relativePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Imagem apagada: ${filePath}`);
        }
      }
    }

    res.json({ message: 'Produto e imagens apagados com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao apagar produto' });
  }
});

// ================================================================
// EXPORTACAO DO ROUTER
// ================================================================
module.exports = router;