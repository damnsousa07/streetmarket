// ================================================================
// ADMINORDERS.JSX – Gestão de encomendas (painel administrativo)
// ================================================================
// Este componente permite ao administrador visualizar e atualizar
// o estado das encomendas (Comprado → Enviado → Recebido).
// Inclui:
// - Pesquisa (nome, email, produto, ID)
// - Filtro por estado
// - Modal de confirmação antes de atualizar
// - Modal de sucesso após atualização
// - Modal de aviso (quando o estado não muda)
// ================================================================

// Importação dos módulos necessários
import { useEffect, useState, useRef, useCallback } from 'react';
import { getAdminOrders, updateAdminOrderStatus } from '../../api/admin';

// ================================================================
// CONSTANTES
// ================================================================

// Estados possíveis para uma encomenda
const STATUS_OPTIONS = [
    { id: 1, label: 'Comprado' },   // Pendente
    { id: 2, label: 'Enviado' },    // Em trânsito
    { id: 3, label: 'Recebido' },   // Entregue
];

// ================================================================
// FUNÇÃO AUXILIAR: Verificar chave de administrador
// ================================================================

function requireAdminKey() {
    const key = localStorage.getItem('admin_key');
    return !!key && key.trim().length > 0;
}

// ================================================================
// COMPONENTE PRINCIPAL: AdminOrders
// ================================================================

