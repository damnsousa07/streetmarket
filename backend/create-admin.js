// ================================================================
// CREATE-ADMIN.JS – Script para criar um administrador inicial
// ================================================================
// Este script cria o primeiro utilizador administrador na base de dados.
// Deve ser executado apenas uma vez (ou quando for necessário criar um novo admin).
// Utiliza bcrypt para encriptar a password antes de guardar.
// ================================================================

// Importação dos módulos necessários
const bcrypt = require('bcrypt');    // Biblioteca para hashing de passwords
const db = require('./db');          // Ligação à base de dados MySQL

// ----- CONFIGURAÇÃO DO ADMIN -----
// Altera estes valores conforme necessário
const email = 'streetmarketptt@gmail.com';   // Email do administrador
const password = 'admin123';                  // Password do administrador
const nome = 'Admin StreetMarket';            // Nome do administrador

// ----- FUNÇÃO PRINCIPAL (auto-executável) -----
(async () => {
    try {
        // 1. Gera o hash da password com bcrypt (salt rounds = 10)
        const hashed = await bcrypt.hash(password, 10);

        // 2. Insere o administrador na tabela Users
        // Campos:
        // - primeiro_nome: 'Admin'
        // - ultimo_nome: 'StreetMarket'
        // - nome: 'Admin StreetMarket'
        // - email: 'streetmarketptt@gmail.com'
        // - password: hash gerado
        // - tipo: 'Administrador' (define permissões)
        // - email_verificado: 1 (true) – não precisa de verificação
        // - data_criacao: NOW() – data/hora atual
        await db.promise().query(
            `INSERT INTO Users 
            (primeiro_nome, ultimo_nome, nome, email, password, tipo, email_verificado, data_criacao) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            ['Admin', 'StreetMarket', nome, email, hashed, 'Administrador', 1]
        );

        // 3. Mensagem de sucesso
        console.log('✅ Administrador criado com sucesso!');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
    } catch (err) {
        // Se ocorrer um erro (ex: email já existe), mostra a mensagem
        console.error('❌ Erro ao criar administrador:', err);
    }
})();  // A função é executada imediatamente

// ================================================================
// COMO EXECUTAR:
// ================================================================
// node create-admin.js
//
// NOTA: Este script só deve ser executado uma vez.
// Se o email já existir na base de dados, a inserção vai falhar.
// ================================================================