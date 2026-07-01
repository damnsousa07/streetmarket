// ================================================================
// NOTIFICATIONS.JS – Rotas públicas para notificações dos utilizadores
// ================================================================
// Este ficheiro contém as rotas para criar e listar notificações
// dos utilizadores. As notificações são geradas pelo sistema
// quando o estado de uma encomenda é atualizado.
// ================================================================

// Importação dos módulos necessários
const express = require('express');        // Framework para construir a API
const router = express.Router();           // Cria um router para definir as rotas
const db = require('../db');               // Ligação à base de dados MySQL

// ================================================================
// ROTA: Criar uma nova notificação (usado internamente pelo sistema)
// ================================================================

// POST /notifications – Cria uma nova notificação para um utilizador
// Esta rota é chamada internamente pelo sistema (ex: quando uma encomenda muda de estado)
// Não é necessário autenticação porque é usada apenas pelo backend.
router.post('/', async (req, res) => {
  // Extrai os dados do corpo da requisição
  const { user_id, tipo, conteudo } = req.body;

  // Validação dos campos obrigatórios
  if (user_id == null || !tipo || !conteudo) {
    return res.status(400).json({ message: 'Preenche todos os campos!' });
  }

  try {
    const uid = Number(user_id);

    // Verifica se o utilizador existe (consulta leve, apenas para existência)
    // Usa 'SELECT 1' para verificar existência sem carregar todos os dados
    const [users] = await db.promise().query(
      'SELECT 1 FROM Users WHERE user_id = ? LIMIT 1',
      [uid]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilizador não encontrado!' });
    }

    // Insere a notificação na base de dados com a data atual
    // 'NOW()' insere a data/hora atual do servidor (formato TIMESTAMP)
    await db.promise().query(
      'INSERT INTO Notifications (user_id, tipo, conteudo, data_envio) VALUES (?, ?, ?, NOW())',
      [uid, tipo, conteudo]
    );

    return res.status(201).json({ message: 'Notificação criada com sucesso!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// ================================================================
// ROTA: Listar notificações de um utilizador
// ================================================================

// GET /notifications/:user_id – Retorna todas as notificações de um utilizador
// Parâmetro: user_id (ID do utilizador)
// Esta rota é utilizada na página de notificações do utilizador (/notifications)
// para mostrar os alertas sobre as suas encomendas.
// Limite máximo de 200 notificações para evitar sobrecarga.
router.get('/:user_id', async (req, res) => {
  const uid = Number(req.params.user_id);  // Converte o parâmetro para número

  // Validação do user_id (deve ser um número válido e positivo)
  if (!Number.isFinite(uid) || uid <= 0) {
    return res.status(400).json({ message: 'user_id inválido.' });
  }

  try {
    // Verifica se o utilizador existe
    const [users] = await db.promise().query(
      'SELECT 1 FROM Users WHERE user_id = ? LIMIT 1',
      [uid]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilizador não encontrado!' });
    }

    // Busca as notificações do utilizador, ordenadas da mais recente para a mais antiga
    // Limite de 200 notificações para manter a performance
    const [notifications] = await db.promise().query(
      'SELECT * FROM Notifications WHERE user_id = ? ORDER BY data_envio DESC LIMIT 200',
      [uid]
    );

    // Devolve a lista de notificações em JSON
    return res.status(200).json(notifications);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// ================================================================
// EXPORTAÇÃO DO ROUTER
// ================================================================
// Exporta o router para ser utilizado no index.js (montado em /notifications)
module.exports = router;