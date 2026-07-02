// ================================================================
// FORGOTPASSWORD.JSX – Página para pedir redefinição de password
// ================================================================
// Este componente permite ao utilizador solicitar a redefinição
// da sua password.
// Funcionalidades:
// - Envio de email com link de redefinição (válido por 15 minutos)
// - Cooldown de 1 minuto entre pedidos (evita spam)
// - Contagem decrescente durante o cooldown
// - Feedback visual (sucesso/erro/cooldown)
// ================================================================

// Importação do React e dos hooks necessários
import { useState } from 'react';
// Importação do cliente API para comunicar com o backend
import { api } from '../api/client';

// ================================================================
// COMPONENTE: ForgotPassword
// ================================================================

export default function ForgotPassword() {
    // ----- ESTADOS -----
    const [email, setEmail] = useState('');                 // Email do utilizador
    const [message, setMessage] = useState('');             // Mensagem de sucesso
    const [error, setError] = useState('');                 // Mensagem de erro
    const [loading, setLoading] = useState(false);          // Indicador de carregamento
    const [cooldown, setCooldown] = useState(false);        // Indica se está em cooldown
    const [remainingSeconds, setRemainingSeconds] = useState(0); // Segundos restantes do cooldown
    const [countdownInterval, setCountdownInterval] = useState(null); // Referência ao intervalo

    // ================================================================
    // FUNÇÃO: Submeter formulário
    // ================================================================

    const handleSubmit = async (e) => {
        e.preventDefault(); // Previne o recarregamento da página

        // Limpa mensagens anteriores
        setError('');
        setMessage('');
        setCooldown(false);

        // Validação: email é obrigatório
        if (!email) {
            setError('Insere o teu email.');
            return;
        }

        try {
            setLoading(true);
            // Envia o pedido para o backend
            const res = await api.post('/users/forgot-password', { email });

            // Verifica se é um erro de cooldown (status 429)
            if (res.status === 429) {
                setCooldown(true);
                setRemainingSeconds(res.data.remainingSeconds || 60);
                setError(res.data.message);
                startCountdown(res.data.remainingSeconds || 60);
                return;
            }

            // Mensagem de sucesso
            setMessage(res.data.message);
        } catch (err) {
            // Verifica se o erro é de cooldown (status 429)
            if (err.response?.status === 429) {
                const data = err.response.data;
                setCooldown(true);
                setRemainingSeconds(data.remainingSeconds || 60);
                setError(data.message);
                startCountdown(data.remainingSeconds || 60);
            } else {
                // Outros erros (ex: servidor, rede, etc.)
                setError(err.response?.data?.message || 'Erro ao enviar pedido.');
            }
        } finally {
            setLoading(false);
        }
    };

    // ================================================================
    // FUNÇÃO: Iniciar contagem decrescente do cooldown
    // ================================================================

    const startCountdown = (seconds) => {
        // Limpa o intervalo anterior (se existir)
        if (countdownInterval) clearInterval(countdownInterval);

        // Cria um novo intervalo que atualiza a cada segundo
        const interval = setInterval(() => {
            setRemainingSeconds((prev) => {
                // Quando chegar a 0, limpa o intervalo e desativa o cooldown
                if (prev <= 1) {
                    clearInterval(interval);
                    setCooldown(false);
                    setError(''); // Limpa a mensagem de erro do cooldown
                    return 0;
                }
                return prev - 1; // Decrementa o contador
            });
        }, 1000);

        // Guarda a referência do intervalo para limpar depois
        setCountdownInterval(interval);
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
                        disabled={cooldown} // Desativa durante o cooldown
                    />

                    {/* Mensagem de erro (exceto durante cooldown, para não duplicar) */}
                    {error && !cooldown && <p style={{ color: 'salmon', marginTop: '10px' }}>{error}</p>}

                    {/* Mensagem de sucesso */}
                    {message && <p style={{ color: 'lightgreen', marginTop: '10px' }}>{message}</p>}

                    {/* Mensagem de cooldown (com contagem decrescente) */}
                    {cooldown && (
                        <p style={{ color: '#ff9800', marginTop: '10px' }}>
                            ⏳ Aguarde {remainingSeconds} segundos para tentar novamente.
                        </p>
                    )}

                    {/* Botão de submissão */}
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ marginTop: '16px', width: '100%' }}
                        disabled={loading || cooldown} // Desativa durante carregamento ou cooldown
                    >
                        {loading ? 'A enviar...' : cooldown ? `Aguarde ${remainingSeconds}s` : 'Enviar link'}
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