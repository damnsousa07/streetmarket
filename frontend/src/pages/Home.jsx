// Home.jsx
// Página inicial da aplicação que lista todos os produtos disponíveis.
// Os produtos são carregados da API e exibidos numa grelha de cards.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as productsApi from '../api/products';

// Função auxiliar para obter a URL completa da imagem do produto.
// Se já for uma URL absoluta (http/https), mantém; caso contrário, adiciona a base da API.
function getFullImageUrl(imagePath) {
    if (!imagePath) return '';                                     // Se não houver imagem, retorna vazio
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;                                          // Já é uma URL absoluta
    }
    return `${import.meta.env.VITE_API_URL}${imagePath}`;          // Concatena com a base da API
}

export default function Home() {
    // Estados para armazenar a lista de produtos, estado de carregamento e erro
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // useEffect para carregar os produtos quando o componente for montado
    useEffect(() => {
        // Flag para evitar atualizações em componentes desmontados (prevenir memory leaks)
        let alive = true;

        // Função imediatamente invocada (async/await dentro do useEffect)
        (async () => {
            try {
                setLoading(true);
                setError('');
                const data = await productsApi.getProducts(); // Busca todos os produtos da API
                if (alive) setProducts(data);     // Só atualiza se o componente ainda estiver montado
            } catch (e) {
                if (alive) setError('Não foi possível carregar os produtos.');
            } finally {
                if (alive) setLoading(false);     // Desativa o indicador de carregamento
            }
        })();

        // Cleanup: marca a flag como false para evitar atualizações após desmontagem
        return () => { alive = false; };
    }, []); // Array vazio = executa apenas uma vez (ao montar)

    // ------------------------------------------------------------
    // Renderização da página
    return (
        <div className="container" style={{ padding: '32px 0' }}>
            {/* Cabeçalho com título e subtítulo */}
            <h1>Produtos</h1>
            <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                Explora o catálogo.
            </p>

            {/* Mensagens de carregamento e erro */}
            {loading && <p style={{ color: 'var(--muted)' }}>A carregar...</p>}
            {error && <p style={{ color: 'salmon' }}>{error}</p>}

            {/* Grelha de produtos (apenas se não estiver a carregar e não houver erro) */}
            {!loading && !error && (
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