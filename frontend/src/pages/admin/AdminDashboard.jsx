// ================================================================
// ADMINDASHBOARD.JSX – Painel de administração (dashboard)
// ================================================================
// Este componente é a página inicial do painel administrativo.
// Exibe links para as diferentes secções de gestão:
// - Encomendas
// - Produtos
// - Categorias
// - Notificações
// Apenas utilizadores com chave de administrador têm acesso.
// ================================================================

// Importação dos módulos necessários
import { Link } from 'react-router-dom';

// ================================================================
// FUNÇÃO AUXILIAR: Verificar chave de administrador
// ================================================================

function requireAdminKey() {
    const key = localStorage.getItem('admin_key');
    return !!key && key.trim().length > 0;
}

// ================================================================
// COMPONENTE: AdminDashboard
// ================================================================

export default function AdminDashboard() {
    // ----- RENDERIZAÇÃO CONDICIONAL (sem chave admin) -----
    // Se não houver chave, mostra mensagem de erro
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

    // ----- RENDERIZAÇÃO PRINCIPAL (com chave admin) -----
    return (
        <div className="container" style={{ padding: '32px 0' }}>
            {/* Cabeçalho */}
            <h1 style={{ marginTop: 0 }}>Admin</h1>
            <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                Escolhe uma secção.
            </p>

            {/* Links para as secções de administração */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                {/* Link para gestão de encomendas */}
                <Link className="btn btn-primary" to="/admin/orders">
                    Encomendas
                </Link>
                
                {/* Link para gestão de produtos */}
                <Link className="btn btn-primary" to="/admin/products">
                    Produtos
                </Link>

                {/* Link para gestão de categorias */}
                <Link className="btn btn-primary" to="/admin/categories">
                    Categorias
                </Link>

                {/* Link para gestão de notificações */}
                <Link className="btn btn-primary" to="/admin/notifications">
                    Notificações
                </Link>
            </div>

            {/* Nota informativa sobre a estrutura */}
            <div style={{ marginTop: 16 }} className="card">
                <div style={{ padding: 14, color: 'var(--muted)' }}>
                    Nota: já tens as páginas separadas a funcionar. A seguir, juntamos tudo numa única página com scroll
                    sem rebentar a app.
                </div>
            </div>
        </div>
    );
}