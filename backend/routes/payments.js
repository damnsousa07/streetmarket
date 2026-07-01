// ================================================================
// PAYMENTS.JS – Rotas de pagamento (Stripe e PayPal)
// ================================================================
// Este ficheiro contém as rotas para processar pagamentos
// com Stripe (cartão de crédito) e PayPal.
// Inclui criação de intenções de pagamento, webhooks e confirmação.
// ================================================================

// Importação dos módulos necessários
const express = require('express');                // Framework para construir a API
const router = express.Router();                   // Cria um router para definir as rotas
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Cliente Stripe
const paypal = require('@paypal/checkout-server-sdk'); // Cliente PayPal SDK
const db = require('../db');                       // Ligação à base de dados MySQL
const { sendOrderEmail } = require('../services/emailservice'); // Envio de emails

// ================================================================
// CONFIGURAÇÃO DO PAYPAL (Sandbox)
// ================================================================

// Inicializa o cliente PayPal com as credenciais do .env
// Usa o ambiente Sandbox para testes (não é produção)
let paypalClient;
try {
  // Cria o ambiente Sandbox com as credenciais
  const environment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,      // ID do cliente PayPal (Sandbox)
    process.env.PAYPAL_CLIENT_SECRET   // Segredo do cliente PayPal (Sandbox)
  );
  // Cria o cliente HTTP do PayPal
  paypalClient = new paypal.core.PayPalHttpClient(environment);
} catch (error) {
  // Se falhar a configuração, regista o erro (mas continua)
  console.error('Erro ao configurar PayPal:', error);
}

// ================================================================
// FUNÇÃO AUXILIAR: Enviar email de confirmação de encomenda
// ================================================================

// Função interna que busca os dados da encomenda e do utilizador
// e envia o email de confirmação usando o serviço sendOrderEmail.
async function sendOrderConfirmationEmail(orderId, user_id) {
  try {
    // 1. Busca a encomenda com os dados do produto (nome, preço, imagem)
    const [orders] = await db.promise().query(
      `SELECT fo.*, p.nome AS product_nome, p.preco, p.imagem 
       FROM FakeOrders fo 
       JOIN Products p ON fo.product_id = p.product_id 
       WHERE fo.order_id = ?`,
      [orderId]
    );
    if (orders.length === 0) return;  // Se não encontrar, sai

    // 2. Busca os dados do utilizador (email, nome)
    const [users] = await db.promise().query('SELECT * FROM Users WHERE user_id = ?', [user_id]);
    if (users.length === 0) return;   // Se não encontrar, sai

    const order = orders[0];
    const user = users[0];

    // 3. Prepara os itens da encomenda (array de objetos)
    const items = [{
      nome: order.product_nome,
      preco: order.preco,
      quantidade: 1               // Cada encomenda tem apenas 1 produto (simplificado)
    }];

    // 4. Formata a data da encomenda para português (ex: "25 de Junho de 2026")
    const orderDate = new Date(order.data_compra);
    const formattedDate = orderDate.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // 5. Envia o email usando o serviço configurado
    await sendOrderEmail({
      to: user.email,                              // Destinatário
      nomeCliente: user.nome || 'Cliente',         // Nome do cliente (fallback)
      orderNumber: order.order_id,                 // Número da encomenda
      orderDate: formattedDate,                    // Data formatada
      items: items,                                // Lista de produtos
      total: order.preco,                          // Valor total
      produtoImagem: order.imagem || null,         // Imagem do produto (opcional)
      marca: 'StreetMarket'                        // Nome da marca
    });

    console.log(`✅ Email de confirmação enviado para ${user.email}`);
  } catch (err) {
    console.error('❌ Erro ao enviar email de confirmação:', err);
  }
}

// ================================================================
// ROTA: Enviar email de confirmação (forçado)
// ================================================================

// POST /payments/send-order-email – Envia o email de confirmação
// Esta rota é chamada pelo frontend após o pagamento ser concluído
// (garante que o email é enviado mesmo que o webhook falhe).
router.post('/send-order-email', async (req, res) => {
  const { orderId, userId } = req.body;
  
  // Validação: ambos os campos são obrigatórios
  if (!orderId || !userId) {
    return res.status(400).json({ message: 'Faltam dados.' });
  }

  try {
    // Chama a função auxiliar para enviar o email
    await sendOrderConfirmationEmail(orderId, userId);
    res.json({ message: 'Email enviado com sucesso.' });
  } catch (err) {
    console.error('❌ Erro ao enviar email:', err);
    res.status(500).json({ message: 'Erro ao enviar email.' });
  }
});

// ================================================================
// ROTAS STRIPE (Cartão de Crédito)
// ================================================================

