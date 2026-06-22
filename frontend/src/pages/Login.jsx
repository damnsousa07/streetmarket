// Login.jsx
// Página de autenticação (login) da aplicação.
// Utiliza a função loginUser da API para autenticar o utilizador e guardar a sessão.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api/users';

// Duração da sessão em milissegundos (10 minutos)
const SESSION_MS = 10 * 60 * 1000; // 10 minutos

export default function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!email || !password) {
            setError('Preenche email e password.');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const data = await loginUser(email, password);

            localStorage.setItem('user_id', String(data.user_id));
            localStorage.setItem('user_nome', data.nome || '');
            localStorage.setItem('user_email', data.email || '');
            localStorage.setItem('auth_expires_at', String(Date.now() + SESSION_MS));
            localStorage.setItem('user_tipo', data.tipo || '');
            
            navigate('/');
            window.location.reload();
        } catch (e) {
            const msg = e?.response?.data?.message;
            setError(msg || 'Falha no login.');
        } finally {
            setLoading(false);
        }
    }

    // Verifica se o erro contém "não verificada"
    const isNotVerified = error && error.toLowerCase().includes('não verificada');

    return (
        <div className="container" style={{ padding: '32px 0' }}>
            <h1>Login</h1>

            <form onSubmit={handleSubmit} className="card" style={{ padding: 16, maxWidth: 420 }}>
                <label>Email</label>
                <input
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <label style={{ marginTop: 12 }}>Password</label>
                <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

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

                {error && <p style={{ color: 'salmon', marginTop: 10 }}>{error}</p>}

                {/* Link para voltar à verificação, apenas se o erro for de conta não verificada */}
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

                <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={loading}>
                    {loading ? 'A entrar...' : 'Entrar'}
                </button>

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