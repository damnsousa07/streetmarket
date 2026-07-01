// ================================================================
// FORGOTPASSWORD.JSX – Página para pedir redefinição de password
// ================================================================
// Este componente permite ao utilizador solicitar a redefinição
// da sua password. Envia um email com um link para definir
// uma nova password (válido por 15 minutos).
// ================================================================

// Importação dos módulos necessários
import { useState } from 'react';
import { api } from '../api/client';

// ================================================================
// COMPONENTE: ForgotPassword
// ================================================================

export default function ForgotPassword() {
    // ----- ESTADOS -----
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');      // Mensagem de sucesso
    const [error, setError] = useState('');          // Mensagem de erro
    const [loading, setLoading] = useState(false);   // Indicador de carregamento

    // ================================================================
    // FUNÇÃO: Submeter formulário
    // ================================================================

    const handleSubmit = async (e) => {
        e.preventDefault(); // Previne o recarregamento da página

        // Limpa mensagens anteriores
        setError('');
        setMessage('');

        // Validação: email é obrigatório
        if (!email) {
            setError('Insere o teu email.');
            return;
        }

        try {
            setLoading(true);
            // Envia o pedido para o backend
            const res = await api.post('/users/forgot-password', { email });
            // Mostra a mensagem de sucesso (o backend devolve sempre a mesma mensagem)
            setMessage(res.data.message);
        } catch (err) {
            // Se houver erro, mostra a mensagem do backend ou uma genérica
            setError(err.response?.data?.message || 'Erro ao enviar pedido.');
        } finally {
            setLoading(false);
        }
    };

    // ================================================================
    // RENDERIZAÇÃO
    // ================================================================

    return (
        <div className="container" style={{ padding: '32px 0', maxWidth: '420px', margin: '0 auto' }}>
            {/* Card centralizado */}
            <div className="card" style={{ padding: '24px' }}>
                {/* Cabeçalho */}
                <h1>Esqueci-me da password</h1>
                <p style={{ color: 'var(--muted)', marginTop: '6px' }}>
                    Insere o teu email e enviaremos um link para redefinires a password.
                </p>

                {/* Formulário */}
                <form onSubmit={handleSubmit}>
                    {/* Campo de email */}
                    <input
                        type="email"
                        placeholder="Email"
                        className="input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    {/* Mensagens de erro e sucesso */}
                    {error && <p style={{ color: 'salmon', marginTop: '10px' }}>{error}</p>}
                    {message && <p style={{ color: 'lightgreen', marginTop: '10px' }}>{message}</p>}

                    {/* Botão de submissão */}
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ marginTop: '16px', width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? 'A enviar...' : 'Enviar link'}
                    </button>
                </form>

                {/* Link para voltar ao login */}
                <p style={{ marginTop: '16px', color: 'var(--muted)' }}>
                    <a href="/login" style={{ color: '#007bff' }}>Voltar ao login</a>
                </p>
            </div>
        </div>
    );
}