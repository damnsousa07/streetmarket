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
/**
 * POST /register
 * Cria uma nova conta de utilizador com os dados fornecidos.
 * Envia um código de verificação por email.
 * 
 * Body esperado:
 *   primeiro_nome, ultimo_nome, email, password, morada, codigo_postal, 
 *   telefone, distrito, concelho
 * 
 * Respostas:
 *   201 – Registo efetuado com sucesso (envio de código)
 *   400 – Dados inválidos ou faltando
 *   500 – Erro interno
 */
router.post('/register', async (req, res) => {
    // Extrai os campos do corpo da requisição
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
    // Verifica se todos os campos essenciais foram fornecidos (localidade removida)
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

    try {
        // ----- VERIFICA SE O EMAIL JÁ ESTÁ REGISTADO -----
        const [existing] = await db.promise().query('SELECT user_id FROM Users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email já registado!' });
        }

        // ----- GERAÇÃO DE DADOS PARA O REGISTO -----
        const hashedPassword = await bcrypt.hash(password, saltRounds);  // Hash da password
        const nomeCompleto = `${primeiro_nome} ${ultimo_nome}`;          // Nome completo concatenado
        const codigoVerificacao = crypto.randomInt(100000, 999999).toString(); // Código de 6 dígitos
        const expiracao = new Date(Date.now() + 15 * 60000);              // Expira em 15 minutos

        // ----- INSERÇÃO NA BASE DE DADOS -----
        // Nota: a coluna 'localidade' foi removida; usamos distrito e concelho.
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

        // Resposta de sucesso
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
/**
 * POST /verify-email
 * Verifica o código enviado por email e ativa a conta.
 * 
 * Body esperado:
 *   email, codigo
 * 
 * Respostas:
 *   200 – Conta verificada com sucesso
 *   400 – Código inválido, expirado ou conta já verificada
 *   404 – Utilizador não encontrado
 *   500 – Erro interno
 */
router.post('/verify-email', async (req, res) => {
    const { email, codigo } = req.body;
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

        // Verifica se já está verificado
        if (user.email_verificado) {
            return res.status(400).json({ message: 'Email já verificado.' });
        }

        // Verifica o código
        if (user.codigo_verificacao !== codigo) {
            return res.status(400).json({ message: 'Código inválido.' });
        }

        // Verifica se o código não expirou
        if (new Date() > new Date(user.codigo_expiracao)) {
            return res.status(400).json({ message: 'Código expirado. Solicita um novo.' });
        }

        // Atualiza o utilizador: marca como verificado e limpa os campos de código
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
/**
 * POST /resend-verification
 * Gera um novo código de verificação e envia por email para contas não verificadas.
 * 
 * Body esperado:
 *   email
 * 
 * Respostas:
 *   200 – Novo código enviado
 *   404 – Utilizador não encontrado ou já verificado
 *   500 – Erro interno
 */
router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email é obrigatório.' });
    }

    try {
        // Procura utilizador não verificado
        const [users] = await db.promise().query(
            'SELECT user_id, primeiro_nome FROM Users WHERE email = ? AND email_verificado = FALSE',
            [email]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilizador não encontrado ou já verificado.' });
        }

        // Gera novo código e nova data de expiração
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

// =======================
// LOGIN
// =======================
/**
 * POST /login
 * Autentica um utilizador com email e password, apenas se a conta estiver verificada.
 * 
 * Body esperado:
 *   email, password
 * 
 * Respostas:
 *   200 – Dados do utilizador (sem password)
 *   400 – Campos em falta
 *   401 – Credenciais incorretas ou conta não verificada
 *   500 – Erro interno
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Preenche todos os campos!' });
    }

    try {
        // Busca o utilizador pelo email (inclui password e estado de verificação)
        const [rows] = await db.promise().query(
            'SELECT user_id, nome, email, password, tipo, email_verificado FROM Users WHERE email = ?',
            [email]
        );
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Email ou password incorretos!' });
        }
        const user = rows[0];

        // Impede login se a conta não estiver verificada
        if (!user.email_verificado) {
            return res.status(401).json({ message: 'Conta não verificada. Verifica o teu email antes de fazer login.' });
        }

        // Compara a password fornecida com o hash guardado
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Email ou password incorretos!' });
        }

        // Responde com os dados do utilizador (NUNCA enviar a password)
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
/**
 * POST /forgot-password
 * Gera um token de redefinição e envia um email com o link para o utilizador.
 * 
 * Body esperado:
 *   email
 * 
 * Respostas:
 *   200 – Email enviado (ou mensagem genérica por segurança)
 *   500 – Erro interno
 */
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email é obrigatório.' });
    }

    try {
        // Busca o utilizador pelo email
        const [users] = await db.promise().query(
            'SELECT user_id, nome FROM Users WHERE email = ?',
            [email]
        );

        // Por segurança, não revelamos se o email existe ou não
        if (users.length === 0) {
            return res.status(200).json({ message: 'Se o email existir, enviaremos as instruções.' });
        }

        const user = users[0];

        // Gera um token aleatório (32 bytes em hex)
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 15 * 60000); // 15 minutos

        // Guarda o token e a expiração na base de dados
        await db.promise().query(
            'UPDATE Users SET reset_token = ?, reset_expires = ? WHERE user_id = ?',
            [token, expires, user.user_id]
        );

        // Constrói o link para o frontend
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset-password/${token}`;

        // Envia o email com o link
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
/**
 * POST /reset-password
 * Define uma nova password utilizando um token válido.
 * 
 * Body esperado:
 *   token, newPassword
 * 
 * Respostas:
 *   200 – Password atualizada com sucesso
 *   400 – Token inválido ou expirado
 *   500 – Erro interno
 */
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token e nova password são obrigatórios.' });
    }

    // Validação básica da nova password (mínimo 6 caracteres)
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'A password deve ter pelo menos 6 caracteres.' });
    }

    try {
        // Busca o utilizador com o token válido (não expirado)
        const [users] = await db.promise().query(
            'SELECT user_id FROM Users WHERE reset_token = ? AND reset_expires > NOW()',
            [token]
        );
        if (users.length === 0) {
            return res.status(400).json({ message: 'Token inválido ou expirado.' });
        }

        const user = users[0];

        // Hash da nova password
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Atualiza a password e limpa o token
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