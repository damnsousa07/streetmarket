// ================================================================
// AUTH.JS – Servico de autenticacao (frontend)
// ================================================================
// Contem as funcoes para login e registo de utilizadores.
// Comunica com as rotas de autenticacao do backend (/users).
// Utiliza o cliente HTTP (Axios) configurado em client.js.
// ================================================================

import { api } from './client';

// ================================================================
// FUNCAO: Login
// ================================================================

// POST /users/login – Autentica o utilizador
// Parametros:
//   email - Email do utilizador
//   password - Password do utilizador
// Retorna: { user_id, nome, email, tipo }
export async function loginUser(email, password) {
    const res = await api.post('/users/login', { email, password });
    return res.data;
}

// ================================================================
// FUNCAO: Registo de novo utilizador
// ================================================================

// POST /users/register – Cria uma nova conta
// Todos os campos sao obrigatorios.
// Apos o registo, e enviado um codigo de verificacao por email.
// Parametros:
//   primeiro_nome - Primeiro nome do utilizador
//   ultimo_nome - Ultimo nome do utilizador
//   email - Email do utilizador (unico)
//   password - Password (minimo 8 caracteres)
//   morada - Morada completa
//   codigo_postal - Codigo postal (formato XXXX-XXX)
//   telefone - Numero de telefone (9 digitos, comeca por 9)
//   distrito - Distrito de residencia
//   concelho - Concelho de residencia
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
    // Aplica trim() para remover espacos em branco desnecessarios
    const payload = {
        primeiro_nome: primeiro_nome.trim(),
        ultimo_nome: ultimo_nome.trim(),
        email: email.trim(),
        password: password,
        morada: morada.trim(),
        codigo_postal: codigo_postal.trim(),
        telefone: telefone.trim(),
        distrito: distrito.trim(),
        concelho: concelho.trim()
    };

    const res = await api.post('/users/register', payload);
    return res.data;
}