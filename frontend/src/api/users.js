// ================================================================
// AUTH.JS – Serviço de autenticação (frontend)
// ================================================================
// Este ficheiro contém as funções para login e registo de utilizadores.
// Comunica com as rotas de autenticação do backend (/users).
// Utiliza o cliente HTTP (Axios) configurado em client.js.
// ================================================================

// Importação do cliente HTTP (Axios) configurado
import { api } from './client';

// ================================================================
// FUNÇÃO: Login
// ================================================================

// POST /users/login – Autentica o utilizador
// Parâmetros:
//   email - Email do utilizador
//   password - Password do utilizador
// Retorna: { user_id, nome, email, tipo }
export async function loginUser(email, password) {
    // Faz a requisição POST para /users/login
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

    // Faz a requisição POST para /users/register
    const res = await api.post('/users/register', payload);
    return res.data; // { message: 'Registo efetuado! Verifica o teu email...' }
}