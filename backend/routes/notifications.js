// ============================================================
// ROTAS DE NOTIFICAÇÕES (públicas, para utilizadores)
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /notifications – Criar uma nova notificação (usado internamente pelo sistema)
router.post('/', async (req, res) => {
  const { user_id, tipo, conteudo } = req.body;

  // Validação dos campos obrigatórios
  if (user_id == null || !tipo || !conteudo) {
    return res.status(400).json({ message: 'Preenche todos os campos!' });
  }

  try {
    const uid = Number(user_id);

    // Verifica se o utilizador existe (consulta leve, apenas para existência)
    const [users] = await db.promise().query(
      'SELECT 1 FROM Users WHERE user_id = ? LIMIT 1',
      [uid]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilizador não encontrado!' });
    }

    // Insere a notificação com a data atual (NOW())
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

// GET /notifications/:user_id – Listar todas as notificações de um utilizador (até 200)
router.get('/:user_id', async (req, res) => {
  const uid = Number(req.params.user_id);

  // Validação do user_id (deve ser número)
  if (!Number.isFinite(uid)) {
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

module.exports = router;