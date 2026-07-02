// ================================================================
// PRODUCTDETAILS.JSX – Página de detalhe do produto
// ================================================================

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../api/products';
import { createOrder } from '../api/orders';
import { createReview, getReviewsByProduct } from '../api/reviews';
import ImageModal from '../components/ImageModal';

function isSessionValid() {
    const userId = localStorage.getItem('user_id');
    const expiresAt = Number(localStorage.getItem('auth_expires_at') || 0);
    return !!userId && Date.now() < expiresAt;
}

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

function getFullImageUrl(imagePath) {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    return `${import.meta.env.VITE_API_URL}${imagePath}`;
}

export default function ProductDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mainImage, setMainImage] = useState('');
    const [modalImage, setModalImage] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);

    const [buying, setBuying] = useState(false);
    const [buyError, setBuyError] = useState('');

    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [reviewError, setReviewError] = useState('');

    const [rating, setRating] = useState(5);
    const [comentario, setComentario] = useState('');
    const [sendingReview, setSendingReview] = useState(false);
    const [sendingReviewError, setSendingReviewError] = useState('');
    const [showReviewSuccess, setShowReviewSuccess] = useState(false); // 🔧 NOVO

    const [canReview, setCanReview] = useState(false);
    const [userReview, setUserReview] = useState(null);

    const user_id = localStorage.getItem('user_id');
    const canBuy = useMemo(() => isSessionValid(), []);

    const hasReviewed = userReview !== null;
    const showReviewForm = canReview && !hasReviewed;

    const avgRating = useMemo(() => {
        if (!reviews?.length) return 0;
        const sum = reviews.reduce(
            (acc, r) => acc + (Number(r.rating ?? r.estrelas ?? r.nota) || 0),
            0
        );
        return Math.round((sum / reviews.length) * 10) / 10;
    }, [reviews]);

    const [refreshKey, setRefreshKey] = useState(0);

    async function loadProduct() {
        try {
            setLoading(true);
            setError('');
            const userId = localStorage.getItem('user_id');
            const data = await getProductById(id, userId);
            const normalized = Array.isArray(data) ? data[0] : data;
            setProduct(normalized || null);
            setCanReview(normalized?.canReview || false);
            setUserReview(normalized?.userReview || null);
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

    async function loadReviews() {
        try {
            setLoadingReviews(true);
            setReviewError('');
            const data = await getReviewsByProduct(id);
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

    useEffect(() => {
        let alive = true;
        (async () => {
            await loadProduct();
            if (alive) await loadReviews();
        })();
        return () => { alive = false; };
    }, [id, refreshKey]);

    async function handleBuy() {
        if (!isSessionValid()) {
            setBuyError('Tens de iniciar sessão para comprar. (Sessão expirada ou não iniciada)');
            navigate('/login');
            return;
        }
        if (!selectedSize) {
            setBuyError('Por favor, seleciona um tamanho antes de comprar.');
            return;
        }
        if ((product.stock ?? 0) <= 0) {
            setBuyError('Produto sem stock disponível.');
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
            const response = await createOrder(Number(uid), Number(product.product_id), selectedSize);
            navigate(`/checkout/${response.order_id}`, {
                state: {
                    amount: product.preco,
                    nomeProduto: product.nome,
                    product_id: product.product_id,
                    tamanho: selectedSize,
                    quantidade: 1,
                },
            });
        } catch (e) {
            console.error('❌ Erro ao comprar:', e);
            setBuyError(e.response?.data?.message || 'Não foi possível criar a compra.');
        } finally {
            setBuying(false);
        }
    }

    // ================================================================
    // FUNÇÃO: Submeter review
    // ================================================================

    async function handleSubmitReview(e) {
        e.preventDefault();

        if (!user_id) {
            alert('Tens de fazer login para escrever uma review.');
            return;
        }

        if (hasReviewed) {
            setSendingReviewError('Já escreveste uma review para este produto.');
            return;
        }

        if (!product?.product_id) return;
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
            await createReview({
                user_id: Number(user_id),
                product_id: Number(product.product_id),
                rating: Number(rating),
                comentario: comentario.trim(),
            });
            setComentario('');
            setRating(5);
            await loadProduct();
            await loadReviews();
            
            // 🔧 MODAL DE SUCESSO EM VEZ DE ALERT
            setShowReviewSuccess(true);
            
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

    // ================================================================
    // RENDERIZAÇÃO
    // ================================================================

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

    const imagesArray = product.images && product.images.length > 0 
        ? product.images 
        : (product.imagem ? [{ image_url: product.imagem, is_primary: true }] : []);

    return (
        <div className="container" style={{ padding: '32px 0' }}>
            {/* Layout do produto - mantém o mesmo */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(260px, 420px) 1fr',
                    gap: 24,
                    alignItems: 'start',
                }}
            >
                {/* Coluna da esquerda - Imagens */}
                <div className="card" style={{ padding: 12 }}>
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

                {/* Coluna da direita - Detalhes */}
                <div>
                    <h1 style={{ marginTop: 0 }}>{product.nome}</h1>
                    <div style={{ color: 'var(--muted)', marginTop: 6 }}>{product.marca}</div>
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
                    <div style={{ marginTop: 16, fontSize: 22, fontWeight: 900 }}>
                        €{product.preco}
                    </div>
                    <div style={{ marginTop: 8, color: 'var(--muted)' }}>
                        Stock: <strong>{product.stock ?? 0}</strong> unidades
                    </div>
                    {product.descricao ? (
                        <p style={{ color: 'var(--muted)', marginTop: 16, lineHeight: 1.6 }}>
                            {product.descricao}
                        </p>
                    ) : (
                        <p style={{ color: 'var(--muted)', marginTop: 16 }}>
                            Sem descrição.
                        </p>
                    )}
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
                    <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleBuy}
                            disabled={buying || !isSessionValid() || (product.stock ?? 0) <= 0}
                            title={
                                !isSessionValid() 
                                    ? 'Tens de iniciar sessão para comprar' 
                                    : (product.stock ?? 0) <= 0 
                                    ? 'Produto sem stock disponível' 
                                    : ''
                            }
                        >
                            {buying ? 'A comprar...' : (product.stock ?? 0) <= 0 ? 'Sem stock' : 'Comprar'}
                        </button>
                    </div>
                    {!isSessionValid() && (
                        <p style={{ color: 'salmon', marginTop: 12 }}>
                            Tens de iniciar sessão para comprar. A tua sessão expira em 10 minutos.
                        </p>
                    )}
                    {buyError && <p style={{ color: 'salmon', marginTop: 12 }}>{buyError}</p>}
                </div>
            </div>

            {modalImage && (
                <ImageModal src={modalImage} alt={product.nome} onClose={() => setModalImage(null)} />
            )}

            {/* ================================================================ */}
            {/* SECÇÃO DE REVIEWS */}
            {/* ================================================================ */}

            <div style={{ marginTop: 28 }}>
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

                {showReviewForm && (
                    <div className="card" style={{ padding: 14, marginTop: 12 }}>
                        <h3 style={{ marginTop: 0 }}>Escrever uma review</h3>
                        <form onSubmit={handleSubmitReview} style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                            <div>
                                <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Pontuação</div>
                                <Stars value={rating} onChange={setRating} readOnly={false} />
                            </div>
                            <div>
                                <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Comentário</div>
                                <textarea
                                    className="input"
                                    style={{ minHeight: 100, resize: 'vertical', padding: 12 }}
                                    value={comentario}
                                    onChange={(e) => setComentario(e.target.value)}
                                    placeholder="Escreve aqui a tua opinião..."
                                />
                            </div>
                            {sendingReviewError && (
                                <p style={{ color: 'salmon', margin: 0 }}>{sendingReviewError}</p>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    className="btn btn-primary"
                                    type="submit"
                                    disabled={sendingReview}
                                >
                                    {sendingReview ? 'A enviar...' : 'Enviar review'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* ================================================================ */}
            {/* MODAL DE SUCESSO DA REVIEW (igual ao do pagamento) */}
            {/* ================================================================ */}

            {showReviewSuccess && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px',
                    }}
                    onClick={() => setShowReviewSuccess(false)}
                >
                    <div
                        style={{
                            backgroundColor: '#fff',
                            borderRadius: '16px',
                            padding: '32px 24px',
                            maxWidth: '440px',
                            width: '100%',
                            textAlign: 'center',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>⭐</div>
                        <h2 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>Review enviada!</h2>
                        <p style={{ color: '#555', fontSize: '16px', lineHeight: '1.5', marginBottom: '20px' }}>
                            A sua review para <strong>“{product?.nome}”</strong> foi enviada com sucesso!<br />
                            Obrigado pela sua opinião. 💪
                        </p>
                        <button
                            onClick={() => {
                                setShowReviewSuccess(false);
                            }}
                            style={{
                                background: '#646cff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '40px',
                                padding: '12px 32px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}