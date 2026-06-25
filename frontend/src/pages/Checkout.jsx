// Checkout.jsx
import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import PaymentCheckout from '../components/PaymentCheckout';

export default function Checkout() {
    const { orderId } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();

    const userId = localStorage.getItem('user_id');
    const amount = Number(state?.amount) || 0;
    const nomeProduto = state?.nomeProduto || 'Produto';

    if (amount <= 0) {
        alert('Erro: valor do produto inválido.');
        navigate('/');
        return null;
    }

    const [showSuccess, setShowSuccess] = useState(false);

    const handleSuccess = () => {
        setShowSuccess(true);
    };

    const closeModalAndRedirect = () => {
        setShowSuccess(false);
        navigate('/orders');
    };

    const footerBgColor = 'rgb(11, 18, 32)';

    return (
        <div style={{ backgroundColor: footerBgColor, minHeight: '100vh', padding: '32px 0', position: 'relative' }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <h1 style={{ textAlign: 'center', marginBottom: 24, color: '#fff' }}>Finalizar Pagamento</h1>

                <PaymentCheckout
                    orderId={orderId}
                    amount={amount}
                    userId={userId}
                    onSuccess={handleSuccess}
                />
            </div>

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
                    onClick={closeModalAndRedirect}
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
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                        <h2 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>Compra Feita!</h2>
                        <p style={{ color: '#555', fontSize: '16px', lineHeight: '1.5', marginBottom: '20px' }}>
                            Obrigado por comprar o nosso produto <strong>“{nomeProduto}”</strong> pelo valor de <strong>€{amount.toFixed(2)}</strong>.<br />
                            Para ver o estado do seu produto, veja o email ou a aba das notificações.
                        </p>
                        <button
                            onClick={closeModalAndRedirect}
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
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}