// ================================================================
// SEARCH.JSX – Página de pesquisa e filtragem de produtos
// ================================================================
// Este componente permite ao utilizador pesquisar e filtrar produtos
// utilizando parâmetros da URL (query string).
// Filtros disponíveis:
// - Termo de pesquisa (q)
// - Categoria (category_id)
// - Marca (brand)
// - Género (gender)
// - Faixa de preço (min_price, max_price)
// - Ordenação (sort)
// - Stock (in_stock) - filtrar apenas produtos com stock > 0
// Inclui paginação (12 produtos por página).
// ================================================================

// Importação dos módulos necessários
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchProducts, getBrands } from '../api/products';
import { getCategories } from '../api/categories';

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
// COMPONENTE: Search
// ================================================================

export default function Search() {
    // ----- OBTÉM PARÂMETROS DA URL -----
    const [searchParams, setSearchParams] = useSearchParams();

    // ----- ESTADOS -----
    const [products, setProducts] = useState([]);      // Produtos encontrados
    const [categories, setCategories] = useState([]);  // Lista de categorias (para o dropdown)
    const [brands, setBrands] = useState([]);          // Lista de marcas (para o dropdown)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ----- ESTADOS DE PAGINAÇÃO -----
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageInput, setPageInput] = useState('');
    const limit = 12; // Produtos por página

    // ----- LÊ OS PARÂMETROS DA URL (com valores padrão) -----
    const q = searchParams.get('q') || '';
    const category_id = searchParams.get('category_id') || '';
    const brand = searchParams.get('brand') || '';
    const gender = searchParams.get('gender') || '';
    const min_price = searchParams.get('min_price') || '';
    const max_price = searchParams.get('max_price') || '';
    const sort = searchParams.get('sort') || 'price_asc';
    const in_stock = searchParams.get('in_stock') || '';

    // ================================================================
    // FUNÇÃO: Buscar produtos com paginação e filtros
    // ================================================================

    const fetchProducts = async (page = 1) => {
        setLoading(true);
        setError('');

        try {
            // Constrói os filtros com os parâmetros da URL
            const filters = { 
                q, 
                category_id, 
                brand, 
                gender, 
                min_price, 
                max_price, 
                sort, 
                page, 
                limit,
                in_stock: in_stock === 'true' ? true : false
            };
            console.log('🔍 FILTROS A ENVIAR:', filters);
            
            const response = await searchProducts(filters);
            console.log('📦 RESPOSTA DO SEARCH:', response);
            // Atualiza os estados com os dados recebidos
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

    // ================================================================
    // EFFECT: Carregar produtos quando os filtros mudarem
    // ================================================================

    // Quando os filtros mudarem, reset para a página 1
    useEffect(() => {
        setCurrentPage(1);
        fetchProducts(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, category_id, brand, gender, min_price, max_price, sort, in_stock]);

    // ================================================================
    // EFFECT: Carregar categorias e marcas (dropdowns)
    // ================================================================

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

    // ================================================================
    // HANDLERS: Filtros e navegação
    // ================================================================

    // Handler para mudanças nos filtros (atualiza a URL)
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

    // Limpa todos os filtros (volta ao estado inicial)
    const clearFilters = () => {
        setSearchParams({ 
            q: '', 
            category_id: '', 
            brand: '', 
            gender: '', 
            min_price: '', 
            max_price: '', 
            sort: 'price_asc',
            in_stock: ''
        });
    };

    // Muda para a página especificada (se válida)
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            fetchProducts(newPage);
        }
    };

    // Submissão do input de salto de página
    const handlePageInputSubmit = (e) => {
        e.preventDefault();
        const page = Number(pageInput);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            fetchProducts(page);
        } else {
            setPageInput(currentPage.toString()); // Reset se inválido
        }
    };

    // Gera um array com os números das páginas
    const getPageNumbers = () => {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
        return pages;
    };

    // ================================================================
    // RENDERIZAÇÃO
    // ================================================================

    return (
        <div className="container" style={{ padding: '32px 0' }}>
            {/* Layout de duas colunas: filtros à esquerda, resultados à direita */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {/* ===== PAINEL LATERAL DE FILTROS ===== */}
                <aside style={{ width: 260, background: 'var(--surface-2)', borderRadius: 12, padding: 16 }}>
                    <h3 style={{ marginTop: 0 }}>Filtros</h3>

                    {/* Campo de pesquisa por termo */}
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

                    {/* Filtro por categoria */}
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

                    {/* Filtro por marca */}
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

                    {/* Filtro por género */}
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

                    {/* Preço mínimo */}
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

                    {/* Preço máximo */}
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

                    {/* Filtro: Apenas produtos em stock */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 6 }}>Stock</label>
                        <select
                            name="in_stock"
                            value={in_stock}
                            onChange={handleFilterChange}
                            className="input"
                        >
                            <option value="">Todos</option>
                            <option value="true">Apenas em stock</option>
                        </select>
                    </div>

                    {/* Ordenação */}
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

                {/* ===== ÁREA PRINCIPAL (RESULTADOS) ===== */}
                <main style={{ flex: 1 }}>
                    {/* Cabeçalho com contagem e indicador de carregamento */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                        <h2 style={{ margin: 0 }}>Resultados ({products.length})</h2>
                        {loading && <p style={{ margin: 0 }}>A carregar...</p>}
                    </div>

                    {/* Mensagem de erro */}
                    {error && <p style={{ color: 'salmon' }}>{error}</p>}

                    {/* Mensagem quando não há produtos */}
                    {!loading && products.length === 0 && !error && (
                        <p style={{ color: 'var(--muted)' }}>Nenhum produto encontrado.</p>
                    )}

                    {/* Grelha de produtos (cards) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                        {products.map(p => (
                            <Link
                                key={p.product_id}
                                to={`/products/${p.product_id}`}
                                className="card"
                                style={{ padding: 14, textDecoration: 'none', color: 'inherit' }}
                            >
                                {/* Container da imagem (proporção 1:1) */}
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
                                {/* Informações do produto */}
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ fontWeight: 700 }}>{p.nome}</div>
                                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>{p.marca}</div>
                                    <div style={{ marginTop: 8, fontWeight: 800 }}>€{p.preco}</div>
                                    {/* Indicador de stock */}
                                    {p.stock > 0 ? (
                                        <span style={{ fontSize: 12, color: 'green' }}>✅ Em stock</span>
                                    ) : (
                                        <span style={{ fontSize: 12, color: 'red' }}>❌ Sem stock</span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* ----- PAGINAÇÃO ----- */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '32px', flexWrap: 'wrap' }}>
                            {/* Botão Anterior */}
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="btn btn-ghost"
                                style={{ padding: '0 16px' }}
                            >
                                Anterior
                            </button>

                            {/* Números das páginas */}
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

                            {/* Botão Próximo */}
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="btn btn-ghost"
                                style={{ padding: '0 16px' }}
                            >
                                Próximo
                            </button>

                            {/* Input para saltar página */}
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