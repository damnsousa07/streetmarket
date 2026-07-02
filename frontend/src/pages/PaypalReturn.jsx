// ================================================================
// PAYPALRETURN.JSX – Página de retorno do PayPal
// ================================================================

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export default function PaypalReturn() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [orderDetails, setOrderDetails] = useState(null);
    const hasProcessed = useRef(false);

    useEffect(() => {
        // 🔧 EVITA PROCESSAMENTO DUPLICADO
        if (hasProcessed.current) {
            console.log('⚠️ Já processado, ignorando...');
            return;
        }

        // O PayPal usa 'token' em vez de 'orderID' na URL de retorno
        let orderID = searchParams.get('token');
        if (!orderID) {
            orderID = searchParams.get('orderID');
        }
        if (!orderID) {
            orderID = searchParams.get('order_id');
        }

        const orderId = localStorage.getItem('pending_order_id');
        const userId = localStorage.getItem('pending_user_id') || localStorage.getItem('user_id');

        console.log('🔍 PAYPAL RETURN - orderID (extraído):', orderID);
        console.log('🔍 PAYPAL RETURN - orderId (localStorage):', orderId);
        console.log('🔍 PAYPAL RETURN - userId:', userId);

        if (orderID && orderId) {
            hasProcessed.current = true;

            const captureOrder = async () => {
                try {
                    console.log('🔍 A capturar pagamento PayPal com orderID:', orderID);
                    
                    // 🔧 CHAMA APENAS UMA VEZ
                    const captureResponse = await axios.post(`${API_URL}/payments/capture-paypal-order`, {
                        orderID: orderID,
                        orderId: orderId,
                        user_id: userId,
                    });
                    
                    console.log('✅ PayPal capture response:', captureResponse.data);

                    // 🔧 REMOVE OS ITENS DO LOCALSTORAGE PARA EVITAR REPETIÇÃO
                    localStorage.removeItem('pending_order_id');
                    localStorage.removeItem('pending_user_id');

                    // 🔧 MOSTRA O MODAL DE SUCESSO
                    setOrderDetails({
                        orderId: orderId,
                        message: captureResponse.data.message || 'Pagamento confirmado com sucesso!'
                    });
                    setShowSuccess(true);
                    setLoading(false);

                    // 🔧 NÃO REDIRECIONA AUTOMATICAMENTE - DEIXA O UTILIZADOR CLICAR NO BOTÃO

                } catch (err) {
                    console.error('❌ Erro ao capturar pagamento PayPal:', err);
                    console.error('❌ Detalhes:', err.response?.data);
                    
                    // 🔧 VERIFICA SE O ERRO É PORQUE JÁ FOI CAPTURADO
                    const errorData = err.response?.data;
                    const alreadyCaptured = errorData?.already_captured || 
                        errorData?.details?.some(d => d.issue === 'ORDER_ALREADY_CAPTURED');
                    
                    if (alreadyCaptured) {
                        // Se já foi capturado, significa que o pagamento foi bem-sucedido
                        localStorage.removeItem('pending_order_id');
                        localStorage.removeItem('pending_user_id');
                        setOrderDetails({
                            orderId: orderId,
                            message: 'Pagamento já foi processado com sucesso!'
                        });
                        setShowSuccess(true);
                        setLoading(false);
                    } else {
                        setError('Erro ao confirmar pagamento. Por favor, contacte o suporte.');
                        setLoading(false);
                        setTimeout(() => {
                            navigate('/checkout');
                        }, 3000);
                    }
                }
            };

            captureOrder();
        } else {
            console.log('⚠️ Dados incompletos para capturar pagamento');
            setLoading(false);
            setTimeout(() => {
                navigate('/');
            }, 2000);
        }
    }, [searchParams, navigate]);

    // ================================================================
    // RENDERIZAÇÃO
    // ================================================================

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'rgb(11, 18, 32)', minHeight: '100vh' }}>
                <h2 style={{ color: '#fff' }}>A processar pagamento PayPal...</h2>
                <p style={{ color: '#aaa' }}>Aguarde, estamos a confirmar o seu pagamento.</p>
            </div>
        );
    }

    if (error && !showSuccess) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'rgb(11, 18, 32)', minHeight: '100vh' }}>
                <h2 style={{ color: '#ff6b6b' }}>❌ Erro no pagamento</h2>
                <p style={{ color: '#aaa' }}>{error}</p>
                <p style={{ color: '#666' }}>A ser redirecionado...</p>
            </div>
        );
    }

    // ================================================================
    // MODAL DE SUCESSO (igual ao do Stripe)
    // ================================================================

    return (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'rgb(11, 18, 32)', minHeight: '100vh' }}>
            {showSuccess && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px',
                    }}
                >
                    <div
                        style={{
                            backgroundColor: '#fff',
                            borderRadius: '16px',
                            padding: '32px 24px',
                            maxWidth: '440px',
                            width: '100%',
                            textAlign: 'center',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                        <h2 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>Compra Feita!</h2>
                        <p style={{ color: '#555', fontSize: '16px', lineHeight: '1.5', marginBottom: '20px' }}>
                            Obrigado por comprar na StreetMarket!<br />
                            Para ver o estado do seu produto, consulte a aba das encomendas.
                            {orderDetails && (
                                <>
                                    <br /><br />
                                    <span style={{ fontSize: '14px', color: '#888' }}>Encomenda #{orderDetails.orderId}</span>
                                </>
                            )}
                        </p>
                        <button
                            onClick={() => {
                                setShowSuccess(false);
                                navigate('/orders');
                            }}
                            style={{
                                background: '#646cff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '40px',
                                padding: '12px 32px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            Ver encomendas
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}