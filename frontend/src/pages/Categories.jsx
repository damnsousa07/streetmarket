// ================================================================
// CATEGORIES.JSX – Página de categorias (pública)
// ================================================================
// Este componente exibe a lista de categorias disponíveis na loja.
// Cada categoria mostra uma imagem (se disponível), nome e descrição.
// Ao clicar numa categoria, o utilizador é redirecionado para a página
// que lista os produtos dessa categoria (/categories/:category_id).
// ================================================================

// Importação dos módulos necessários
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '../api/categories';

// ================================================================
// CONSTANTES
// ================================================================

// URL base do backend (fallback para localhost:3000 se não definida no .env)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ================================================================
// FUNÇÃO AUXILIAR: Obter URL da imagem da categoria
// ================================================================

function getCategoryImage(category) {
  // Se não houver image_url na base de dados, usa placeholder
  if (!category.image_url) return '/images/categories/placeholder.png';
  // Se já for uma URL absoluta (http/https), mantém
  if (category.image_url.startsWith('http')) return category.image_url;
  // Caso contrário, concatena com a base da API
  return `${API_BASE}${category.image_url}`;
}

// ================================================================
// COMPONENTE: Categories
// ================================================================

export default function Categories() {
  const navigate = useNavigate();   // Hook para navegação programática

  // ----- ESTADOS -----
  const [rows, setRows] = useState([]);      // Lista de categorias
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ----- ORDENAÇÃO: Categorias por nome (A→Z) -----
  // Utiliza useMemo para evitar re-ordenar em cada renderização
  const sorted = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    return [...list].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));
  }, [rows]);

  // ================================================================
  // FUNÇÃO: Carregar categorias da API
  // ================================================================

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await getCategories();   // Chama a API
      setRows(data);
    } catch (e) {
      setError('Erro ao carregar.');
    }
    setLoading(false);
  }

  // Carrega as categorias ao montar o componente
  useEffect(() => {
    load();
  }, []);

  // ================================================================
  // FUNÇÃO: Navegar para produtos de uma categoria
  // ================================================================

  function goToCategory(category_id) {
    navigate(`/categories/${category_id}`);
  }

  // ================================================================
  // RENDERIZAÇÃO
  // ================================================================

  return (
    <div className="container" style={{ padding: '32px 0' }}>
      {/* Cabeçalho com título e botão de atualizar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Categorias</h1>
          <p style={{ color: 'var(--muted)', marginTop: 6 }}>
            Seleciona uma categoria para ver os produtos.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          Atualizar
        </button>
      </div>

      {/* Estados de carregamento e erro */}
      {loading && <p style={{ color: 'var(--muted)', marginTop: 16 }}>A carregar...</p>}
      {error && <p style={{ color: 'salmon', marginTop: 16 }}>{error}</p>}

      {/* Tabela de categorias (apenas se não estiver a carregar e não houver erro) */}
      {!loading && !error && (
        <div className="card" style={{ padding: 12, marginTop: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: 13 }}>
                <th style={{ padding: 10, width: '80px' }}>Imagem</th>
                <th style={{ padding: 10 }}>Nome</th>
                <th style={{ padding: 10 }}>Descrição</th>
                <th style={{ padding: 10 }} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                // Cada linha da tabela é clicável (navega para a categoria)
                <tr
                  key={c.category_id}
                  style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => goToCategory(c.category_id)}
                  title="Ver produtos desta categoria"
                >
                  {/* Coluna da imagem */}
                  <td style={{ padding: 10 }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={getCategoryImage(c)}
                        alt={c.nome}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        // Fallback: se a imagem falhar, mostra um ícone 📁
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img && img.parentElement) {
                            img.style.display = 'none';
                            const parent = img.parentElement;
                            parent.innerHTML = '📁';
                            parent.style.fontSize = '28px';
                            parent.style.display = 'flex';
                            parent.style.alignItems = 'center';
                            parent.style.justifyContent = 'center';
                          }
                        }}
                      />
                    </div>
                  </td>

                  {/* Nome da categoria */}
                  <td style={{ padding: 10, fontWeight: 800 }}>{c.nome}</td>

                  {/* Descrição */}
                  <td style={{ padding: 10, color: 'var(--muted)' }}>{c.descricao || '—'}</td>

                  {/* Botão "Ver produtos" */}
                  <td style={{ padding: 10, textAlign: 'right' }}>
                    <button
                      className="btn btn-primary"
                      onClick={(e) => {
                        e.stopPropagation(); // Evita o clique na linha (para não navegar duas vezes)
                        goToCategory(c.category_id);
                      }}
                    >
                      Ver produtos
                    </button>
                  </td>
                </tr>
              ))}

              {/* Mensagem quando não há categorias */}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 14, color: 'var(--muted)' }}>
                    Sem categorias.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}