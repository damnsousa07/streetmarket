// ================================================================
// PAYMENTS.JS – Rotas de pagamento (Stripe e PayPal)
// ================================================================
// Contem as rotas para processar pagamentos com Stripe e PayPal.
// Inclui criacao de intencoes de pagamento, webhooks e confirmacao.
// ================================================================

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');
const db = require('../db');
const { sendOrderEmail } = require('../services/emailservice');

// ================================================================
// CONFIGURACAO DO PAYPAL
// ================================================================

// Inicializa o cliente PayPal com as credenciais do .env em modo Sandbox
// SandboxEnvironment permite testes sem dinheiro real
let paypalClient;
try {
  const environment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  );
  paypalClient = new paypal.core.PayPalHttpClient(environment);
} catch (error) {
  console.error('Erro ao configurar PayPal:', error);
}

// ================================================================
// FUNCAO AUXILIAR: Enviar email de confirmacao de encomenda
// ================================================================

// Busca os dados da encomenda e do utilizador e envia o email
// Utilizada tanto para Stripe como para PayPal
async function sendOrderConfirmationEmail(orderId, user_id) {
  try {
    // Busca encomenda com dados do produto
    const [orders] = await db.promise().query(
      `SELECT fo.*, p.nome AS product_nome, p.preco, p.imagem 
       FROM FakeOrders fo 
       JOIN Products p ON fo.product_id = p.product_id 
       WHERE fo.order_id = ?`,
      [orderId]
    );
    if (orders.length === 0) return;

    // Busca dados do utilizador
    const [users] = await db.promise().query('SELECT * FROM Users WHERE user_id = ?', [user_id]);
    if (users.length === 0) return;

    const order = orders[0];
    const user = users[0];

    // Prepara os itens da encomenda para o email
    const items = [{
      nome: order.product_nome,
      preco: order.preco,
      quantidade: 1
    }];

    // Formata a data para portugues
    const orderDate = new Date(order.data_compra);
    const formattedDate = orderDate.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // Envia o email usando o servico de email
    await sendOrderEmail({
      to: user.email,
      nomeCliente: user.nome || 'Cliente',
      orderNumber: order.order_id,
      orderDate: formattedDate,
      items: items,
      total: order.preco,
      produtoImagem: order.imagem || null,
      marca: 'StreetMarket'
    });

    console.log(`Email de confirmacao enviado para ${user.email}`);
  } catch (err) {
    console.error('Erro ao enviar email de confirmacao:', err);
  }
}

// ================================================================
// ROTA: Confirmar encomenda e decrementar stock (APOS PAGAMENTO)
// ================================================================

// Esta rota e chamada pelo frontend apos o pagamento ser confirmado
// Decrementa o stock e mantem a encomenda como Pendente (status_id = 1)
router.post('/confirm-order', async (req, res) => {
  const { orderId, userId } = req.body;
  
  console.log('CONFIRM ORDER - Dados recebidos:', { orderId, userId });
  
  if (!orderId || !userId) {
    return res.status(400).json({ message: 'Dados incompletos.' });
  }
  
  try {
    const [orders] = await db.promise().query(
      'SELECT * FROM FakeOrders WHERE order_id = ?',
      [orderId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Encomenda nao encontrada.' });
    }
    
    const order = orders[0];
    
    // Verifica se a encomenda ja foi processada
    if (order.status_id !== 1) {
      console.log('Encomenda ja processada:', orderId);
      return res.json({ message: 'Encomenda ja processada.' });
    }
    
    // Decrementa o stock do produto
    await db.promise().query(
      'UPDATE Products SET stock = stock - 1 WHERE product_id = ? AND stock > 0',
      [order.product_id]
    );
    console.log(`Stock decrementado para o produto ${order.product_id}`);
    
    // Nao envia email aqui para evitar duplicacao
    // O email e enviado no capture-paypal-order ou stripe-webhook
    
    res.json({ 
      message: 'Pagamento confirmado e stock atualizado com sucesso!',
      order_id: orderId,
      status: 'Pendente (aguardando envio)'
    });
  } catch (err) {
    console.error('Erro ao confirmar encomenda:', err);
    res.status(500).json({ message: 'Erro ao confirmar encomenda.' });
  }
});

// ================================================================
// ROTA: Enviar email de confirmacao (APENAS PARA ADMIN)
// ================================================================

// Rota auxiliar para o admin reenviar emails manualmente
router.post('/send-order-email', async (req, res) => {
  const { orderId, userId } = req.body;
  
  if (!orderId || !userId) {
    return res.status(400).json({ message: 'Faltam dados.' });
  }

  try {
    await sendOrderConfirmationEmail(orderId, userId);
    res.json({ message: 'Email enviado com sucesso.' });
  } catch (err) {
    console.error('Erro ao enviar email:', err);
    res.status(500).json({ message: 'Erro ao enviar email.' });
  }
});

// ================================================================
// ROTAS STRIPE
// ================================================================

// POST /create-payment-intent – Cria um PaymentIntent no Stripe
// O frontend usa o clientSecret para confirmar o pagamento
router.post('/create-payment-intent', async (req, res) => {
  const { amount, orderId, user_id } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Valor invalido para pagamento.' });
  }
  
  try {
    // Cria o PaymentIntent no Stripe
    // amount: valor em euros (convertido para centimos multiplicando por 100)
    // metadata: guarda orderId e user_id para usar no webhook
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'eur',
      metadata: { 
        orderId: orderId.toString(), 
        user_id: user_id.toString() 
      },
    });
    
    // Devolve o clientSecret para o frontend
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Erro ao criar PaymentIntent:', error);
    res.status(500).json({ message: 'Erro ao criar pagamento.' });
  }
});

