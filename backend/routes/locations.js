// ================================================================
// LOCATIONS.JS – Rotas de localizações (Distritos, Concelhos, Códigos Postais)
// ================================================================
// Este ficheiro contém as rotas para consultar dados geográficos
// (distritos, concelhos e códigos postais) da base de dados.
// Estas rotas são públicas e NÃO requerem autenticação.
// ================================================================

// Importação dos módulos necessários
const express = require('express');        // Framework para construir a API
const router = express.Router();           // Cria um router para definir as rotas
const db = require('../db');               // Ligação à base de dados MySQL

// ================================================================
// ROTA: Listar todos os distritos
// ================================================================

// GET /locations/districts – Retorna todos os distritos ordenados por nome (A→Z)
// Utilizada para popular dropdowns de seleção de distrito no frontend.
router.get('/districts', async (req, res) => {
    try {
        // Query: seleciona ID e nome de todos os distritos, ordenados alfabeticamente
        const [rows] = await db.promise().query('SELECT id, nome FROM Districts ORDER BY nome');
        // Devolve os dados em JSON
        res.json(rows);
    } catch (err) {
        // Regista o erro no console do servidor para depuração
        console.error(err);
        // Devolve erro 500 com mensagem genérica para o cliente
        res.status(500).json({ message: 'Erro ao obter distritos' });
    }
});

// ================================================================
// ROTA: Listar concelhos de um distrito específico
// ================================================================

// GET /locations/municipalities/:districtId – Retorna os concelhos de um distrito
// Parâmetro: districtId (ID do distrito)
// Utilizada para popular dropdowns de seleção de concelho (dependentes do distrito).
router.get('/municipalities/:districtId', async (req, res) => {
    const { districtId } = req.params;  // Obtém o ID do distrito da URL
    
    try {
        // Query: seleciona ID e nome dos concelhos cujo distrito_id coincide com o parâmetro
        // Ordena por nome (A→Z) para facilitar a navegação
        const [rows] = await db.promise().query(
            'SELECT id, nome FROM Municipalities WHERE distrito_id = ? ORDER BY nome',
            [districtId]
        );
        // Devolve os dados em JSON
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao obter concelhos' });
    }
});

// ================================================================
// ROTA: Pesquisar informações de um código postal
// ================================================================

// GET /locations/postal-code/:code – Retorna o distrito e concelho de um código postal
// Parâmetro: code (código postal)
// Utilizada para autopreenchimento de localização com base no código postal.
// Esta rota depende da existência da tabela PostalCodes.
router.get('/postal-code/:code', async (req, res) => {
    const { code } = req.params;  // Obtém o código postal da URL
    
    try {
        // Query com JOINs para obter o distrito e concelho a partir do código postal
        // Tabelas envolvidas: PostalCodes, Municipalities, Districts
        const [rows] = await db.promise().query(
            `SELECT d.nome AS district, m.nome AS municipality 
             FROM PostalCodes pc
             JOIN Municipalities m ON pc.municipality_id = m.id
             JOIN Districts d ON pc.district_id = d.id
             WHERE pc.codigo = ?`,
            [code]
        );
        
        // Se não encontrar nenhum registo, devolve erro 404 (não encontrado)
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Código postal não encontrado' });
        }
        
        // Devolve o primeiro (e único) resultado em JSON
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao pesquisar código postal' });
    }
});

// ================================================================
// EXPORTAÇÃO DO ROUTER
// ================================================================
// Exporta o router para ser utilizado no index.js (montado em /locations)
module.exports = router;