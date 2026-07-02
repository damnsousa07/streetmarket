// ================================================================
// PAYMENTCHECKOUT.JSX – Componente de pagamento (Stripe e PayPal)
// ================================================================
// Permite ao utilizador escolher entre pagamento com cartao (Stripe) ou PayPal.
// Utiliza Stripe Elements para processar o cartao de forma segura.
// ================================================================

import React, { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import stripePromise from '../utils/stripe';
import axios from 'axios';
import { updatePaymentMethod } from '../api/orders';

const API_URL = import.meta.env.VITE_API_URL;

// ================================================================
// COMPONENTE INTERNO: StripeForm (pagamento com cartao)
// ================================================================

// Formulario para pagamento com cartao de credito
// Utiliza Stripe Elements para capturar os dados do cartao
const StripeForm = ({ amount, orderId, userId, onSuccess }) => {
    const stripe = useStripe();
    const elements = useElements();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Verifica se o Stripe ja esta carregado
        if (!stripe || !elements) {
            setError('Stripe nao esta pronto.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Cria o PaymentIntent no backend
            const { data } = await axios.post(`${API_URL}/payments/create-payment-intent`, {
                amount,
                orderId,
                user_id: userId,
            });

            // Confirma o pagamento com o cartao do utilizador
            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
                payment_method: { card: elements.getElement(CardElement) },
            });

            if (stripeError) throw new Error(stripeError.message);

            // Se o pagamento for bem-sucedido, confirma a encomenda e decrementa o stock
            if (paymentIntent.status === 'succeeded') {
                console.log('CONFIRMANDO ENCOMENDA (Stripe):', { orderId, userId });
                await axios.post(`${API_URL}/payments/confirm-order`, {
                    orderId: orderId,
                    userId: userId,
                });
                console.log('Encomenda confirmada e stock decrementado (Stripe)');

                await updatePaymentMethod(orderId, 'Debito');
                onSuccess();
            }
        } catch (err) {
            console.error('Erro no pagamento:', err);
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

// ================================================================
// COMPONENTE PRINCIPAL: PaymentCheckout
// ================================================================

// Componente principal que permite escolher entre cartao e PayPal
const PaymentCheckout = ({ orderId, amount, userId, onSuccess, productData }) => {
    const [method, setMethod] = useState('card');

    const [paypalLoading, setPaypalLoading] = useState(false);
    const [paypalError, setPaypalError] = useState('');

    // Funcao para redirecionar para o PayPal
    const handlePaypalRedirect = async () => {
        if (!amount || amount <= 0) {
            setPaypalError('Valor invalido para pagamento.');
            return;
        }

        console.log('productData recebido no PayPal:', productData);
        console.log('product_id:', productData?.product_id);
        console.log('tamanho:', productData?.tamanho);
        
        // Verifica se os dados do produto estao completos
        if (!productData || !productData.product_id) {
            setPaypalError('Dados do produto incompletos. Por favor, tente novamente.');
            setPaypalLoading(false);
            return;
        }

        setPaypalLoading(true);
        setPaypalError('');

        try {
            // Cria a encomenda antes de redirecionar para o PayPal
            const orderData = {
                user_id: userId,
                product_id: productData.product_id,
                tamanho: productData.tamanho || 'N/A',
                quantidade: productData.quantidade || 1,
                status_id: 1,
            };

            console.log('A criar encomenda (PayPal) com dados:', orderData);

            const createOrderResponse = await axios.post(`${API_URL}/orders`, orderData);
            const createdOrderId = createOrderResponse.data.order_id;

            if (!createdOrderId) {
                throw new Error('Nao foi possivel criar a encomenda.');
            }

            console.log('Encomenda criada (PayPal) com ID:', createdOrderId);

            // Cria a ordem no PayPal
            const { data } = await axios.post(`${API_URL}/payments/create-paypal-order`, {
                amount,
                orderId: createdOrderId,
                user_id: userId,
            });

            // Guarda o ID da encomenda pendente para usar no retorno
            localStorage.setItem('pending_order_id', createdOrderId);
            localStorage.setItem('pending_user_id', userId);

            // Redireciona para o PayPal
            window.location.href = data.approvalUrl;
        } catch (err) {
            console.error('Erro ao iniciar PayPal:', err);
            setPaypalError(err.response?.data?.message || 'Erro ao iniciar pagamento PayPal. Tente novamente.');
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
            {/* Selecao do metodo de pagamento */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 20, justifyContent: 'center' }}>
                <label style={{ color: '#fff', cursor: 'pointer' }}>
                    <input
                        type="radio"
                        value="card"
                        checked={method === 'card'}
                        onChange={() => setMethod('card')}
                    />
                    <span style={{ marginLeft: 6 }}>Cartao</span>
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

            {/* Renderiza o StripeForm se o metodo for cartao */}
            {method === 'card' && (
                <Elements stripe={stripePromise}>
                    <StripeForm amount={amount} orderId={orderId} userId={userId} onSuccess={onSuccess} />
                </Elements>
            )}

            {/* Renderiza o botao PayPal se o metodo for PayPal */}
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
                        {paypalLoading ? 'A processar...' : 'Pagar com PayPal'}
                    </button>
                    {paypalError && <div style={{ color: '#ff6b6b', marginTop: '12px', textAlign: 'center' }}>{paypalError}</div>}
                </div>
            )}
        </div>
    );
};

export default PaymentCheckout;