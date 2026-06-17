// AdminDashboard.jsx
// Página inicial do painel de administração com links para as secções de gestão.

import { Link } from 'react-router-dom';

// Função que verifica se existe uma chave de administrador válida no localStorage
function requireAdminKey() {
    const key = localStorage.getItem('admin_key');
    return !!key && key.trim().length > 0;
}

export default function AdminDashboard() {
    // Se não houver chave, mostra mensagem de erro (sem acesso)
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

    return (
        <div className="container" style={{ padding: '32px 0' }}>
            {/* Cabeçalho */}
            <h1 style={{ marginTop: 0 }}>Admin</h1>
            <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                Escolhe uma secção.
            </p>

            {/* Links para as secções de administração */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <Link className="btn btn-primary" to="/admin/orders">Encomendas</Link>
                <Link className="btn btn-primary" to="/admin/products">Produtos</Link>
            </div>

            {/* Nota informativa sobre a estrutura futura */}
            <div style={{ marginTop: 16 }} className="card">
                <div style={{ padding: 14, color: 'var(--muted)' }}>
                    Nota: já tens as páginas separadas a funcionar. A seguir, juntamos tudo numa única página com scroll
                    sem rebentar a app.
                </div>
            </div>
        </div>
    );
}