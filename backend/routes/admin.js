// Importa o módulo express para criar rotas
const express = require('express');
// Cria um objeto router para definir as rotas deste ficheiro
const router = express.Router();
// Importa o multer para upload de ficheiros
const multer = require('multer');
// Importa o módulo path para manipulação de caminhos
const path = require('path');
// Importa o módulo fs para operações de sistema de ficheiros
const fs = require('fs');
// Importa a ligação à base de dados
const db = require('../db');
// Importa a função de envio de email de review
const { sendReviewRequestEmail } = require('../services/emailservice');

// ============================================================
// CONFIGURAÇÃO DO UPLOAD DE IMAGENS (multer)
// ============================================================

// Define o diretório onde as imagens serão guardadas (pasta uploads na raiz do backend)
const uploadDir = path.join(__dirname, '../uploads');
// Cria a pasta se ela não existir (recursive: true cria todos os níveis necessários)
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configuração do armazenamento do multer: define destino e nome do ficheiro
const storage = multer.diskStorage({
  // Define o destino onde o ficheiro será guardado
  destination: (req, file, cb) => cb(null, uploadDir),
  // Define o nome do ficheiro: timestamp + número aleatório + extensão original
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `prod-${unique}${path.extname(file.originalname)}`);
  }
});

// Cria o middleware multer com as configurações definidas e limite de 5 MB por imagem
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// ============================================================
// MIDDLEWARE DE AUTENTICAÇÃO ADMIN
// ============================================================

// Função middleware para verificar se o pedido contém a chave de administrador correta
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

// ============================================================
// ROTAS DE CATEGORIAS
// ============================================================

// Rota GET para listar categorias (com pesquisa e ordenação)
router.get('/Categories', async (req, res) => {
    // Obtém o termo de pesquisa da query string (se existir)
    const search = req.query.search ? `%${req.query.search}%` : null;
    // Define a ordenação: DESC se for 'name_desc', caso contrário ASC
    const sort = req.query.sort === 'name_desc' ? 'DESC' : 'ASC';

    // Query base para selecionar todas as categorias
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
        // Executa a query e retorna os resultados em JSON
        const [rows] = await db.promise().query(sql, params);
        res.json(rows);
    } catch (err) {
        // Em caso de erro, regista no console e devolve erro 500
        console.error(err);
        res.status(500).json({ message: 'Erro ao listar categorias.' });
    }
});

// Rota POST para criar uma nova categoria
router.post('/Categories', async (req, res) => {
  // Extrai nome e descrição do corpo da requisição
  const { nome, descricao } = req.body;
  // Valida se o nome foi enviado
  if (!nome) return res.status(400).json({ message: 'Nome é obrigatório.' });
  try {
    // Insere a nova categoria na base de dados
    const [result] = await db.promise().query(
      'INSERT INTO Categories (nome, descricao) VALUES (?, ?)',
      [nome, descricao || null]
    );
    // Retorna sucesso com o ID da categoria criada
    res.status(201).json({ message: 'Categoria criada.', category_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao criar categoria.' });
  }
});

// Rota PUT para atualizar uma categoria existente
router.put('/Categories/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, descricao } = req.body;
  // Valida se o nome foi enviado
  if (!nome) return res.status(400).json({ message: 'Nome é obrigatório.' });
  try {
    // Atualiza a categoria com o ID fornecido
    const [result] = await db.promise().query(
      'UPDATE Categories SET nome = ?, descricao = ? WHERE category_id = ?',
      [nome, descricao || null, id]
    );
    // Se nenhuma linha foi afetada, a categoria não existe
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Categoria não encontrada.' });
    res.json({ message: 'Categoria atualizada.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar categoria.' });
  }
});

// Rota DELETE para apagar uma categoria (apenas se não houver produtos associados)
router.delete('/Categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Verifica se existem produtos que usam esta categoria
    const [check] = await db.promise().query(
      'SELECT COUNT(*) AS total FROM Products WHERE category_id = ?',
      [id]
    );
    // Se houver produtos associados, impede a exclusão
    if (check[0].total > 0) {
      return res.status(400).json({ message: 'Não é possível apagar: existem produtos associados.' });
    }
    // Apaga a categoria
    const [result] = await db.promise().query('DELETE FROM Categories WHERE category_id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Categoria não encontrada.' });
    res.json({ message: 'Categoria apagada.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao apagar categoria.' });
  }
});

// ============================================================
// ROTAS DE PRODUTOS (com imagens e marcas)
// ============================================================

// Rota GET para listar produtos com filtros avançados
router.get('/Products', async (req, res) => {
    // Extrai os parâmetros da query string
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

    // Adiciona a ordenação conforme o parâmetro sort
    switch (sort) {
        case 'name_asc':
            sql += ` ORDER BY p.nome ASC`;
            break;
        case 'name_desc':
            sql += ` ORDER BY p.nome DESC`;
            break;
        case 'price_asc':
            sql += ` ORDER BY p.preco ASC`;
            break;
        case 'price_desc':
            sql += ` ORDER BY p.preco DESC`;
            break;
        default:
            sql += ` ORDER BY p.product_id DESC`; // mais recentes primeiro
    }

    try {
        // Executa a query principal
        const [rows] = await db.promise().query(sql, params);
        // Para cada produto, busca a primeira imagem (a que será usada como capa)
        const imagePromises = rows.map(async (product) => {
            const [images] = await db.promise().query(
                'SELECT image_url FROM ProductsImages WHERE product_id = ? ORDER BY order_index ASC, is_primary DESC, created_at ASC LIMIT 1',
                [product.product_id]
            );
            product.imagem = images[0]?.image_url || null;
        });
        // Aguarda todas as consultas de imagem serem concluídas
        await Promise.all(imagePromises);
        // Retorna os produtos com a imagem principal adicionada
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao listar produtos.' });
    }
});

