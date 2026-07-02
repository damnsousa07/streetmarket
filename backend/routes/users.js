// ================================================================
// USERS.JS – Rotas de autenticacao
// ================================================================
// Contem todas as rotas relacionadas com autenticacao:
// Registo (com verificacao por email), Login, Verificacao de email,
// Reenvio de codigo, Recuperacao de password com cooldown de 1 minuto
// e Redefinicao de password com token.
// ================================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../services/emailservice');

const saltRounds = 10;

// ================================================================
// FUNCOES DE COOLDOWN (com base de dados)
// ================================================================

// Verifica se o email esta em cooldown (1 minuto)
// Retorna true se o ultimo pedido foi ha menos de 60 segundos
async function isInCooldown(email) {
    const [rows] = await db.promise().query(
        'SELECT forgot_password_cooldown FROM Users WHERE email = ?',
        [email]
    );
    if (rows.length === 0) return false;
    const cooldownTime = rows[0].forgot_password_cooldown;
    if (!cooldownTime) return false;
    const now = new Date();
    const diff = (now - new Date(cooldownTime)) / 1000;
    return diff < 60;
}

// Atualiza o timestamp do cooldown na base de dados
// Guarda a data/hora atual para controlar o tempo de espera
async function setCooldown(email) {
    const now = new Date();
    await db.promise().query(
        'UPDATE Users SET forgot_password_cooldown = ? WHERE email = ?',
        [now, email]
    );
}

