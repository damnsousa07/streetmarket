// Search.jsx
// Página de pesquisa e filtragem de produtos com base em parâmetros da URL.
// Permite filtrar por termo, categoria, faixa de preço e ordenação.

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchProducts } from '../api/products';
import { getCategories } from '../api/categories';

// Função auxiliar para obter a URL completa da imagem do produto.
// Se já for uma URL absoluta (http/https), mantém; caso contrário, adiciona a base da API.
function getFullImageUrl(imagePath) {
    if (!imagePath) return '';                                     // Se não houver imagem, retorna vazio
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;                                          // Já é uma URL absoluta
    }
    return `${import.meta.env.VITE_API_URL}${imagePath}`;          // Concatena com a base da API
}

export default function Search() {
    // Hook para ler e atualizar os parâmetros da URL (query string)
    const [searchParams, setSearchParams] = useSearchParams();

    // Estados para produtos, categorias, carregamento e erro
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Lê os filtros diretamente da URL, com valores padrão (vazio)
    const q = searchParams.get('q') || '';                         // Termo de pesquisa
    const category_id = searchParams.get('category_id') || '';     // ID da categoria
    const min_price = searchParams.get('min_price') || '';         // Preço mínimo
    const max_price = searchParams.get('max_price') || '';         // Preço máximo
    const sort = searchParams.get('sort') || 'price_asc';          // Ordenação (padrão: preço crescente)

    // ------------------------------------------------------------
    // Efeito: sempre que os parâmetros da URL mudarem, faz a pesquisa
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);      // Ativa o carregamento
            setError('');          // Limpa erros anteriores

            try {
                // Constrói objeto de filtros com os valores da URL
                const filters = { q, category_id, min_price, max_price, sort };
                const data = await searchProducts(filters); // Chama a API
                setProducts(data); // Guarda os produtos encontrados
            } catch (err) {
                setError('Erro ao carregar resultados.');
                console.error(err);
            } finally {
                setLoading(false); // Desativa o carregamento
            }
        };

        fetchProducts();
    }, [q, category_id, min_price, max_price, sort]); // Executa quando qualquer filtro mudar

    // ------------------------------------------------------------
    // Efeito: carrega a lista de categorias (para o dropdown) ao montar
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const data = await getCategories();
                setCategories(data);
            } catch (err) {
                console.error('Erro ao carregar categorias', err);
            }
        };
        loadCategories();
    }, []); // Array vazio = executa apenas uma vez

    // ------------------------------------------------------------
    // Função chamada quando um filtro é alterado (input, select)
    // Atualiza os parâmetros da URL, o que dispara o efeito de pesquisa
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(name, value);      // Define o parâmetro se tiver valor
        } else {
            newParams.delete(name);           // Remove o parâmetro se estiver vazio
        }
        setSearchParams(newParams);           // Atualiza a URL
    };

    // ------------------------------------------------------------
    // Função que limpa todos os filtros e volta ao estado inicial
    const clearFilters = () => {
        // Define os parâmetros para os valores padrão (vazios)
        setSearchParams({ q: '', category_id: '', min_price: '', max_price: '', sort: 'price_asc' });
    };

    // ------------------------------------------------------------
    // Renderização da página
    return (
        <div className="container" style={{ padding: '32px 0' }}>
            {/* Estrutura de duas colunas: filtros à esquerda, resultados à direita */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {/* Painel lateral de filtros */}
                <aside style={{ width: 260, background: 'var(--surface-2)', borderRadius: 12, padding: 16 }}>
                    <h3 style={{ marginTop: 0 }}>Filtros</h3>

                    {/* Campo: pesquisa por termo */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 6 }}>Pesquisar</label>
                        <input
                            type="text"
                            name="q"
                            placeholder="Ex: jeans"
                            value={q}
                            onChange={handleFilterChange}
                            className="input"
                        />
                    </div>

                    {/* Seleção de categoria */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 6 }}>Categoria</label>
                        <select
                            name="category_id"
                            value={category_id}
                            onChange={handleFilterChange}
                            className="input"
                        >
                            <option value="">Todas</option>
                            {categories.map(cat => (
                                <option key={cat.category_id} value={cat.category_id}>
                                    {cat.nome}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Campo: preço mínimo */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 6 }}>Preço mínimo (€)</label>
                        <input
                            type="number"
                            name="min_price"
                            placeholder="0"
                            value={min_price}
                            onChange={handleFilterChange}
                            className="input"
                        />
                    </div>

                    {/* Campo: preço máximo */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 6 }}>Preço máximo (€)</label>
                        <input
                            type="number"
                            name="max_price"
                            placeholder="500"
                            value={max_price}
                            onChange={handleFilterChange}
                            className="input"
                        />
                    </div>

                    {/* Seleção de ordenação */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 6 }}>Ordenar por</label>
                        <select
                            name="sort"
                            value={sort}
                            onChange={handleFilterChange}
                            className="input"
                        >
                            <option value="price_asc">Preço: menor → maior</option>
                            <option value="price_desc">Preço: maior → menor</option>
                            <option value="name_asc">Nome: A → Z</option>
                            <option value="name_desc">Nome: Z → A</option>
                        </select>
                    </div>

                    {/* Botão para limpar todos os filtros */}
                    <button className="btn btn-ghost" onClick={clearFilters} style={{ width: '100%' }}>
                        Limpar filtros
                    </button>
                </aside>

                {/* Área principal: resultados da pesquisa */}
                <main style={{ flex: 1 }}>
                    {/* Cabeçalho dos resultados (contagem e indicador de carregamento) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                        <h2 style={{ margin: 0 }}>Resultados ({products.length})</h2>
                        {loading && <p style={{ margin: 0 }}>A carregar...</p>}
                    </div>

                    {/* Mensagem de erro (se houver) */}
                    {error && <p style={{ color: 'salmon' }}>{error}</p>}

                    {/* Mensagem quando não há produtos (apenas se não estiver a carregar e não houver erro) */}
                    {!loading && products.length === 0 && !error && (
                        <p style={{ color: 'var(--muted)' }}>Nenhum produto encontrado.</p>
                    )}

                    {/* Grelha de produtos (cards) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                        {products.map(p => (
                            // Cada card é um link para a página de detalhes do produto
                            <Link
                                key={p.product_id}
                                to={`/products/${p.product_id}`}
                                className="card"
                                style={{ padding: 14, textDecoration: 'none', color: 'inherit' }}
                            >
                                {/* Container da imagem com proporção 1:1 */}
                                <div style={{
                                    aspectRatio: '1/1',
                                    background: 'var(--surface-2)',
                                    borderRadius: 12,
                                    overflow: 'hidden'
                                }}>
                                    {p.imagem ? (
                                        <img
                                            src={getFullImageUrl(p.imagem)}
                                            alt={p.nome}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%' }} />
                                    )}
                                </div>

                                {/* Informações do produto: nome, marca e preço */}
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ fontWeight: 700 }}>{p.nome}</div>
                                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>{p.marca}</div>
                                    <div style={{ marginTop: 8, fontWeight: 800 }}>€{p.preco}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}