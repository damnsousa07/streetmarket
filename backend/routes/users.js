// ================================================================
// AUTH.JS – Rotas de autenticação
// ================================================================
// Este ficheiro contém todas as rotas relacionadas com autenticação:
// - Registo de utilizadores (com verificação por email)
// - Login
// - Verificação de email
// - Reenvio de código de verificação
// - Recuperação de password (esqueci-me da password)
// - Redefinição de password com token
// ================================================================

// Importação dos módulos necessários
const express = require('express');        // Framework para construir a API
const router = express.Router();           // Cria um router para definir as rotas
const bcrypt = require('bcrypt');          // Biblioteca para hashing de passwords
const crypto = require('crypto');          // Biblioteca para gerar tokens e códigos aleatórios
const db = require('../db');               // Ligação à base de dados MySQL
const { sendVerificationEmail, sendResetPasswordEmail } = require('../services/emailservice'); // Serviço de email

// Número de rounds para o salt do bcrypt (quanto maior, mais seguro, mas mais lento)
const saltRounds = 10;

// ================================================================
// ROTA: Registo de novo utilizador
// ================================================================

// POST /auth/register – Cria uma nova conta de utilizador
// Todos os campos são obrigatórios.
// Envia um código de verificação por email.
// O utilizador fica com email_verificado = FALSE até confirmar o código.
router.post('/register', async (req, res) => {
    // Extrai os dados do corpo da requisição
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

    // ----- 1. VALIDAÇÃO DOS CAMPOS OBRIGATÓRIOS -----
    if (!primeiro_nome || !ultimo_nome || !email || !password || !morada || !codigo_postal || !telefone || !distrito || !concelho) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios!' });
    }

    // Validação do formato do email (expressão regular simples)
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

    // Validação da password (mínimo 8 caracteres)
    if (!password || password.length < 8) {
        return res.status(400).json({ message: 'A palavra-passe deve ter pelo menos 8 caracteres.' });
    }

    try {
        // ----- 2. VERIFICA SE O EMAIL JÁ ESTÁ REGISTADO -----
        const [existing] = await db.promise().query('SELECT user_id FROM Users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email já registado!' });
        }

        // ----- 3. VERIFICA SE O TELEFONE JÁ ESTÁ REGISTADO -----
        const [telefoneExists] = await db.promise().query(
            'SELECT user_id FROM Users WHERE telefone = ?',
            [telefone]
        );
        if (telefoneExists.length > 0) {
            return res.status(400).json({ message: 'Este número de telemóvel já está registado.' });
        }

        // ----- 4. GERAÇÃO DE DADOS PARA O REGISTO -----
        const hashedPassword = await bcrypt.hash(password, saltRounds); // Hash da password
        const nomeCompleto = `${primeiro_nome} ${ultimo_nome}`;          // Junta o nome completo
        const codigoVerificacao = crypto.randomInt(100000, 999999).toString(); // Código de 6 dígitos
        const expiracao = new Date(Date.now() + 15 * 60000);             // Expira em 15 minutos

        // ----- 5. INSERÇÃO NA BASE DE DADOS -----
        await db.promise().query(
            `INSERT INTO Users 
            (nome, primeiro_nome, ultimo_nome, email, password, morada, codigo_postal, telefone, 
             distrito, concelho, email_verificado, codigo_verificacao, codigo_expiracao, tipo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nomeCompleto, primeiro_nome, ultimo_nome, email, hashedPassword,
                morada, codigo_postal, telefone,
                distrito, concelho, false, codigoVerificacao, expiracao, 'Utilizador']
        );

        // ----- 6. ENVIO DO EMAIL DE VERIFICAÇÃO -----
        await sendVerificationEmail(email, primeiro_nome, codigoVerificacao);

        res.status(201).json({
            message: 'Registo efetuado! Verifica o teu email com o código enviado para ativar a conta.'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// ================================================================
// ROTA: Verificação de email (código)
// ================================================================

// POST /auth/verify-email – Confirma o email com o código recebido
// O código tem validade de 15 minutos.
router.post('/verify-email', async (req, res) => {
    const { email, codigo } = req.body;

    // Validação: ambos os campos são obrigatórios
    if (!email || !codigo) {
        return res.status(400).json({ message: 'Email e código são obrigatórios.' });
    }

    try {
        // Busca o utilizador pelo email
        const [users] = await db.promise().query(
            'SELECT user_id, codigo_verificacao, codigo_expiracao, email_verificado FROM Users WHERE email = ?',
            [email]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }

        const user = users[0];

        // Verifica se o email já foi verificado
        if (user.email_verificado) {
            return res.status(400).json({ message: 'Email já verificado.' });
        }

        // Verifica se o código está correto
        if (user.codigo_verificacao !== codigo) {
            return res.status(400).json({ message: 'Código inválido.' });
        }

        // Verifica se o código expirou
        if (new Date() > new Date(user.codigo_expiracao)) {
            return res.status(400).json({ message: 'Código expirado. Solicita um novo.' });
        }

        // Atualiza o utilizador: email_verificado = TRUE, remove código
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

// ================================================================
// ROTA: Reenviar código de verificação
// ================================================================

// POST /auth/resend-verification – Envia um novo código para o email
// Útil se o utilizador não recebeu ou perdeu o código anterior.
router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email é obrigatório.' });
    }

    try {
        // Busca o utilizador (apenas se NÃO estiver verificado)
        const [users] = await db.promise().query(
            'SELECT user_id, primeiro_nome FROM Users WHERE email = ? AND email_verificado = FALSE',
            [email]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilizador não encontrado ou já verificado.' });
        }

        // Gera novo código e nova expiração
        const novoCodigo = crypto.randomInt(100000, 999999).toString();
        const novaExpiracao = new Date(Date.now() + 15 * 60000);

        // Atualiza na base de dados
        await db.promise().query(
            'UPDATE Users SET codigo_verificacao = ?, codigo_expiracao = ? WHERE user_id = ?',
            [novoCodigo, novaExpiracao, users[0].user_id]
        );

        // Envia o novo código por email
        await sendVerificationEmail(email, users[0].primeiro_nome, novoCodigo);

        res.json({ message: 'Novo código enviado para o teu email.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao reenviar código.' });
    }
});

// ================================================================
// ROTA: Login
// ================================================================

// POST /auth/login – Autentica o utilizador e devolve os dados da sessão
// Verifica se o email está verificado antes de permitir o login.
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Validação: ambos os campos são obrigatórios
    if (!email || !password) {
        return res.status(400).json({ message: 'Preenche todos os campos!' });
    }

    try {
        // Busca o utilizador pelo email
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
            return res.status(401).json({ message: 'Conta não verificada. Verifica o teu email antes de fazer login.' });
        }

        // Verifica a password (bcrypt.compare)
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Email ou password incorretos!' });
        }

        // Devolve os dados do utilizador (sem a password)
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
// ROTA: Esqueci-me da password (enviar email com link)
// ================================================================

// POST /auth/forgot-password – Envia um email com link para redefinir a password
// O link contém um token que expira em 15 minutos.
// Por segurança, a resposta é sempre a mesma, mesmo que o email não exista.
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email é obrigatório.' });
    }

    try {
        // Busca o utilizador pelo email (apenas nome e user_id)
        const [users] = await db.promise().query(
            'SELECT user_id, nome FROM Users WHERE email = ?',
            [email]
        );

        // Se não encontrar, responde com sucesso (por segurança)
        if (users.length === 0) {
            return res.status(200).json({ message: 'Se o email existir, enviaremos as instruções.' });
        }

        const user = users[0];

        // Gera um token aleatório (32 bytes em hexadecimal)
        const token = crypto.randomBytes(32).toString('hex');
        // Define a expiração para 15 minutos
        const expires = new Date(Date.now() + 15 * 60000);

        // Guarda o token na base de dados
        await db.promise().query(
            'UPDATE Users SET reset_token = ?, reset_expires = ? WHERE user_id = ?',
            [token, expires, user.user_id]
        );

        // Constrói o link de redefinição (para o frontend)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset-password/${token}`;

        // Envia o email com o link
        await sendResetPasswordEmail(email, user.nome, resetLink);

        // Resposta de sucesso (mesmo que não tenha encontrado o email)
        res.status(200).json({ message: 'Se o email existir, enviaremos as instruções.' });
    } catch (err) {
        console.error('❌ Erro em forgot-password:', err);
        res.status(500).json({ message: 'Erro ao processar pedido.' });
    }
});

// ================================================================
// ROTA: Redefinir password (com token)
// ================================================================

// POST /auth/reset-password – Atualiza a password com o token recebido
// O token deve ser válido e não expirado.
// A nova password deve ter pelo menos 8 caracteres.
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    // Validação: ambos são obrigatórios
    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token e nova password são obrigatórios.' });
    }

    // Validação: password com mínimo 8 caracteres
    if (newPassword.length < 8) {
        return res.status(400).json({ message: 'A password deve ter pelo menos 8 caracteres.' });
    }

    try {
        // Verifica se o token existe e não expirou (reset_expires > NOW())
        const [users] = await db.promise().query(
            'SELECT user_id FROM Users WHERE reset_token = ? AND reset_expires > NOW()',
            [token]
        );
        if (users.length === 0) {
            return res.status(400).json({ message: 'Token inválido ou expirado.' });
        }

        const user = users[0];

        // Gera o hash da nova password
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Atualiza a password e remove o token
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

// ================================================================
// EXPORTAÇÃO DO ROUTER
// ================================================================
// Exporta o router para ser utilizado no index.js (montado em /auth)
module.exports = router;