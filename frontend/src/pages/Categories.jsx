// Categories.jsx
// Página que lista todas as categorias disponíveis e permite navegar para ver produtos de cada uma.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '../api/categories';

export default function Categories() {
    const navigate = useNavigate();

    // Estados locais: lista de categorias, loading e erro
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Memoização: ordena as categorias por nome (ordem alfabética portuguesa)
    const sorted = useMemo(() => {
        const list = Array.isArray(rows) ? rows : [];
        return [...list].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));
    }, [rows]);

    // Função que carrega as categorias da API
    async function load() {
        setLoading(true);
        setError('');
        try {
            const data = await getCategories();
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

    // Navega para a página de produtos de uma categoria específica
    function goToCategory(category_id) {
        navigate(`/categories/${category_id}`);
    }

    // ------------------------------------------------------------
    // Renderização da página
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

            {/* Estados de loading e erro */}
            {loading && <p style={{ color: 'var(--muted)', marginTop: 16 }}>A carregar...</p>}
            {error && <p style={{ color: 'salmon', marginTop: 16 }}>{error}</p>}

            {/* Tabela de categorias (apenas se não estiver a carregar e não houver erro) */}
            {!loading && !error && (
                <div className="card" style={{ padding: 12, marginTop: 16, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: 13 }}>
                                <th style={{ padding: 10 }}>ID</th>
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
                                    <td style={{ padding: 10, fontWeight: 800 }}>#{c.category_id}</td>
                                    <td style={{ padding: 10, fontWeight: 800 }}>{c.nome}</td>
                                    <td style={{ padding: 10, color: 'var(--muted)' }}>{c.descricao || '—'}</td>
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