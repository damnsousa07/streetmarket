// auth.js
// Serviço de autenticação (login e registo) para o frontend.
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