// ================================================================
// CHECKOUT.JSX – Página de finalização de pagamento
// ================================================================
// Este componente exibe a página de checkout onde o utilizador
// pode escolher o método de pagamento (Cartão ou PayPal).
// Utiliza o componente PaymentCheckout para processar o pagamento.
// Após o pagamento bem-sucedido, mostra um modal de sucesso.
// ================================================================

// Importação dos módulos necessários
import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import PaymentCheckout from '../components/PaymentCheckout';

// ================================================================
// COMPONENTE: Checkout
// ================================================================

export default function Checkout() {
    // ----- OBTÉM PARÂMETROS DA URL E ESTADO DA NAVEGAÇÃO -----
    const { orderId } = useParams();                 // ID da encomenda (da URL: /checkout/:orderId)
    const { state } = useLocation();                // Dados passados via navegação (state)
    const navigate = useNavigate();                 // Hook para navegação programática

    // ----- DADOS DO UTILIZADOR E DA ENCOMENDA -----
    const userId = localStorage.getItem('user_id'); // ID do utilizador logado
    const amount = Number(state?.amount) || 0;      // Valor do produto (vem do state)
    const nomeProduto = state?.nomeProduto || 'Produto'; // Nome do produto (vem do state)

    // ----- VALIDAÇÃO: Valor inválido -----
    // Se o valor for inválido (<=0), redireciona para a home com um alerta
    if (amount <= 0) {
        alert('Erro: valor do produto inválido.');
        navigate('/');
        return null;
    }

    // ----- ESTADO DO MODAL DE SUCESSO -----
    const [showSuccess, setShowSuccess] = useState(false);

    // ----- CALLBACK: Pagamento bem-sucedido -----
    // Chamado pelo componente PaymentCheckout quando o pagamento é concluído
    const handleSuccess = () => {
        setShowSuccess(true);
    };

    // ----- FUNÇÃO: Fechar modal e redirecionar para encomendas -----
    const closeModalAndRedirect = () => {
        setShowSuccess(false);
        navigate('/orders'); // Redireciona para a lista de encomendas
    };

    // ----- COR DE FUNDO (consistente com o layout) -----
    const footerBgColor = 'rgb(11, 18, 32)';

    // ----- RENDERIZAÇÃO -----
    return (
        <div style={{ backgroundColor: footerBgColor, minHeight: '100vh', padding: '32px 0', position: 'relative' }}>
            {/* Container centralizado */}
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
                {/* Título */}
                <h1 style={{ textAlign: 'center', marginBottom: 24, color: '#fff' }}>
                    Finalizar Pagamento
                </h1>

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
                        {/* Ícone de sucesso */}
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                        <h2 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>Compra Feita!</h2>
                        {/* Detalhes da compra */}
                        <p style={{ color: '#555', fontSize: '16px', lineHeight: '1.5', marginBottom: '20px' }}>
                            Obrigado por comprar o nosso produto <strong>“{nomeProduto}”</strong> pelo valor de <strong>€{amount.toFixed(2)}</strong>.<br />
                            Para ver o estado do seu produto, veja o email ou a aba das notificações.
                        </p>
                        {/* Botão OK (fecha o modal e redireciona) */}
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