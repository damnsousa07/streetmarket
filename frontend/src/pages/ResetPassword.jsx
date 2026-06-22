// ResetPassword.jsx
// Página para definir nova password com token.

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        // ----- VALIDAÇÃO: mínimo 8 caracteres -----
        if (password.length < 8) {
            setError('A password deve ter pelo menos 8 caracteres.');
            return;
        }
        if (password !== confirm) {
            setError('As passwords não coincidem.');
            return;
        }

        try {
            setLoading(true);
            const res = await api.post('/users/reset-password', { token, newPassword: password });
            setMessage(res.data.message);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao redefinir password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '32px 0', maxWidth: '420px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '24px' }}>
                <h1>Nova password</h1>
                <p style={{ color: 'var(--muted)', marginTop: '6px' }}>
                    Define uma nova password para a tua conta.
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="Nova password"
                        className="input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                    />
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
                    {error && <p style={{ color: 'salmon', marginTop: '10px' }}>{error}</p>}
                    {message && <p style={{ color: 'lightgreen', marginTop: '10px' }}>{message}</p>}
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '16px', width: '100%' }} disabled={loading}>
                        {loading ? 'A atualizar...' : 'Atualizar password'}
                    </button>
                </form>
            </div>
        </div>
    );
}