// ================================================================
// ADMINLOGIN.JSX – Página de autenticação do painel administrativo
// ================================================================
// Este componente permite ao administrador definir ou limpar a chave
// de administrador (admin_key) no localStorage.
// A chave é utilizada em todas as chamadas à API admin (header x-admin-key).
// ================================================================

// Importação dos módulos necessários
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ================================================================
// COMPONENTE: AdminLogin
// ================================================================

export default function AdminLogin() {
    // Estado que guarda a chave de administrador
    // Inicializada com o valor do localStorage (se existir)
    const [key, setKey] = useState(localStorage.getItem('admin_key') || '');
    const navigate = useNavigate();

    // ----- FUNÇÃO: Submeter formulário (guardar chave) -----
    const handleSubmit = (e) => {
        e.preventDefault(); // Previne o recarregamento da página
        localStorage.setItem('admin_key', key.trim()); // Guarda a chave (remove espaços extra)
        navigate('/admin', { replace: true }); // Redireciona para o dashboard admin
    };

    // ----- FUNÇÃO: Limpar chave -----
    const handleClear = () => {
        localStorage.removeItem('admin_key'); // Remove a chave do localStorage
        setKey(''); // Limpa o campo de texto
    };

    // ----- RENDERIZAÇÃO -----
    return (
        <div className="container" style={{ padding: '64px 0' }}>
            {/* Card centralizado */}
            <div className="card" style={{ padding: 18, maxWidth: 460, margin: '0 auto' }}>
                {/* Cabeçalho */}
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

                    {/* Botões: Entrar e Limpar */}
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