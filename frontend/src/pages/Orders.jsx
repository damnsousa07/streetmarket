// Orders.jsx
// Página que exibe o histórico de encomendas do utilizador autenticado.
// Cada encomenda é exibida com imagem, nome, preço, data, status e ID.

import { useEffect, useState } from 'react';
import { getOrdersByUser } from '../api/orders';

// Função auxiliar para obter a URL completa da imagem do produto.
// Se já for uma URL absoluta (http/https), mantém; caso contrário, adiciona a base da API.
function getFullImageUrl(imagePath) {
    if (!imagePath) return '';                                     // Se não houver imagem, retorna vazio
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;                                          // Já é uma URL absoluta
    }
    return `${import.meta.env.VITE_API_URL}${imagePath}`;          // Concatena com a base da API
}

// ------------------------------------------------------------
// Componente interno: exibe um badge (etiqueta) com cor diferente consoante o status da encomenda.
// Recebe: status (string) – ex: 'comprado', 'enviado', 'recebido', etc.
function StatusBadge({ status }) {
    // Normaliza o status para minúsculas (para comparação)
    const s = (status || '').toLowerCase();

    // Cores padrão (fallback)
    let bg = 'rgba(255,255,255,0.06)';
    let color = 'rgba(255,255,255,0.85)';
    let border = 'rgba(255,255,255,0.10)';

    // Define cores específicas com base no status
    if (s.includes('compr')) {          // Comprado / em processamento
        bg = 'rgba(37, 99, 235, 0.18)';      // Azul translúcido
        border = 'rgba(37, 99, 235, 0.35)';
    } else if (s.includes('envi')) {    // Enviado
        bg = 'rgba(245, 158, 11, 0.18)';     // Amarelo translúcido
        border = 'rgba(245, 158, 11, 0.35)';
    } else if (s.includes('receb')) {   // Recebido / entregue
        bg = 'rgba(34, 197, 94, 0.18)';      // Verde translúcido
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

// ------------------------------------------------------------
// Componente principal: lista de encomendas
export default function Orders() {
    // Estados para armazenar as encomendas, loading e erro
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Função que carrega as encomendas da API
    async function load() {
        // Obtém o user_id do localStorage (guardado no login)
        const user_id = localStorage.getItem('user_id');

        // Verifica se existe user_id
        if (!user_id) {
            setError('Define o teu user_id no Login primeiro.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);   // Ativa o carregamento
            setError('');       // Limpa erros anteriores

            // Chama a API para buscar as encomendas do utilizador
            const data = await getOrdersByUser(user_id);
            setOrders(Array.isArray(data) ? data : []); // Garante que é um array
        } catch (e) {
            setError('Não foi possível carregar as encomendas.');
        } finally {
            setLoading(false); // Desativa o carregamento
        }
    }

    // Carrega as encomendas ao montar o componente
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Array vazio = executa apenas uma vez

    // Função para formatar a data com timezone de Portugal (Europe/Lisbon)
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

    // ------------------------------------------------------------
    // Renderização da página
    return (
        <div className="container" style={{ padding: '32px 0' }}>
            {/* Cabeçalho com título, subtítulo e botão "Atualizar" */}
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
                    {orders.map((o) => (
                        // Cada encomenda é um card com imagem, detalhes e badge de status
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
                            {/* Container da imagem do produto (quadrado 72x72) */}
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
                                            // Se a imagem falhar, oculta o elemento (mostra o fundo)
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    // Placeholder quando não há imagem
                                    <div style={{ width: '100%', height: '100%', background: 'var(--surface-2)' }} />
                                )}
                            </div>

                            {/* Informações da encomenda: nome, preço, ID e data */}
                            <div>
                                <div style={{ fontWeight: 900 }}>{o.product_nome}</div>
                                <div style={{ color: 'var(--muted)', marginTop: 4 }}>
                                    €{o.preco} • #{o.order_id}
                                </div>
                                <div style={{ color: 'var(--muted)', marginTop: 6, fontSize: 13 }}>
                                    {formatDate(o.data_compra)}
                                </div>
                            </div>

                            {/* Badge de status alinhado à direita */}
                            <div style={{ justifySelf: 'end' }}>
                                <StatusBadge status={o.status} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}