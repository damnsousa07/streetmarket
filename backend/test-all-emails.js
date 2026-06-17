// test-all-emails.js
// Teste completo para todas as funções de email da StreetMarket:
// - Verificação de email (sendVerificationEmail)
// - Pedido de review SEM imagem (sendReviewRequestEmail)
// - Confirmação de compra com review block (sendOrderEmail)

require('dotenv').config();
const { sendOrderEmail, sendReviewRequestEmail, sendVerificationEmail } = require('./services/emailservice');

// ============================================================
// CONFIGURAÇÃO – ALTERA ESTES DADOS PARA O TEU TESTE
// ============================================================
const testEmail = 'teu-email@gmail.com';   // Substituir pelo teu email
const nomeUser = 'João';
const nomeProduto = 'Produto Exemplo';
const productId = 123;                     // ID real de um produto (para o link)
const imagemCaminho = '/uploads/produto.jpg'; // NÃO USADO (ignorado)

// ============================================================
// EXECUÇÃO DOS TESTES
// ============================================================
(async () => {
    try {
        console.log('📧 Iniciando testes de envio de emails...\n');

        // ============================================================
        // 1. EMAIL DE VERIFICAÇÃO (código de registo)
        // ============================================================
        await sendVerificationEmail(testEmail, nomeUser, '123456');
        console.log('✅ Email de verificação enviado');

        // ============================================================
        // 2. EMAIL DE REVIEW (separado) – SEM IMAGEM (a imagem é ignorada)
        // ============================================================
        await sendReviewRequestEmail(testEmail, nomeUser, nomeProduto, productId, null);
        console.log('✅ Email de review (sem imagem) enviado');

        // ============================================================
        // 3. EMAIL DE CONFIRMAÇÃO DE COMPRA (com bloco de review)
        // ============================================================
        await sendOrderEmail({
            to: testEmail,
            nomeCliente: nomeUser,
            corPrimaria: '#007bff',
            orderNumber: '99',
            orderDate: new Date().toLocaleDateString('pt-PT'),
            items: [
                { nome: nomeProduto, preco: 19.99, quantidade: 2 }
            ],
            total: 39.98,
            produtoImagem: null,           // Sem imagem do produto
            marca: 'StreetMarket',
            reviewProductId: productId,    // ID do produto para o link de review
            reviewProductName: nomeProduto
        });
        console.log('✅ Email de confirmação de compra (com review block) enviado');

        console.log('\n🎉 Todos os emails enviados com sucesso! Verifica a tua caixa de entrada (e spam).');
    } catch (error) {
        console.error('❌ Erro ao enviar emails:', error.message);
    }
})();