// POST /stripe-webhook – Webhook do Stripe
// O Stripe chama esta URL quando o estado do pagamento muda
// Apos pagamento bem-sucedido, atualiza a encomenda e envia email
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    // Verifica a assinatura do webhook para garantir que e do Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  if (event.type === 'payment_intent.succeeded') {
    const { orderId, user_id } = event.data.object.metadata;
    console.log('STRIPE WEBHOOK - Pagamento confirmado para ordem:', orderId);
    
    // Regista o metodo de pagamento
    await db.promise().query(
      'UPDATE FakeOrders SET payment_method = "stripe" WHERE order_id = ?',
      [orderId]
    );
    
    // Envia email de confirmacao
    await sendOrderConfirmationEmail(orderId, user_id);
    
    // Decrementa o stock
    try {
      const [orders] = await db.promise().query(
        'SELECT * FROM FakeOrders WHERE order_id = ?',
        [orderId]
      );
      
      if (orders.length > 0 && orders[0].status_id === 1) {
        await db.promise().query(
          'UPDATE Products SET stock = stock - 1 WHERE product_id = ? AND stock > 0',
          [orders[0].product_id]
        );
        console.log(`Stock decrementado para o produto ${orders[0].product_id} (via webhook)`);
      }
    } catch (err) {
      console.error('Erro ao decrementar stock via webhook:', err);
    }
  }
  
  res.json({ received: true });
});

// ================================================================
// ROTAS PAYPAL
// ================================================================

// POST /create-paypal-order – Cria uma ordem no PayPal
// O frontend usa a URL de aprovacao para redirecionar o utilizador
router.post('/create-paypal-order', async (req, res) => {
  const { amount, orderId, user_id } = req.body;
  
  console.log('CREATE PAYPAL ORDER - Dados recebidos:', { amount, orderId, user_id });
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Valor invalido para pagamento.' });
  }
  
  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: 'CAPTURE', // Captura o pagamento imediatamente
    purchase_units: [{
      amount: { 
        currency_code: 'EUR', 
        value: amount.toString()
      },
      reference_id: orderId.toString(),
      custom_id: user_id.toString()
    }],
    application_context: {
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/paypal-return`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout`,
      user_action: 'PAY_NOW', // Forca o botao "Pagar Agora" no PayPal
    }
  });
  
  try {
    const order = await paypalClient.execute(request);
    const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;
    
    console.log('Ordem PayPal criada:', order.result.id);
    console.log('Approval URL:', approvalUrl);
    
    res.json({ 
      orderID: order.result.id,
      approvalUrl: approvalUrl
    });
  } catch (error) {
    console.error('Erro ao criar ordem PayPal:', error.response?.data || error.message);
    res.status(500).json({ message: 'Erro ao criar ordem PayPal.', details: error.message });
  }
});

// POST /capture-paypal-order – Captura um pagamento PayPal
// Chamada apos o utilizador voltar do PayPal
router.post('/capture-paypal-order', async (req, res) => {
  const { orderID, orderId, user_id } = req.body;
  
  console.log('CAPTURE PAYPAL - Dados recebidos:', { orderID, orderId, user_id });
  
  if (!orderID || !orderId) {
    return res.status(400).json({ message: 'Dados incompletos.' });
  }
  
  try {
    // Verifica se a encomenda ja foi processada para evitar duplicacao
    const [existingOrder] = await db.promise().query(
      'SELECT * FROM FakeOrders WHERE order_id = ?',
      [orderId]
    );
    
    if (existingOrder.length > 0 && existingOrder[0].status_id !== 1) {
      console.log(`Encomenda ${orderId} ja foi processada (status: ${existingOrder[0].status_id})`);
      return res.status(400).json({ 
        message: 'Encomenda ja processada.',
        already_processed: true
      });
    }
    
    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});
    
    const capture = await paypalClient.execute(request);
    console.log('PayPal capture response status:', capture.result.status);
    
    if (capture.result.status === 'COMPLETED') {
      // Regista o metodo de pagamento
      await db.promise().query(
        'UPDATE FakeOrders SET payment_method = "paypal" WHERE order_id = ?',
        [orderId]
      );
      console.log(`Payment method atualizado para paypal na ordem ${orderId}`);
      
      // Decrementa o stock
      const [order] = await db.promise().query(
        'SELECT product_id FROM FakeOrders WHERE order_id = ?',
        [orderId]
      );
      
      if (order.length > 0) {
        await db.promise().query(
          'UPDATE Products SET stock = stock - 1 WHERE product_id = ? AND stock > 0',
          [order[0].product_id]
        );
        console.log(`Stock decrementado para o produto ${order[0].product_id}`);
      }
      
      // Envia email de confirmacao
      await sendOrderConfirmationEmail(orderId, user_id);
      console.log(`Email de confirmacao enviado para a ordem ${orderId}`);
      
      res.json({ 
        message: 'Pagamento confirmado com sucesso!',
        status: capture.result.status,
        orderId: orderId
      });
    } else {
      console.log(`Pagamento nao completado: ${capture.result.status}`);
      res.status(400).json({ message: 'Pagamento nao completado.' });
    }
  } catch (error) {
    // Trata o erro ORDER_ALREADY_CAPTURED que ocorre quando a ordem ja foi capturada
    const errorDetails = error.response?.data?.details || [];
    const alreadyCaptured = errorDetails.some(d => d.issue === 'ORDER_ALREADY_CAPTURED');
    
    if (alreadyCaptured) {
      console.log('Ordem PayPal ja foi capturada anteriormente');
      return res.json({ 
        message: 'Pagamento ja foi processado anteriormente.',
        already_captured: true
      });
    }
    
    console.error('Erro ao capturar pagamento PayPal:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Erro ao capturar pagamento PayPal.',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;