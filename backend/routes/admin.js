const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { sendReviewRequestEmail } = require('../services/emailservice');

// ============================================================
// CONFIGURAÇÃO DO UPLOAD (UNIFICADO)
// ============================================================

const uploadDir = path.join(__dirname, '../uploads');
const categoriesDir = path.join(uploadDir, 'categories');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(categoriesDir)) fs.mkdirSync(categoriesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.path.includes('/Categories')) {
      cb(null, categoriesDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const prefix = req.path.includes('/Categories') ? 'cat-' : 'prod-';
    cb(null, `${prefix}${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ============================================================
// MIDDLEWARE DE ADMIN
// ============================================================

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({ message: 'ADMIN_KEY não definido no .env' });
  }
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ message: 'Acesso negado (admin).' });
  }
  next();
}

router.use(requireAdmin);

// ============================================================
// ROTAS DE CATEGORIAS (com imagem)
// ============================================================

router.get('/Categories', async (req, res) => {
  const search = req.query.search ? `%${req.query.search}%` : null;
  const sort = req.query.sort === 'name_desc' ? 'DESC' : 'ASC';
  let sql = 'SELECT * FROM Categories WHERE 1=1';
  const params = [];
  if (search) {
    sql += ` AND nome LIKE ?`;
    params.push(search);
  }
  sql += ` ORDER BY nome ${sort}`;
  try {
    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao listar categorias.' });
  }
});

router.post('/Categories', upload.single('image'), async (req, res) => {
  console.log('🔍 req.file:', req.file);
  console.log('🔍 req.body:', req.body);

  req.body = req.body || {};
  const { nome, descricao } = req.body;
  if (!nome) return res.status(400).json({ message: 'Nome é obrigatório.' });

  let imageUrl = null;
  if (req.file) {
    // O multer já guardou com o prefixo cat-
    imageUrl = `/uploads/categories/${req.file.filename}`;
    console.log('✅ Ficheiro guardado:', imageUrl);
  } else {
    console.log('❌ Nenhum ficheiro recebido.');
  }

  try {
    const [result] = await db.promise().query(
      'INSERT INTO Categories (nome, descricao, image_url) VALUES (?, ?, ?)',
      [nome, descricao || null, imageUrl]
    );
    res.status(201).json({
      message: 'Categoria criada.',
      category_id: result.insertId,
      image_url: imageUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao criar categoria.' });
  }
});

router.put('/Categories/:id', upload.single('image'), async (req, res) => {
  req.body = req.body || {};
  const { id } = req.params;
  const { nome, descricao } = req.body;
  if (!nome) return res.status(400).json({ message: 'Nome é obrigatório.' });

  let imageUrl = null;
  if (req.file) {
    imageUrl = `/uploads/categories/${req.file.filename}`;
    console.log('✅ Nova imagem guardada:', imageUrl);

    // Apagar a imagem antiga
    const [old] = await db.promise().query('SELECT image_url FROM Categories WHERE category_id = ?', [id]);
    if (old.length > 0 && old[0].image_url) {
      const oldPath = path.join(__dirname, '..', old[0].image_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log('🗑️ Imagem antiga apagada:', oldPath);
      }
    }
  }

  try {
    let sql = 'UPDATE Categories SET nome = ?, descricao = ?';
    const params = [nome, descricao || null];
    if (imageUrl) {
      sql += ', image_url = ?';
      params.push(imageUrl);
    }
    sql += ' WHERE category_id = ?';
    params.push(id);

    const [result] = await db.promise().query(sql, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Categoria não encontrada.' });
    }

    res.json({ message: 'Categoria atualizada.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar categoria.' });
  }
});

router.delete('/Categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [check] = await db.promise().query(
      'SELECT COUNT(*) AS total FROM Products WHERE category_id = ?',
      [id]
    );
    if (check[0].total > 0) {
      return res.status(400).json({ message: 'Não é possível apagar: existem produtos associados.' });
    }

    const [old] = await db.promise().query('SELECT image_url FROM Categories WHERE category_id = ?', [id]);
    const [result] = await db.promise().query('DELETE FROM Categories WHERE category_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Categoria não encontrada.' });
    }

    if (old.length > 0 && old[0].image_url) {
      const oldPath = path.join(__dirname, '..', old[0].image_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log('🗑️ Imagem apagada:', oldPath);
      }
    }

    res.json({ message: 'Categoria apagada.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao apagar categoria.' });
  }
});

// ============================================================
// ROTAS DE PRODUTOS (paginação, CRUD, etc.)
// ============================================================

router.get('/Products', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const offset = (page - 1) * limit;

  const search = req.query.search ? `%${req.query.search}%` : null;
  const category_id = req.query.category_id ? parseInt(req.query.category_id) : null;
  const brand = req.query.brand || null;
  const min_price = req.query.min_price ? parseFloat(req.query.min_price) : null;
  const max_price = req.query.max_price ? parseFloat(req.query.max_price) : null;
  const sort = req.query.sort || 'id_desc';

  let sql = `
    SELECT p.*, c.nome AS category_nome
    FROM Products p
    LEFT JOIN Categories c ON p.category_id = c.category_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    sql += ` AND (p.nome LIKE ? OR p.marca LIKE ?)`;
    params.push(search, search);
  }
  if (category_id !== null) {
    sql += ` AND p.category_id = ?`;
    params.push(category_id);
  }
  if (brand) {
    sql += ` AND p.marca = ?`;
    params.push(brand);
  }
  if (min_price !== null) {
    sql += ` AND p.preco >= ?`;
    params.push(min_price);
  }
  if (max_price !== null) {
    sql += ` AND p.preco <= ?`;
    params.push(max_price);
  }

  switch (sort) {
    case 'name_asc': sql += ` ORDER BY p.nome ASC`; break;
    case 'name_desc': sql += ` ORDER BY p.nome DESC`; break;
    case 'price_asc': sql += ` ORDER BY p.preco ASC`; break;
    case 'price_desc': sql += ` ORDER BY p.preco DESC`; break;
    default: sql += ` ORDER BY p.product_id DESC`;
  }

  const countSql = sql.replace(/ORDER BY.*$/, '');
  const [countResult] = await db.promise().query(countSql, params);
  const total = countResult.length;

  sql += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await db.promise().query(sql, params);

  const imagePromises = rows.map(async (product) => {
    const [images] = await db.promise().query(
      'SELECT image_url FROM ProductsImages WHERE product_id = ? ORDER BY order_index ASC, is_primary DESC, created_at ASC LIMIT 1',
      [product.product_id]
    );
    product.imagem = images[0]?.image_url || null;
  });
  await Promise.all(imagePromises);

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
});