// ================================================================
// ROTA: Registo de novo utilizador
// ================================================================

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

    // Validacao de campos obrigatorios
    if (!primeiro_nome || !ultimo_nome || !email || !password || !morada || !codigo_postal || !telefone || !distrito || !concelho) {
        return res.status(400).json({ message: 'Todos os campos sao obrigatorios!' });
    }

    // Validacao do formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Email invalido.' });
    }

    // Validacao do numero de telefone (9 digitos, comeca por 9)
    const telefoneRegex = /^[9][0-9]{8}$/;
    if (!telefoneRegex.test(telefone)) {
        return res.status(400).json({ message: 'Numero de telefone invalido (9 digitos, comeca por 9).' });
    }

    // Validacao do codigo postal (formato XXXX-XXX)
    const cpRegex = /^\d{4}-\d{3}$/;
    if (!cpRegex.test(codigo_postal)) {
        return res.status(400).json({ message: 'Codigo postal invalido (formato XXXX-XXX).' });
    }

    // Validacao da password (minimo 8 caracteres)
    if (!password || password.length < 8) {
        return res.status(400).json({ message: 'A palavra-passe deve ter pelo menos 8 caracteres.' });
    }

    try {
        // Verifica se o email ja esta registado
        const [existing] = await db.promise().query('SELECT user_id FROM Users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email ja registado!' });
        }

        // Verifica se o telefone ja esta registado
        const [telefoneExists] = await db.promise().query(
            'SELECT user_id FROM Users WHERE telefone = ?',
            [telefone]
        );
        if (telefoneExists.length > 0) {
            return res.status(400).json({ message: 'Este numero de telemovel ja esta registado.' });
        }

        // Encripta a password com bcrypt (salt rounds = 10)
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const nomeCompleto = `${primeiro_nome} ${ultimo_nome}`;
        
        // Gera codigo de verificacao de 6 digitos e define expiracao para 15 minutos
        const codigoVerificacao = crypto.randomInt(100000, 999999).toString();
        const expiracao = new Date(Date.now() + 15 * 60000);

        // Insere o novo utilizador na base de dados
        await db.promise().query(
            `INSERT INTO Users 
            (nome, primeiro_nome, ultimo_nome, email, password, morada, codigo_postal, telefone, 
             distrito, concelho, email_verificado, codigo_verificacao, codigo_expiracao, tipo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nomeCompleto, primeiro_nome, ultimo_nome, email, hashedPassword,
                morada, codigo_postal, telefone,
                distrito, concelho, false, codigoVerificacao, expiracao, 'Utilizador']
        );

        // Envia email com codigo de verificacao
        await sendVerificationEmail(email, primeiro_nome, codigoVerificacao);

        res.status(201).json({
            message: 'Registo efetuado! Verifica o teu email com o codigo enviado para ativar a conta.'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// ================================================================
// ROTA: Verificacao de email
// ================================================================

router.post('/verify-email', async (req, res) => {
    const { email, codigo } = req.body;

    if (!email || !codigo) {
        return res.status(400).json({ message: 'Email e codigo sao obrigatorios.' });
    }

    try {
        // Busca utilizador pelo email
        const [users] = await db.promise().query(
            'SELECT user_id, codigo_verificacao, codigo_expiracao, email_verificado FROM Users WHERE email = ?',
            [email]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilizador nao encontrado.' });
        }

        const user = users[0];

        // Verifica se o email ja foi verificado
        if (user.email_verificado) {
            return res.status(400).json({ message: 'Email ja verificado.' });
        }
        // Verifica se o codigo esta correto
        if (user.codigo_verificacao !== codigo) {
            return res.status(400).json({ message: 'Codigo invalido.' });
        }
        // Verifica se o codigo nao expirou
        if (new Date() > new Date(user.codigo_expiracao)) {
            return res.status(400).json({ message: 'Codigo expirado. Solicita um novo.' });
        }

        // Atualiza o utilizador como verificado e limpa codigos
        await db.promise().query(
            'UPDATE Users SET email_verificado = TRUE, codigo_verificacao = NULL, codigo_expiracao = NULL WHERE user_id = ?',
            [user.user_id]
        );

        res.json({ message: 'Email verificado com sucesso! Ja podes fazer login.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro na verificacao.' });
    }
});

// ================================================================
// ROTA: Reenviar codigo de verificacao
// ================================================================

router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email e obrigatorio.' });
    }

    try {
        // Busca utilizador nao verificado
        const [users] = await db.promise().query(
            'SELECT user_id, primeiro_nome FROM Users WHERE email = ? AND email_verificado = FALSE',
            [email]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilizador nao encontrado ou ja verificado.' });
        }

        // Gera novo codigo e nova expiracao
        const novoCodigo = crypto.randomInt(100000, 999999).toString();
        const novaExpiracao = new Date(Date.now() + 15 * 60000);

        await db.promise().query(
            'UPDATE Users SET codigo_verificacao = ?, codigo_expiracao = ? WHERE user_id = ?',
            [novoCodigo, novaExpiracao, users[0].user_id]
        );

        // Envia novo codigo por email
        await sendVerificationEmail(email, users[0].primeiro_nome, novoCodigo);

        res.json({ message: 'Novo codigo enviado para o teu email.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao reenviar codigo.' });
    }
});

// ================================================================
// ROTA: Login
// ================================================================

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Preenche todos os campos!' });
    }

    try {
        // Busca utilizador pelo email
        const [rows] = await db.promise().query(
            'SELECT user_id, nome, email, password, tipo, email_verificado FROM Users WHERE email = ?',
            [email]
        );
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Email ou password incorretos!' });
        }

        const user = rows[0];

        // Verifica se o email foi verificado
        if (!user.email_verificado) {
            return res.status(401).json({ message: 'Conta nao verificada. Verifica o teu email antes de fazer login.' });
        }

        // Verifica a password com bcrypt
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Email ou password incorretos!' });
        }

        // Retorna dados do utilizador (sem token JWT - gerado no frontend)
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

// ================================================================
// ROTA: Esqueci-me da password (com cooldown guardado na BD)
// ================================================================

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email e obrigatorio.' });
    }

    try {
        // Verifica cooldown na base de dados
        const inCooldown = await isInCooldown(email);
        if (inCooldown) {
            const [rows] = await db.promise().query(
                'SELECT forgot_password_cooldown FROM Users WHERE email = ?',
                [email]
            );
            const cooldownTime = rows[0].forgot_password_cooldown;
            const now = new Date();
            const elapsed = (now - new Date(cooldownTime)) / 1000;
            const remainingSeconds = Math.ceil(60 - elapsed);
            return res.status(429).json({
                message: `Aguarde ${remainingSeconds} segundos antes de solicitar novamente.`,
                cooldown: true,
                remainingSeconds
            });
        }

        // Busca utilizador pelo email
        const [users] = await db.promise().query(
            'SELECT user_id, nome FROM Users WHERE email = ?',
            [email]
        );

        // Verifica se o email existe (mesmo que nao exista, nao revelamos para seguranca)
        if (users.length === 0) {
            return res.status(404).json({ message: 'Email inexistente.' });
        }

        // Atualiza o cooldown na BD
        await setCooldown(email);

        const user = users[0];

        // Gera token de redefinicao e define expiracao de 15 minutos
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 15 * 60000);

        await db.promise().query(
            'UPDATE Users SET reset_token = ?, reset_expires = ? WHERE user_id = ?',
            [token, expires, user.user_id]
        );

        // Envia email com link de redefinicao
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset-password/${token}`;

        await sendResetPasswordEmail(email, user.nome, resetLink);

        res.status(200).json({ message: 'Email enviado com sucesso! Verifica a tua caixa de entrada.' });
    } catch (err) {
        console.error('Erro em forgot-password:', err);
        res.status(500).json({ message: 'Erro ao processar pedido.' });
    }
});

// ================================================================
// ROTA: Redefinir password (com token)
// ================================================================

router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token e nova password sao obrigatorios.' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ message: 'A password deve ter pelo menos 8 caracteres.' });
    }

    try {
        // Verifica se o token e valido e nao expirou
        const [users] = await db.promise().query(
            'SELECT user_id FROM Users WHERE reset_token = ? AND reset_expires > NOW()',
            [token]
        );
        if (users.length === 0) {
            return res.status(400).json({ message: 'Token invalido ou expirado.' });
        }

        const user = users[0];
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Atualiza password e limpa token de redefinicao
        await db.promise().query(
            'UPDATE Users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE user_id = ?',
            [hashedPassword, user.user_id]
        );

        res.json({ message: 'Password atualizada com sucesso.' });
    } catch (err) {
        console.error('Erro em reset-password:', err);
        res.status(500).json({ message: 'Erro ao redefinir password.' });
    }
});

// ================================================================
// EXPORTACAO DO ROUTER
// ================================================================

module.exports = router;