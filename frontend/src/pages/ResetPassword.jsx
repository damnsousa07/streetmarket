// ================================================================
// RESETPASSWORD.JSX – Página para redefinir password
// ================================================================
// Este componente permite ao utilizador definir uma nova password
// utilizando um token recebido por email (válido por 15 minutos).
// O token é passado como parâmetro na URL (/reset-password/:token).
// ================================================================

// Importação dos módulos necessários
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

// ================================================================
// COMPONENTE: ResetPassword
// ================================================================

export default function ResetPassword() {
    const { token } = useParams();          // Token da URL (enviado por email)
    const navigate = useNavigate();         // Hook para navegação programática

    // ----- ESTADOS -----
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ================================================================
    // FUNÇÃO: Submeter nova password
    // ================================================================

    const handleSubmit = async (e) => {
        e.preventDefault(); // Previne o recarregamento da página
        setError('');
        setMessage('');

        // ----- VALIDAÇÕES -----
        // Password: mínimo 8 caracteres
        if (password.length < 8) {
            setError('A password deve ter pelo menos 8 caracteres.');
            return;
        }
        // Confirmar password
        if (password !== confirm) {
            setError('As passwords não coincidem.');
            return;
        }

        try {
            setLoading(true);
            // Envia o pedido para o backend
            const res = await api.post('/users/reset-password', { 
                token,                  // Token de redefinição
                newPassword: password   // Nova password
            });
            setMessage(res.data.message);
            // Redireciona para o login após 3 segundos
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao redefinir password.');
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
                <h1>Nova password</h1>
                <p style={{ color: 'var(--muted)', marginTop: '6px' }}>
                    Define uma nova password para a tua conta.
                </p>

                {/* Formulário */}
                <form onSubmit={handleSubmit}>
                    {/* Campo: Nova password */}
                    <input
                        type="password"
                        placeholder="Nova password"
                        className="input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                    />

                    {/* Campo: Confirmar password */}
                    <input
                        type="password"
                        placeholder="Confirmar password"
                        className="input"
                        style={{ marginTop: '12px' }}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        minLength={8}
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
                        {loading ? 'A atualizar...' : 'Atualizar password'}
                    </button>
                </form>
            </div>
        </div>
    );
}