// ================================================================
// ADMIN.JS – Rotas de administração
// ================================================================
// Este ficheiro contém todas as rotas protegidas para a gestão 
// da loja (categorias, produtos, encomendas e notificações).
// Apenas utilizadores com a chave de administrador correta podem aceder.
// ================================================================

// Importação dos módulos necessários
const express = require('express');        // Framework para construir a API
const router = express.Router();           // Cria um router para definir as rotas
const multer = require('multer');          // Middleware para upload de ficheiros
const path = require('path');              // Manipulação de caminhos de ficheiros
const fs = require('fs');                  // Manipulação do sistema de ficheiros
const db = require('../db');               // Ligação à base de dados MySQL
const { sendReviewRequestEmail } = require('../services/emailservice'); // Envio de emails

// ================================================================
// CONFIGURAÇÃO DO UPLOAD DE IMAGENS (MULTER)
// ================================================================

// Define os diretórios onde as imagens serão guardadas
const uploadDir = path.join(__dirname, '../uploads');          // Pasta principal de uploads
const categoriesDir = path.join(uploadDir, 'categories');      // Pasta específica para categorias

// Cria as pastas se não existirem (recursive: true cria todos os níveis necessários)
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(categoriesDir)) fs.mkdirSync(categoriesDir, { recursive: true });

// Configuração do armazenamento do multer (define destino e nome do ficheiro)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Se o pedido for para categorias, guarda na pasta categories
    if (req.path.includes('/Categories')) {
      cb(null, categoriesDir);
    } else {
      cb(null, uploadDir);  // Caso contrário, guarda na pasta principal
    }
  },
  filename: (req, file, cb) => {
    // Gera um nome único para o ficheiro: timestamp + número aleatório + extensão original
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    // Prefixo 'cat-' para categorias, 'prod-' para produtos
    const prefix = req.path.includes('/Categories') ? 'cat-' : 'prod-';
    cb(null, `${prefix}${unique}${ext}`);
  }
});

// Cria o middleware multer com as configurações definidas e limite de 5 MB por imagem
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// ================================================================
// MIDDLEWARE DE AUTENTICAÇÃO ADMIN
// ================================================================

// Função middleware que verifica se o pedido contém a chave de administrador correta
// Esta função é executada antes de qualquer rota protegida
function requireAdmin(req, res, next) {
  // Obtém a chave do cabeçalho 'x-admin-key'
  const key = req.headers['x-admin-key'];
  
  // Verifica se a variável de ambiente ADMIN_KEY está definida
  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({ message: 'ADMIN_KEY não definido no .env' });
  }
  
  // Verifica se a chave foi enviada e se coincide com a definida no .env
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ message: 'Acesso negado (admin).' });
  }
  
  // Se a chave estiver correta, prossegue para a próxima função/middleware
  next();
}

// Aplica o middleware de autenticação a todas as rotas definidas neste router
router.use(requireAdmin);

// ================================================================
// ROTAS DE CATEGORIAS (CRUD com imagem)
// ================================================================

// GET /admin/Categories – Listar todas as categorias
// Permite pesquisa por nome e ordenação (A→Z ou Z→A)
router.get('/Categories', async (req, res) => {
  // Obtém o termo de pesquisa e a ordenação da query string
  const search = req.query.search ? `%${req.query.search}%` : null;
  const sort = req.query.sort === 'name_desc' ? 'DESC' : 'ASC';
  
  // Query base: seleciona todas as categorias
  let sql = 'SELECT * FROM Categories WHERE 1=1';
  const params = [];
  
  // Se houver termo de pesquisa, adiciona a condição LIKE
  if (search) {
    sql += ` AND nome LIKE ?`;
    params.push(search);
  }
  
  // Adiciona a ordenação dinâmica
  sql += ` ORDER BY nome ${sort}`;
  
  try {
    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao listar categorias.' });
  }
});

