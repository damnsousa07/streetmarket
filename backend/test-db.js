// ================================================================
// TEST-DB.JS – Script para testar a ligação à base de dados
// ================================================================
// Este script é utilizado para verificar se a ligação à base de dados
// está a funcionar corretamente. Deve ser executado apenas para testes.
// ================================================================

// Importa a ligação à base de dados
const db = require('./db');

// ----- TESTE DA LIGAÇÃO -----
// Obtém todos os registos da tabela Users (apenas para teste)
db.select('*')                         // Seleciona todas as colunas
  .from('Users')                       // Da tabela Users
  .then(data => {
    // Se a ligação for bem-sucedida, mostra os dados e msg
    console.log("✅ Ligação OK! Utilizadores encontrados:", data.length);
    console.log("📋 Dados:", data);
  })
  .catch(err => {
    // Se houver erro, mostra a mensagem de erro
    console.error("❌ Erro de ligação:", err.message);
    console.error("Detalhes:", err);
  })
  .finally(() => {
    // Fecha a ligação à base de dados (liberta recursos)
    // Como estamos a usar pool, usamos destroy ()
    // Se usares uma única conexão, podes usar end().
    db.destroy();
    console.log("🔌 Ligação fechada.");
  });

// ================================================================
// COMO EXECUTAR:
// ================================================================
// node test-db.js
//
// SCRIPT para diagnosticar erros
// com a base de dados. Deve ser executado apenas em desenvolvimento.
// ================================================================