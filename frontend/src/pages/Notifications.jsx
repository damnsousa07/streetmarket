// ================================================================
// NOTIFICATIONS.JSX – Página de notificações do utilizador
// ================================================================
// Este componente exibe as notificações do utilizador autenticado.
// As notificações são carregadas da API e exibidas com um badge
// colorido consoante o tipo (Encomenda, Review, Admin).
// ================================================================

// Importação dos módulos necessários
import { useEffect, useState } from 'react';
import { getNotificationsByUser } from '../api/notifications';

// ================================================================
// COMPONENTE: TypeBadge (badge colorido para o tipo de notificação)
// ================================================================

// Exibe um badge com cor diferente consoante o tipo de notificação
function TypeBadge({ tipo }) {
    // Normaliza o tipo para minúsculas (para comparação)
    const t = (tipo || '').toLowerCase();

    // Cores padrão (fallback)
    let bg = 'rgba(255,255,255,0.06)';
    let border = 'rgba(255,255,255,0.10)';

    // Define cores específicas com base no tipo
    if (t.includes('encom')) { // Encomenda / pedido
        bg = 'rgba(37, 99, 235, 0.18)';      // Azul translúcido
        border = 'rgba(37, 99, 235, 0.35)';
    } else if (t.includes('review')) { // Avaliação
        bg = 'rgba(34, 197, 94, 0.18)';      // Verde translúcido
        border = 'rgba(34, 197, 94, 0.35)';
    } else if (t.includes('admin')) { // Administrativo
        bg = 'rgba(245, 158, 11, 0.18)';     // Amarelo translúcido
        border = 'rgba(245, 158, 11, 0.35)';
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
                fontSize: 12,
                fontWeight: 800,
            }}
        >
            {tipo || '—'}
        </span>
    );
}

// ================================================================
// COMPONENTE PRINCIPAL: Notifications
// ================================================================

export default function Notifications() {
    // ----- ESTADOS -----
    const [items, setItems] = useState([]);      // Lista de notificações
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ================================================================
    // FUNÇÃO: Carregar notificações da API
    // ================================================================

    async function load() {
        // Obtém o user_id do localStorage (guardado no login)
        const rawUserId = localStorage.getItem('user_id');

        // Verifica se existe user_id
        if (!rawUserId) {
            setError('Define o teu user_id no Login primeiro.');
            setLoading(false);
            return;
        }

        // Converte para número e valida
        const user_id = Number(rawUserId);
        if (!Number.isFinite(user_id)) {
            setError('user_id inválido. Vai ao Login e coloca um número (ex: 1).');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');
            // Chama a API para buscar notificações do utilizador
            const data = await getNotificationsByUser(user_id);
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            // Log detalhado para depuração
            console.log('NOTIFICATIONS ERROR:', e);
            console.log('STATUS:', e?.response?.status);
            console.log('DATA:', e?.response?.data);

            // Constrói mensagem de erro amigável
            const status = e?.response?.status;
            const message = e?.response?.data?.message;
            setError(
                `Não foi possível carregar as notificações. ` +
                `${status ? `(HTTP ${status})` : ''} ` +
                `${message ? `- ${message}` : ''}`
            );
        } finally {
            setLoading(false);
        }
    }

    // Carrega as notificações ao montar o componente
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Array vazio = executa apenas uma vez

    // ================================================================
    // RENDERIZAÇÃO
    // ================================================================

    return (
        <div className="container" style={{ padding: '32px 0' }}>
            {/* Cabeçalho com título, subtítulo e botão "Atualizar" */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <div>
                    <h1 style={{ margin: 0 }}>Notificações</h1>
                    <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                        Atualizações do sistema para a tua conta.
                    </p>
                </div>
                <button className="btn btn-ghost" onClick={load} disabled={loading}>
                    Atualizar
                </button>
            </div>

            {/* Estados de carregamento e erro */}
            {loading && <p style={{ color: 'var(--muted)', marginTop: 16 }}>A carregar...</p>}
            {error && <p style={{ color: 'salmon', marginTop: 16 }}>{error}</p>}

            {/* Mensagem quando não há notificações */}
            {!loading && !error && items.length === 0 && (
                <p style={{ color: 'var(--muted)', marginTop: 16 }}>Sem notificações.</p>
            )}

            {/* Lista de notificações (cards) */}
            {!loading && !error && items.length > 0 && (
                <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                    {items.map((n, idx) => (
                        <div
                            key={n.notification_id ?? `${n.user_id}-${n.data_envio}-${idx}`}
                            className="card"
                            style={{ padding: 14 }}
                        >
                            {/* Linha superior: badge + data */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                                <TypeBadge tipo={n.tipo} />
                                <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                                    {n.data_envio ? new Date(n.data_envio).toLocaleString() : ''}
                                </div>
                            </div>

                            {/* Conteúdo da notificação */}
                            <div style={{ marginTop: 10, fontWeight: 700 }}>
                                {n.conteudo}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}