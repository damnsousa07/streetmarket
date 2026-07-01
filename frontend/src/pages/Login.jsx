// ================================================================
// LOGIN.JSX – Página de autenticação (login)
// ================================================================
// Este componente permite ao utilizador autenticar-se na aplicação.
// Após o login bem-sucedido, guarda os dados da sessão no localStorage
// e redireciona para a página inicial.
// A sessão expira após 10 minutos (configurável).
// ================================================================

// Importação dos módulos necessários
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api/users';

// ================================================================
// CONSTANTES
// ================================================================

// Duração da sessão em milissegundos (10 minutos)
const SESSION_MS = 10 * 60 * 1000; // 10 minutos

// ================================================================
// COMPONENTE: Login
// ================================================================

export default function Login() {
    const navigate = useNavigate();   // Hook para navegação programática

    // ----- ESTADOS -----
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ================================================================
    // FUNÇÃO: Submeter formulário de login
    // ================================================================

    async function handleSubmit(e) {
        e.preventDefault(); // Previne o recarregamento da página

        // Validação: email e password são obrigatórios
        if (!email || !password) {
            setError('Preenche email e password.');
            return;
        }

        try {
            setLoading(true);
            setError('');

            // Chama a API para autenticar o utilizador
            const data = await loginUser(email, password);

            // Guarda os dados da sessão no localStorage
            localStorage.setItem('user_id', String(data.user_id));
            localStorage.setItem('user_nome', data.nome || '');
            localStorage.setItem('user_email', data.email || '');
            localStorage.setItem('auth_expires_at', String(Date.now() + SESSION_MS));
            localStorage.setItem('user_tipo', data.tipo || '');

            // Redireciona para a página inicial
            navigate('/');
            window.location.reload(); // Recarrega para atualizar a navbar
        } catch (e) {
            // Captura o erro da API
            const msg = e?.response?.data?.message;
            setError(msg || 'Falha no login.');
        } finally {
            setLoading(false);
        }
    }

    // Verifica se o erro contém "não verificada" (para mostrar link de verificação)
    const isNotVerified = error && error.toLowerCase().includes('não verificada');

    // ================================================================
    // RENDERIZAÇÃO
    // ================================================================

    return (
        <div className="container" style={{ padding: '32px 0' }}>
            <h1>Login</h1>

            {/* Formulário de login (card centralizado) */}
            <form onSubmit={handleSubmit} className="card" style={{ padding: 16, maxWidth: 420 }}>
                {/* Campo: Email */}
                <label>Email</label>
                <input
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                {/* Campo: Password */}
                <label style={{ marginTop: 12 }}>Password</label>
                <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {/* Link: Esqueci-me da password */}
                <Link
                    to="/forgot-password"
                    style={{
                        display: 'block',
                        marginTop: '8px',
                        color: '#007bff',
                        fontSize: '14px',
                        textDecoration: 'none',
                    }}
                >
                    Esqueci-me da palavra-passe
                </Link>

                {/* Mensagem de erro */}
                {error && <p style={{ color: 'salmon', marginTop: 10 }}>{error}</p>}

                {/* Link para verificação de email (se o erro for de conta não verificada) */}
                {isNotVerified && (
                    <p style={{ marginTop: '8px' }}>
                        <Link
                            to="/register"
                            state={{ email: email, step: 'verify' }}
                            style={{ color: '#007bff', fontWeight: 600 }}
                        >
                            Verificar email novamente
                        </Link>
                    </p>
                )}

                {/* Botão de submissão */}
                <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={loading}>
                    {loading ? 'A entrar...' : 'Entrar'}
                </button>

                {/* Link para registo */}
                <p style={{ marginTop: 12, color: 'var(--muted)' }}>
                    Ainda não tens conta?{' '}
                    <Link to="/register" style={{ fontWeight: 700 }}>
                        Regista-te
                    </Link>
                </p>
            </form>
        </div>
    );
}