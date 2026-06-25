// Search.jsx
// Página de pesquisa e filtragem de produtos com base em parâmetros da URL.
// Permite filtrar por termo, categoria, marca, género, faixa de preço e ordenação,
// com paginação.

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchProducts, getBrands } from '../api/products';
import { getCategories } from '../api/categories';

function getFullImageUrl(imagePath) {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    return `${import.meta.env.VITE_API_URL}${imagePath}`;
}

export default function Search() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageInput, setPageInput] = useState('');
    const limit = 12;

    // Lê os parâmetros da URL
    const q = searchParams.get('q') || '';
    const category_id = searchParams.get('category_id') || '';
    const brand = searchParams.get('brand') || '';
    const gender = searchParams.get('gender') || '';
    const min_price = searchParams.get('min_price') || '';
    const max_price = searchParams.get('max_price') || '';
    const sort = searchParams.get('sort') || 'price_asc';

    // Buscar produtos com paginação
    const fetchProducts = async (page = 1) => {
        setLoading(true);
        setError('');

        try {
            const filters = { q, category_id, brand, gender, min_price, max_price, sort, page, limit };
            const response = await searchProducts(filters);
            console.log('📦 Resposta do Search:', response);
            setProducts(response.data || []);
            setCurrentPage(response.meta?.currentPage || 1);
            setTotalPages(response.meta?.totalPages || 1);
            setPageInput((response.meta?.currentPage || 1).toString());
        } catch (err) {
            setError('Erro ao carregar resultados.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Quando os filtros mudarem, reset para página 1
    useEffect(() => {
        setCurrentPage(1);
        fetchProducts(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, category_id, brand, gender, min_price, max_price, sort]);

    // Carregar categorias e marcas
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const data = await getCategories();
                setCategories(data);
            } catch (err) {
                console.error('Erro ao carregar categorias', err);
            }
        };
        const loadBrands = async () => {
            try {
                const data = await getBrands();
                setBrands(data);
            } catch (err) {
                console.error('Erro ao carregar marcas', err);
            }
        };
        loadCategories();
        loadBrands();
    }, []);

    // Handlers de filtro
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(name, value);
        } else {
            newParams.delete(name);
        }
        setSearchParams(newParams);
    };

    const clearFilters = () => {
        setSearchParams({ q: '', category_id: '', brand: '', gender: '', min_price: '', max_price: '', sort: 'price_asc' });
    };

    // Navegação de páginas
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            fetchProducts(newPage);
        }
    };

    const handlePageInputSubmit = (e) => {
        e.preventDefault();
        const page = Number(pageInput);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            fetchProducts(page);
        } else {
            setPageInput(currentPage.toString());
        }
    };

    const getPageNumbers = () => {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="container" style={{ padding: '32px 0' }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <aside style={{ width: 260, background: 'var(--surface-2)', borderRadius: 12, padding: 16 }}>
                    <h3 style={{ marginTop: 0 }}>Filtros</h3>

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

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 6 }}>Marca</label>
                        <select
                            name="brand"
                            value={brand}
                            onChange={handleFilterChange}
                            className="input"
                        >
                            <option value="">Todas</option>
                            {brands.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 6 }}>Género</label>
                        <select
                            name="gender"
                            value={gender}
                            onChange={handleFilterChange}
                            className="input"
                        >
                            <option value="">Todos</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Feminino">Feminino</option>
                            <option value="Unisexo">Unisexo</option>
                        </select>
                    </div>

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

                    <button className="btn btn-ghost" onClick={clearFilters} style={{ width: '100%' }}>
                        Limpar filtros
                    </button>
                </aside>

                <main style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                        <h2 style={{ margin: 0 }}>Resultados ({products.length})</h2>
                        {loading && <p style={{ margin: 0 }}>A carregar...</p>}
                    </div>

                    {error && <p style={{ color: 'salmon' }}>{error}</p>}

                    {!loading && products.length === 0 && !error && (
                        <p style={{ color: 'var(--muted)' }}>Nenhum produto encontrado.</p>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                        {products.map(p => (
                            <Link
                                key={p.product_id}
                                to={`/products/${p.product_id}`}
                                className="card"
                                style={{ padding: 14, textDecoration: 'none', color: 'inherit' }}
                            >
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

                                <div style={{ marginTop: 12 }}>
                                    <div style={{ fontWeight: 700 }}>{p.nome}</div>
                                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>{p.marca}</div>
                                    <div style={{ marginTop: 8, fontWeight: 800 }}>€{p.preco}</div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Paginação */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '32px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="btn btn-ghost"
                                style={{ padding: '0 16px' }}
                            >
                                Anterior
                            </button>
                            {getPageNumbers().map(num => (
                                <button
                                    key={num}
                                    onClick={() => handlePageChange(num)}
                                    className="btn"
                                    style={{
                                        padding: '0 14px',
                                        background: num === currentPage ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                        color: num === currentPage ? '#fff' : 'var(--text)',
                                        border: '1px solid ' + (num === currentPage ? 'transparent' : 'rgba(255,255,255,0.12)'),
                                        minWidth: '40px',
                                    }}
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="btn btn-ghost"
                                style={{ padding: '0 16px' }}
                            >
                                Próximo
                            </button>

                            <form onSubmit={handlePageInputSubmit} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
                                <span style={{ fontSize: '14px', color: 'var(--muted)' }}>Ir para</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={totalPages}
                                    value={pageInput}
                                    onChange={(e) => setPageInput(e.target.value)}
                                    style={{
                                        width: '60px',
                                        height: '36px',
                                        padding: '4px 6px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'var(--text)',
                                        textAlign: 'center',
                                        fontSize: '14px',
                                    }}
                                />
                                <span style={{ fontSize: '14px', color: 'var(--muted)' }}>de {totalPages}</span>
                                <button type="submit" className="btn btn-ghost" style={{ padding: '0 12px', height: '36px' }}>
                                    Ir
                                </button>
                            </form>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}