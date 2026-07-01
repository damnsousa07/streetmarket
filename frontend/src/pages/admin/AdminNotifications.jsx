// ================================================================
// ADMINNOTIFICATIONS.JSX – Gestão de notificações (painel admin)
// ================================================================
// Este componente permite ao administrador visualizar as notificações
// do sistema com filtros por:
// - Pesquisa (conteúdo, utilizador ou email)
// - Tipo de notificação (Encomenda, Review, Admin)
// - Ordenação (data ou tipo)
// Limite máximo: 200 notificações (definido no backend)
// ================================================================

// Importação dos módulos necessários
import { useEffect, useState, useRef, useCallback } from 'react';
import { getAdminNotifications } from '../../api/admin';

// ================================================================
// CONSTANTES
// ================================================================

// Opções de filtro por tipo de notificação
const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'encomenda', label: 'Encomenda' },
  { value: 'review', label: 'Review' },
  { value: 'admin', label: 'Admin' },
];

// Opções de ordenação disponíveis
const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Data: mais recente primeiro' },
  { value: 'date_asc', label: 'Data: mais antiga primeiro' },
  { value: 'type_asc', label: 'Tipo: A → Z' },
  { value: 'type_desc', label: 'Tipo: Z → A' },
];

// ================================================================
// FUNÇÃO AUXILIAR: Verificar chave de administrador
// ================================================================

function requireAdminKey() {
  const key = localStorage.getItem('admin_key');
  return !!key && key.trim().length > 0;
}

// ================================================================
// COMPONENTE: TypeBadge (badge colorido para o tipo de notificação)
// ================================================================

// Exibe um badge com cor diferente consoante o tipo de notificação
function TypeBadge({ tipo }) {
  const t = (tipo || '').toLowerCase();

  // Cores padrão (fallback)
  let bg = 'rgba(255,255,255,0.06)';
  let border = 'rgba(255,255,255,0.10)';

  // Define cores específicas para cada tipo
  if (t.includes('encom')) {
    bg = 'rgba(37, 99, 235, 0.18)';      // Azul para encomendas
    border = 'rgba(37, 99, 235, 0.35)';
  } else if (t.includes('review')) {
    bg = 'rgba(34, 197, 94, 0.18)';      // Verde para reviews
    border = 'rgba(34, 197, 94, 0.35)';
  } else if (t.includes('admin')) {
    bg = 'rgba(245, 158, 11, 0.18)';     // Amarelo para admin
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
// COMPONENTE PRINCIPAL: AdminNotifications
// ================================================================

export default function AdminNotifications() {
  // ----- ESTADOS DA LISTA -----
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ----- ESTADO DOS FILTROS -----
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    sort: 'date_desc',
  });

  // ----- REFERÊNCIAS -----
  const searchInputRef = useRef(null);
  const debounceTimer = useRef(null);

  // ================================================================
  // FUNÇÃO: Buscar notificações
  // ================================================================

  const fetchNotifications = useCallback(async (search, type, sort) => {
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
      if (type) params.append('type', type);
      if (sort) params.append('sort', sort);
      // Chama a API
      const data = await getAdminNotifications(params.toString());
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Erro ao carregar notificações.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ================================================================
  // EFFECTS: Carregar dados
  // ================================================================

  // Carrega as notificações iniciais (sem filtros) ao montar
  useEffect(() => {
    fetchNotifications('', '', 'date_desc');
  }, [fetchNotifications]);

  // Quando os filtros mudarem, recarrega os dados
  useEffect(() => {
    fetchNotifications(filters.search, filters.type, filters.sort);
  }, [filters, fetchNotifications]);

  // ================================================================
  // HANDLERS: Filtros
  // ================================================================

  // Handler para pesquisa com debounce (500ms)
  const handleSearchChange = () => {
    const value = searchInputRef.current?.value || '';
    // Limpa o timer anterior para evitar chamadas desnecessárias
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value }));
    }, 500);
  };

  // Handler para mudanças nos selects (tipo e ordenação)
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Força a atualização manual (recarrega com os filtros atuais)
  const handleRefresh = () => {
    const currentSearch = searchInputRef.current?.value || '';
    const currentType = filters.type;
    const currentSort = filters.sort;
    setFilters({ search: currentSearch, type: currentType, sort: currentSort });
    fetchNotifications(currentSearch, currentType, currentSort);
  };

  // ================================================================
  // RENDERIZAÇÃO CONDICIONAL (sem chave admin)
  // ================================================================

  if (!requireAdminKey()) {
    return (
      <div className="container" style={{ padding: '32px 0' }}>
        <h1>Admin • Notificações</h1>
        <p style={{ color: 'salmon' }}>
          Sem admin key. Vai a <strong>/admin/login</strong> e define a chave.
        </p>
      </div>
    );
  }

  // ================================================================
  // RENDERIZAÇÃO PRINCIPAL
  // ================================================================

  return (
    <div className="container" style={{ padding: '32px 0' }}>
      {/* Cabeçalho com título e botão de atualizar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin • Notificações</h1>
          <p style={{ color: 'var(--muted)', marginTop: 6 }}>
            Últimas notificações do sistema (até 200).
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
          placeholder="Pesquisar por conteúdo, utilizador ou email"
          onChange={handleSearchChange}
          className="input"
          style={{ flex: 2, minWidth: '200px' }}
        />

        {/* Seletor de tipo de notificação */}
        <select
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
          className="input"
          style={{ width: '160px' }}
        >
          {TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Seletor de ordenação */}
        <select
          name="sort"
          value={filters.sort}
          onChange={handleFilterChange}
          className="input"
          style={{ width: '220px' }}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
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
          {items.map((n) => (
            <div
              key={n.notification_id || `${n.user_id}-${n.data_envio}-${n.conteudo}`}
              className="card"
              style={{ padding: 14 }}
            >
              {/* Linha superior: badge + info do utilizador + data */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Badge do tipo */}
                  <TypeBadge tipo={n.tipo} />
                  {/* Informação do utilizador */}
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                    User: <strong>{n.user_id}</strong> {n.user_nome ? `• ${n.user_nome}` : ''}{' '}
                    {n.email ? `• ${n.email}` : ''}
                  </div>
                </div>
                {/* Data da notificação */}
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