router.get('/Products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [products] = await db.promise().query(
      `SELECT p.*, c.nome AS category_nome
       FROM Products p
       LEFT JOIN Categories c ON p.category_id = c.category_id
       WHERE p.product_id = ?`,
      [id]
    );
    if (products.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    const product = products[0];
    const [images] = await db.promise().query(
      'SELECT image_id, image_url, is_primary, order_index FROM ProductsImages WHERE product_id = ? ORDER BY order_index ASC, is_primary DESC, created_at ASC',
      [id]
    );
    product.images = images;
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar produto.' });
  }
});

router.get('/Brands', async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT DISTINCT marca FROM Products WHERE marca IS NOT NULL AND marca != "" ORDER BY marca ASC'
    );
    res.json(rows.map(row => row.marca));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao listar marcas.' });
  }
});

router.post('/Products', upload.array('images', 6), async (req, res) => {
  console.log('POST /admin/Products - req.body:', req.body);
  console.log('POST /admin/Products - req.files:', req.files ? req.files.length : 0);

  const { nome, marca, preco, descricao, category_id, tamanhos } = req.body;

  if (!nome || !marca || !preco || !category_id) {
    return res.status(400).json({
      message: 'nome, marca, preco e category_id são obrigatórios.',
      received: { nome, marca, preco, category_id }
    });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO Products (nome, marca, preco, descricao, category_id, tamanhos, data_criacao) VALUES (?, ?, ?, ?, ?, ?, NOW())',
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
    res.status(201).json({ message: 'Produto criado com sucesso!', product_id: productId });
  } catch (err) {
    await connection.rollback();
    console.error('Erro no POST /admin/Products:', err);
    res.status(500).json({ message: 'Erro ao criar produto.', error: err.message });
  } finally {
    connection.release();
  }
});

