/**
 * auth.js
 * Rotas de autenticação (registo, verificação, login, recuperação de password) para a StreetMarket.
 * Utiliza bcrypt para hash de passwords, e emailservice para envio de códigos e emails de recuperação.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../services/emailservice');

// Número de rounds para o salt do bcrypt (segurança)
const saltRounds = 10;

// =======================
// REGISTO DE UTILIZADOR (sem localidade)
// =======================
router.post('/register', async (req, res) => {
    const {
        primeiro_nome,
        ultimo_nome,
        email,
        password,
        morada,
        codigo_postal,
        telefone,
        distrito,
        concelho
    } = req.body;

    // ----- VALIDAÇÃO DOS CAMPOS OBRIGATÓRIOS -----
    if (!primeiro_nome || !ultimo_nome || !email || !password || !morada || !codigo_postal || !telefone || !distrito || !concelho) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios!' });
    }

    // Validação do formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Email inválido.' });
    }

    // Validação do número de telefone (9 dígitos, começa por 9)
    const telefoneRegex = /^[9][0-9]{8}$/;
    if (!telefoneRegex.test(telefone)) {
        return res.status(400).json({ message: 'Número de telefone inválido (9 dígitos, começa por 9).' });
    }

    // Validação do código postal (formato XXXX-XXX)
    const cpRegex = /^\d{4}-\d{3}$/;
    if (!cpRegex.test(codigo_postal)) {
        return res.status(400).json({ message: 'Código postal inválido (formato XXXX-XXX).' });
    }

    // ----- VALIDAÇÃO DA PASSWORD (mínimo 8 caracteres) -----
    if (!password || password.length < 8) {
        return res.status(400).json({ message: 'A palavra-passe deve ter pelo menos 8 caracteres.' });
    }

    try {
        // ----- VERIFICA SE O EMAIL JÁ ESTÁ REGISTADO -----
        const [existing] = await db.promise().query('SELECT user_id FROM Users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email já registado!' });
        }

        // ----- VERIFICA SE O TELEFONE JÁ ESTÁ REGISTADO -----
        const [telefoneExists] = await db.promise().query(
            'SELECT user_id FROM Users WHERE telefone = ?',
            [telefone]
        );
        if (telefoneExists.length > 0) {
            return res.status(400).json({ message: 'Este número de telemóvel já está registado.' });
        }

        // ----- GERAÇÃO DE DADOS PARA O REGISTO -----
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const nomeCompleto = `${primeiro_nome} ${ultimo_nome}`;
        const codigoVerificacao = crypto.randomInt(100000, 999999).toString();
        const expiracao = new Date(Date.now() + 15 * 60000);

        // ----- INSERÇÃO NA BASE DE DADOS -----
        await db.promise().query(
            `INSERT INTO Users 
            (nome, primeiro_nome, ultimo_nome, email, password, morada, codigo_postal, telefone, 
             distrito, concelho, email_verificado, codigo_verificacao, codigo_expiracao, tipo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nomeCompleto, primeiro_nome, ultimo_nome, email, hashedPassword,
                morada, codigo_postal, telefone,
                distrito, concelho, false, codigoVerificacao, expiracao, 'Utilizador']
        );

        // ----- ENVIO DO EMAIL DE VERIFICAÇÃO -----
        await sendVerificationEmail(email, primeiro_nome, codigoVerificacao);

        res.status(201).json({
            message: 'Registo efetuado! Verifica o teu email com o código enviado para ativar a conta.'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// =======================
// VERIFICAÇÃO DE EMAIL
// =======================
router.post('/verify-email', async (req, res) => {
    const { email, codigo } = req.body;
    if (!email || !codigo) {
        return res.status(400).json({ message: 'Email e código são obrigatórios.' });
    }

    try {
        const [users] = await db.promise().query(
            'SELECT user_id, codigo_verificacao, codigo_expiracao, email_verificado FROM Users WHERE email = ?',
            [email]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }
        const user = users[0];

        if (user.email_verificado) {
            return res.status(400).json({ message: 'Email já verificado.' });
        }
        if (user.codigo_verificacao !== codigo) {
            return res.status(400).json({ message: 'Código inválido.' });
        }
        if (new Date() > new Date(user.codigo_expiracao)) {
            return res.status(400).json({ message: 'Código expirado. Solicita um novo.' });
        }

        await db.promise().query(
            'UPDATE Users SET email_verificado = TRUE, codigo_verificacao = NULL, codigo_expiracao = NULL WHERE user_id = ?',
            [user.user_id]
        );

        res.json({ message: 'Email verificado com sucesso! Já podes fazer login.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro na verificação.' });
    }
});

// =======================
// REENVIAR CÓDIGO DE VERIFICAÇÃO
// =======================
router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email é obrigatório.' });
    }

    try {
        const [users] = await db.promise().query(
            'SELECT user_id, primeiro_nome FROM Users WHERE email = ? AND email_verificado = FALSE',
            [email]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilizador não encontrado ou já verificado.' });
        }

        const novoCodigo = crypto.randomInt(100000, 999999).toString();
        const novaExpiracao = new Date(Date.now() + 15 * 60000);

        await db.promise().query(
            'UPDATE Users SET codigo_verificacao = ?, codigo_expiracao = ? WHERE user_id = ?',
            [novoCodigo, novaExpiracao, users[0].user_id]
        );

        await sendVerificationEmail(email, users[0].primeiro_nome, novoCodigo);

        res.json({ message: 'Novo código enviado para o teu email.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao reenviar código.' });
    }
});

// =======================
// LOGIN
// =======================
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Preenche todos os campos!' });
    }

    try {
        const [rows] = await db.promise().query(
            'SELECT user_id, nome, email, password, tipo, email_verificado FROM Users WHERE email = ?',
            [email]
        );
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Email ou password incorretos!' });
        }
        const user = rows[0];

        if (!user.email_verificado) {
            return res.status(401).json({ message: 'Conta não verificada. Verifica o teu email antes de fazer login.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Email ou password incorretos!' });
        }

        res.json({
            user_id: user.user_id,
            nome: user.nome,
            email: user.email,
            tipo: user.tipo,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// =======================
// ESQUECI-ME DA PASSWORD (enviar email com link)
// =======================
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email é obrigatório.' });
    }

    try {
        const [users] = await db.promise().query(
            'SELECT user_id, nome FROM Users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(200).json({ message: 'Se o email existir, enviaremos as instruções.' });
        }

        const user = users[0];

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 15 * 60000);

        await db.promise().query(
            'UPDATE Users SET reset_token = ?, reset_expires = ? WHERE user_id = ?',
            [token, expires, user.user_id]
        );

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset-password/${token}`;

        await sendResetPasswordEmail(email, user.nome, resetLink);

        res.status(200).json({ message: 'Se o email existir, enviaremos as instruções.' });
    } catch (err) {
        console.error('❌ Erro em forgot-password:', err);
        res.status(500).json({ message: 'Erro ao processar pedido.' });
    }
});

// =======================
// REDEFINIR PASSWORD (com token)
// =======================
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token e nova password são obrigatórios.' });
    }

    // VALIDAÇÃO: mínimo 8 caracteres
    if (newPassword.length < 8) {
        return res.status(400).json({ message: 'A password deve ter pelo menos 8 caracteres.' });
    }

    try {
        const [users] = await db.promise().query(
            'SELECT user_id FROM Users WHERE reset_token = ? AND reset_expires > NOW()',
            [token]
        );
        if (users.length === 0) {
            return res.status(400).json({ message: 'Token inválido ou expirado.' });
        }

        const user = users[0];
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await db.promise().query(
            'UPDATE Users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE user_id = ?',
            [hashedPassword, user.user_id]
        );

        res.json({ message: 'Password atualizada com sucesso.' });
    } catch (err) {
        console.error('❌ Erro em reset-password:', err);
        res.status(500).json({ message: 'Erro ao redefinir password.' });
    }
});

module.exports = router;