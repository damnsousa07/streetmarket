// ============================================================
// ROTAS DE PAGAMENTOS (Stripe e PayPal)
// ============================================================

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');
const db = require('../db');
const { sendOrderEmail } = require('../services/emailservice');

// -----------------------------------------------------------------
// CONFIGURAÇÃO DO CLIENTE PAYPAL (modo sandbox)
// -----------------------------------------------------------------
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

// ============================================================
// FUNÇÃO AUXILIAR: Enviar confirmação de compra (email + notificação)
// ============================================================
async function sendOrderConfirmation(orderId) {
  try {
    // Buscar dados da encomenda, produto e utilizador
    const [orders] = await db.promise().query(
      `SELECT o.*, p.nome as product_nome, p.product_id, p.imagem, p.preco, 
              u.email, u.primeiro_nome, u.nome as user_nome
       FROM FakeOrders o
       JOIN Products p ON o.product_id = p.product_id
       JOIN Users u ON o.user_id = u.user_id
       WHERE o.order_id = ?`,
      [orderId]
    );
    if (orders.length === 0) return;
    const order = orders[0];

    // Formatar data
    const orderDate = new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' });

    // Construir imagem do produto
    let imageUrl = '';
    if (order.imagem) {
      let raw = order.imagem.trim();
      if (raw.startsWith('http')) {
        imageUrl = raw;
      } else {
        let clean = raw.replace(/^\/+/, '');
        if (!clean.startsWith('uploads/')) clean = 'uploads/' + clean;
        imageUrl = `http://localhost:3000/${clean}`;
      }
    }

    // Enviar email de confirmação (com review block)
    await sendOrderEmail({
      to: order.email,
      nomeCliente: order.primeiro_nome || order.user_nome,
      logoUrl: process.env.LOGO_URL || 'http://localhost:5173/LogoStreetmarket.png',
      corPrimaria: process.env.PRIMARY_COLOR || '#007bff',
      orderNumber: orderId.toString(),
      orderDate,
      items: [{ nome: order.product_nome, preco: order.preco, quantidade: 1 }],
      total: order.preco,
      produtoImagem: imageUrl,
      marca: 'StreetMarket',
      reviewProductId: order.product_id,
      reviewProductName: order.product_nome
    });

    // Criar notificação interna
    const mensagem = `Encomendaste o produto '${order.product_nome}' no valor de €${order.preco}, iremos atualizar-te em breve.`;
    await db.promise().query(
      'INSERT INTO Notifications (user_id, tipo, conteudo, data_envio) VALUES (?, ?, ?, NOW())',
      [order.user_id, 'Encomenda', mensagem]
    );
  } catch (err) {
    console.error('Erro ao enviar confirmação de compra:', err);
  }
}

// ============================================================
// ROTAS STRIPE
// ============================================================

// POST /payments/create-payment-intent – Criar intenção de pagamento (Stripe)
router.post('/create-payment-intent', async (req, res) => {
  const { amount, orderId, user_id } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Valor inválido para pagamento.' });
  }
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'eur',
      metadata: { orderId: orderId.toString(), user_id: user_id.toString() },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Erro ao criar PaymentIntent:', error);
    res.status(500).json({ message: 'Erro ao criar pagamento.' });
  }
});

// POST /payments/stripe-webhook – Webhook para confirmação de pagamento (Stripe)
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'payment_intent.succeeded') {
    const { orderId, user_id } = event.data.object.metadata;
    // Atualizar a encomenda para status_id = 2 (Comprado/Confirmado)
    await db.promise().query(
      'UPDATE FakeOrders SET status_id = 2, payment_method = "stripe" WHERE order_id = ?',
      [orderId]
    );
    // ----- ENVIAR CONFIRMAÇÃO (EMAIL + NOTIFICAÇÃO) -----
    await sendOrderConfirmation(orderId);
  }
  res.json({ received: true });
});

// ============================================================
// ROTAS PAYPAL
// ============================================================

// POST /payments/create-paypal-order – Criar ordem PayPal
router.post('/create-paypal-order', async (req, res) => {
  const { amount, orderId, user_id } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Valor inválido para pagamento.' });
  }
  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: { currency_code: 'EUR', value: amount.toString() },
      reference_id: orderId.toString(),
      custom_id: user_id.toString()
    }],
    application_context: {
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/paypal-return`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout`,
    }
  });
  try {
    const order = await paypalClient.execute(request);
    const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;
    res.json({
      orderID: order.result.id,
      approvalUrl: approvalUrl
    });
  } catch (error) {
    console.error('Erro ao criar ordem PayPal:', error);
    res.status(500).json({ message: 'Erro ao criar ordem PayPal.', details: error.message });
  }
});

// POST /payments/capture-paypal-order – Capturar pagamento PayPal
router.post('/capture-paypal-order', async (req, res) => {
  const { orderID, orderId, user_id } = req.body;
  if (!orderID || !orderId) {
    return res.status(400).json({ message: 'Dados incompletos.' });
  }
  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  try {
    const capture = await paypalClient.execute(request);
    if (capture.result.status === 'COMPLETED') {
      // Atualizar a encomenda para status_id = 2
      await db.promise().query(
        'UPDATE FakeOrders SET status_id = 2, payment_method = "paypal" WHERE order_id = ?',
        [orderId]
      );
      // ----- ENVIAR CONFIRMAÇÃO (EMAIL + NOTIFICAÇÃO) -----
      await sendOrderConfirmation(orderId);
      res.json({ message: 'Pagamento confirmado!' });
    } else {
      res.status(400).json({ message: 'Pagamento não completado.' });
    }
  } catch (error) {
    console.error('Erro ao capturar pagamento:', error);
    res.status(500).json({ message: 'Erro ao capturar pagamento.' });
  }
});

module.exports = router;