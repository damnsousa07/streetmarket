// Login.jsx
// Página de autenticação (login) da aplicação.
// Utiliza a função loginUser da API para autenticar o utilizador e guardar a sessão.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api/users';

// Duração da sessão em milissegundos (10 minutos)
const SESSION_MS = 10 * 60 * 1000; // 10 minutos

export default function Login() {
    // Hook para navegação programática
    const navigate = useNavigate();

    // Estados do formulário
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Submissão do formulário de login
    async function handleSubmit(e) {
        e.preventDefault(); // Evita o recarregamento da página

        // Validação básica dos campos
        if (!email || !password) {
            setError('Preenche email e password.');
            return;
        }

        try {
            setLoading(true);   // Ativa o indicador de carregamento
            setError('');       // Limpa erros anteriores

            // Chama a API para fazer login
            const data = await loginUser(email, password);

            // Guarda os dados da sessão no localStorage
            localStorage.setItem('user_id', String(data.user_id));
            localStorage.setItem('user_nome', data.nome || '');
            localStorage.setItem('user_email', data.email || '');

            // Define a expiração da sessão (10 minutos a partir de agora)
            localStorage.setItem('auth_expires_at', String(Date.now() + SESSION_MS));

            // Redireciona para a página inicial e recarrega para atualizar a navbar
            navigate('/');
            window.location.reload(); // força navbar atualizar já
        } catch (e) {
            // Captura o erro vindo do backend ou mensagem genérica
            const msg = e?.response?.data?.message;
            setError(msg || 'Falha no login.');
        } finally {
            setLoading(false); // Desativa o indicador de carregamento
        }
    }

    return (
        <div className="container" style={{ padding: '32px 0' }}>
            <h1>Login</h1>

            {/* Formulário de login */}
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

                {/* Link para recuperação de password */}
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

                {/* Mensagem de erro (se houver) */}
                {error && <p style={{ color: 'salmon', marginTop: 10 }}>{error}</p>}

                {/* Botão de submissão (desativado durante o carregamento) */}
                <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={loading}>
                    {loading ? 'A entrar...' : 'Entrar'}
                </button>

                {/* Link para a página de registo */}
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