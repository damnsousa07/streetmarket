// ForgotPassword.jsx
// Página para pedir redefinição de password.

import { useState } from 'react';
import { api } from '../api/client';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (!email) {
            setError('Insere o teu email.');
            return;
        }
        try {
            setLoading(true);
            const res = await api.post('/users/forgot-password', { email });
            setMessage(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao enviar pedido.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '32px 0', maxWidth: '420px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '24px' }}>
                <h1>Esqueci-me da password</h1>
                <p style={{ color: 'var(--muted)', marginTop: '6px' }}>
                    Insere o teu email e enviaremos um link para redefinires a password.
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        className="input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    {error && <p style={{ color: 'salmon', marginTop: '10px' }}>{error}</p>}
                    {message && <p style={{ color: 'lightgreen', marginTop: '10px' }}>{message}</p>}
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '16px', width: '100%' }} disabled={loading}>
                        {loading ? 'A enviar...' : 'Enviar link'}
                    </button>
                </form>
                <p style={{ marginTop: '16px', color: 'var(--muted)' }}>
                    <a href="/login" style={{ color: '#007bff' }}>Voltar ao login</a>
                </p>
            </div>
        </div>
    );
}