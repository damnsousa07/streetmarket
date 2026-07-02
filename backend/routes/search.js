// ================================================================
// SEARCH.JS – Rotas de pesquisa de produtos
// ================================================================
// Rota para pesquisar produtos com filtros e paginacao.
// Suporta: pesquisa por termo, categoria, marca, genero, preco e stock.
// ================================================================

const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /search – Pesquisar produtos com filtros e paginacao
router.get('/', async (req, res) => {
    try {
        // Logs para depuracao do backend
        console.log('BACKEND - Query recebida:', req.query);
        console.log('BACKEND - in_stock value:', req.query.in_stock);
        
        // Paginacao: pagina atual, limite por pagina e offset
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;

        // Filtros recebidos da query string
        const q = req.query.q || '';
        const category_id = req.query.category_id || '';
        const brand = req.query.brand || '';
        const gender = req.query.gender || '';
        const min_price = req.query.min_price || '';
        const max_price = req.query.max_price || '';
        const sort = req.query.sort || 'price_asc';
        const in_stock = req.query.in_stock === 'true' ? true : false;
        
        console.log('BACKEND - in_stock processado:', in_stock);

        // Query base com juncao a tabela Categories
        // LEFT JOIN para incluir produtos mesmo sem categoria associada
        let sql = `
            SELECT p.*, c.nome AS category_nome
            FROM Products p
            LEFT JOIN Categories c ON p.category_id = c.category_id
            WHERE 1=1
        `;
        const params = [];

        // Filtro por termo de pesquisa (nome ou marca)
        if (q) {
            sql += ` AND (p.nome LIKE ? OR p.marca LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }

        // Filtro por categoria
        if (category_id) {
            sql += ` AND p.category_id = ?`;
            params.push(category_id);
        }

        // Filtro por marca
        if (brand) {
            sql += ` AND p.marca = ?`;
            params.push(brand);
        }

        // Filtro por genero
        if (gender) {
            sql += ` AND p.gender = ?`;
            params.push(gender);
        }

        // Filtro por preco minimo
        if (min_price) {
            sql += ` AND p.preco >= ?`;
            params.push(parseFloat(min_price));
        }

        // Filtro por preco maximo
        if (max_price) {
            sql += ` AND p.preco <= ?`;
            params.push(parseFloat(max_price));
        }

        // Filtro de stock (apenas produtos com stock > 0)
        if (in_stock) {
            sql += ` AND p.stock > 0`;
            console.log('BACKEND - FILTRO STOCK APLICADO: stock > 0');
        } else {
            console.log('BACKEND - FILTRO STOCK NAO APLICADO');
        }

        // Ordenacao dinamica conforme parametro sort
        switch (sort) {
            case 'price_asc':
                sql += ` ORDER BY p.preco ASC`;
                break;
            case 'price_desc':
                sql += ` ORDER BY p.preco DESC`;
                break;
            case 'name_asc':
                sql += ` ORDER BY p.nome ASC`;
                break;
            case 'name_desc':
                sql += ` ORDER BY p.nome DESC`;
                break;
            default:
                sql += ` ORDER BY p.product_id DESC`;
        }

        console.log('BACKEND - SQL FINAL:', sql);

        // Contagem total para calcular paginas
        const countSql = sql.replace(/ORDER BY.*$/, '');
        const [countResult] = await db.promise().query(countSql, params);
        const total = countResult.length;

        // Aplica paginacao
        sql += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        // Executa query principal
        const [rows] = await db.promise().query(sql, params);

        // Busca imagem principal de cada produto
        // Ordena por order_index e is_primary para obter a imagem principal
        const imagePromises = rows.map(async (product) => {
            const [images] = await db.promise().query(
                'SELECT image_url FROM ProductsImages WHERE product_id = ? ORDER BY order_index ASC, is_primary DESC, created_at ASC LIMIT 1',
                [product.product_id]
            );
            product.imagem = images[0]?.image_url || null;
        });
        await Promise.all(imagePromises);

        // Calcula total de paginas
        const totalPages = Math.ceil(total / limit);

        console.log('BACKEND - PRODUTOS ENCONTRADOS:', rows.length);

        // Resposta com dados e meta-informacao
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
        console.error('Erro na pesquisa:', err);
        res.status(500).json({ message: 'Erro ao pesquisar produtos.' });
    }
});

module.exports = router;