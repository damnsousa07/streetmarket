// Home.jsx
// Página inicial da aplicação que lista todos os produtos disponíveis com paginação.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../api/products';

function getFullImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return `${import.meta.env.VITE_API_URL}${imagePath}`;
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState('');
  const limit = 12;

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const response = await getProducts({ page, limit });
      setProducts(response.data);
      setCurrentPage(response.meta.currentPage);
      setTotalPages(response.meta.totalPages);
      setPageInput(response.meta.currentPage.toString());
    } catch (e) {
      setError('Não foi possível carregar os produtos.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(currentPage);
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const page = Number(pageInput);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    } else {
      setPageInput(currentPage.toString()); // reset se inválido
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
      <h1>Produtos</h1>
      <p style={{ color: 'var(--muted)', marginTop: 6 }}>Explora o catálogo.</p>

      {loading && <p style={{ color: 'var(--muted)' }}>A carregar...</p>}
      {error && <p style={{ color: 'salmon' }}>{error}</p>}

      {!loading && !error && (
        <>
          <div
            style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            {products.map((p) => (
              <Link
                key={p.product_id}
                to={`/products/${p.product_id}`}
                className="card"
                style={{ padding: 14, textDecoration: 'none', color: 'inherit' }}
              >
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