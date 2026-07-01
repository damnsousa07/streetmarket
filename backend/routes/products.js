// ================================================================
// PRODUCTS.JS – Rotas públicas de produtos
// ================================================================
// Este ficheiro contém as rotas para listar, pesquisar e visualizar
// produtos na parte pública da aplicação (Home, Search, ProductDetails).
// Inclui paginação, filtros, marcas e verificação de reviews.
// ================================================================

// Importação dos módulos necessários
const express = require('express');        // Framework para construir a API
const router = express.Router();           // Cria um router para definir as rotas
const multer = require('multer');          // Middleware para upload de ficheiros
const path = require('path');              // Manipulação de caminhos de ficheiros
const fs = require('fs');                  // Manipulação do sistema de ficheiros
const db = require('../db');               // Ligação à base de dados MySQL

// ================================================================
// CONFIGURAÇÃO DO UPLOAD DE IMAGENS (MULTER)
// ================================================================

// Define o diretório onde as imagens serão guardadas
const uploadDir = path.join(__dirname, '../uploads');
// Cria a pasta se não existir (recursive: true cria todos os níveis)
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configuração do armazenamento do multer (destino e nome do ficheiro)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),  // Guarda na pasta uploads
  filename: (req, file, cb) => {
    // Gera um nome único: timestamp + número aleatório + extensão original
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `prod-${unique}${path.extname(file.originalname)}`);
  }
});

// Cria o middleware multer com limite de 5 MB por imagem
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// ================================================================
// ROTA: Listar produtos com paginação e filtros
// ================================================================

