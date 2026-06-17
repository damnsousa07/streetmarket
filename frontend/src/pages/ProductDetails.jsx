// ProductDetails.jsx
// Página de detalhes de um produto, com galeria de imagens, seleção de tamanho,
// compra, exibição de reviews e envio de nova review.

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../api/products';
import { createOrder } from '../api/orders';
import { createReview, getReviewsByProduct } from '../api/reviews';
import ImageModal from '../components/ImageModal';

// ------------------------------------------------------------
// Verifica se a sessão do utilizador ainda é válida
function isSessionValid() {
    const userId = localStorage.getItem('user_id');
    const expiresAt = Number(localStorage.getItem('auth_expires_at') || 0);
    return !!userId && Date.now() < expiresAt;
}

// ------------------------------------------------------------
// Componente de estrelas (rating), com suporte para leitura e edição
function Stars({ value = 0, onChange, size = 22, readOnly = false }) {
    const v = Number(value) || 0;
    return (
        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((n) => {
                const filled = n <= v;
                return (
                    <button
                        key={n}
                        type="button"
                        onClick={() => !readOnly && onChange?.(n)}
                        disabled={readOnly}
                        className="btn btn-ghost"
                        style={{
                            padding: 0,
                            width: size + 10,
                            height: size + 10,
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: 10,
                            cursor: readOnly ? 'default' : 'pointer',
                            opacity: readOnly ? 1 : 0.95,
                        }}
                        aria-label={`${n} estrelas`}
                        title={`${n} estrelas`}
                    >
                        <span style={{ fontSize: size, lineHeight: 1 }}>
                            {filled ? '★' : '☆'}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ------------------------------------------------------------
// Função auxiliar para obter a URL completa da imagem do produto.
// Se já for uma URL absoluta (http/https), mantém; caso contrário, adiciona a base da API.
function getFullImageUrl(imagePath) {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    return `${import.meta.env.VITE_API_URL}${imagePath}`;
}

// ------------------------------------------------------------
// Componente principal: detalhes do produto
export default function ProductDetails() {
    // Obtém o ID do produto a partir dos parâmetros da URL
    const { id } = useParams();
    const navigate = useNavigate();

    // Estados para o produto, carregamento, erro e imagem principal
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mainImage, setMainImage] = useState('');
    const [modalImage, setModalImage] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);

    // Estados para a compra
    const [buying, setBuying] = useState(false);
    const [buyError, setBuyError] = useState('');

    // Estados para reviews
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [reviewError, setReviewError] = useState('');

    // Estados para envio de nova review
    const [rating, setRating] = useState(5);
    const [comentario, setComentario] = useState('');
    const [sendingReview, setSendingReview] = useState(false);
    const [sendingReviewError, setSendingReviewError] = useState('');

    // Obtém o user_id do localStorage
    const user_id = localStorage.getItem('user_id');

    // Verifica se o utilizador pode comprar (sessão válida)
    const canBuy = useMemo(() => isSessionValid(), []);

    // Verifica se o utilizador já fez uma review para este produto
    const hasReviewed = useMemo(() => {
        if (!user_id) return false;
        return (reviews || []).some((r) => Number(r.user_id) === Number(user_id));
    }, [reviews, user_id]);

    // Calcula a média das classificações
    const avgRating = useMemo(() => {
        if (!reviews?.length) return 0;
        const sum = reviews.reduce(
            (acc, r) => acc + (Number(r.rating ?? r.estrelas ?? r.nota) || 0),
            0
        );
        return Math.round((sum / reviews.length) * 10) / 10;
    }, [reviews]);

    // ------------------------------------------------------------
    // Função que carrega os dados do produto
    async function loadProduct() {
        try {
            setLoading(true);
            setError('');
            const data = await getProductById(id);
            const normalized = Array.isArray(data) ? data[0] : data;
            setProduct(normalized || null);
            
            // Define a imagem principal (primeira ou a marcada como primary)
            if (normalized?.images && normalized.images.length > 0) {
                const primary = normalized.images.find(img => img.is_primary) || normalized.images[0];
                setMainImage(primary.image_url);
            } else if (normalized?.imagem) {
                setMainImage(normalized.imagem);
            } else {
                setMainImage('');
            }
        } catch (e) {
            setError('Não foi possível carregar o produto.');
        } finally {
            setLoading(false);
        }
    }

    // Função que carrega as reviews do produto
    async function loadReviews() {
        try {
            setLoadingReviews(true);
            setReviewError('');
            const data = await getReviewsByProduct(id);
            // Normaliza a resposta (pode ser array ou objeto com propriedade 'reviews')
            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.reviews)
                ? data.reviews
                : [];
            setReviews(list);
        } catch (e) {
            setReviewError('Não foi possível carregar as reviews.');
            setReviews([]);
        } finally {
            setLoadingReviews(false);
        }
    }

    // useEffect para carregar produto e reviews ao montar ou quando o ID mudar
    useEffect(() => {
        let alive = true;
        (async () => {
            await loadProduct();
            if (alive) await loadReviews();
        })();
        return () => { alive = false; };
    }, [id]);

    // ------------------------------------------------------------
    // Função que trata da compra do produto
    async function handleBuy() {
        // Verifica se a sessão é válida
        if (!isSessionValid()) {
            setBuyError('Tens de iniciar sessão para comprar. (Sessão expirada ou não iniciada)');
            navigate('/login');
            return;
        }
        // Verifica se foi selecionado um tamanho
        if (!selectedSize) {
            setBuyError('Por favor, seleciona um tamanho antes de comprar.');
            return;
        }
        const uid = localStorage.getItem('user_id');
        if (!uid) {
            setBuyError('Tens de iniciar sessão para comprar.');
            navigate('/login');
            return;
        }
        try {
            setBuying(true);
            setBuyError('');
            // Cria a encomenda com o tamanho selecionado
            const response = await createOrder(Number(uid), Number(product.product_id), selectedSize);
            // Redireciona para o checkout passando o valor e o nome do produto
            navigate(`/checkout/${response.order_id}`, {
                state: {
                    amount: product.preco,
                    nomeProduto: product.nome,
                },
            });
        } catch (e) {
            setBuyError('Não foi possível criar a compra.');
        } finally {
            setBuying(false);
        }
    }

    // ------------------------------------------------------------
    // Função que envia uma nova review
    async function handleSubmitReview(e) {
        e.preventDefault();
        // Valida se o utilizador está autenticado
        if (!user_id) {
            alert('Tens de fazer login (definir user_id) para escrever uma review.');
            return;
        }
        // Verifica se já escreveu review para este produto
        if (hasReviewed) {
            setSendingReviewError('Já escreveste uma review para este produto.');
            return;
        }
        if (!product?.product_id) return;
        // Valida a pontuação
        if (!rating || Number(rating) < 1 || Number(rating) > 5) {
            setSendingReviewError('Escolhe uma pontuação entre 1 e 5.');
            return;
        }
        if (!comentario.trim()) {
            setSendingReviewError('Escreve um comentário.');
            return;
        }
        try {
            setSendingReview(true);
            setSendingReviewError('');
            // Envia a review para a API
            await createReview({
                user_id: Number(user_id),
                product_id: Number(product.product_id),
                rating: Number(rating),
                comentario: comentario.trim(),
            });
            // Limpa o formulário e recarrega as reviews
            setComentario('');
            setRating(5);
            await loadReviews();
            alert('Review enviada com sucesso.');
        } catch (e) {
            const status = e?.response?.status;
            const msg = e?.response?.data?.message;
            setSendingReviewError(
                `Não foi possível enviar a review. ${status ? `(HTTP ${status})` : ''} ${msg ? `- ${msg}` : ''}`
            );
        } finally {
            setSendingReview(false);
        }
    }

    // ------------------------------------------------------------
    // Renderiza estados de carregamento e erro (product)
    if (loading) {
        return (
            <div className="container" style={{ padding: '32px 0' }}>
                <p style={{ color: 'var(--muted)' }}>A carregar...</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="container" style={{ padding: '32px 0' }}>
                <p style={{ color: 'salmon' }}>{error}</p>
            </div>
        );
    }
    if (!product) {
        return (
            <div className="container" style={{ padding: '32px 0' }}>
                <p style={{ color: 'var(--muted)' }}>Produto não encontrado.</p>
            </div>
        );
    }

    // Normaliza a lista de imagens
    const imagesArray = product.images && product.images.length > 0 
        ? product.images 
        : (product.imagem ? [{ image_url: product.imagem, is_primary: true }] : []);

    // ------------------------------------------------------------
    // Renderização principal
    return (
        <div className="container" style={{ padding: '32px 0' }}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(260px, 420px) 1fr',
                    gap: 24,
                    alignItems: 'start',
                }}
            >
                {/* GALERIA DE IMAGENS */}
                <div className="card" style={{ padding: 12 }}>
                    {/* Imagem principal (clicável para abrir modal) */}
                    <div
                        style={{
                            aspectRatio: '1 / 1',
                            background: 'var(--surface-2)',
                            borderRadius: 12,
                            overflow: 'hidden',
                            marginBottom: 12,
                            cursor: 'pointer',
                        }}
                        onClick={() => mainImage && setModalImage(getFullImageUrl(mainImage))}
                    >
                        {mainImage ? (
                            <img
                                src={getFullImageUrl(mainImage)}
                                alt={product.nome}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%' }} />
                        )}
                    </div>

                    {/* Miniaturas das imagens */}
                    {imagesArray.length > 1 && (
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                            {imagesArray.map((img) => (
                                <img
                                    key={img.image_id || img.image_url}
                                    src={getFullImageUrl(img.image_url)}
                                    alt="miniatura"
                                    onClick={() => setMainImage(img.image_url)}
                                    style={{
                                        width: 60,
                                        height: 60,
                                        objectFit: 'cover',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        border: mainImage === img.image_url ? '2px solid #646cff' : '1px solid var(--border)',
                                        opacity: mainImage === img.image_url ? 1 : 0.7,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* INFORMAÇÕES DO PRODUTO */}
                <div>
                    <h1 style={{ marginTop: 0 }}>{product.nome}</h1>
                    <div style={{ color: 'var(--muted)', marginTop: 6 }}>{product.marca}</div>

                    {/* Média de estrelas */}
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Stars value={Math.round(avgRating)} readOnly />
                        <div style={{ color: 'var(--muted)' }}>
                            {reviews.length > 0 ? (
                                <>
                                    <strong>{avgRating}</strong> / 5 • {reviews.length} review(s)
                                </>
                            ) : (
                                'Sem reviews'
                            )}
                        </div>
                    </div>

                    {/* Preço */}
                    <div style={{ marginTop: 16, fontSize: 22, fontWeight: 900 }}>
                        €{product.preco}
                    </div>

                    {/* Descrição */}
                    {product.descricao ? (
                        <p style={{ color: 'var(--muted)', marginTop: 16, lineHeight: 1.6 }}>
                            {product.descricao}
                        </p>
                    ) : (
                        <p style={{ color: 'var(--muted)', marginTop: 16 }}>
                            Sem descrição.
                        </p>
                    )}

                    {/* Seleção de tamanhos (se existir) */}
                    {product.tamanhos && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontWeight: 700, marginBottom: 8 }}>Tamanhos disponíveis:</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {product.tamanhos.split(',').map((tamanho, idx) => {
                                    const tamanhoTrim = tamanho.trim();
                                    const isSelected = selectedSize === tamanhoTrim;
                                    return (
                                        <button
                                            key={idx}
                                            className="btn"
                                            onClick={() => setSelectedSize(tamanhoTrim)}
                                            style={{
                                                padding: '6px 12px',
                                                border: '1px solid var(--border)',
                                                backgroundColor: isSelected ? '#646cff' : 'transparent',
                                                color: isSelected ? 'white' : 'inherit',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {tamanhoTrim}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Botão de compra */}
                    <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleBuy}
                            disabled={buying || !isSessionValid()}
                            title={!isSessionValid() ? 'Tens de iniciar sessão para comprar' : ''}
                        >
                            {buying ? 'A comprar...' : 'Comprar'}
                        </button>
                    </div>

                    {/* Mensagem de sessão inválida */}
                    {!isSessionValid() && (
                        <p style={{ color: 'salmon', marginTop: 12 }}>
                            Tens de iniciar sessão para comprar. A tua sessão expira em 10 minutos.
                        </p>
                    )}

                    {/* Erro na compra */}
                    {buyError && <p style={{ color: 'salmon', marginTop: 12 }}>{buyError}</p>}
                </div>
            </div>

            {/* Modal para ver imagem em tamanho grande */}
            {modalImage && (
                <ImageModal src={modalImage} alt={product.nome} onClose={() => setModalImage(null)} />
            )}

            {/* SECÇÃO DE REVIEWS */}
            <div style={{ marginTop: 28 }}>
                {/* Lista de reviews */}
                <div className="card" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                        <div>
                            <h2 style={{ margin: 0 }}>Reviews</h2>
                            <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                                Opiniões de quem comprou este produto.
                            </p>
                        </div>
                        <button className="btn btn-ghost" onClick={loadReviews} disabled={loadingReviews}>
                            Atualizar
                        </button>
                    </div>

                    {loadingReviews && <p style={{ color: 'var(--muted)', marginTop: 14 }}>A carregar reviews...</p>}
                    {reviewError && <p style={{ color: 'salmon', marginTop: 14 }}>{reviewError}</p>}

                    {!loadingReviews && !reviewError && reviews.length === 0 && (
                        <p style={{ color: 'var(--muted)', marginTop: 14 }}>Ainda não há reviews.</p>
                    )}

                    {!loadingReviews && !reviewError && reviews.length > 0 && (
                        <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
                            {reviews.map((r, idx) => {
                                const stars = Number(r.rating ?? r.estrelas ?? r.nota) || 0;
                                const text = r.comentario ?? r.texto ?? r.comment ?? '';
                                const date = r.data ?? r.data_criacao ?? r.created_at;

                                return (
                                    <div key={r.review_id || `${idx}-${stars}-${text}`} className="card" style={{ padding: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <Stars value={stars} readOnly size={18} />
                                            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                                                {date ? new Date(date).toLocaleString() : ''}
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 10, fontWeight: 700 }}>
                                            {text || '—'}
                                        </div>

                                        {(r.user_nome || r.nome || r.user_id) && (
                                            <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 13 }}>
                                                Por: <strong>{r.user_nome ?? r.nome ?? `User ${r.user_id}`}</strong>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Formulário para escrever nova review */}
                <div className="card" style={{ padding: 14, marginTop: 12 }}>
                    <h3 style={{ marginTop: 0 }}>Escrever uma review</h3>

                    {!user_id && (
                        <p style={{ color: 'salmon', marginTop: 6 }}>
                            Tens de fazer login (definir <strong>user_id</strong>) para escrever uma review.
                        </p>
                    )}

                    {user_id && hasReviewed && (
                        <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                            Já escreveste uma review para este produto.
                        </p>
                    )}

                    <form onSubmit={handleSubmitReview} style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                        <div>
                            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Pontuação</div>
                            <Stars value={rating} onChange={setRating} readOnly={hasReviewed} />
                        </div>

                        <div>
                            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Comentário</div>
                            <textarea
                                className="input"
                                style={{ minHeight: 100, resize: 'vertical', padding: 12 }}
                                value={comentario}
                                onChange={(e) => setComentario(e.target.value)}
                                placeholder="Escreve aqui a tua opinião..."
                                disabled={!user_id || hasReviewed}
                            />
                        </div>

                        {sendingReviewError && (
                            <p style={{ color: 'salmon', margin: 0 }}>{sendingReviewError}</p>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-primary"
                                type="submit"
                                disabled={sendingReview || !user_id || hasReviewed}
                            >
                                {sendingReview ? 'A enviar...' : 'Enviar review'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}