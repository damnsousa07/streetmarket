// ================================================================
// PAYMENTCHECKOUT.JSX – Componente de pagamento (Stripe e PayPal)
// ================================================================
// Este componente permite ao utilizador escolher entre pagamento com
// cartão de crédito (Stripe) ou PayPal.
// Utiliza o Stripe Elements para processar o cartão de forma segura.
// ================================================================

// Importação dos módulos necessários
import React, { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import stripePromise from '../utils/stripe';
import axios from 'axios';
import { updatePaymentMethod } from '../api/orders';

// URL base da API (definida no .env)
const API_URL = import.meta.env.VITE_API_URL;

// ================================================================
// COMPONENTE INTERNO: StripeForm (pagamento com cartão)
// ================================================================

// Formulário para pagamento com cartão de crédito
// Utiliza o Stripe Elements para capturar os dados do cartão
const StripeForm = ({ amount, orderId, userId, onSuccess }) => {
    const stripe = useStripe();          // Hook do Stripe para confirmar pagamento
    const elements = useElements();      // Hook para aceder aos elementos do formulário

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ----- SUBMISSÃO DO FORMULÁRIO -----
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

            // 2. Confirma o pagamento com o cartão do utilizador
            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
                payment_method: { card: elements.getElement(CardElement) },
            });

            if (stripeError) throw new Error(stripeError.message);

            // 3. Se o pagamento for bem-sucedido
            if (paymentIntent.status === 'succeeded') {
                // Guarda o método de pagamento (Débito)
                await updatePaymentMethod(orderId, 'Débito');
                // Envia email de confirmação
                await axios.post(`${API_URL}/payments/send-order-email`, { orderId, userId });
                onSuccess();  // Chama o callback de sucesso
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Campo do cartão (estilizado) */}
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

// ================================================================
// COMPONENTE PRINCIPAL: PaymentCheckout
// ================================================================

// Componente que permite escolher entre cartão e PayPal
const PaymentCheckout = ({ orderId, amount, userId, onSuccess }) => {
    // Estado para controlar o método de pagamento selecionado
    const [method, setMethod] = useState('card');

    // Estados para PayPal
    const [paypalLoading, setPaypalLoading] = useState(false);
    const [paypalError, setPaypalError] = useState('');

    // ----- FUNÇÃO: Redirecionar para PayPal -----
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

            // Guarda o método de pagamento antes de redirecionar
            await updatePaymentMethod(orderId, 'PayPal');

            // Guarda o ID da ordem pendente
            localStorage.setItem('pending_order_id', orderId);

            // Redireciona o utilizador para o PayPal
            window.location.href = data.approvalUrl;
        } catch (err) {
            console.error('Erro ao iniciar PayPal:', err);
            setPaypalError('Erro ao iniciar pagamento PayPal. Tente novamente.');
            setPaypalLoading(false);
        }
    };

    // ----- RENDERIZAÇÃO -----
    return (
        <div style={{
            maxWidth: 500,
            margin: '0 auto',
            padding: 20,
            backgroundColor: 'rgb(11, 18, 32)',
            borderRadius: 16
        }}>
            {/* Seleção do método de pagamento */}
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

            {/* Renderiza o StripeForm se o método for cartão */}
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