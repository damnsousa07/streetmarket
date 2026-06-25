const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');
const db = require('../db');
const { sendOrderEmail } = require('../services/emailservice');

// Configurar PayPal (sandbox)
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

// ---------- FUNÇÃO AUXILIAR PARA ENVIAR EMAIL ----------
async function sendOrderConfirmationEmail(orderId, user_id) {
  try {
    const [orders] = await db.promise().query(
      `SELECT fo.*, p.nome AS product_nome, p.preco, p.imagem 
       FROM FakeOrders fo 
       JOIN Products p ON fo.product_id = p.product_id 
       WHERE fo.order_id = ?`,
      [orderId]
    );
    if (orders.length === 0) return;

    const [users] = await db.promise().query('SELECT * FROM Users WHERE user_id = ?', [user_id]);
    if (users.length === 0) return;

    const order = orders[0];
    const user = users[0];

    const items = [{
      nome: order.product_nome,
      preco: order.preco,
      quantidade: 1
    }];

    const orderDate = new Date(order.data_compra);
    const formattedDate = orderDate.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

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

    console.log(`✅ Email de confirmação enviado para ${user.email}`);
  } catch (err) {
    console.error('❌ Erro ao enviar email de confirmação:', err);
  }
}

// ---------- ROTA PARA ENVIAR EMAIL (FORÇADO) ----------
router.post('/send-order-email', async (req, res) => {
  const { orderId, userId } = req.body;
  if (!orderId || !userId) {
    return res.status(400).json({ message: 'Faltam dados.' });
  }

  try {
    await sendOrderConfirmationEmail(orderId, userId);
    res.json({ message: 'Email enviado com sucesso.' });
  } catch (err) {
    console.error('❌ Erro ao enviar email:', err);
    res.status(500).json({ message: 'Erro ao enviar email.' });
  }
});

// ---------- STRIPE ----------
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

// Webhook do Stripe
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
    await db.promise().query(
      'UPDATE FakeOrders SET status_id = 2, payment_method = "stripe" WHERE order_id = ?',
      [orderId]
    );
    await sendOrderConfirmationEmail(orderId, user_id);
  }
  res.json({ received: true });
});

// ---------- PAYPAL ----------
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

router.post('/capture-paypal-order', async (req, res) => {
  const { orderID, orderId, user_id } = req.body;
  if (!orderID || !orderId) {
    return res.status(400).json({ message: 'Dados incompletos.' });
  }
  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  try {
    const capture = await paypalClient.execute(request);
    if (capture.result.status === 'COMPLETED') {
      await db.promise().query(
        'UPDATE FakeOrders SET status_id = 2, payment_method = "paypal" WHERE order_id = ?',
        [orderId]
      );
      await sendOrderConfirmationEmail(orderId, user_id);
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