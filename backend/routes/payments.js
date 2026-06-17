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
// Inicializa o cliente PayPal com as credenciais de sandbox
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
// ROTAS STRIPE
// ============================================================

// POST /payments/create-payment-intent – Criar intenção de pagamento (Stripe)
// Cria um PaymentIntent no Stripe para um determinado valor, associando-o à encomenda.
router.post('/create-payment-intent', async (req, res) => {
  const { amount, orderId, user_id } = req.body;
  // Validação: o valor deve ser positivo
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Valor inválido para pagamento.' });
  }
  try {
    // Cria o PaymentIntent com o valor (em cêntimos) e moeda EUR
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // converte para cêntimos
      currency: 'eur',
      metadata: { orderId: orderId.toString(), user_id: user_id.toString() },
    });
    // Devolve o clientSecret ao frontend para confirmar o pagamento
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Erro ao criar PaymentIntent:', error);
    res.status(500).json({ message: 'Erro ao criar pagamento.' });
  }
});

// POST /payments/stripe-webhook – Webhook para confirmação de pagamento (Stripe)
// O Stripe notifica este endpoint quando um pagamento é concluído com sucesso.
// Atualiza o estado da encomenda e, se necessário, envia email de confirmação.
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    // Verifica a assinatura do webhook para garantir que é do Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // Se o evento for de pagamento bem-sucedido
  if (event.type === 'payment_intent.succeeded') {
    const { orderId, user_id } = event.data.object.metadata;
    // Atualiza a encomenda para status_id = 2 (Comprado/Confirmado) e regista método "stripe"
    await db.promise().query(
      'UPDATE FakeOrders SET status_id = 2, payment_method = "stripe" WHERE order_id = ?',
      [orderId]
    );
    // (Opcional) Buscar dados para enviar email de confirmação
    const [orders] = await db.promise().query('SELECT * FROM FakeOrders WHERE order_id = ?', [orderId]);
    if (orders.length > 0) {
      const [users] = await db.promise().query('SELECT * FROM Users WHERE user_id = ?', [user_id]);
      const [products] = await db.promise().query('SELECT * FROM Products WHERE product_id = ?', [orders[0].product_id]);
      if (users.length && products.length) {
        // Aqui poderias chamar sendOrderEmail() para enviar um email de confirmação,
        // mas o código actual está comentado, pois o email já é enviado na criação da encomenda.
      }
    }
  }
  res.json({ received: true });
});

// ============================================================
// ROTAS PAYPAL
// ============================================================

// POST /payments/create-paypal-order – Criar ordem PayPal
// Cria uma ordem no PayPal, devolvendo o ID da ordem e a URL de aprovação (redirecionamento).
router.post('/create-paypal-order', async (req, res) => {
  const { amount, orderId, user_id } = req.body;
  // Validação: o valor deve ser positivo
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Valor inválido para pagamento.' });
  }
  // Cria o pedido de ordem PayPal com os dados da compra
  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: { currency_code: 'EUR', value: amount.toString() },
      reference_id: orderId.toString(), // ID da encomenda interna
      custom_id: user_id.toString()     // ID do utilizador
    }],
    // Define as URLs de retorno (após sucesso ou cancelamento)
    application_context: {
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/paypal-return`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout`,
    }
  });
  try {
    // Executa o pedido à API PayPal
    const order = await paypalClient.execute(request);
    // Obtém a URL de aprovação (onde o utilizador será redirecionado para pagar)
    const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;
    // Devolve o ID da ordem e a URL de aprovação ao frontend
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
// Após o utilizador aprovar o pagamento no PayPal, o frontend chama esta rota
// para capturar o valor da ordem e confirmar o pagamento.
router.post('/capture-paypal-order', async (req, res) => {
  const { orderID, orderId, user_id } = req.body;
  // Validação: ambos os IDs são obrigatórios
  if (!orderID || !orderId) {
    return res.status(400).json({ message: 'Dados incompletos.' });
  }
  // Cria o pedido de captura da ordem PayPal
  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  try {
    // Executa a captura
    const capture = await paypalClient.execute(request);
    // Se o pagamento foi concluído com sucesso
    if (capture.result.status === 'COMPLETED') {
      // Atualiza a encomenda para status_id = 2 e regista método "paypal"
      await db.promise().query(
        'UPDATE FakeOrders SET status_id = 2, payment_method = "paypal" WHERE order_id = ?',
        [orderId]
      );
      // (Opcional) enviar email de confirmação – pode ser adicionado aqui
      res.json({ message: 'Pagamento confirmado!' });
    } else {
      // Se o estado não for "COMPLETED", rejeita o pagamento
      res.status(400).json({ message: 'Pagamento não completado.' });
    }
  } catch (error) {
    console.error('Erro ao capturar pagamento:', error);
    res.status(500).json({ message: 'Erro ao capturar pagamento.' });
  }
});

module.exports = router;