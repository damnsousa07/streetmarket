// auth.js
// Serviço de autenticação (login, registo, recuperação de password) para o frontend.
// Comunica com a API de autenticação do backend.

import { api } from '../api/client';

// ------------------------------------------------------------
// LOGIN
// Envia email e password para o backend.
// Retorna os dados do utilizador (se autenticado).
export async function loginUser(email, password) {
    // Faz POST para /users/login com as credenciais
    const res = await api.post('/users/login', { email, password });
    return res.data; // { user_id, nome, email, tipo }
}

// ------------------------------------------------------------
// REGISTO (com todos os campos obrigatórios)
// Envia os dados necessários para criar uma conta.
// O backend exige: primeiro_nome, ultimo_nome, email, password,
// morada, codigo_postal, telefone, distrito, concelho.
// Retorna a mensagem de sucesso (código de verificação enviado).
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
    // Monta o payload com todos os campos exigidos pelo backend
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

    // Faz POST para /users/register
    const res = await api.post('/users/register', payload);
    return res.data; // { message: 'Registo efetuado! Verifica o teu email...' }
}

// ------------------------------------------------------------
// PEDIDO DE REDEFINIÇÃO DE PASSWORD (esqueci-me da password)
// Envia o email para o backend, que gera um token e envia o link.
// Parâmetro: email (string)
// Retorna a mensagem de sucesso (genérica por segurança).
export async function requestPasswordReset(email) {
    const res = await api.post('/users/forgot-password', { email });
    return res.data; // { message: 'Se o email existir, enviaremos as instruções.' }
}

// ------------------------------------------------------------
// REDEFINIR PASSWORD (com token e nova password)
// Envia o token e a nova password para o backend.
// Parâmetros: token (string), newPassword (string)
// Retorna a mensagem de sucesso.
export async function resetPassword(token, newPassword) {
    const res = await api.post('/users/reset-password', { token, newPassword });
    return res.data; // { message: 'Password atualizada com sucesso.' }
}