// PaymentCheckout.jsx
// Componente de pagamento que suporta Stripe (cartão) e PayPal.
// Utiliza o Stripe Elements para capturar dados do cartão de forma segura.

import React, { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import stripePromise from '../utils/stripe';
import axios from 'axios';
import { updatePaymentMethod } from '../api/orders';

// URL base da API (definida no .env)
const API_URL = import.meta.env.VITE_API_URL;

// ------------------------------------------------------------
// Componente interno: formulário de pagamento com Stripe (cartão)
const StripeForm = ({ amount, orderId, userId, onSuccess }) => {
    const stripe = useStripe();
    const elements = useElements();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) {
            setError('Stripe não está pronto.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data } = await axios.post(`${API_URL}/payments/create-payment-intent`, {
                amount,
                orderId,
                user_id: userId,
            });

            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
                payment_method: { card: elements.getElement(CardElement) },
            });

            if (stripeError) throw new Error(stripeError.message);

            if (paymentIntent.status === 'succeeded') {
                // Guarda o método de pagamento
                await updatePaymentMethod(orderId, 'Débito');
                // Envia email de confirmação
                await axios.post(`${API_URL}/payments/send-order-email`, { orderId, userId });
                onSuccess();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div style={{
                border: '1px solid #ccc',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                backgroundColor: '#fff'
            }}>
                <CardElement options={{ hidePostalCode: true }} />
            </div>

            <button
                type="submit"
                disabled={!stripe || loading}
                style={{
                    background: '#646cff',
                    color: '#fff',
                    padding: '12px',
                    width: '100%',
                    borderRadius: '40px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                }}
            >
                {loading ? 'Processando...' : `Pagar €${amount}`}
            </button>

            {error && <div style={{ color: '#ff6b6b', marginTop: '12px', textAlign: 'center' }}>{error}</div>}
        </form>
    );
};

// ------------------------------------------------------------
// Componente principal
const PaymentCheckout = ({ orderId, amount, userId, onSuccess }) => {
    const [method, setMethod] = useState('card');

    const [paypalLoading, setPaypalLoading] = useState(false);
    const [paypalError, setPaypalError] = useState('');

    const handlePaypalRedirect = async () => {
        if (!amount || amount <= 0) {
            setPaypalError('Valor inválido para pagamento.');
            return;
        }

        setPaypalLoading(true);
        setPaypalError('');

        try {
            const { data } = await axios.post(`${API_URL}/payments/create-paypal-order`, {
                amount,
                orderId,
                user_id: userId,
            });

            // Guarda o método de pagamento antes de redirecionar
            await updatePaymentMethod(orderId, 'PayPal');

            localStorage.setItem('pending_order_id', orderId);
            window.location.href = data.approvalUrl;
        } catch (err) {
            console.error('Erro ao iniciar PayPal:', err);
            setPaypalError('Erro ao iniciar pagamento PayPal. Tente novamente.');
            setPaypalLoading(false);
        }
    };

    return (
        <div style={{
            maxWidth: 500,
            margin: '0 auto',
            padding: 20,
            backgroundColor: 'rgb(11, 18, 32)',
            borderRadius: 16
        }}>
            <div style={{ display: 'flex', gap: 20, marginBottom: 20, justifyContent: 'center' }}>
                <label style={{ color: '#fff', cursor: 'pointer' }}>
                    <input
                        type="radio"
                        value="card"
                        checked={method === 'card'}
                        onChange={() => setMethod('card')}
                    />
                    <span style={{ marginLeft: 6 }}>Cartão</span>
                </label>
                <label style={{ color: '#fff', cursor: 'pointer' }}>
                    <input
                        type="radio"
                        value="paypal"
                        checked={method === 'paypal'}
                        onChange={() => setMethod('paypal')}
                    />
                    <span style={{ marginLeft: 6 }}>PayPal</span>
                </label>
            </div>

            {method === 'card' && (
                <Elements stripe={stripePromise}>
                    <StripeForm amount={amount} orderId={orderId} userId={userId} onSuccess={onSuccess} />
                </Elements>
            )}

            {method === 'paypal' && (
                <div>
                    <button
                        onClick={handlePaypalRedirect}
                        disabled={paypalLoading}
                        style={{
                            background: '#0070ba',
                            color: '#fff',
                            padding: '12px',
                            width: '100%',
                            borderRadius: '40px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 600,
                            opacity: paypalLoading ? 0.7 : 1,
                        }}
                    >
                        {paypalLoading ? 'A redirecionar...' : 'Pagar com PayPal'}
                    </button>
                    {paypalError && <div style={{ color: '#ff6b6b', marginTop: '12px', textAlign: 'center' }}>{paypalError}</div>}
                </div>
            )}
        </div>
    );
};

export default PaymentCheckout;