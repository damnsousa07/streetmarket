// ============================================================
// ROTAS DE ENCOMENDAS (criação, atualização de estado, listagem)
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendOrderEmail, sendReviewRequestEmail } = require('../services/emailservice');

// -----------------------------------------------------------------
// ROTA POST /orders – Criar uma nova encomenda
// -----------------------------------------------------------------
// Cria uma encomenda para um utilizador e um produto específicos,
// envia email de confirmação, regista notificação e devolve o ID da encomenda.
router.post('/', async (req, res) => {
    // Extrai os dados do corpo do pedido
    const { user_id, product_id } = req.body;
    // Validação básica: ambos os campos são obrigatórios
    if (!user_id || !product_id) return res.status(400).json({ message: 'Preenche todos os campos!' });

    try {
        // 1. Verificar se o utilizador existe
        const [users] = await db.promise().query('SELECT * FROM Users WHERE user_id = ?', [user_id]);
        if (users.length === 0) return res.status(404).json({ message: 'Utilizador não encontrado!' });
        const user = users[0];

        // 2. Verificar se o produto existe
        const [products] = await db.promise().query('SELECT * FROM Products WHERE product_id = ?', [product_id]);
        if (products.length === 0) return res.status(404).json({ message: 'Produto não encontrado!' });
        const product = products[0];

        // 3. Inserir a encomenda na tabela FakeOrders com status_id = 1 (Comprado)
        const [result] = await db.promise().query(
            'INSERT INTO FakeOrders (user_id, product_id, status_id, data_compra) VALUES (?, ?, 1, NOW())',
            [user_id, product_id]
        );
        const order_id = result.insertId; // ID da encomenda gerado automaticamente

        // 4. Formatar a data para exibição no email (formato português)
        const orderDate = new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' });

        // 5. Construir a URL da imagem do produto para incluir no email
        let imageUrl = '';
        if (product.imagem) {
            let raw = product.imagem.trim();
            if (raw.startsWith('http')) {
                imageUrl = raw; // se já for URL absoluta, mantém
            } else {
                // caso contrário, constrói o caminho a partir do diretório uploads
                let clean = raw.replace(/^\/+/, '');
                if (!clean.startsWith('uploads/')) clean = 'uploads/' + clean;
                imageUrl = `http://localhost:3000/${clean}`;
            }
        }

        // 6. Definir a URL da logo (usando variável de ambiente ou fallback)
        const logoUrl = process.env.LOGO_URL || 'http://localhost:5173/LogoStreetmarket.png';

        // 7. Enviar email de confirmação da encomenda
        await sendOrderEmail({
            to: user.email,
            nomeCliente: user.primeiro_nome || user.nome,
            logoUrl,
            corPrimaria: process.env.PRIMARY_COLOR || '#000000',
            orderNumber: order_id.toString(),
            orderDate,
            items: [{ nome: product.nome, preco: product.preco, quantidade: 1 }],
            total: product.preco,
            produtoImagem: imageUrl,
            marca: 'StreetMarket'
        });

        // 8. Registrar notificação interna para o utilizador
        const mensagemNotificacao = `Encomendaste o produto '${product.nome}' no valor de €${product.preco}, iremos atualizar-te em breve.`;
        await db.promise().query(
            'INSERT INTO Notifications (user_id, tipo, conteudo, data_envio) VALUES (?, ?, ?, NOW())',
            [user_id, 'Encomenda', mensagemNotificacao]
        );

        // 9. Resposta de sucesso ao cliente
        res.status(201).json({ message: 'Encomenda criada com sucesso!', order_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// -----------------------------------------------------------------
// ROTA PUT /orders/:order_id/status – Atualizar estado da encomenda
// -----------------------------------------------------------------
// Permite alterar o estado de uma encomenda (ex: de "Comprado" para "Enviado" ou "Recebido").
// Quando muda para "Enviado" ou "Recebido", cria notificações automáticas e,
// no caso de "Recebido", envia também um email a pedir review.
router.put('/orders/:order_id/status', async (req, res) => {
    const { order_id } = req.params;
    const { status_id } = req.body;
    if (!status_id) return res.status(400).json({ message: 'status_id é obrigatório.' });

    try {
        // 1. Buscar dados completos da encomenda, incluindo produto e utilizador
        const [orders] = await db.promise().query(
            `SELECT o.*, p.nome as product_nome, p.product_id, p.imagem, u.email, u.primeiro_nome, u.nome as user_nome
             FROM FakeOrders o
             JOIN Products p ON o.product_id = p.product_id
             JOIN Users u ON o.user_id = u.user_id
             WHERE o.order_id = ?`,
            [order_id]
        );
        if (orders.length === 0) return res.status(404).json({ message: 'Encomenda não encontrada.' });
        const order = orders[0];

        // 2. Atualizar o estado na base de dados
        await db.promise().query('UPDATE FakeOrders SET status_id = ? WHERE order_id = ?', [status_id, order_id]);

        // 3. Preparar os dados para notificações
        const user_id = order.user_id;
        const productNome = order.product_nome;

        // 4. Se o novo estado for 2 (Enviado): notificar utilizador que o produto vai chegar em breve
        if (Number(status_id) === 2) {
            const mensagem = `O seu produto '${productNome}' vai chegar em breve.`;
            await db.promise().query(
                'INSERT INTO Notifications (user_id, tipo, conteudo, data_envio) VALUES (?, ?, ?, NOW())',
                [user_id, 'Encomenda', mensagem]
            );
        }
        // 5. Se o novo estado for 3 (Recebido): notificar e enviar email de review
        else if (Number(status_id) === 3) {
            const mensagem = `O seu produto '${productNome}' chegou. Espero que goste! Veja o seu email para dar a sua avaliação.`;
            await db.promise().query(
                'INSERT INTO Notifications (user_id, tipo, conteudo, data_envio) VALUES (?, ?, ?, NOW())',
                [user_id, 'Encomenda', mensagem]
            );
            // Enviar email de pedido de review (função importada)
            await sendReviewRequestEmail(
                order.email,
                order.primeiro_nome || order.user_nome,
                productNome,
                order.product_id,
                order.imagem
            );
        }

        // 6. Resposta de sucesso
        res.json({ message: 'Estado da encomenda atualizado.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao atualizar estado.' });
    }
});

// -----------------------------------------------------------------
// ROTA GET /orders/user/:user_id – Listar encomendas de um utilizador
// -----------------------------------------------------------------
// Devolve todas as encomendas de um utilizador específico, com informações
// do produto e o estado atual, ordenadas da mais recente para a mais antiga.
router.get('/user/:user_id', async (req, res) => {
    const { user_id } = req.params;
    try {
        const [orders] = await db.promise().query(
            `SELECT o.order_id, o.data_compra, s.nome AS status, p.nome AS product_nome, p.preco, p.imagem
             FROM FakeOrders o
             JOIN OrderStatus s ON o.status_id = s.status_id
             JOIN Products p ON o.product_id = p.product_id
             WHERE o.user_id = ?
             ORDER BY o.data_compra DESC`,
            [user_id]
        );
        res.status(200).json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

module.exports = router;