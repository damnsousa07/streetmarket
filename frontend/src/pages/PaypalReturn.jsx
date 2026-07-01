// ================================================================
// PAYPALRETURN.JSX – Página de retorno do PayPal
// ================================================================
// Esta página é chamada pelo PayPal após o utilizador aprovar o pagamento.
// Captura o pagamento no backend e redireciona o utilizador para
// a lista de encomendas (ou para o checkout em caso de erro).
// ================================================================

// Importação dos módulos necessários
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// ================================================================
// CONSTANTES
// ================================================================

// URL base da API (definida no .env)
const API_URL = import.meta.env.VITE_API_URL;

// ================================================================
// COMPONENTE: PaypalReturn
// ================================================================

export default function PaypalReturn() {
    // Obtém os parâmetros da URL (query string) enviados pelo PayPal
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // ================================================================
    // EFFECT: Processar o retorno do PayPal ao montar o componente
    // ================================================================

    useEffect(() => {
        // O PayPal devolve orderID e PayerID na query string (após aprovação)
        const orderID = searchParams.get('orderID');
        const payerID = searchParams.get('PayerID');

        // Recupera o ID da encomenda pendente (guardado no localStorage antes do redirecionamento)
        const orderId = localStorage.getItem('pending_order_id');
        const userId = localStorage.getItem('user_id');

        // Verifica se todos os dados necessários existem
        if (orderID && orderId) {
            // Função assíncrona para capturar o pagamento no backend
            const captureOrder = async () => {
                try {
                    // Chama o endpoint para capturar o pagamento PayPal
                    await axios.post(`${API_URL}/payments/capture-paypal-order`, {
                        orderID,
                        orderId,
                        user_id: userId,
                    });

                    // Remove o ID da encomenda pendente do localStorage
                    localStorage.removeItem('pending_order_id');

                    // Notifica o utilizador do sucesso
                    alert('Pagamento realizado com sucesso! O recibo será enviado por email.');

                    // Redireciona para a página de encomendas
                    navigate('/orders');
                } catch (err) {
                    // Em caso de erro, mostra mensagem e redireciona para o checkout
                    console.error('Erro ao capturar pagamento PayPal:', err);
                    alert('Erro ao confirmar pagamento. Tente novamente.');
                    navigate('/checkout');
                }
            };

            // Executa a captura do pagamento
            captureOrder();
        } else {
            // Se faltar orderID ou orderId, redireciona para a página inicial
            navigate('/');
        }
    }, [searchParams, navigate]); // Dependências: parâmetros da URL e função navigate

    // ================================================================
    // RENDERIZAÇÃO (tela de carregamento)
    // ================================================================

    return (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'rgb(11, 18, 32)', minHeight: '100vh' }}>
            <h2 style={{ color: '#fff' }}>A processar pagamento PayPal...</h2>
            <p style={{ color: '#aaa' }}>Aguarde, estamos a confirmar o seu pagamento.</p>
        </div>
    );
}