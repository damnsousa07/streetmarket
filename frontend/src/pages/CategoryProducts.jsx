// CategoryProducts.jsx
// Página que exibe todos os produtos de uma categoria específica.
// Utiliza o ID da categoria obtido via parâmetro da URL.

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProducts } from '../api/products';
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

export default function CategoryProducts() {
    // Obtém o ID da categoria a partir dos parâmetros da rota (ex: /categories/5)
    const { category_id } = useParams();

    // Estados para guardar os produtos, estado de carregamento, erro e nome da categoria
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [categoryName, setCategoryName] = useState('');

    // useEffect para carregar os dados quando o ID da categoria mudar
    useEffect(() => {
        // Flag para evitar atualizações em componentes desmontados (prevenir memory leaks)
        let alive = true;

        async function load() {
            try {
                setLoading(true);
                setError('');

                // 1. Busca todos os produtos (a API pode não ter filtro por categoria)
                const allProducts = await getProducts();
                if (!alive) return; // Se o componente foi desmontado, interrompe

                // 2. Filtra os produtos cujo category_id corresponda ao da URL
                const filtered = allProducts.filter(
                    (p) => String(p.category_id) === String(category_id)
                );
                setProducts(filtered);

                // 3. (Opcional) Busca o nome da categoria para mostrar no cabeçalho
                try {
                    const categories = await getCategories();
                    if (!alive) return;
                    const cat = categories.find(c => String(c.category_id) === String(category_id));
                    setCategoryName(cat?.nome || `Categoria ${category_id}`);
                } catch {
                    // Se falhar ao buscar categorias, usa um fallback
                    setCategoryName(`Categoria ${category_id}`);
                }
            } catch (err) {
                // Captura erros da requisição de produtos
                if (alive) setError('Erro ao carregar produtos');
                console.error(err);
            } finally {
                // Desativa o indicador de carregamento se o componente ainda estiver montado
                if (alive) setLoading(false);
            }
        }

        load();

        // Cleanup: marca a flag como false para evitar atualizações após desmontagem
        return () => { alive = false; };
    }, [category_id]); // Recarrega sempre que o category_id mudar

    // Renderização condicional: carregamento
    if (loading) return <p style={{ padding: '32px 0', textAlign: 'center' }}>A carregar produtos...</p>;
    // Renderização condicional: erro
    if (error) return <p style={{ color: 'salmon', padding: '32px 0' }}>{error}</p>;

    return (
        <div className="container" style={{ padding: '32px 0' }}>
            {/* Cabeçalho com o nome da categoria e subtítulo */}
            <h1>{categoryName}</h1>
            <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                Produtos disponíveis nesta categoria.
            </p>

            {/* Se não houver produtos, mostra mensagem */}
            {products.length === 0 ? (
                <p style={{ color: 'var(--muted)', marginTop: 16 }}>
                    Nenhum produto encontrado nesta categoria.
                </p>
            ) : (
                // Grelha de produtos (cards)
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
                            {/* Container da imagem com proporção 1:1 */}
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
                                    // Placeholder quando não há imagem
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
            )}
        </div>
    );
}