// GET /products – Retorna uma lista paginada de produtos
// Suporta: pesquisa (q), categoria, marca, género, preço mínimo/máximo e ordenação.
// Utilizada na página inicial (Home) e na pesquisa (Search).
router.get('/', async (req, res) => {
  try {
    // Paginação: página atual e limite por página
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    // Filtros (da query string)
    const search = req.query.q ? `%${req.query.q}%` : null;
    const category_id = req.query.category_id ? parseInt(req.query.category_id) : null;
    const brand = req.query.brand || null;
    const gender = req.query.gender || null;
    const min_price = req.query.min_price ? parseFloat(req.query.min_price) : null;
    const max_price = req.query.max_price ? parseFloat(req.query.max_price) : null;
    const sort = req.query.sort || 'id_desc';

    // Query base: seleciona todos os produtos
    let sql = 'SELECT * FROM Products WHERE 1=1';
    const params = [];

    // Adiciona condições de filtro conforme os parâmetros fornecidos
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

    // Ordenação dinâmica
    switch (sort) {
      case 'name_asc': sql += ' ORDER BY nome ASC'; break;
      case 'name_desc': sql += ' ORDER BY nome DESC'; break;
      case 'price_asc': sql += ' ORDER BY preco ASC'; break;
      case 'price_desc': sql += ' ORDER BY preco DESC'; break;
      default: sql += ' ORDER BY product_id DESC';
    }

    // Contagem total (para calcular o número de páginas)
    const countSql = sql.replace(/ORDER BY.*$/, '');
    const [countResult] = await db.promise().query(countSql, params);
    const total = countResult.length;

    // Aplica LIMIT e OFFSET
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await db.promise().query(sql, params);

    // Busca a imagem principal de cada produto (a primeira imagem da tabela ProductsImages)
    for (let product of rows) {
      const [images] = await db.promise().query(
        'SELECT image_url FROM ProductsImages WHERE product_id = ? ORDER BY order_index ASC, is_primary DESC, created_at ASC LIMIT 1',
        [product.product_id]
      );
      product.imagem = images[0]?.image_url || null;
    }

    // Calcula o total de páginas
    const totalPages = Math.ceil(total / limit);

    // Devolve os dados + meta-informação para a paginação
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

// GET /products/brands – Retorna todas as marcas distintas (para dropdowns de filtro)
// Utilizada na página de pesquisa (Search) e no admin.
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

// GET /products/search – Redireciona para a rota principal (/) com os mesmos parâmetros
// Mantido para compatibilidade com versões anteriores.
router.get('/search', async (req, res) => {
  const query = req.query;
  const queryString = new URLSearchParams(query).toString();
  res.redirect(`/products?${queryString}`);
});

// ================================================================
// ROTA: Detalhe de um produto (com verificação de review)
// ================================================================

// GET /products/:id – Retorna os detalhes de um produto específico
// Inclui imagens e informações sobre se o utilizador pode escrever uma review.
// Utiliza userId da query string para verificar permissões.
router.get('/:id', async (req, res) => {
  // Headers para evitar cache (garantir que os dados estão atualizados)
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { id } = req.params;
  const userId = req.query.userId ? parseInt(req.query.userId) : null;

  console.log('🔍 userId (query):', userId);
  console.log('🔍 product_id:', id);

  try {
    // 1. Busca o produto
    const [rows] = await db.promise().query('SELECT * FROM Products WHERE product_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Produto não encontrado' });
    const product = rows[0];

    // 2. Busca as imagens do produto (ordenadas por ordem definida)
    const [images] = await db.promise().query(
      'SELECT image_id, image_url, is_primary, order_index FROM ProductsImages WHERE product_id = ? ORDER BY order_index ASC, is_primary DESC, created_at ASC',
      [id]
    );
    product.images = images;
    product.imagem = images[0]?.image_url || null;

    // 3. Verifica se o utilizador pode escrever uma review
    let canReview = false;
    let userReview = null;

    if (userId) {
      // Verifica se existe encomenda recebida (status_id = 3)
      const [orders] = await db.promise().query(
        `SELECT * FROM FakeOrders 
         WHERE user_id = ? AND product_id = ? AND status_id = 3`,
        [userId, id]
      );
      console.log('🔍 Encomendas recebidas:', orders);
      if (orders.length > 0) {
        canReview = true;
        // Verifica se já escreveu review
        const [reviews] = await db.promise().query(
          'SELECT * FROM Reviews WHERE user_id = ? AND product_id = ?',
          [userId, id]
        );
        if (reviews.length > 0) {
          canReview = false;      // Já escreveu, não pode escrever novamente
          userReview = reviews[0];
        }
      }
    }

    // Adiciona as informações de review ao objeto do produto
    product.canReview = canReview;
    product.userReview = userReview;

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao obter produto' });
  }
});

// ================================================================
// ROTA: Criar um novo produto (utilizada pelo admin)
// ================================================================

// POST /products – Cria um novo produto com imagens (máx. 6)
// Esta rota é utilizada pelo painel administrativo (AdminProducts).
router.post('/', upload.array('images', 6), async (req, res) => {
  const { nome, marca, preco, descricao, category_id, tamanhos, gender } = req.body;
  
  // Validação dos campos obrigatórios
  if (!nome || !marca || !preco || !category_id) {
    return res.status(400).json({ message: 'Preenche todos os campos obrigatórios!' });
  }

  // Obtém uma ligação à base de dados para usar transação
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insere o produto na tabela Products
    const [result] = await connection.query(
      'INSERT INTO Products (nome, marca, preco, descricao, category_id, tamanhos, gender) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nome, marca, preco, descricao || null, category_id, tamanhos || null, gender || 'Unisexo']
    );
    const productId = result.insertId;

    // 2. Insere as imagens (se houver)
    if (req.files && req.files.length) {
      for (let idx = 0; idx < req.files.length; idx++) {
        const file = req.files[idx];
        const imageUrl = `/uploads/${file.filename}`;
        const isPrimary = idx === 0;  // A primeira imagem é a principal
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
    res.status(201).json({ message: 'Produto adicionado com sucesso!', productId });
  } catch (err) {
    // Em caso de erro, desfaz todas as alterações
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Erro ao adicionar produto' });
  } finally {
    connection.release();
  }
});

// ================================================================
// ROTA: Atualizar um produto (utilizada pelo admin)
// ================================================================

// PUT /products/:id – Atualiza um produto existente
// Suporta: atualização de dados, adição/remoção de imagens e reordenação.
// As imagens removidas são apagadas do disco.
router.put('/:id', upload.array('newImages', 6), async (req, res) => {
  const { id } = req.params;
  const { nome, marca, preco, descricao, category_id, tamanhos, imagesToDelete, imagesOrder, gender } = req.body;

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 1. Atualiza os dados do produto
    await connection.query(
      'UPDATE Products SET nome = ?, marca = ?, preco = ?, descricao = ?, category_id = ?, tamanhos = ?, gender = ? WHERE product_id = ?',
      [nome, marca, preco, descricao || null, category_id, tamanhos || null, gender || 'Unisexo', id]
    );

    // 2. Elimina imagens marcadas para remoção (inclui apagar do disco)
    if (imagesToDelete && imagesToDelete.length) {
      const ids = JSON.parse(imagesToDelete);
      
      // Busca as URLs das imagens antes de apagar (para saber os ficheiros a remover)
      const [imagesToRemove] = await connection.query(
        'SELECT image_url FROM ProductsImages WHERE image_id IN (?) AND product_id = ?',
        [ids, id]
      );
      
      // Apaga os registos da base de dados
      await connection.query(
        'DELETE FROM ProductsImages WHERE image_id IN (?) AND product_id = ?',
        [ids, id]
      );
      
      // Apaga os ficheiros do disco
      for (const img of imagesToRemove) {
        if (img.image_url) {
          // Converte o caminho relativo para absoluto
          const relativePath = img.image_url.replace(/^\/uploads\//, '');
          const filePath = path.join(__dirname, '../uploads', relativePath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);  // Remove o ficheiro
            console.log(`🗑️ Imagem removida: ${filePath}`);
          }
        }
      }
      console.log(`Imagens eliminadas: ${ids.join(', ')}`);
    }

    // 3. Reordena imagens existentes (se enviada nova ordem)
    if (imagesOrder) {
      const orderArray = JSON.parse(imagesOrder);
      for (let idx = 0; idx < orderArray.length; idx++) {
        await connection.query(
          'UPDATE ProductsImages SET order_index = ? WHERE image_id = ? AND product_id = ?',
          [idx, orderArray[idx], id]
        );
      }
    }

    // 4. Adiciona novas imagens (se houver)
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

    // 5. Atualiza o campo 'imagem' com a primeira imagem disponível
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
// ROTA: Apagar um produto (utilizada pelo admin)
// ================================================================

// DELETE /products/:id – Apaga um produto e todas as suas imagens do disco
// Esta rota apaga o registo da base de dados e remove os ficheiros de imagem
// da pasta uploads, libertando espaço em disco.
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // 1. Busca as imagens do produto antes de apagar (para saber os ficheiros a remover)
    const [images] = await db.promise().query(
      'SELECT image_url FROM ProductsImages WHERE product_id = ?',
      [id]
    );
    
    // 2. Apaga o produto da base de dados
    // (As imagens são apagadas da BD via ON DELETE CASCADE se a FK estiver configurada)
    await db.promise().query('DELETE FROM Products WHERE product_id = ?', [id]);

    // 3. Apaga os ficheiros de imagem do disco
    for (const img of images) {
      if (img.image_url) {
        // Converte o caminho relativo (ex: /uploads/prod-123.jpg) para absoluto
        const relativePath = img.image_url.replace(/^\/uploads\//, '');
        const filePath = path.join(__dirname, '../uploads', relativePath);
        // Verifica se o ficheiro existe e remove-o
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Imagem apagada: ${filePath}`);
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
// EXPORTAÇÃO DO ROUTER
// ================================================================
// Exporta o router para ser utilizado no index.js (montado em /products)
module.exports = router;