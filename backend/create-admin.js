// create-admin.js
const bcrypt = require('bcrypt');
const db = require('./db');

const email = 'admin@streetmarket.com';
const password = 'admin123';
const nome = 'Admin StreetMarket';

(async () => {
    try {
        const hashed = await bcrypt.hash(password, 10);
        await db.promise().query(
            `INSERT INTO Users 
            (primeiro_nome, ultimo_nome, nome, email, password, tipo, email_verificado, data_criacao) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            ['Admin', 'StreetMarket', nome, email, hashed, 'Administrador', 1]
        );
        console.log('✅ Administrador criado com sucesso!');
    } catch (err) {
        console.error('❌ Erro:', err);
    }
})();