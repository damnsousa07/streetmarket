// ================================================================
// ORDERS.JSX – Página de histórico de encomendas do utilizador
// ================================================================
// Este componente exibe o histórico de encomendas do utilizador autenticado.
// Cada encomenda é exibida com:
// - Imagem do produto
// - Nome do produto
// - Preço
// - Número da encomenda
// - Data da compra
// - Estado (Comprado, Enviado, Recebido) com badge colorido
// ================================================================

// Importação dos módulos necessários
import { useEffect, useState } from 'react';
import { getOrdersByUser } from '../api/orders';

// ================================================================
// FUNÇÃO AUXILIAR: Obter URL completa da imagem
// ================================================================

function getFullImageUrl(imagePath) {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    return `${import.meta.env.VITE_API_URL}${imagePath}`;
}

// ================================================================
// COMPONENTE: StatusBadge (badge colorido para o estado da encomenda)
// ================================================================

function StatusBadge({ status }) {
    const s = (status || '').toLowerCase();
    let bg = 'rgba(255,255,255,0.06)';
    let color = 'rgba(255,255,255,0.85)';
    let border = 'rgba(255,255,255,0.10)';

    // Define cores específicas com base no estado
    if (s.includes('compr')) {
        bg = 'rgba(37, 99, 235, 0.18)';      // Azul para "Comprado"
        border = 'rgba(37, 99, 235, 0.35)';
    } else if (s.includes('envi')) {
        bg = 'rgba(245, 158, 11, 0.18)';     // Amarelo para "Enviado"
        border = 'rgba(245, 158, 11, 0.35)';
    } else if (s.includes('receb')) {
        bg = 'rgba(34, 197, 94, 0.18)';      // Verde para "Recebido"
        border = 'rgba(34, 197, 94, 0.35)';
    }

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 10px',
                borderRadius: 999,
                background: bg,
                border: `1px solid ${border}`,
                color,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.2,
            }}
        >
            {status || '—'}
        </span>
    );
}

// ================================================================
// COMPONENTE PRINCIPAL: Orders
// ================================================================

export default function Orders() {
    // ----- ESTADOS -----
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ================================================================
    // FUNÇÃO: Carregar encomendas da API
    // ================================================================

    async function load() {
        // Obtém o user_id do localStorage
        const user_id = localStorage.getItem('user_id');
        if (!user_id) {
            setError('Define o teu user_id no Login primeiro.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');
            // Chama a API para buscar as encomendas do utilizador
            const data = await getOrdersByUser(user_id);
            console.log('📦 Dados recebidos:', data);
            setOrders(Array.isArray(data) ? data : []);
        } catch (e) {
            setError('Não foi possível carregar as encomendas.');
        } finally {
            setLoading(false);
        }
    }

    // Carrega as encomendas ao montar o componente
    useEffect(() => {
        load();
    }, []);

    // ================================================================
    // FUNÇÃO: Formatar data (timezone Portugal)
    // ================================================================

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('pt-PT', {
            timeZone: 'Europe/Lisbon',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    // ================================================================
    // RENDERIZAÇÃO
    // ================================================================

    return (
        <div className="container" style={{ padding: '32px 0' }}>
            {/* Cabeçalho com título e botão "Atualizar" */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <div>
                    <h1 style={{ margin: 0 }}>Encomendas</h1>
                    <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                        Histórico de compras simuladas.
                    </p>
                </div>
                <button className="btn btn-ghost" onClick={load} disabled={loading}>
                    Atualizar
                </button>
            </div>

            {/* Estados de carregamento e erro */}
            {loading && <p style={{ color: 'var(--muted)', marginTop: 16 }}>A carregar...</p>}
            {error && <p style={{ color: 'salmon', marginTop: 16 }}>{error}</p>}

            {/* Mensagem quando não há encomendas */}
            {!loading && !error && orders.length === 0 && (
                <p style={{ color: 'var(--muted)', marginTop: 16 }}>Ainda não tens encomendas.</p>
            )}

            {/* Lista de encomendas (cards) */}
            {!loading && !error && orders.length > 0 && (
                <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                    {orders.map((o) => {
                        // Tenta obter o preço de várias formas (fallback)
                        const preco = o.preco || o.product_preco || o.price || 0;
                        return (
                            <div
                                key={o.order_id}
                                className="card"
                                style={{
                                    padding: 14,
                                    display: 'grid',
                                    gridTemplateColumns: '72px 1fr auto',
                                    gap: 14,
                                    alignItems: 'center',
                                }}
                            >
                                {/* Imagem do produto */}
                                <div
                                    style={{
                                        width: 72,
                                        height: 72,
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        background: 'var(--surface-2)',
                                    }}
                                >
                                    {o.imagem ? (
                                        <img
                                            src={getFullImageUrl(o.imagem)}
                                            alt={o.product_nome}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: 'var(--surface-2)' }} />
                                    )}
                                </div>

                                {/* Informações da encomenda */}
                                <div>
                                    <div style={{ fontWeight: 900 }}>{o.product_nome}</div>
                                    <div style={{ color: 'var(--muted)', marginTop: 4 }}>
                                        €{preco} • #{o.order_id}
                                    </div>
                                    <div style={{ color: 'var(--muted)', marginTop: 6, fontSize: 13 }}>
                                        {formatDate(o.data_compra)}
                                    </div>
                                </div>

                                {/* Badge de estado */}
                                <div style={{ justifySelf: 'end' }}>
                                    <StatusBadge status={o.status} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}