// Rota GET para buscar um único produto com todas as suas imagens
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

    // Busca todas as imagens do produto, ordenadas por ordem definida
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

// Rota GET para listar todas as marcas distintas
router.get('/Brands', async (req, res) => {
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

// Rota POST para criar um novo produto (com imagens e tamanhos)
router.post('/Products', upload.array('images', 6), async (req, res) => {
  // Log do corpo e ficheiros recebidos (para depuração)
  console.log('POST /admin/Products - req.body:', req.body);
  console.log('POST /admin/Products - req.files:', req.files ? req.files.length : 0);

  const { nome, marca, preco, descricao, category_id, tamanhos } = req.body;

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
    // Inicia uma transação
    await connection.beginTransaction();

    // 1. Insere o produto na tabela Products
    const [result] = await connection.query(
      'INSERT INTO Products (nome, marca, preco, descricao, category_id, tamanhos, data_criacao) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [nome, marca, preco, descricao || null, category_id, tamanhos || null]
    );
    const productId = result.insertId;

    // 2. Insere as imagens (se houver)
    if (req.files && req.files.length) {
      for (let idx = 0; idx < req.files.length; idx++) {
        const file = req.files[idx];
        const imageUrl = `/uploads/${file.filename}`;
        const isPrimary = idx === 0; // a primeira imagem é a principal
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

    // Confirma a transação (commit)
    await connection.commit();
    res.status(201).json({ message: 'Produto criado com sucesso!', product_id: productId });
  } catch (err) {
    // Em caso de erro, desfaz todas as alterações (rollback)
    await connection.rollback();
    console.error('Erro no POST /admin/Products:', err);
    res.status(500).json({ message: 'Erro ao criar produto.', error: err.message });
  } finally {
    // Liberta a ligação de volta ao pool
    connection.release();
  }
});

// Rota PUT para atualizar um produto existente (com imagens, reordenação, remoção)
router.put('/Products/:id', upload.array('newImages', 6), async (req, res) => {
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

    // 1. Atualiza os dados do produto
    const [updateResult] = await connection.query(
      'UPDATE Products SET nome = ?, marca = ?, preco = ?, descricao = ?, category_id = ?, tamanhos = ? WHERE product_id = ?',
      [nome, marca, preco, descricao || null, category_id, tamanhos || null, id]
    );
    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    // 2. Elimina imagens marcadas para remoção (campo imagesToDelete)
    let imagesToDelete = req.body.imagesToDelete;
    if (imagesToDelete && typeof imagesToDelete === 'string') {
      try {
        imagesToDelete = JSON.parse(imagesToDelete);
      } catch (e) {
        imagesToDelete = [];
      }
    }
    if (imagesToDelete && imagesToDelete.length) {
      await connection.query(
        'DELETE FROM ProductsImages WHERE image_id IN (?) AND product_id = ?',
        [imagesToDelete, id]
      );
    }

    // 3. Reordena imagens existentes (campo imagesOrder)
    let imagesOrder = req.body.imagesOrder;
    if (imagesOrder && typeof imagesOrder === 'string') {
      try {
        imagesOrder = JSON.parse(imagesOrder);
      } catch (e) {
        imagesOrder = [];
      }
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
      // Se não for enviada ordem, define com base na ordem atual (por created_at)
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

    // 5. Actualiza o campo 'imagem' do produto com a primeira imagem disponível
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

// Rota DELETE para apagar um produto
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
// ROTAS DE ENCOMENDAS (para administração)
// ============================================================

// Rota GET para listar todas as encomendas com pesquisa e filtros
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

    // Adiciona condições de pesquisa (nome, email, produto ou ID)
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

    // Ordenação dinâmica
    switch (sort) {
        case 'order_id_asc':
            sql += ` ORDER BY fo.order_id ASC`;
            break;
        case 'order_id_desc':
            sql += ` ORDER BY fo.order_id DESC`;
            break;
        case 'date_asc':
            sql += ` ORDER BY fo.data_compra ASC`;
            break;
        case 'date_desc':
            sql += ` ORDER BY fo.data_compra DESC`;
            break;
        case 'price_asc':
            sql += ` ORDER BY p.preco ASC`;
            break;
        case 'price_desc':
            sql += ` ORDER BY p.preco DESC`;
            break;
        default:
            sql += ` ORDER BY fo.order_id DESC`;
    }

    try {
        const [rows] = await db.promise().query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao listar encomendas.' });
    }
});

// Rota PUT para atualizar o estado de uma encomenda (com notificações e email)
router.put('/Orders/:order_id/status', async (req, res) => {
  const { order_id } = req.params;
  const { status_id } = req.body;
  if (status_id == null) return res.status(400).json({ message: 'status_id é obrigatório.' });

  try {
    // Busca dados completos da encomenda, produto e utilizador
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

// ============================================================
// ROTAS DE NOTIFICAÇÕES (para administração)
// ============================================================

// Rota GET para listar as últimas 200 notificações com pesquisa e filtros
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

    // Ordenação dinâmica
    switch (sort) {
        case 'date_asc':
            sql += ` ORDER BY n.data_envio ASC`;
            break;
        case 'type_asc':
            sql += ` ORDER BY n.tipo ASC`;
            break;
        case 'type_desc':
            sql += ` ORDER BY n.tipo DESC`;
            break;
        default:
            sql += ` ORDER BY n.data_envio DESC`; // mais recentes primeiro
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

module.exports = router;