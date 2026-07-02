// ================================================================
// ADMINLOGIN.JSX – Pagina de autenticacao do painel administrativo
// ================================================================
// Permite ao administrador definir ou limpar a chave de administrador
// no localStorage. A chave e usada em todas as chamadas a API admin.
// ================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ================================================================
// COMPONENTE: AdminLogin
// ================================================================

export default function AdminLogin() {
    // Estado que guarda a chave de administrador
    // Inicializada com o valor do localStorage se existir
    const [key, setKey] = useState(localStorage.getItem('admin_key') || '');
    const navigate = useNavigate();

    // Funcao para submeter o formulario e guardar a chave
    const handleSubmit = (e) => {
        e.preventDefault();
        localStorage.setItem('admin_key', key.trim());
        navigate('/admin', { replace: true });
    };

    // Funcao para limpar a chave do localStorage
    const handleClear = () => {
        localStorage.removeItem('admin_key');
        setKey('');
    };

    return (
        <div className="container" style={{ padding: '64px 0' }}>
            <div className="card" style={{ padding: 18, maxWidth: 460, margin: '0 auto' }}>
                <h1 style={{ marginTop: 0 }}>Admin</h1>
                <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                    Insere a chave de administrador (header <strong>x-admin-key</strong>).
                </p>

                <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>
                        Admin key
                    </label>
                    <input
                        className="input"
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="streetmarket_admin_2026"
                        required
                    />

                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                        <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>
                            Entrar
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={handleClear}>
                            Limpar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}