router.put('/Products/:id', upload.array('images', 6), async (req, res) => {
  const { id } = req.params;
  console.log('PUT /admin/Products/:id - req.body:', req.body);
  console.log('PUT /admin/Products/:id - req.files:', req.files ? req.files.length : 0);

  const { nome, marca, preco, descricao, category_id, tamanhos } = req.body;

  if (!nome || !marca || !preco || !category_id) {
    return res.status(400).json({
      message: 'nome, marca, preco e category_id são obrigatórios.',
      received: { nome, marca, preco, category_id }
    });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    console.log('A atualizar produto com:', { nome, marca, preco, descricao, category_id, tamanhos, id });
    const [updateResult] = await connection.query(
      'UPDATE Products SET nome = ?, marca = ?, preco = ?, descricao = ?, category_id = ?, tamanhos = ? WHERE product_id = ?',
      [nome, marca, preco, descricao || null, category_id, tamanhos || null, id]
    );
    console.log('Resultado do update:', updateResult);
    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    let imagesToDelete = req.body.imagesToDelete;
    if (imagesToDelete && typeof imagesToDelete === 'string') {
      try { imagesToDelete = JSON.parse(imagesToDelete); } catch (e) { imagesToDelete = []; }
    }
    if (imagesToDelete && imagesToDelete.length) {
      await connection.query(
        'DELETE FROM ProductsImages WHERE image_id IN (?) AND product_id = ?',
        [imagesToDelete, id]
      );
      console.log(`Imagens eliminadas: ${imagesToDelete.join(', ')}`);
    }

    let imagesOrder = req.body.imagesOrder;
    if (imagesOrder && typeof imagesOrder === 'string') {
      try { imagesOrder = JSON.parse(imagesOrder); } catch (e) { imagesOrder = []; }
    }
    if (imagesOrder && imagesOrder.length) {
      for (let i = 0; i < imagesOrder.length; i++) {
        await connection.query(
          'UPDATE ProductsImages SET order_index = ? WHERE image_id = ? AND product_id = ?',
          [i, imagesOrder[i], id]
        );
      }
      console.log(`Ordem actualizada para o produto ${id}:`, imagesOrder);
    } else {
      const [remaining] = await connection.query(
        'SELECT image_id FROM ProductsImages WHERE product_id = ? ORDER BY order_index ASC, created_at ASC',
        [id]
      );
      for (let i = 0; i < remaining.length; i++) {
        await connection.query(
          'UPDATE ProductsImages SET order_index = ? WHERE image_id = ?',
          [i, remaining[i].image_id]
        );
      }
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
      console.log(`Novas imagens adicionadas: ${req.files.length}`);
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
    res.json({ message: 'Produto actualizado com sucesso!' });
  } catch (err) {
    await connection.rollback();
    console.error('Erro no PUT /admin/Products:', err);
    res.status(500).json({ message: 'Erro ao actualizar produto.', error: err.message });
  } finally {
    connection.release();
  }
});

router.delete('/Products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.promise().query('DELETE FROM Products WHERE product_id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Produto não encontrado.' });
    res.json({ message: 'Produto apagado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao apagar produto.' });
  }
});

// ============================================================
// ROTAS DE ENCOMENDAS
// ============================================================

