// ============================================================
// ROTAS DE PRODUTOS (públicas) – listagem, pesquisa, detalhe, criação, edição e eliminação
// ============================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// -----------------------------------------------------------------
// CONFIGURAÇÃO DO UPLOAD DE IMAGENS (multer)
// -----------------------------------------------------------------

// Diretório onde as imagens serão armazenadas (relativo à raiz do backend)
const uploadDir = path.join(__dirname, '../uploads');
// Cria a pasta se não existir (recursive: true cria todos os níveis)
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configuração do armazenamento: define destino e nome do ficheiro
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Gera um nome único com timestamp + número aleatório + extensão original
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `prod-${unique}${path.extname(file.originalname)}`);
  }
});

// Middleware multer com limite de 5MB por imagem
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// -----------------------------------------------------------------
// ROTA GET /products – Listar todos os produtos
// -----------------------------------------------------------------
// Retorna todos os produtos com a imagem principal (primeira imagem) incluída.
// Utilizado pelo frontend para a página inicial e listagens básicas.
router.get('/', async (req, res) => {
  try {
    // Buscar todos os produtos
    const [rows] = await db.promise().query('SELECT * FROM Products');
    // Para cada produto, buscar a sua imagem principal (a primeira, ordenando por is_primary e data)
    for (let product of rows) {
      const [images] = await db.promise().query(
        'SELECT image_url FROM ProductsImages WHERE product_id = ? ORDER BY is_primary DESC, created_at ASC LIMIT 1',
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

// -----------------------------------------------------------------
// ROTA GET /products/search – Pesquisa com filtros
// -----------------------------------------------------------------
// Permite pesquisar produtos com base em: q (texto), category_id, min_price, max_price e sort.
// Retorna os produtos filtrados e ordenados, com a imagem principal.
router.get('/search', async (req, res) => {
  // Extrai parâmetros da query string
  let { q, category_id, min_price, max_price, sort } = req.query;

  // Se os campos de preço estiverem vazios, ignorá-los (tornar undefined)
  if (min_price === '') min_price = undefined;
  if (max_price === '') max_price = undefined;

  // Montagem dinâmica da query SQL
  let sql = 'SELECT * FROM Products WHERE 1=1';
  const params = [];

  // Filtro por texto (nome ou marca)
  if (q && q.trim() !== '') {
    sql += ' AND (nome LIKE ? OR marca LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }

  // Filtro por categoria
  if (category_id && category_id !== '') {
    sql += ' AND category_id = ?';
    params.push(category_id);
  }

  // Filtro por preço mínimo
  if (min_price !== undefined) {
    const min = Number(min_price);
    if (!isNaN(min)) {
      sql += ' AND preco >= ?';
      params.push(min);
    }
  }

  // Filtro por preço máximo
  if (max_price !== undefined) {
    const max = Number(max_price);
    if (!isNaN(max)) {
      sql += ' AND preco <= ?';
      params.push(max);
    }
  }

  // Ordenação dinâmica
  switch (sort) {
    case 'price_asc': sql += ' ORDER BY preco ASC'; break;
    case 'price_desc': sql += ' ORDER BY preco DESC'; break;
    case 'name_asc': sql += ' ORDER BY nome ASC'; break;
    case 'name_desc': sql += ' ORDER BY nome DESC'; break;
    default: sql += ' ORDER BY product_id DESC'; // mais recentes primeiro
  }

  try {
    const [rows] = await db.promise().query(sql, params);
    // Adicionar a imagem principal a cada produto
    for (let product of rows) {
      const [images] = await db.promise().query(
        'SELECT image_url FROM ProductsImages WHERE product_id = ? ORDER BY is_primary DESC, created_at ASC LIMIT 1',
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

// -----------------------------------------------------------------
// ROTA GET /products/:id – Detalhe de um produto específico
// -----------------------------------------------------------------
// Retorna todos os dados do produto, incluindo todas as suas imagens (não apenas a principal).
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Buscar o produto pelo ID
    const [rows] = await db.promise().query('SELECT * FROM Products WHERE product_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Produto não encontrado' });
    const product = rows[0];

    // Buscar todas as imagens associadas ao produto
    const [images] = await db.promise().query(
      'SELECT image_id, image_url, is_primary FROM ProductsImages WHERE product_id = ? ORDER BY is_primary DESC, created_at ASC',
      [id]
    );
    product.images = images;
    // Definir a imagem principal (primeira da lista)
    product.imagem = images[0]?.image_url || null;

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao obter produto' });
  }
});

// -----------------------------------------------------------------
// ROTA POST /products – Criar um novo produto com imagens
// -----------------------------------------------------------------
// Recebe dados do produto e até 6 imagens (campo 'images').
// Insere o produto, as imagens e atualiza o campo 'imagem' do produto.
router.post('/', upload.array('images', 6), async (req, res) => {
  const { nome, marca, preco, descricao, category_id, tamanhos } = req.body;
  // Validação dos campos obrigatórios
  if (!nome || !marca || !preco || !category_id) {
    return res.status(400).json({ message: 'Preenche todos os campos obrigatórios!' });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 1. Inserir o produto
    const [result] = await connection.query(
      'INSERT INTO Products (nome, marca, preco, descricao, category_id, tamanhos) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, marca, preco, descricao || null, category_id, tamanhos || null]
    );
    const productId = result.insertId;

    // 2. Inserir as imagens (se houver)
    if (req.files && req.files.length) {
      for (let idx = 0; idx < req.files.length; idx++) {
        const file = req.files[idx];
        const imageUrl = `/uploads/${file.filename}`;
        // A primeira imagem é definida como principal (is_primary = 1)
        const isPrimary = idx === 0;
        await connection.query(
          'INSERT INTO ProductsImages (product_id, image_url, is_primary) VALUES (?, ?, ?)',
          [productId, imageUrl, isPrimary]
        );
      }
      // 3. Atualizar o campo 'imagem' do produto com a URL da primeira imagem
      await connection.query(
        `UPDATE Products 
         SET imagem = (
             SELECT image_url FROM ProductsImages 
             WHERE product_id = ? 
             ORDER BY is_primary DESC, created_at ASC LIMIT 1
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

// -----------------------------------------------------------------
// ROTA PUT /products/:id – Atualizar um produto existente
// -----------------------------------------------------------------
// Permite atualizar os dados do produto, adicionar novas imagens e remover imagens existentes.
// Recebe: campos do produto, ficheiros (newImages), e uma lista de IDs de imagens a eliminar (imagesToDelete).
router.put('/:id', upload.array('newImages', 6), async (req, res) => {
  const { id } = req.params;
  const { nome, marca, preco, descricao, category_id, tamanhos, imagesToDelete } = req.body;

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 1. Atualizar os dados do produto
    await connection.query(
      'UPDATE Products SET nome = ?, marca = ?, preco = ?, descricao = ?, category_id = ?, tamanhos = ? WHERE product_id = ?',
      [nome, marca, preco, descricao || null, category_id, tamanhos || null, id]
    );

    // 2. Eliminar imagens marcadas (se houver)
    if (imagesToDelete && imagesToDelete.length) {
      // imagesToDelete é um array de IDs (ex: [1,2,3])
      await connection.query('DELETE FROM ProductsImages WHERE image_id IN (?) AND product_id = ?', [imagesToDelete, id]);
    }

    // 3. Adicionar novas imagens (se houver)
    if (req.files && req.files.length) {
      // Verificar se o produto já tem imagens; se não, a primeira nova será a principal
      const [existing] = await connection.query('SELECT 1 FROM ProductsImages WHERE product_id = ? LIMIT 1', [id]);
      const hasImages = existing.length > 0;
      for (let idx = 0; idx < req.files.length; idx++) {
        const file = req.files[idx];
        const imageUrl = `/uploads/${file.filename}`;
        // A primeira imagem só é principal se não houver imagens existentes
        const isPrimary = (idx === 0 && !hasImages);
        await connection.query(
          'INSERT INTO ProductsImages (product_id, image_url, is_primary) VALUES (?, ?, ?)',
          [id, imageUrl, isPrimary]
        );
      }
      // 4. Atualizar o campo 'imagem' do produto (apontar para a primeira imagem disponível)
      await connection.query(
        `UPDATE Products 
         SET imagem = (
             SELECT image_url FROM ProductsImages 
             WHERE product_id = ? 
             ORDER BY is_primary DESC, created_at ASC LIMIT 1
         ) 
         WHERE product_id = ?`,
        [id, id]
      );
    }

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

// -----------------------------------------------------------------
// ROTA DELETE /products/:id – Apagar um produto
// -----------------------------------------------------------------
// Elimina o produto da base de dados. As imagens permanecem no disco (poderão ser limpas posteriormente).
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