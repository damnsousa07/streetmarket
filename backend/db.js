// ================================================================
// DB.JS – Configuração da ligação à base de dados MySQL
// ================================================================
// Este ficheiro configura a ligação à base de dados utilizando
// mysql2 com connection pool (gestão eficiente de conexões).
// As credenciais são carregadas do ficheiro .env (variáveis de ambiente).
// ================================================================

// Importação dos módulos necessários
const mysql = require('mysql2');      // Driver MySQL para Node.js (com suporte a Promises)
require('dotenv').config();           // Carrega as variáveis de ambiente do ficheiro .env

// ----- CRIAÇÃO DO POOL DE LIGAÇÕES -----
// O pool mantém várias ligações abertas e reutiliza-as,
// evitando o overhead de abrir/fechar ligações a cada pedido.
const db = mysql.createPool({
  host: process.env.DB_HOST,          // Endereço do servidor MySQL (ex: localhost)
  user: process.env.DB_USER,          // Utilizador da base de dados
  password: process.env.DB_PASS,      // Password do utilizador
  database: process.env.DB_NAME,      // Nome da base de dados
  port: process.env.DB_PORT || 3306   // Porta do MySQL (3306 é a padrão)
});

// ----- EXPORTAÇÃO DO POOL -----
// O pool é exportado para ser usado noutros ficheiros.
// Para usar com async/await, usa db.promise().
// Exemplo: const [rows] = await db.promise().query('SELECT * FROM Users');
module.exports = db;

// ================================================================
// NOTAS:
// ================================================================
// 1. As variáveis de ambiente devem estar definidas no ficheiro .env:
//    DB_HOST=localhost
//    DB_USER=root
//    DB_PASS=admin123
//    DB_NAME=streetmarket
//    DB_PORT=3306
//
// 2. Para usar com Promises (async/await):
//    const [rows] = await db.promise().query('SELECT * FROM Users');
//
// 3. O pool gere automaticamente o número de ligações abertas.
//    Não é necessário fechar a ligação manualmente em cada pedido.
// ================================================================