export default function AdminOrders({ embedded = false }) {
    // ----- ESTADOS DA LISTA -----
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingId, setSavingId] = useState(null);              // ID da encomenda a guardar
    const [draftStatus, setDraftStatus] = useState({});         // Estado temporário (antes de guardar)

    // ----- ESTADO DOS FILTROS -----
    const [filters, setFilters] = useState({
        search: '',
        status_id: '',
    });

    // ----- REFERÊNCIAS -----
    const searchInputRef = useRef(null);
    const debounceTimer = useRef(null);

    // ----- MODAIS -----
    // Modal de confirmação
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmData, setConfirmData] = useState({
        orderId: null,
        currentStatus: '',
        newStatus: '',
        newStatusId: null,
    });

    // Modal de sucesso
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Modal de aviso (centralizado)
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');

    // ================================================================
    // FUNÇÃO: Buscar encomendas
    // ================================================================

    const fetchOrders = useCallback(async (search, status) => {
        // Verifica se tem chave de administrador
        if (!requireAdminKey()) {
            setError('Sem admin key.');
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            // Constrói os parâmetros da query string
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (status) params.append('status_id', status);
            // Chama a API
            const data = await getAdminOrders(params.toString());
            setOrders(data);
            // Inicializa o estado temporário com os estados atuais
            const next = {};
            for (const o of data) next[o.order_id] = o.status_id;
            setDraftStatus(next);
        } catch (err) {
            setError('Erro ao carregar encomendas.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ================================================================
    // EFFECTS: Carregar dados
    // ================================================================

    // Carrega as encomendas quando os filtros mudarem
    useEffect(() => {
        fetchOrders(filters.search, filters.status_id);
    }, [filters, fetchOrders]);

    // ================================================================
    // HANDLERS: Filtros
    // ================================================================

    // Handler para pesquisa com debounce (500ms)
    const handleSearchChange = () => {
        const value = searchInputRef.current?.value || '';
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setFilters(prev => ({ ...prev, search: value }));
        }, 500);
    };

    // Handler para mudança no filtro de estado
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // Força a atualização manual (recarrega com os filtros atuais)
    const handleRefresh = () => {
        const currentSearch = searchInputRef.current?.value || '';
        const currentStatus = filters.status_id;
        setFilters({ search: currentSearch, status_id: currentStatus });
        fetchOrders(currentSearch, currentStatus);
    };

    // ================================================================
    // HANDLERS: Estado das encomendas
    // ================================================================

    // Atualiza o estado temporário quando o utilizador muda o select
    const handleOrderStatusChange = (orderId, newStatusId) => {
        setDraftStatus(prev => ({ ...prev, [orderId]: newStatusId }));
    };

    // Abre o modal de confirmação
    const openConfirmModal = (orderId, newStatusId) => {
        const currentOrder = orders.find(o => o.order_id === orderId);
        if (!currentOrder) return;

        const currentStatus = STATUS_OPTIONS.find(s => s.id === currentOrder.status_id)?.label || 'Desconhecido';
        const newStatus = STATUS_OPTIONS.find(s => s.id === newStatusId)?.label || 'Desconhecido';

        // Se o estado for o mesmo, mostra aviso
        if (currentOrder.status_id === newStatusId) {
            setWarningMessage(`A encomenda #${orderId} já está no estado "${currentStatus}".`);
            setShowWarningModal(true);
            return;
        }

        setConfirmData({
            orderId,
            currentStatus,
            newStatus,
            newStatusId,
        });
        setShowConfirmModal(true);
    };

    // Confirma a atualização do estado
    const handleConfirm = async () => {
        const { orderId, newStatusId } = confirmData;
        if (!orderId || newStatusId == null) return;

        try {
            setSavingId(orderId);
            // Chama a API para atualizar o estado
            await updateAdminOrderStatus(orderId, newStatusId);

            // Atualiza a lista local (para evitar recarregar tudo)
            setOrders(prev =>
                prev.map(order =>
                    order.order_id === orderId
                        ? { ...order, status_id: newStatusId, status_nome: STATUS_OPTIONS.find(s => s.id === newStatusId).label }
                        : order
                )
            );
            setShowConfirmModal(false);
            setSuccessMessage('Estado atualizado com sucesso!');
            setShowSuccessModal(true);
        } catch (err) {
            alert('Erro ao atualizar estado.');
            console.error(err);
        } finally {
            setSavingId(null);
        }
    };

    // Cancela a confirmação
    const handleCancel = () => {
        setShowConfirmModal(false);
    };

    // Função chamada ao clicar em "Guardar"
    const handleSave = (orderId) => {
        const newStatusId = draftStatus[orderId];
        if (newStatusId == null) return;
        openConfirmModal(orderId, newStatusId);
    };

    // ================================================================
    // COMPONENTE Wrapper (para embedding)
    // ================================================================

    const Wrapper = ({ children }) =>
        embedded ? <div>{children}</div> : <div className="container" style={{ padding: '32px 0' }}>{children}</div>;

    // ================================================================
    // RENDERIZAÇÃO CONDICIONAL (sem chave admin)
    // ================================================================

    if (!requireAdminKey()) {
        return (
            <Wrapper>
                {!embedded && <h1>Admin • Encomendas</h1>}
                <p style={{ color: 'salmon' }}>Sem admin key. Vai a <strong>/admin/login</strong> e define a chave.</p>
            </Wrapper>
        );
    }

    // ================================================================
    // RENDERIZAÇÃO PRINCIPAL
    // ================================================================

    return (
        <Wrapper>
            {/* ----- CABEÇALHO (apenas se não estiver embutido) ----- */}
            {!embedded && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                            <h1 style={{ margin: 0 }}>Admin • Encomendas</h1>
                            <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                                Altera o estado. Se mudares para <strong>Recebido (3)</strong>, o backend envia o email de review.
                            </p>
                        </div>
                        <button className="btn btn-primary" onClick={handleRefresh} disabled={loading}>
                            Atualizar
                        </button>
                    </div>

                    {/* Barra de filtros */}
                    <div style={{ display: 'flex', gap: '12px', margin: '20px 0', flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Pesquisa por texto */}
                        <input
                            type="text"
                            ref={searchInputRef}
                            defaultValue={filters.search}
                            placeholder="Pesquisar por nome, email, produto ou ID"
                            onChange={handleSearchChange}
                            className="input"
                            style={{ flex: 2, minWidth: '200px' }}
                        />
                        {/* Seletor de estado */}
                        <select
                            name="status_id"
                            value={filters.status_id}
                            onChange={handleFilterChange}
                            className="input"
                            style={{ width: '160px' }}
                        >
                            <option value="">Todos os estados</option>
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </>
            )}

            {/* ----- ESTADOS DE CARREGAMENTO E ERRO ----- */}
            {loading && <p style={{ color: 'var(--muted)', marginTop: 16 }}>A carregar...</p>}
            {error && <p style={{ color: 'salmon', marginTop: 16 }}>{error}</p>}

            {/* ----- LISTA DE ENCOMENDAS ----- */}
            {!loading && !error && (
                <>
                    {orders.length === 0 ? (
                        <p>Nenhuma encomenda encontrada.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: '16px' }}>
                            {orders.map(order => (
                                <div
                                    key={order.order_id}
                                    className="card"
                                    style={{
                                        padding: '16px',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}
                                >
                                    {/* Informações da encomenda */}
                                    <div style={{ flex: 2, minWidth: '200px' }}>
                                        <div><strong>#{order.order_id}</strong> – {new Date(order.data_compra).toLocaleString()}</div>
                                        <div>{order.user_nome} ({order.email})</div>
                                        <div>{order.product_nome} – €{order.preco}</div>
                                    </div>

                                    {/* Controles de estado */}
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <select
                                            value={draftStatus[order.order_id] ?? order.status_id}
                                            onChange={(e) => handleOrderStatusChange(order.order_id, parseInt(e.target.value))}
                                            className="input"
                                            style={{ width: '150px' }}
                                            disabled={savingId === order.order_id}
                                        >
                                            {STATUS_OPTIONS.map(opt => (
                                                <option key={opt.id} value={opt.id}>{opt.label} ({opt.id})</option>
                                            ))}
                                        </select>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => handleSave(order.order_id)}
                                            disabled={savingId === order.order_id}
                                        >
                                            {savingId === order.order_id ? 'A guardar...' : 'Guardar'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ================================================================ */}
            {/* MODAIS */}
            {/* ================================================================ */}

            {/* Modal de confirmação de alteração */}
            {showConfirmModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px',
                    }}
                    onClick={handleCancel}
                >
                    <div
                        style={{
                            backgroundColor: '#fff',
                            borderRadius: '16px',
                            padding: '32px 24px',
                            maxWidth: '440px',
                            width: '100%',
                            textAlign: 'center',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>Confirmar alteração</h3>
                        <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.5', marginBottom: '20px' }}>
                            Deseja mudar o estado da encomenda nº <strong>{confirmData.orderId}</strong> do estado{' '}
                            <strong>"{confirmData.currentStatus}"</strong> para <strong>"{confirmData.newStatus}"</strong>?
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={handleCancel}
                                style={{
                                    background: '#e0e0e0',
                                    color: '#333',
                                    border: 'none',
                                    borderRadius: '40px',
                                    padding: '10px 24px',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                style={{
                                    background: '#646cff',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '40px',
                                    padding: '10px 24px',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de sucesso */}
            {showSuccessModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px',
                    }}
                    onClick={() => setShowSuccessModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: '#fff',
                            borderRadius: '16px',
                            padding: '32px 24px',
                            maxWidth: '440px',
                            width: '100%',
                            textAlign: 'center',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                        <h3 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>{successMessage}</h3>
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            style={{
                                background: '#646cff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '40px',
                                padding: '10px 32px',
                                fontSize: '15px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                marginTop: '12px',
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de aviso (estado não mudou) */}
            {showWarningModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px',
                    }}
                    onClick={() => setShowWarningModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: '#fff',
                            borderRadius: '16px',
                            padding: '32px 24px',
                            maxWidth: '440px',
                            width: '100%',
                            textAlign: 'center',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>Aviso</h3>
                        <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.5', marginBottom: '20px' }}>
                            {warningMessage}
                        </p>
                        <button
                            onClick={() => setShowWarningModal(false)}
                            style={{
                                background: '#ff9800',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '40px',
                                padding: '10px 32px',
                                fontSize: '15px',
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </Wrapper>
    );
}