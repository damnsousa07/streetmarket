// AdminSearchOrders.jsx
// Página de administração para pesquisa e filtragem avançada de encomendas.

import { useState, useEffect, useCallback } from 'react';
import { getAdminOrders } from '../../api/admin';

// Opções de estados possíveis para as encomendas
const STATUS_OPTIONS = [
  { id: 1, label: 'Comprado' },
  { id: 2, label: 'Enviado' },
  { id: 3, label: 'Recebido' },
];

// Opções de ordenação disponíveis
const SORT_OPTIONS = [
  { value: 'order_id_desc', label: 'ID: mais recente primeiro' },
  { value: 'order_id_asc', label: 'ID: mais antigo primeiro' },
  { value: 'date_desc', label: 'Data: mais recente primeiro' },
  { value: 'date_asc', label: 'Data: mais antigo primeiro' },
  { value: 'price_desc', label: 'Preço: maior → menor' },
  { value: 'price_asc', label: 'Preço: menor → maior' },
];

// Verifica se a chave de administrador está definida no localStorage
function requireAdminKey() {
  const key = localStorage.getItem('admin_key');
  return !!key && key.trim().length > 0;
}

export default function AdminSearchOrders() {
  // Estados para lista de encomendas, carregamento e erro
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estado dos filtros (pesquisa, estado, datas, ordenação)
  const [filters, setFilters] = useState({
    search: '',
    status_id: '',
    sort: 'order_id_desc',
    date_from: '',
    date_to: '',
  });

  // Função que busca encomendas com os filtros atuais
  const fetchOrders = useCallback(async () => {
    // Verifica se tem chave de admin
    if (!requireAdminKey()) {
      setError('Sem admin key.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params = new URLSearchParams();
      // Adiciona cada filtro à query string se estiver preenchido
      if (filters.search) params.append('search', filters.search);
      if (filters.status_id) params.append('status_id', filters.status_id);
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      const data = await getAdminOrders(params.toString());
      setOrders(data);
    } catch (err) {
      setError('Erro ao carregar encomendas.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]); // Recria a função sempre que os filtros mudarem

  // Efeito para carregar encomendas sempre que os filtros mudarem
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handler para mudanças nos campos de filtro
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Limpa todos os filtros (volta ao estado inicial)
  const clearFilters = () => {
    setFilters({
      search: '',
      status_id: '',
      sort: 'order_id_desc',
      date_from: '',
      date_to: '',
    });
  };

  // Se não houver chave de admin, mostra aviso
  if (!requireAdminKey()) {
    return (
      <div className="container" style={{ padding: '32px 0' }}>
        <p style={{ color: 'salmon' }}>Sem admin key. Vai a <strong>/admin/login</strong> e define a chave.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 0' }}>
      {/* Layout de duas colunas: filtros à esquerda, resultados à direita */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Painel lateral de filtros */}
        <aside style={{ width: 260, background: 'var(--surface-2)', borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Filtros</h3>
          {/* Campo de pesquisa textual */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Pesquisar</label>
            <input type="text" name="search" placeholder="Nome, email, produto ou ID" value={filters.search} onChange={handleFilterChange} className="input" />
          </div>
          {/* Select para filtrar por estado */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Estado</label>
            <select name="status_id" value={filters.status_id} onChange={handleFilterChange} className="input">
              <option value="">Todos</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
          {/* Data inicial */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Data inicial</label>
            <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange} className="input" />
          </div>
          {/* Data final */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Data final</label>
            <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange} className="input" />
          </div>
          {/* Select para ordenação */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Ordenar por</label>
            <select name="sort" value={filters.sort} onChange={handleFilterChange} className="input">
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {/* Botão para limpar todos os filtros */}
          <button className="btn btn-ghost" onClick={clearFilters} style={{ width: '100%' }}>Limpar filtros</button>
        </aside>

        {/* Área principal com os resultados */}
        <main style={{ flex: 1 }}>
          {/* Cabeçalho com contagem e indicador de carregamento */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Encomendas ({orders.length})</h2>
            {loading && <p style={{ margin: 0 }}>A carregar...</p>}
          </div>
          {/* Mensagem de erro */}
          {error && <p style={{ color: 'salmon' }}>{error}</p>}
          {/* Mensagem quando não há encomendas */}
          {!loading && orders.length === 0 && !error && <p style={{ color: 'var(--muted)' }}>Nenhuma encomenda encontrada.</p>}
          {/* Lista de encomendas (cards) */}
          <div style={{ display: 'grid', gap: '16px' }}>
            {orders.map(order => (
              <div key={order.order_id} className="card" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <div><strong>#{order.order_id}</strong> – {new Date(order.data_compra).toLocaleString()}</div>
                  <div>{order.user_nome} ({order.email})</div>
                  <div>{order.product_nome} – €{order.preco}</div>
                  <div>Estado: {order.status_nome}</div>
                </div>
                {/* Aqui podes adicionar botões de ação, ex: editar estado */}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}