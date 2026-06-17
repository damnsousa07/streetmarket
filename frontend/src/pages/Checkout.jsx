// Checkout.jsx
// Página de finalização de pagamento, que exibe o componente PaymentCheckout (Stripe/PayPal).
// Mostra um modal de sucesso após o pagamento ser concluído.

import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import PaymentCheckout from '../components/PaymentCheckout';

export default function Checkout() {
    // Obtém o orderId da URL (ex: /checkout/123)
    const { orderId } = useParams();
    // Obtém os dados passados via navegação (state)
    const { state } = useLocation();
    // Hook para navegação programática
    const navigate = useNavigate();

    // Obtém o ID do utilizador a partir do localStorage
    const userId = localStorage.getItem('user_id');
    // O valor do pagamento (vem do state) – fallback para 0
    const amount = Number(state?.amount) || 0;
    // Nome do produto (vem do state) – fallback
    const nomeProduto = state?.nomeProduto || 'Produto';

    // Se o valor for inválido (<=0), redireciona para a home com um alerta
    if (amount <= 0) {
        alert('Erro: valor do produto inválido.');
        navigate('/');
        return null; // Não renderiza o componente
    }

    // Estado para controlar a visibilidade do modal de sucesso
    const [showSuccess, setShowSuccess] = useState(false);

    // Callback chamado quando o pagamento é bem-sucedido (vindo do PaymentCheckout)
    const handleSuccess = () => {
        setShowSuccess(true);
        // Não redireciona automaticamente; o utilizador clica em "OK" para ir para /orders
    };

    // Fecha o modal e redireciona para a lista de encomendas
    const closeModalAndRedirect = () => {
        setShowSuccess(false);
        navigate('/orders');
    };

    // Cor de fundo usada em vários locais (coerente com o layout)
    const footerBgColor = 'rgb(11, 18, 32)';

    // ------------------------------------------------------------
    // Renderização do checkout
    return (
        <div style={{ backgroundColor: footerBgColor, minHeight: '100vh', padding: '32px 0', position: 'relative' }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <h1 style={{ textAlign: 'center', marginBottom: 24, color: '#fff' }}>Finalizar Pagamento</h1>

                {/* Componente de pagamento (Stripe + PayPal) */}
                <PaymentCheckout
                    orderId={orderId}
                    amount={amount}
                    userId={userId}
                    onSuccess={handleSuccess}
                />
            </div>

            {/* Modal de sucesso (aparece quando showSuccess é true) */}
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
                    // Clicar no fundo escuro também fecha o modal
                    onClick={closeModalAndRedirect}
                >
                    {/* Conteúdo do modal (bloco branco) */}
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
                        // Evita que o clique dentro do modal feche o modal (propagação interrompida)
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