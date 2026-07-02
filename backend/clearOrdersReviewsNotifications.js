// clearOrdersReviewsNotifications.js
const db = require('./db');

async function clearData() {
    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();

        console.log('🧹 A limpar Orders, Reviews e Notifications...');

        // Desativa verificação de chaves estrangeiras
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Apaga apenas os registos das tabelas indicadas
        await connection.query('TRUNCATE TABLE Notifications');
        console.log('✅ Notifications limpa');

        await connection.query('TRUNCATE TABLE Reviews');
        console.log('✅ Reviews limpa');

        await connection.query('TRUNCATE TABLE FakeOrders');
        console.log('✅ FakeOrders limpa');

        // Reativa verificação de chaves estrangeiras
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        await connection.commit();
        console.log('🎉 Orders, Reviews e Notifications apagadas com sucesso!');
        console.log('✅ Utilizadores, Produtos e Categorias mantidos.');
    } catch (err) {
        await connection.rollback();
        console.error('❌ Erro ao apagar dados:', err);
    } finally {
        connection.release();
        process.exit();
    }
}

clearData();