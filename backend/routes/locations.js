// Importa o módulo express para criar rotas
const express = require('express');
// Cria um objeto router para definir as rotas deste ficheiro
const router = express.Router();
// Importa a ligação à base de dados (MySQL)
const db = require('../db');

// Rota GET para listar todos os distritos (pública)
router.get('/districts', async (req, res) => {
    try {
        // Query SQL para buscar todos os distritos, ordenados por nome (A → Z)
        const [rows] = await db.promise().query('SELECT id, nome FROM Districts ORDER BY nome');
        // Devolve os dados em formato JSON com status 200 (OK)
        res.json(rows);
    } catch (err) {
        // Regista o erro no console do servidor para depuração
        console.error(err);
        // Devolve erro 500 com mensagem genérica para o cliente
        res.status(500).json({ message: 'Erro ao obter distritos' });
    }
});

// Rota GET para listar os concelhos (municipalities) de um determinado distrito
// Parâmetro da URL: districtId (o ID do distrito)
router.get('/municipalities/:districtId', async (req, res) => {
    const { districtId } = req.params;
    try {
        // Query SQL para buscar concelhos cujo distrito_id coincide com o parâmetro, ordenados por nome
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

// Rota GET para pesquisar informações de um código postal (opcional, se a tabela PostalCodes existir)
// Parâmetro da URL: code (o código postal)
router.get('/postal-code/:code', async (req, res) => {
    const { code } = req.params;
    try {
        // Query com JOIN para obter o distrito e concelho a partir do código postal
        const [rows] = await db.promise().query(
            `SELECT d.nome AS district, m.nome AS municipality 
             FROM PostalCodes pc
             JOIN Municipalities m ON pc.municipality_id = m.id
             JOIN Districts d ON pc.district_id = d.id
             WHERE pc.codigo = ?`,
            [code]
        );
        // Se não encontrar nenhum registo, devolve erro 404
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Código postal não encontrado' });
        }
        // Devolve o primeiro (e único) resultado
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao pesquisar código postal' });
    }
});

// Exporta o router para ser usado no ficheiro principal (index.js)
module.exports = router;