// POST /payments/create-payment-intent – Cria um PaymentIntent no Stripe
// O frontend usa o clientSecret para confirmar o pagamento com o cartão.
router.post('/create-payment-intent', async (req, res) => {
  const { amount, orderId, user_id } = req.body;
  
  // Validação: valor é obrigatório e deve ser positivo
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Valor inválido para pagamento.' });
  }
  
  try {
    // Cria o PaymentIntent no Stripe
    // amount: valor em euros (convertido para cêntimos multiplicando por 100)
    // currency: 'eur' (Euro)
    // metadata: guarda orderId e user_id para usar no webhook
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),   // Stripe trabalha em cêntimos
      currency: 'eur',
      metadata: { 
        orderId: orderId.toString(), 
        user_id: user_id.toString() 
      },
    });
    
    // Devolve o clientSecret para o frontend (necessário para confirmar o pagamento)
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Erro ao criar PaymentIntent:', error);
    res.status(500).json({ message: 'Erro ao criar pagamento.' });
  }
});

// POST /payments/stripe-webhook – Webhook do Stripe
// O Stripe chama esta URL quando o estado do pagamento muda.
// Aqui, quando o pagamento é bem-sucedido, atualiza a encomenda e envia email.
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];  // Assinatura do webhook (para verificação)
  let event;
  
  try {
    // Verifica a assinatura do webhook usando o segredo do .env
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    // Se a assinatura for inválida, retorna erro 400
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Se o evento for 'payment_intent.succeeded', o pagamento foi bem-sucedido
  if (event.type === 'payment_intent.succeeded') {
    // Extrai o orderId e user_id dos metadados
    const { orderId, user_id } = event.data.object.metadata;
    
    // Atualiza a encomenda: status_id = 2 (Enviado) e payment_method = 'stripe'
    await db.promise().query(
      'UPDATE FakeOrders SET status_id = 2, payment_method = "stripe" WHERE order_id = ?',
      [orderId]
    );
    
    // Envia o email de confirmação
    await sendOrderConfirmationEmail(orderId, user_id);
  }
  
  // Devolve resposta 200 para o Stripe saber que o webhook foi recebido
  res.json({ received: true });
});

// ================================================================
// ROTAS PAYPAL
// ================================================================

// POST /payments/create-paypal-order – Cria uma ordem no PayPal
// O frontend usa a URL de aprovação para redirecionar o utilizador para o PayPal.
router.post('/create-paypal-order', async (req, res) => {
  const { amount, orderId, user_id } = req.body;
  
  // Validação: valor é obrigatório e deve ser positivo
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Valor inválido para pagamento.' });
  }
  
  // Cria o pedido para a API do PayPal
  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: 'CAPTURE',  // Capturar o pagamento imediatamente
    purchase_units: [{
      amount: { 
        currency_code: 'EUR', 
        value: amount.toString()   // PayPal trabalha com strings
      },
      reference_id: orderId.toString(),  // ID da encomenda (referência)
      custom_id: user_id.toString()      // ID do utilizador
    }],
    application_context: {
      // URLs para onde o utilizador é redirecionado após o pagamento
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/paypal-return`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout`,
    }
  });
  
  try {
    // Executa o pedido à API do PayPal
    const order = await paypalClient.execute(request);
    // Encontra o link de aprovação (onde o utilizador é redirecionado)
    const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;
    
    // Devolve o ID da ordem e a URL de aprovação
    res.json({ 
      orderID: order.result.id,
      approvalUrl: approvalUrl
    });
  } catch (error) {
    console.error('Erro ao criar ordem PayPal:', error);
    res.status(500).json({ message: 'Erro ao criar ordem PayPal.', details: error.message });
  }
});

// POST /payments/capture-paypal-order – Captura um pagamento PayPal
// O frontend chama esta rota após o utilizador voltar do PayPal.
router.post('/capture-paypal-order', async (req, res) => {
  const { orderID, orderId, user_id } = req.body;
  
  // Validação: ambos são obrigatórios
  if (!orderID || !orderId) {
    return res.status(400).json({ message: 'Dados incompletos.' });
  }
  
  // Cria o pedido de captura
  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  
  try {
    // Executa a captura (confirma o pagamento)
    const capture = await paypalClient.execute(request);
    
    // Se o status for COMPLETED, o pagamento foi bem-sucedido
    if (capture.result.status === 'COMPLETED') {
      // Atualiza a encomenda: status_id = 2 (Enviado) e payment_method = 'paypal'
      await db.promise().query(
        'UPDATE FakeOrders SET status_id = 2, payment_method = "paypal" WHERE order_id = ?',
        [orderId]
      );
      
      // Envia o email de confirmação
      await sendOrderConfirmationEmail(orderId, user_id);
      
      res.json({ message: 'Pagamento confirmado!' });
    } else {
      // Se não estiver completo, rejeita
      res.status(400).json({ message: 'Pagamento não completado.' });
    }
  } catch (error) {
    console.error('Erro ao capturar pagamento:', error);
    res.status(500).json({ message: 'Erro ao capturar pagamento.' });
  }
});

// ================================================================
// EXPORTAÇÃO DO ROUTER
// ================================================================
// Exporta o router para ser utilizado no index.js (montado em /payments)
module.exports = router;