// POST /admin/Categories – Criar uma nova categoria (com imagem opcional)
router.post('/Categories', upload.single('image'), async (req, res) => {
  // Logs para depuração
  console.log('🔍 req.file:', req.file);
  console.log('🔍 req.body:', req.body);

  // Garante que req.body existe
  req.body = req.body || {};
  const { nome, descricao } = req.body;
  
  // Validação: nome é obrigatório
  if (!nome) return res.status(400).json({ message: 'Nome é obrigatório.' });

  // Se foi enviada uma imagem, guarda o caminho
  let imageUrl = null;
  if (req.file) {
    imageUrl = `/uploads/categories/${req.file.filename}`;
    console.log('✅ Ficheiro guardado:', imageUrl);
  } else {
    console.log('❌ Nenhum ficheiro recebido.');
  }

  try {
    // Insere a nova categoria na base de dados
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

// PUT /admin/Categories/:id – Atualizar uma categoria (com imagem opcional)
router.put('/Categories/:id', upload.single('image'), async (req, res) => {
  // Garante que req.body existe
  req.body = req.body || {};
  const { id } = req.params;
  const { nome, descricao } = req.body;
  
  // Validação: nome é obrigatório
  if (!nome) return res.status(400).json({ message: 'Nome é obrigatório.' });

  // Se foi enviada uma nova imagem, guarda o caminho
  let imageUrl = null;
  if (req.file) {
    imageUrl = `/uploads/categories/${req.file.filename}`;
    console.log('✅ Nova imagem guardada:', imageUrl);

    // Apaga a imagem antiga (se existir)
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
    // Constrói a query dinamicamente (inclui a imagem apenas se foi enviada)
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

// DELETE /admin/Categories/:id – Apagar uma categoria
router.delete('/Categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Verifica se existem produtos associados (impede a exclusão se houver)
    const [check] = await db.promise().query(
      'SELECT COUNT(*) AS total FROM Products WHERE category_id = ?',
      [id]
    );
    if (check[0].total > 0) {
      return res.status(400).json({ message: 'Não é possível apagar: existem produtos associados.' });
    }

    // Busca a imagem antes de apagar (para remover o ficheiro)
    const [old] = await db.promise().query('SELECT image_url FROM Categories WHERE category_id = ?', [id]);
    const [result] = await db.promise().query('DELETE FROM Categories WHERE category_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Categoria não encontrada.' });
    }

    // Apaga o ficheiro de imagem se existir
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

// ================================================================
// ROTAS DE PRODUTOS (CRUD com imagens, stock, género e paginação)
// ================================================================

// GET /admin/Products – Listar produtos com paginação e filtros
router.get('/Products', async (req, res) => {
  // Paginação: página atual e limite por página
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const offset = (page - 1) * limit;

  // Filtros
  const search = req.query.search ? `%${req.query.search}%` : null;
  const category_id = req.query.category_id ? parseInt(req.query.category_id) : null;
  const brand = req.query.brand || null;
  const min_price = req.query.min_price ? parseFloat(req.query.min_price) : null;
  const max_price = req.query.max_price ? parseFloat(req.query.max_price) : null;
  const sort = req.query.sort || 'id_desc';

  // Query base com junção à tabela Categories para obter o nome da categoria
  let sql = `
    SELECT p.*, c.nome AS category_nome
    FROM Products p
    LEFT JOIN Categories c ON p.category_id = c.category_id
    WHERE 1=1
  `;
  const params = [];

  // Adiciona condições de filtro conforme os parâmetros fornecidos
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

  // Ordenação
  switch (sort) {
    case 'name_asc': sql += ` ORDER BY p.nome ASC`; break;
    case 'name_desc': sql += ` ORDER BY p.nome DESC`; break;
    case 'price_asc': sql += ` ORDER BY p.preco ASC`; break;
    case 'price_desc': sql += ` ORDER BY p.preco DESC`; break;
    default: sql += ` ORDER BY p.product_id DESC`;
  }

  // Contagem total (para calcular o número de páginas)
  const countSql = sql.replace(/ORDER BY.*$/, '');
  const [countResult] = await db.promise().query(countSql, params);
  const total = countResult.length;

  // Aplica LIMIT e OFFSET
  sql += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await db.promise().query(sql, params);

  // Busca a imagem principal de cada produto
  const imagePromises = rows.map(async (product) => {
    const [images] = await db.promise().query(
      'SELECT image_url FROM ProductsImages WHERE product_id = ? ORDER BY order_index ASC, is_primary DESC, created_at ASC LIMIT 1',
      [product.product_id]
    );
    product.imagem = images[0]?.image_url || null;
  });
  await Promise.all(imagePromises);

  // Calcula o total de páginas
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

// GET /admin/Products/:id – Buscar um produto específico (com imagens)
router.get('/Products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Busca o produto com o ID fornecido, incluindo o nome da categoria
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

    // Busca todas as imagens do produto (ordenadas por ordem definida)
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

// GET /admin/Brands – Listar todas as marcas distintas
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

// POST /admin/Products – Criar um novo produto (com imagens)
router.post('/Products', upload.array('images', 6), async (req, res) => {
  // Logs para depuração
  console.log('POST /admin/Products - req.body:', req.body);
  console.log('POST /admin/Products - req.files:', req.files ? req.files.length : 0);

  const { nome, marca, preco, descricao, category_id, tamanhos, gender, stock } = req.body;

  // Validação dos campos obrigatórios
  if (!nome || !marca || !preco || !category_id) {
    return res.status(400).json({
      message: 'nome, marca, preco e category_id são obrigatórios.',
      received: { nome, marca, preco, category_id }
    });
  }

  // Obtém uma ligação à base de dados para usar transação
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insere o produto na tabela Products (inclui gender e stock)
    const [result] = await connection.query(
      'INSERT INTO Products (nome, marca, preco, descricao, category_id, tamanhos, gender, stock, data_criacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [nome, marca, preco, descricao || null, category_id, tamanhos || null, gender || 'Unisexo', stock || 0]
    );
    const productId = result.insertId;

    // 2. Insere as imagens (se houver)
    if (req.files && req.files.length) {
      for (let idx = 0; idx < req.files.length; idx++) {
        const file = req.files[idx];
        const imageUrl = `/uploads/${file.filename}`;
        const isPrimary = idx === 0; // A primeira imagem é a principal
        await connection.query(
          'INSERT INTO ProductsImages (product_id, image_url, is_primary, order_index) VALUES (?, ?, ?, ?)',
          [productId, imageUrl, isPrimary, idx]
        );
      }
      // 3. Sincroniza o campo 'imagem' do produto com a primeira imagem
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

    // Confirma a transação
    await connection.commit();
    res.status(201).json({ message: 'Produto criado com sucesso!', product_id: productId });
  } catch (err) {
    // Em caso de erro, desfaz todas as alterações
    await connection.rollback();
    console.error('Erro no POST /admin/Products:', err);
    res.status(500).json({ message: 'Erro ao criar produto.', error: err.message });
  } finally {
    connection.release();
  }
});

// PUT /admin/Products/:id – Atualizar um produto (com imagens, reordenação, remoção)
router.put('/Products/:id', upload.array('images', 6), async (req, res) => {
  const { id } = req.params;
  console.log('PUT /admin/Products/:id - req.body:', req.body);
  console.log('PUT /admin/Products/:id - req.files:', req.files ? req.files.length : 0);

  const { nome, marca, preco, descricao, category_id, tamanhos, stock, gender } = req.body;

  // Validação dos campos obrigatórios
  if (!nome || !marca || !preco || !category_id) {
    return res.status(400).json({
      message: 'nome, marca, preco e category_id são obrigatórios.',
      received: { nome, marca, preco, category_id }
    });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 1. ATUALIZA OS DADOS DO PRODUTO (incluindo stock e gender)
    const stockValue = stock !== undefined && stock !== '' ? parseInt(stock) : 0;
    console.log('A atualizar produto com:', { nome, marca, preco, descricao, category_id, tamanhos, stockValue, gender, id });
    const [updateResult] = await connection.query(
      'UPDATE Products SET nome = ?, marca = ?, preco = ?, descricao = ?, category_id = ?, tamanhos = ?, stock = ?, gender = ? WHERE product_id = ?',
      [nome, marca, preco, descricao || null, category_id, tamanhos || null, stockValue, gender || 'Unisexo', id]
    );
    console.log('Resultado do update:', updateResult);
    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    // 2. ELIMINA IMAGENS MARCADAS
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

    // 3. REORDENA IMAGENS EXISTENTES
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
      // Se não for enviada ordem, define com base na ordem atual
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

    // 4. ADICIONA NOVAS IMAGENS
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

    // 5. ATUALIZA O CAMPO 'imagem' COM A PRIMEIRA IMAGEM DISPONÍVEL
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

// DELETE /admin/Products/:id – Apagar um produto
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

// ================================================================
// ROTAS DE ENCOMENDAS (listagem e atualização de estado)
// ================================================================

// GET /admin/Orders – Listar encomendas com pesquisa, filtros e ordenação
router.get('/Orders', async (req, res) => {
  // Parâmetros da query string
  const search = req.query.search ? `%${req.query.search}%` : null;
  const status_id = req.query.status_id ? parseInt(req.query.status_id) : null;
  const sort = req.query.sort || 'order_id_desc';
  const date_from = req.query.date_from ? new Date(req.query.date_from) : null;
  const date_to = req.query.date_to ? new Date(req.query.date_to) : null;

  // Query base com joins para obter dados do utilizador, produto e estado
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

  // Filtros
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

  // Ordenação
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

// PUT /admin/Orders/:order_id/status – Atualizar o estado de uma encomenda
router.put('/Orders/:order_id/status', async (req, res) => {
  const { order_id } = req.params;
  const { status_id } = req.body;
  
  // Validação: status_id é obrigatório
  if (status_id == null) return res.status(400).json({ message: 'status_id é obrigatório.' });

  try {
    // Busca dados completos da encomenda (produto e utilizador)
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

    // Atualiza o estado da encomenda
    const [result] = await db.promise().query(
      'UPDATE FakeOrders SET status_id = ? WHERE order_id = ?',
      [status_id, order_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Encomenda não encontrada.' });

    const user_id = order.user_id;
    const productNome = order.product_nome;

    // Cria notificações conforme o novo estado
    if (Number(status_id) === 2) {
      // Estado: Enviado
      const mensagem = `O seu produto '${productNome}' vai chegar em breve.`;
      await db.promise().query(
        'INSERT INTO Notifications (user_id, tipo, conteudo, data_envio) VALUES (?, ?, ?, NOW())',
        [user_id, 'Encomenda', mensagem]
      );
    } else if (Number(status_id) === 3) {
      // Estado: Recebido
      const mensagem = `O seu produto '${productNome}' chegou. Espero que goste! Veja o seu email para dar a sua avaliação.`;
      await db.promise().query(
        'INSERT INTO Notifications (user_id, tipo, conteudo, data_envio) VALUES (?, ?, ?, NOW())',
        [user_id, 'Encomenda', mensagem]
      );
      // Envia email de review (utilizando a função importada)
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

// ================================================================
// ROTAS DE NOTIFICAÇÕES (listagem com filtros)
// ================================================================

// GET /admin/Notifications – Listar notificações com pesquisa e filtros
router.get('/Notifications', async (req, res) => {
  // Parâmetros da query string
  const search = req.query.search ? `%${req.query.search}%` : null;
  const type = req.query.type || null;
  const sort = req.query.sort || 'date_desc';

  // Query base com junção à tabela Users para obter o nome do utilizador
  let sql = `
    SELECT n.*, u.nome AS user_nome, u.email
    FROM Notifications n
    JOIN Users u ON n.user_id = u.user_id
    WHERE 1=1
  `;
  const params = [];

  // Filtros
  if (search) {
    sql += ` AND (n.conteudo LIKE ? OR u.nome LIKE ? OR u.email LIKE ?)`;
    params.push(search, search, search);
  }
  if (type) {
    sql += ` AND n.tipo LIKE ?`;
    params.push(`%${type}%`);
  }

  // Ordenação
  switch (sort) {
    case 'date_asc': sql += ` ORDER BY n.data_envio ASC`; break;
    case 'type_asc': sql += ` ORDER BY n.tipo ASC`; break;
    case 'type_desc': sql += ` ORDER BY n.tipo DESC`; break;
    default: sql += ` ORDER BY n.data_envio DESC`;
  }
  
  // Limita a 200 notificações para evitar sobrecarga
  sql += ` LIMIT 200`;

  try {
    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao listar notificações.' });
  }
});

// ================================================================
// EXPORTAÇÃO DO ROUTER
// ================================================================
module.exports = router;