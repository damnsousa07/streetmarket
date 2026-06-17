// PaymentCheckout.jsx
// Componente de pagamento que suporta Stripe (cartão) e PayPal.
// Utiliza o Stripe Elements para capturar dados do cartão de forma segura.

import React, { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import stripePromise from '../utils/stripe';
import axios from 'axios';

// URL base da API (definida no .env)
const API_URL = import.meta.env.VITE_API_URL;

// ------------------------------------------------------------
// Componente interno: formulário de pagamento com Stripe (cartão)
// Recebe: amount (valor), orderId, userId, onSuccess (callback)
const StripeForm = ({ amount, orderId, userId, onSuccess }) => {
    // Hook do Stripe para confirmar o pagamento
    const stripe = useStripe();
    // Hook para aceder aos elementos do formulário (CardElement)
    const elements = useElements();

    // Estado do loading e de erros
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Submissão do formulário de pagamento
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Verifica se o Stripe já está carregado
        if (!stripe || !elements) {
            setError('Stripe não está pronto.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Cria o PaymentIntent no backend
            const { data } = await axios.post(`${API_URL}/payments/create-payment-intent`, {
                amount,
                orderId,
                user_id: userId,
            });

            // 2. Confirma o pagamento com o cartão fornecido
            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
                payment_method: { card: elements.getElement(CardElement) },
            });

            if (stripeError) throw new Error(stripeError.message);

            // 3. Se o pagamento foi bem-sucedido, chama o callback
            if (paymentIntent.status === 'succeeded') onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Input do cartão (estilizado) */}
            <div style={{
                border: '1px solid #ccc',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                backgroundColor: '#fff'
            }}>
                <CardElement options={{ hidePostalCode: true }} />
            </div>

            {/* Botão de pagamento */}
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

            {/* Mensagem de erro */}
            {error && <div style={{ color: '#ff6b6b', marginTop: '12px', textAlign: 'center' }}>{error}</div>}
        </form>
    );
};

// ------------------------------------------------------------
// Componente principal: escolhe entre cartão (Stripe) e PayPal
const PaymentCheckout = ({ orderId, amount, userId, onSuccess }) => {
    // Método de pagamento selecionado: 'card' ou 'paypal'
    const [method, setMethod] = useState('card');

    // Estados específicos para PayPal
    const [paypalLoading, setPaypalLoading] = useState(false);
    const [paypalError, setPaypalError] = useState('');

    // Inicia o fluxo de pagamento com PayPal
    const handlePaypalRedirect = async () => {
        // Valida o valor do pagamento
        if (!amount || amount <= 0) {
            setPaypalError('Valor inválido para pagamento.');
            return;
        }

        setPaypalLoading(true);
        setPaypalError('');

        try {
            // Cria a ordem PayPal no backend
            const { data } = await axios.post(`${API_URL}/payments/create-paypal-order`, {
                amount,
                orderId,
                user_id: userId,
            });

            // Guarda o ID da ordem pendente para usar depois do retorno
            localStorage.setItem('pending_order_id', orderId);

            // Redireciona o utilizador para o PayPal
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
            {/* Toggle entre métodos de pagamento */}
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

            {/* Renderiza o formulário Stripe se o método for cartão */}
            {method === 'card' && (
                <Elements stripe={stripePromise}>
                    <StripeForm amount={amount} orderId={orderId} userId={userId} onSuccess={onSuccess} />
                </Elements>
            )}

            {/* Renderiza o botão PayPal se o método for PayPal */}
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