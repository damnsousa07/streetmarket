// ================================================================
// CATEGORYPRODUCTS.JSX – Produtos de uma categoria específica
// ================================================================
// Este componente exibe os produtos de uma categoria específica,
// com paginação (12 produtos por página) e navegação para a página
// de detalhe do produto.
// Utiliza o ID da categoria obtido via parâmetro da URL (/categories/:category_id).
// ================================================================

// Importação dos módulos necessários
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProducts } from '../api/products';
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
// COMPONENTE: CategoryProducts
// ================================================================

export default function CategoryProducts() {
    // Obtém o ID da categoria a partir dos parâmetros da URL
    const { category_id } = useParams();

    // ----- ESTADOS -----
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [categoryName, setCategoryName] = useState('');

    // ----- ESTADOS DE PAGINAÇÃO -----
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageInput, setPageInput] = useState('');
    const limit = 12; // Produtos por página

    // ================================================================
    // FUNÇÃO: Buscar produtos da categoria (com paginação)
    // ================================================================

    const fetchProducts = async (page = 1) => {
        try {
            setLoading(true);
            setError('');
            // Chama a API com o category_id, página e limite
            const response = await getProducts({
                category_id,
                page,
                limit,
            });
            console.log('📦 Resposta da API (categoria):', response);
            // Atualiza os estados com os dados recebidos
            setProducts(response.data || []);
            setCurrentPage(response.meta?.currentPage || 1);
            setTotalPages(response.meta?.totalPages || 1);
            setPageInput((response.meta?.currentPage || 1).toString());
        } catch (err) {
            setError('Erro ao carregar produtos');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ================================================================
    // FUNÇÃO: Buscar nome da categoria
    // ================================================================

    const fetchCategoryName = async () => {
        try {
            const categories = await getCategories();
            // Encontra a categoria pelo ID
            const cat = categories.find(c => String(c.category_id) === String(category_id));
            setCategoryName(cat?.nome || `Categoria ${category_id}`);
        } catch {
            setCategoryName(`Categoria ${category_id}`);
        }
    };

    // ================================================================
    // EFFECT: Carregar dados quando a categoria mudar
    // ================================================================

    useEffect(() => {
        // Reset para a página 1 quando a categoria mudar
        setCurrentPage(1);
        fetchProducts(1);
        fetchCategoryName();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category_id]);

    // ================================================================
    // FUNÇÕES: Navegação entre páginas
    // ================================================================

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

    // Gera um array com os números das páginas (para os botões)
    const getPageNumbers = () => {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
        return pages;
    };

    // ================================================================
    // RENDERIZAÇÃO CONDICIONAL
    // ================================================================

    // Mostra loading apenas na primeira carga (quando não há produtos)
    if (loading && products.length === 0) {
        return <p style={{ padding: '32px 0', textAlign: 'center' }}>A carregar produtos...</p>;
    }

    // Mostra erro se houver
    if (error) {
        return <p style={{ color: 'salmon', padding: '32px 0' }}>{error}</p>;
    }

    // ================================================================
    // RENDERIZAÇÃO PRINCIPAL
    // ================================================================

    return (
        <div className="container" style={{ padding: '32px 0' }}>
            {/* Cabeçalho com o nome da categoria */}
            <h1>{categoryName}</h1>
            <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                Produtos disponíveis nesta categoria.
            </p>

            {/* Mensagem quando não há produtos */}
            {products.length === 0 ? (
                <p style={{ color: 'var(--muted)', marginTop: 16 }}>
                    Nenhum produto encontrado nesta categoria.
                </p>
            ) : (
                <>
                    {/* ----- GRELHA DE PRODUTOS (cards) ----- */}
                    <div
                        style={{
                            marginTop: 16,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: 16,
                        }}
                    >
                        {products.map((p) => (
                            // Cada card é um link para a página de detalhes do produto
                            <Link
                                key={p.product_id}
                                to={`/products/${p.product_id}`}
                                className="card"
                                style={{ padding: 14, textDecoration: 'none', color: 'inherit' }}
                            >
                                {/* Container da imagem (proporção 1:1) */}
                                <div style={{
                                    aspectRatio: '1 / 1',
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

                    {/* ----- PAGINAÇÃO (igual à Home) ----- */}
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
                </>
            )}
        </div>
    );
}