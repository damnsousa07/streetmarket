// AdminPanel.jsx
// Painel de administração com links para as secções de gestão (encomendas, produtos, categorias, notificações).
// Inclui verificação de chave de administrador e funcionalidade de logout.

import { Link, useNavigate } from 'react-router-dom';

// Função que verifica se existe uma chave de administrador válida no localStorage
function requireAdminKey() {
    const key = localStorage.getItem('admin_key');
    return !!key && key.trim().length > 0;
}

export default function AdminPanel() {
    const navigate = useNavigate();

    // Se não houver chave de administrador, redireciona para a página de login admin
    if (!requireAdminKey()) {
        navigate('/admin/login', { replace: true });
        return null; // Não renderiza nada enquanto redireciona
    }

    // Função para terminar a sessão de administrador
    function logout() {
        localStorage.removeItem('admin_key'); // Remove a chave do localStorage
        navigate('/', { replace: true });     // Redireciona para a página inicial
    }

    // Estilos reutilizáveis para os botões/links do painel
    const btnStyle = {
        width: '100%',
        maxWidth: 360,
        padding: '16px 18px',
        fontSize: 16,
        fontWeight: 900,
        borderRadius: 14,
        textAlign: 'center',
    };

    return (
        <div className="container" style={{ padding: '32px 0' }}>
            {/* Container centralizado verticalmente */}
            <div
                style={{
                    minHeight: 'calc(100vh - 120px)',
                    display: 'grid',
                    placeItems: 'center',
                }}
            >
                <div style={{ width: '100%', maxWidth: 520 }}>
                    {/* Cabeçalho */}
                    <h1 style={{ textAlign: 'center', marginTop: 0 }}>Painel Admin</h1>
                    <p style={{ color: 'var(--muted)', textAlign: 'center', marginTop: 6 }}>
                        Escolhe uma área para gerir.
                    </p>

                    {/* Links para as secções de administração */}
                    <div style={{ display: 'grid', gap: 12, marginTop: 18, justifyItems: 'center' }}>
                        <Link className="btn btn-primary" style={btnStyle} to="/admin/orders">
                            Encomendas
                        </Link>

                        <Link className="btn btn-primary" style={btnStyle} to="/admin/products">
                            Produtos
                        </Link>

                        <Link className="btn btn-primary" style={btnStyle} to="/admin/categories">
                            Categorias
                        </Link>

                        <Link className="btn btn-primary" style={btnStyle} to="/admin/notifications">
                            Notificações
                        </Link>

                        {/* Botão de logout (estilo ghost) */}
                        <button className="btn btn-ghost" style={{ ...btnStyle, maxWidth: 220 }} onClick={logout}>
                            Sair do Admin
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}