router.get('/Orders', async (req, res) => {
  const search = req.query.search ? `%${req.query.search}%` : null;
  const status_id = req.query.status_id ? parseInt(req.query.status_id) : null;
  const sort = req.query.sort || 'order_id_desc';
  const date_from = req.query.date_from ? new Date(req.query.date_from) : null;
  const date_to = req.query.date_to ? new Date(req.query.date_to) : null;

  let sql = `
    SELECT fo.order_id, fo.data_compra,
           u.user_id, u.nome AS user_nome, u.email,
           p.product_id, p.nome AS product_nome, p.preco,
           os.status_id, os.nome AS status_nome
    FROM FakeOrders fo
    JOIN Users u ON fo.user_id = u.user_id
    JOIN Products p ON fo.product_id = p.product_id
    JOIN OrderStatus os ON fo.status_id = os.status_id
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    sql += ` AND (u.nome LIKE ? OR u.email LIKE ? OR p.nome LIKE ? OR CAST(fo.order_id AS CHAR) LIKE ?)`;
    params.push(search, search, search, search);
  }
  if (status_id !== null) {
    sql += ` AND fo.status_id = ?`;
    params.push(status_id);
  }
  if (date_from) {
    sql += ` AND fo.data_compra >= ?`;
    params.push(date_from);
  }
  if (date_to) {
    sql += ` AND fo.data_compra <= ?`;
    params.push(date_to);
  }

  switch (sort) {
    case 'order_id_asc': sql += ` ORDER BY fo.order_id ASC`; break;
    case 'order_id_desc': sql += ` ORDER BY fo.order_id DESC`; break;
    case 'date_asc': sql += ` ORDER BY fo.data_compra ASC`; break;
    case 'date_desc': sql += ` ORDER BY fo.data_compra DESC`; break;
    case 'price_asc': sql += ` ORDER BY p.preco ASC`; break;
    case 'price_desc': sql += ` ORDER BY p.preco DESC`; break;
    default: sql += ` ORDER BY fo.order_id DESC`;
  }

  try {
    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao listar encomendas.' });
  }
});

router.put('/Orders/:order_id/status', async (req, res) => {
  const { order_id } = req.params;
  const { status_id } = req.body;
  if (status_id == null) return res.status(400).json({ message: 'status_id é obrigatório.' });

  try {
    const [orders] = await db.promise().query(
      `SELECT fo.*, p.nome as product_nome, p.product_id, p.imagem, u.email, u.primeiro_nome, u.nome as user_nome
       FROM FakeOrders fo
       JOIN Products p ON fo.product_id = p.product_id
       JOIN Users u ON fo.user_id = u.user_id
       WHERE fo.order_id = ?`,
      [order_id]
    );
    if (orders.length === 0) return res.status(404).json({ message: 'Encomenda não encontrada.' });
    const order = orders[0];

    const [result] = await db.promise().query(
      'UPDATE FakeOrders SET status_id = ? WHERE order_id = ?',
      [status_id, order_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Encomenda não encontrada.' });

    const user_id = order.user_id;
    const productNome = order.product_nome;

    if (Number(status_id) === 2) {
      const mensagem = `O seu produto '${productNome}' vai chegar em breve.`;
      await db.promise().query(
        'INSERT INTO Notifications (user_id, tipo, conteudo, data_envio) VALUES (?, ?, ?, NOW())',
        [user_id, 'Encomenda', mensagem]
      );
    } else if (Number(status_id) === 3) {
      const mensagem = `O seu produto '${productNome}' chegou. Espero que goste! Veja o seu email para dar a sua avaliação.`;
      await db.promise().query(
        'INSERT INTO Notifications (user_id, tipo, conteudo, data_envio) VALUES (?, ?, ?, NOW())',
        [user_id, 'Encomenda', mensagem]
      );
      await sendReviewRequestEmail(
        order.email,
        order.primeiro_nome || order.user_nome,
        productNome,
        order.product_id,
        order.imagem
      );
    }

    res.json({ message: 'Estado da encomenda atualizado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar estado.' });
  }
});

// ============================================================
// ROTAS DE NOTIFICAÇÕES
// ============================================================

router.get('/Notifications', async (req, res) => {
  const search = req.query.search ? `%${req.query.search}%` : null;
  const type = req.query.type || null;
  const sort = req.query.sort || 'date_desc';

  let sql = `
    SELECT n.*, u.nome AS user_nome, u.email
    FROM Notifications n
    JOIN Users u ON n.user_id = u.user_id
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    sql += ` AND (n.conteudo LIKE ? OR u.nome LIKE ? OR u.email LIKE ?)`;
    params.push(search, search, search);
  }
  if (type) {
    sql += ` AND n.tipo LIKE ?`;
    params.push(`%${type}%`);
  }

  switch (sort) {
    case 'date_asc': sql += ` ORDER BY n.data_envio ASC`; break;
    case 'type_asc': sql += ` ORDER BY n.tipo ASC`; break;
    case 'type_desc': sql += ` ORDER BY n.tipo DESC`; break;
    default: sql += ` ORDER BY n.data_envio DESC`;
  }
  sql += ` LIMIT 200`;

  try {
    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao listar notificações.' });
  }
});

module.exports = router;