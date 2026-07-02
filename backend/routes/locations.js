// ================================================================
// LOCATIONS.JS – Rotas de localizacoes
// ================================================================
// Contem as rotas para consultar dados geograficos (distritos, concelhos
// e codigos postais) da base de dados. Rotas publicas sem autenticacao.
// ================================================================

const express = require('express');
const router = express.Router();
const db = require('../db');

// ================================================================
// ROTA: Listar todos os distritos
// ================================================================

// GET /locations/districts – Retorna todos os distritos ordenados por nome
// Utilizada para popular dropdowns de selecao de distrito no frontend.
router.get('/districts', async (req, res) => {
    try {
        // Seleciona ID e nome de todos os distritos, ordenados alfabeticamente
        // A ordenacao por nome melhora a experiencia do utilizador nos dropdowns
        const [rows] = await db.promise().query('SELECT id, nome FROM Districts ORDER BY nome');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao obter distritos' });
    }
});

// ================================================================
// ROTA: Listar concelhos de um distrito especifico
// ================================================================

// GET /locations/municipalities/:districtId – Retorna os concelhos de um distrito
// Parametro: districtId (ID do distrito)
// Utilizada para dropdowns de concelho dependentes do distrito selecionado.
router.get('/municipalities/:districtId', async (req, res) => {
    const { districtId } = req.params;
    
    try {
        // Seleciona ID e nome dos concelhos cujo distrito_id coincide com o parametro
        // Ordena por nome para consistencia na apresentacao
        const [rows] = await db.promise().query(
            'SELECT id, nome FROM Municipalities WHERE distrito_id = ? ORDER BY nome',
            [districtId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao obter concelhos' });
    }
});

// ================================================================
// ROTA: Pesquisar informacoes de um codigo postal
// ================================================================

// GET /locations/postal-code/:code – Retorna distrito e concelho de um codigo postal
// Parametro: code (codigo postal)
// Utilizada para autopreenchimento de localizacao com base no codigo postal.
router.get('/postal-code/:code', async (req, res) => {
    const { code } = req.params;
    
    try {
        // Query com JOINs para obter distrito e concelho a partir do codigo postal
        // As tabelas PostalCodes, Municipalities e Districts estao relacionadas
        const [rows] = await db.promise().query(
            `SELECT d.nome AS district, m.nome AS municipality 
             FROM PostalCodes pc
             JOIN Municipalities m ON pc.municipality_id = m.id
             JOIN Districts d ON pc.district_id = d.id
             WHERE pc.codigo = ?`,
            [code]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Codigo postal nao encontrado' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao pesquisar codigo postal' });
    }
});

// ================================================================
// EXPORTACAO DO ROUTER
// ================================================================
module.exports = router;