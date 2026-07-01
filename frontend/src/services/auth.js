// ================================================================
// AUTH.JS – Serviço de autenticação (frontend)
// ================================================================
// Este ficheiro contém todas as funções para autenticação:
// - Login
// - Registo (com verificação de email)
// - Pedido de redefinição de password (esqueci-me da password)
// - Redefinição de password (com token)
// Comunica com a API de autenticação do backend (/users).
// Utiliza o cliente HTTP (Axios) configurado em client.js.
// ================================================================

// Importação do cliente HTTP (Axios) configurado
import { api } from '../api/client';

// ================================================================
// FUNÇÃO: Login
// ================================================================

// POST /users/login – Autentica o utilizador
// Parâmetros:
//   email - Email do utilizador
//   password - Password do utilizador
// Retorna: { user_id, nome, email, tipo }
export async function loginUser(email, password) {
    const res = await api.post('/users/login', { email, password });
    return res.data;
}

// ================================================================
// FUNÇÃO: Registo de novo utilizador
// ================================================================

// POST /users/register – Cria uma nova conta
// Todos os campos são obrigatórios.
// Após o registo, é enviado um código de verificação por email.
// Parâmetros:
//   primeiro_nome - Primeiro nome do utilizador
//   ultimo_nome - Último nome do utilizador
//   email - Email do utilizador (único)
//   password - Password (mínimo 8 caracteres)
//   morada - Morada completa
//   codigo_postal - Código postal (formato XXXX-XXX)
//   telefone - Número de telefone (9 dígitos, começa por 9)
//   distrito - Distrito de residência
//   concelho - Concelho de residência
export async function registerUser({
    primeiro_nome,
    ultimo_nome,
    email,
    password,
    morada,
    codigo_postal,
    telefone,
    distrito,
    concelho
}) {
    const payload = {
        primeiro_nome: primeiro_nome.trim(),
        ultimo_nome: ultimo_nome.trim(),
        email: email.trim(),
        password: password,
        morada: morada.trim(),
        codigo_postal: codigo_postal.trim(), // formato XXXX-XXX
        telefone: telefone.trim(),           // 9 dígitos, começa por 9
        distrito: distrito.trim(),
        concelho: concelho.trim()
    };

    const res = await api.post('/users/register', payload);
    return res.data; // { message: 'Registo efetuado! Verifica o teu email...' }
}

// ================================================================
// FUNÇÃO: Pedido de redefinição de password
// ================================================================

// POST /users/forgot-password – Envia um email com link para redefinir a password
// O link contém um token que expira em 15 minutos.
// Por segurança, a resposta é sempre a mesma, mesmo que o email não exista.
// Parâmetro: email - Email do utilizador
export async function requestPasswordReset(email) {
    const res = await api.post('/users/forgot-password', { email });
    return res.data; // { message: 'Se o email existir, enviaremos as instruções.' }
}

// ================================================================
// FUNÇÃO: Redefinir password (com token)
// ================================================================

// POST /users/reset-password – Atualiza a password com o token recebido
// O token deve ser válido e não expirado.
// A nova password deve ter pelo menos 8 caracteres.
// Parâmetros:
//   token - Token recebido por email
//   newPassword - Nova password (mínimo 8 caracteres)
export async function resetPassword(token, newPassword) {
    const res = await api.post('/users/reset-password', { token, newPassword });
    return res.data; // { message: 'Password atualizada com sucesso.' }
}