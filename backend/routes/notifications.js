// ================================================================
// NOTIFICATIONS.JS – Rotas publicas para notificacoes dos utilizadores
// ================================================================
// Contem as rotas para criar e listar notificacoes dos utilizadores.
// As notificacoes sao geradas pelo sistema quando o estado de uma encomenda e atualizado.
// ================================================================

const express = require('express');
const router = express.Router();
const db = require('../db');

// ================================================================
// ROTA: Criar uma nova notificacao
// ================================================================

// POST /notifications – Cria uma nova notificacao para um utilizador
// Esta rota e chamada internamente pelo sistema (ex: quando uma encomenda muda de estado)
// Nao requer autenticacao pois e usada apenas pelo backend.
router.post('/', async (req, res) => {
  const { user_id, tipo, conteudo } = req.body;

  // Validacao dos campos obrigatorios
  // Todos os campos sao necessarios para criar uma notificacao valida
  if (user_id == null || !tipo || !conteudo) {
    return res.status(400).json({ message: 'Preenche todos os campos!' });
  }

  try {
    const uid = Number(user_id);

    // Verifica se o utilizador existe usando 'SELECT 1'
    // Esta abordagem e mais leve que SELECT * porque nao carrega todos os dados
    const [users] = await db.promise().query(
      'SELECT 1 FROM Users WHERE user_id = ? LIMIT 1',
      [uid]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilizador nao encontrado!' });
    }

    // Insere a notificacao na base de dados com a data atual
    // NOW() insere a data/hora atual do servidor no formato TIMESTAMP
    await db.promise().query(
      'INSERT INTO Notifications (user_id, tipo, conteudo, data_envio) VALUES (?, ?, ?, NOW())',
      [uid, tipo, conteudo]
    );

    return res.status(201).json({ message: 'Notificacao criada com sucesso!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// ================================================================
// ROTA: Listar notificacoes de um utilizador
// ================================================================

// GET /notifications/:user_id – Retorna todas as notificacoes de um utilizador
// Parametro: user_id (ID do utilizador)
// Utilizada na pagina de notificacoes para mostrar alertas sobre encomendas.
router.get('/:user_id', async (req, res) => {
  const uid = Number(req.params.user_id);

  // Validacao do user_id: deve ser um numero positivo
  // Number.isFinite garante que nao e NaN, Infinity ou -Infinity
  if (!Number.isFinite(uid) || uid <= 0) {
    return res.status(400).json({ message: 'user_id invalido.' });
  }

  try {
    // Verifica se o utilizador existe
    const [users] = await db.promise().query(
      'SELECT 1 FROM Users WHERE user_id = ? LIMIT 1',
      [uid]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilizador nao encontrado!' });
    }

    // Busca as notificacoes ordenadas da mais recente para a mais antiga
    // Limite de 200 notificacoes para evitar sobrecarga e manter performance
    const [notifications] = await db.promise().query(
      'SELECT * FROM Notifications WHERE user_id = ? ORDER BY data_envio DESC LIMIT 200',
      [uid]
    );

    return res.status(200).json(notifications);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// ================================================================
// EXPORTACAO DO ROUTER
// ================================================================
module.exports = router;