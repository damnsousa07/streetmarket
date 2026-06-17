// AdminLogin.jsx
// Página de autenticação para o painel de administração.
// Permite definir ou limpar a chave de administrador (admin_key) no localStorage.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
    // Estado que guarda a chave de administrador (inicializada com o valor do localStorage, se existir)
    const [key, setKey] = useState(localStorage.getItem('admin_key') || '');
    const navigate = useNavigate();

    // Submissão do formulário: guarda a chave no localStorage e redireciona para o dashboard admin
    function handleSubmit(e) {
        e.preventDefault(); // Previne o recarregamento da página
        localStorage.setItem('admin_key', key.trim()); // Guarda a chave (sem espaços)
        navigate('/admin', { replace: true }); // Redireciona para /admin, substituindo a entrada do histórico
    }

    // Função que limpa a chave do localStorage e reseta o campo de input
    function handleClear() {
        localStorage.removeItem('admin_key'); // Remove a chave do storage
        setKey(''); // Limpa o campo de texto
    }

    return (
        <div className="container" style={{ padding: '64px 0' }}>
            <div className="card" style={{ padding: 18, maxWidth: 460, margin: '0 auto' }}>
                <h1 style={{ marginTop: 0 }}>Admin</h1>
                <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                    Insere a chave de administrador (header <strong>x-admin-key</strong>).
                </p>

                {/* Formulário para inserir a chave */}
                <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>
                        Admin key
                    </label>
                    <input
                        className="input"
                        type="password" // Campo de password para ocultar a chave
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="streetmarket_admin_2026"
                        required
                    />

                    {/* Botões para Entrar e Limpar */}
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