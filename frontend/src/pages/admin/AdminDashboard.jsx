// ================================================================
// ADMINDASHBOARD.JSX – Painel de administracao (dashboard)
// ================================================================
// Pagina inicial do painel administrativo.
// Exibe links para as seccoes de gestao: Encomendas, Produtos, Categorias e Notificacoes.
// Apenas utilizadores com chave de administrador tem acesso.
// ================================================================

import { Link } from 'react-router-dom';

// ================================================================
// FUNCAO AUXILIAR: Verificar chave de administrador
// ================================================================

function requireAdminKey() {
    const key = localStorage.getItem('admin_key');
    return !!key && key.trim().length > 0;
}

// ================================================================
// COMPONENTE: AdminDashboard
// ================================================================

export default function AdminDashboard() {
    // Renderizacao condicional: se nao houver chave admin, mostra erro
    if (!requireAdminKey()) {
        return (
            <div className="container" style={{ padding: '32px 0' }}>
                <h1>Admin</h1>
                <p style={{ color: 'salmon' }}>
                    Sem admin key. Vai a <strong>/admin/login</strong> e define a chave.
                </p>
            </div>
        );
    }

    // Renderizacao principal com os links para as seccoes admin
    return (
        <div className="container" style={{ padding: '32px 0' }}>
            <h1 style={{ marginTop: 0 }}>Admin</h1>
            <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                Escolhe uma secao.
            </p>

            {/* Links para as seccoes de administracao */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <Link className="btn btn-primary" to="/admin/orders">
                    Encomendas
                </Link>
                <Link className="btn btn-primary" to="/admin/products">
                    Produtos
                </Link>
                <Link className="btn btn-primary" to="/admin/categories">
                    Categorias
                </Link>
                <Link className="btn btn-primary" to="/admin/notifications">
                    Notificacoes
                </Link>
            </div>

            {/* Nota informativa sobre a estrutura */}
            <div style={{ marginTop: 16 }} className="card">
                <div style={{ padding: 14, color: 'var(--muted)' }}>
                    Nota: ja tens as paginas separadas a funcionar. A seguir, juntamos tudo numa unica pagina com scroll
                    sem rebentar a app.
                </div>
            </div>
        </div>
    );
}