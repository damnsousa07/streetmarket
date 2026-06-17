// AdminProducts.jsx
// Página de administração de produtos com CRUD completo, pesquisa, filtros, ordenação,
// gestão de imagens (arrastar/reordenar, adicionar/remover) e modais de confirmação.

import { useEffect, useMemo, useState, useRef, useCallback, memo } from 'react';
import { api } from '../../api/client';
import {
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminCategories,
  getAdminProductById,
} from '../../api/admin';
import ImageModal from '../../components/ImageModal';

// ------------------------------------------------------------
// Verifica se existe uma chave de administrador válida no localStorage
function requireAdminKey() {
  const key = localStorage.getItem('admin_key');
  return !!key && key.trim().length > 0;
}

// Opções de ordenação disponíveis para a lista de produtos
const SORT_OPTIONS = [
  { value: 'id_desc', label: 'ID: mais recente primeiro' },
  { value: 'id_asc', label: 'ID: mais antigo primeiro' },
  { value: 'name_asc', label: 'Nome: A → Z' },
  { value: 'name_desc', label: 'Nome: Z → A' },
  { value: 'price_asc', label: 'Preço: menor → maior' },
  { value: 'price_desc', label: 'Preço: maior → menor' },
];

// ------------------------------------------------------------
// Componente de barra de pesquisa (memoizado para evitar re-renders desnecessários)
// Inclui: campo de pesquisa (com debounce), filtros por categoria/marca/preço e ordenação
const SearchBar = memo(({ onSearch, onFilterChange, filters, categories, brands }) => {
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const debounceTimer = useRef(null);

  // Sincroniza o estado local com o valor dos filtros (quando vindo de fora)
  useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  // Handler com debounce de 500ms para a pesquisa
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onSearch(value);
    }, 500);
  };

  return (
    <div style={{ display: 'flex', gap: '12px', margin: '20px 0', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Campo de pesquisa textual */}
      <input
        type="text"
        value={localSearch}
        onChange={handleSearchChange}
        placeholder="Pesquisar por nome ou marca"
        className="input"
        style={{ flex: 2, minWidth: '200px' }}
      />
      {/* Filtro por categoria */}
      <select
        name="category_id"
        value={filters.category_id}
        onChange={onFilterChange}
        className="input"
        style={{ width: '160px' }}
      >
        <option value="">Todas as categorias</option>
        {categories.map(cat => (
          <option key={cat.category_id} value={cat.category_id}>{cat.nome}</option>
        ))}
      </select>
      {/* Filtro por marca */}
      <select
        name="brand"
        value={filters.brand}
        onChange={onFilterChange}
        className="input"
        style={{ width: '160px' }}
      >
        <option value="">Todas as marcas</option>
        {brands.map(brand => (
          <option key={brand} value={brand}>{brand}</option>
        ))}
      </select>
      {/* Preço mínimo */}
      <input
        type="number"
        name="min_price"
        placeholder="Preço mínimo"
        value={filters.min_price}
        onChange={onFilterChange}
        className="input"
        style={{ width: '120px' }}
      />
      {/* Preço máximo */}
      <input
        type="number"
        name="max_price"
        placeholder="Preço máximo"
        value={filters.max_price}
        onChange={onFilterChange}
        className="input"
        style={{ width: '120px' }}
      />
      {/* Ordenação */}
      <select
        name="sort"
        value={filters.sort}
        onChange={onFilterChange}
        className="input"
        style={{ width: '200px' }}
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
});

// ------------------------------------------------------------
// Componente principal de gestão de produtos (admin)
export default function AdminProducts({ embedded = false }) {
  // Estados para a lista de produtos, categorias, marcas, carregamento e erro
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCats, setLoadingCats] = useState(true);
  const [error, setError] = useState('');

  // Filtros atuais (pesquisa, categoria, marca, preço mínimo/máximo, ordenação)
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    brand: '',
    min_price: '',
    max_price: '',
    sort: 'id_desc',
  });

  // Estados para edição de produto
  const [editingProduct, setEditingProduct] = useState(null);
  const [existingImages, setExistingImages] = useState([]); // Imagens já existentes (em edição)
  const [modalImage, setModalImage] = useState(null);      // Imagem ampliada no modal

  // Referências para os campos do formulário (criação/edição)
  const nomeRef = useRef('');
  const marcaRef = useRef('');
  const precoRef = useRef('');
  const descricaoRef = useRef('');
  const categoryIdRef = useRef('');
  const tamanhosRef = useRef('');

  // Estados para novas imagens (upload)
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Estados para modais personalizados
  const [showConfirmModal, setShowConfirmModal] = useState(false);   // Confirmação de edição
  const [showSuccessModal, setShowSuccessModal] = useState(false);   // Sucesso (criação/edição)
  const [showDeleteModal, setShowDeleteModal] = useState(false);     // Confirmação de eliminação
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');
  const [successData, setSuccessData] = useState({ nome: '', marca: '', preco: 0, isEdit: false });

  // Verifica se o utilizador tem chave de administrador
  const hasKey = useMemo(() => requireAdminKey(), []);

  // ------------------------------------------------------------
  // Função que busca produtos com os filtros atuais
  const fetchProducts = useCallback(async () => {
    if (!requireAdminKey()) {
      setError('Sem admin key.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category_id) params.append('category_id', filters.category_id);
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.min_price) params.append('min_price', filters.min_price);
      if (filters.max_price) params.append('max_price', filters.max_price);
      if (filters.sort) params.append('sort', filters.sort);
      const data = await getAdminProducts(params.toString());
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;
      setError(`Não foi possível carregar produtos. ${status ? `(HTTP ${status})` : ''} ${msg ? `- ${msg}` : ''}`);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Efeito que recarrega sempre que os filtros mudarem
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ------------------------------------------------------------
  // Carrega categorias e marcas (para os dropdowns)
  async function loadCategories() {
    if (!requireAdminKey()) {
      setLoadingCats(false);
      return;
    }
    try {
      setLoadingCats(true);
      const data = await getAdminCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Erro a carregar categorias:', e);
      setCategories([]);
    } finally {
      setLoadingCats(false);
    }
  }

  async function loadBrands() {
    if (!requireAdminKey()) return;
    try {
      const res = await api.get('/admin/Brands', {
        headers: { 'x-admin-key': localStorage.getItem('admin_key') }
      });
      setBrands(res.data);
    } catch (err) {
      console.error('Erro ao carregar marcas', err);
      setBrands([]);
    }
  }

  // Carrega categorias e marcas ao montar
  useEffect(() => {
    loadCategories();
    loadBrands();
  }, []);

  // Handlers para os filtros
  const handleSearch = useCallback((searchValue) => {
    setFilters(prev => ({ ...prev, search: searchValue }));
  }, []);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []);

  // Limpa todos os filtros
  const clearFilters = () => {
    setFilters({
      search: '',
      category_id: '',
      brand: '',
      min_price: '',
      max_price: '',
      sort: 'id_desc',
    });
  };

  // Força a atualização manual
  const handleRefresh = () => {
    fetchProducts();
  };

  // ------------------------------------------------------------
  // Inicia a edição de um produto (carrega os detalhes completos)
  async function startEdit(product) {
    try {
      const productId = product.product_id ?? product.Product_id;
      if (!productId) {
        console.error('Produto sem ID:', product);
        setError('ID do produto não encontrado.');
        return;
      }
      // Busca os detalhes completos do produto
      const fullProduct = await getAdminProductById(productId);
      setEditingProduct(fullProduct);
      // Preenche os campos do formulário com os dados
      if (nomeRef.current) nomeRef.current.value = fullProduct.nome || '';
      if (marcaRef.current) marcaRef.current.value = fullProduct.marca || '';
      if (precoRef.current) precoRef.current.value = fullProduct.preco || '';
      if (descricaoRef.current) descricaoRef.current.value = fullProduct.descricao || '';
      if (categoryIdRef.current) categoryIdRef.current.value = fullProduct.category_id || '';
      if (tamanhosRef.current) tamanhosRef.current.value = fullProduct.tamanhos || '';
      setExistingImages(fullProduct.images || []);
      setImageFiles([]);
      setPreviewUrls([]);
      // Rola para o formulário de edição
      document.querySelector('.admin-product-form')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error('Erro ao carregar produto para edição:', err);
      setError('Não foi possível carregar os detalhes do produto.');
    }
  }

  // Cancela o modo de edição
  function cancelEdit() {
    setEditingProduct(null);
    if (nomeRef.current) nomeRef.current.value = '';
    if (marcaRef.current) marcaRef.current.value = '';
    if (precoRef.current) precoRef.current.value = '';
    if (descricaoRef.current) descricaoRef.current.value = '';
    if (categoryIdRef.current) categoryIdRef.current.value = '';
    if (tamanhosRef.current) tamanhosRef.current.value = '';
    setImageFiles([]);
    setPreviewUrls([]);
    setExistingImages([]);
  }

  // Handler para seleção de imagens (upload)
  function handleImageChange(e) {
    const files = Array.from(e.target.files);
    setImageFiles(files);
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  }

  // Remove uma imagem existente (em modo de edição)
  function removeExistingImage(imageId) {
    setExistingImages(prev => prev.filter(img => img.image_id !== imageId));
  }

  // ------------------------------------------------------------
  // Modais: confirmação de edição
  const openConfirmEdit = () => {
    setShowConfirmModal(true);
  };

  const confirmEdit = async () => {
    setShowConfirmModal(false);
    await performSubmit(true);
  };

  const cancelConfirm = () => {
    setShowConfirmModal(false);
  };

  // Modais: confirmação de eliminação
  const openDeleteConfirm = (id, nome) => {
    setDeleteTargetId(id);
    setDeleteTargetName(nome || '');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    const id = deleteTargetId;
    try {
      setError('');
      await deleteAdminProduct(id);
      await fetchProducts();
      alert('Produto apagado com sucesso.');
    } catch (e) {
      const status = e?.response?.status;
      const m = e?.response?.data?.message;
      setError(`Falha ao apagar produto. ${status ? `(HTTP ${status})` : ''} ${m ? `- ${m}` : ''}`);
    } finally {
      setDeleteTargetId(null);
      setDeleteTargetName('');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTargetId(null);
    setDeleteTargetName('');
  };

  // ------------------------------------------------------------
  // Submissão do formulário (criação ou edição)
  const performSubmit = async (isConfirmed = false) => {
    // Recolhe os valores dos campos
    const nome = nomeRef.current.value;
    const marca = marcaRef.current.value;
    const preco = precoRef.current.value;
    const descricao = descricaoRef.current.value;
    const category_id = categoryIdRef.current.value;
    const tamanhos = tamanhosRef.current.value;

    // Validações básicas
    if (!nome || !marca || !preco || !category_id) {
      setError('Nome, marca, preço e categoria são obrigatórios.');
      return;
    }
    const precoNum = Number(preco);
    if (isNaN(precoNum) || precoNum < 0) {
      setError('Preço inválido.');
      return;
    }

    // Monta o FormData para enviar (inclui imagens)
    const formData = new FormData();
    formData.append('nome', nome.trim());
    formData.append('marca', marca.trim());
    formData.append('preco', precoNum);
    formData.append('descricao', descricao.trim() || '');
    formData.append('category_id', Number(category_id));
    formData.append('tamanhos', tamanhos);
    imageFiles.forEach(file => formData.append('images', file));

    try {
      setSubmitting(true);
      setError('');

      if (editingProduct) {
        // MODO EDIÇÃO: atualiza o produto existente
        const productId = editingProduct.product_id ?? editingProduct.Product_id;
        // Calcula quais imagens foram removidas (para enviar ao backend)
        const originalIds = (editingProduct.images || []).map(img => img.image_id);
        const currentIds = existingImages.map(img => img.image_id);
        const imagesToDelete = originalIds.filter(id => !currentIds.includes(id));
        if (imagesToDelete.length > 0) {
          formData.append('imagesToDelete', JSON.stringify(imagesToDelete));
        }
        // Guarda a nova ordem das imagens
        const newOrder = existingImages.map(img => img.image_id);
        formData.append('imagesOrder', JSON.stringify(newOrder));

        // Chama a API de atualização
        await updateAdminProduct(productId, formData);
        // Prepara dados para o modal de sucesso
        setSuccessData({
          nome: nome.trim(),
          marca: marca.trim(),
          preco: precoNum,
          isEdit: true,
        });
        setShowSuccessModal(true);
        cancelEdit(); // Sai do modo de edição
      } else {
        // MODO CRIAÇÃO: cria um novo produto
        await createAdminProduct(formData);
        setSuccessData({
          nome: nome.trim(),
          marca: marca.trim(),
          preco: precoNum,
          isEdit: false,
        });
        setShowSuccessModal(true);
        // Limpa o formulário
        nomeRef.current.value = '';
        marcaRef.current.value = '';
        precoRef.current.value = '';
        descricaoRef.current.value = '';
        categoryIdRef.current.value = '';
        tamanhosRef.current.value = '';
        setImageFiles([]);
        setPreviewUrls([]);
      }
      // Recarrega a lista de produtos para refletir as alterações
      await fetchProducts();
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      setError(`Falha ao ${editingProduct ? 'atualizar' : 'criar'} produto. ${status ? `(HTTP ${status})` : ''} ${msg ? `- ${msg}` : ''}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handler do submit do formulário: se for edição, abre modal de confirmação
  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProduct) {
      openConfirmEdit();
    } else {
      performSubmit();
    }
  };

  // Fecha o modal de sucesso
  const closeSuccessModal = () => {
    setShowSuccessModal(false);
  };

  // ------------------------------------------------------------
  // Wrapper para permitir uso embebido (sem container) noutras páginas
  const Wrapper = ({ children }) =>
    embedded ? <div>{children}</div> : <div className="container" style={{ padding: '32px 0' }}>{children}</div>;

  // Se não houver chave de admin, mostra aviso
  if (!hasKey) {
    return (
      <Wrapper>
        {!embedded && <h1>Admin • Produtos</h1>}
        <p style={{ color: 'salmon' }}>Sem admin key. Vai a <strong>/admin/login</strong> e define a chave.</p>
      </Wrapper>
    );
  }

  // ------------------------------------------------------------
  // Renderização principal
  return (
    <Wrapper>
      {/* Cabeçalho (apenas se não estiver embebido) */}
      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0 }}>Admin • Produtos</h1>
            <p style={{ color: 'var(--muted)', marginTop: 6 }}>Criar, editar e apagar produtos.</p>
          </div>
          <button className="btn btn-ghost" onClick={handleRefresh} disabled={loading || loadingCats}>
            Atualizar
          </button>
        </div>
      )}

      {/* Mensagem de erro geral */}
      {error && <p style={{ color: 'salmon', marginTop: 16 }}>{error}</p>}

      {/* Barra de pesquisa e filtros */}
      <SearchBar
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filters={filters}
        categories={categories}
        brands={brands}
      />

      {/* Formulário de criação/edição de produto */}
      <div className="card admin-product-form" style={{ padding: 14, marginTop: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          {editingProduct ? '✏️ Editar produto' : '➕ Criar produto'}
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Nome */}
          <div>
            <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Nome *</label>
            <input className="input" name="nome" ref={nomeRef} defaultValue={editingProduct?.nome || ''} />
          </div>
          {/* Marca */}
          <div>
            <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Marca *</label>
            <input className="input" name="marca" ref={marcaRef} defaultValue={editingProduct?.marca || ''} />
          </div>
          {/* Preço */}
          <div>
            <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Preço (€) *</label>
            <input className="input" name="preco" ref={precoRef} defaultValue={editingProduct?.preco || ''} />
          </div>
          {/* Categoria */}
          <div>
            <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Categoria *</label>
            <select className="input" name="category_id" ref={categoryIdRef} defaultValue={editingProduct?.category_id || ''} disabled={loadingCats}>
              <option value="">{loadingCats ? 'A carregar...' : 'Seleciona uma categoria'}</option>
              {categories.map(c => (
                <option key={c.category_id} value={c.category_id}>{c.nome} (#{c.category_id})</option>
              ))}
            </select>
          </div>
          {/* Tamanhos */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>
              Tamanhos (separados por vírgula)
            </label>
            <input
              className="input"
              name="tamanhos"
              ref={tamanhosRef}
              defaultValue={editingProduct?.tamanhos || ''}
              placeholder="Ex: XS,S,M,L,XL"
            />
          </div>

          {/* Imagens existentes (em modo de edição) com arrastar para reordenar */}
          {editingProduct && existingImages.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>
                Imagens atuais (arraste para reordenar | clique na imagem para ampliar | ✖ para remover)
              </label>
              <div
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                onDragOver={(e) => e.preventDefault()}
              >
                {existingImages.map((img, index) => {
                  const fullImageUrl = img.image_url.startsWith('http')
                    ? img.image_url
                    : `${import.meta.env.VITE_API_URL}${img.image_url}`;
                  return (
                    <div
                      key={img.image_id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', index);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        if (isNaN(fromIndex)) return;
                        const toIndex = index;
                        if (fromIndex === toIndex) return;
                        const reordered = [...existingImages];
                        const [moved] = reordered.splice(fromIndex, 1);
                        reordered.splice(toIndex, 0, moved);
                        setExistingImages(reordered);
                      }}
                      style={{ position: 'relative', cursor: 'grab' }}
                    >
                      <img
                        src={fullImageUrl}
                        alt="miniatura"
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, pointerEvents: 'auto' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalImage(fullImageUrl);
                        }}
                      />
                      {/* Botão para remover a imagem */}
                      <button
                        type="button"
                        onClick={() => removeExistingImage(img.image_id)}
                        style={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          background: 'red',
                          color: 'white',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 16,
                          fontWeight: 'bold',
                          zIndex: 10,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upload de novas imagens */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>
              {editingProduct ? 'Adicionar novas imagens (opcional, até 6)' : 'Imagens (até 6)'}
            </label>
            <input type="file" multiple accept="image/*" onChange={handleImageChange} className="input" />
            {previewUrls.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {previewUrls.map((url, idx) => (
                  <img key={idx} src={url} alt="pré-visualização" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                ))}
              </div>
            )}
          </div>

          {/* Descrição */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Descrição</label>
            <input className="input" name="descricao" ref={descricaoRef} defaultValue={editingProduct?.descricao || ''} />
          </div>

          {/* Botões de ação */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            {editingProduct && (
              <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
                Cancelar edição
              </button>
            )}
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? (editingProduct ? 'A atualizar...' : 'A criar...') : (editingProduct ? 'Atualizar produto' : 'Criar produto')}
            </button>
          </div>
        </form>
      </div>

      {/* Tabela com a lista de produtos */}
      <div className="card" style={{ padding: 12, marginTop: 16, overflowX: 'auto' }}>
        {loading ? (
          <p style={{ color: 'var(--muted)' }}>A carregar...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: 13 }}>
                <th style={{ padding: 10 }}>ID</th>
                <th style={{ padding: 10 }}>Imagem</th>
                <th style={{ padding: 10 }}>Nome</th>
                <th style={{ padding: 10 }}>Marca</th>
                <th style={{ padding: 10 }}>Preço</th>
                <th style={{ padding: 10 }}>Categoria</th>
                <th style={{ padding: 10 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const id = r.product_id ?? r.Product_id;
                const imageUrl = r.imagem ? (r.imagem.startsWith('http') ? r.imagem : `${import.meta.env.VITE_API_URL}${r.imagem}`) : null;
                return (
                  <tr key={id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 10, fontWeight: 800 }}>#{id}</td>
                    <td style={{ padding: 10 }}>
                      <div
                        style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer' }}
                        onClick={() => imageUrl && setModalImage(imageUrl)}
                      >
                        {imageUrl ? (
                          <img 
                            src={imageUrl}
                            alt={r.nome} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : null}
                      </div>
                    </td>
                    <td style={{ padding: 10 }}>{r.nome}</td>
                    <td style={{ padding: 10 }}>{r.marca}</td>
                    <td style={{ padding: 10, fontWeight: 800 }}>€{r.preco}</td>
                    <td style={{ padding: 10 }}>{r.category_id}</td>
                    <td style={{ padding: 10, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost" onClick={() => startEdit(r)}>Editar</button>
                      <button className="btn btn-ghost" onClick={() => openDeleteConfirm(id, r.nome)} style={{ marginLeft: 8 }}>Apagar</button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 14, color: 'var(--muted)' }}>Sem produtos.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal para ampliar imagem (clique na miniatura) */}
      {modalImage && (
        <ImageModal src={modalImage} alt="Produto" onClose={() => setModalImage(null)} />
      )}

      {/* Modal de confirmação para edição */}
      {showConfirmModal && (
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
          onClick={cancelConfirm}
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
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>Confirmar alterações</h3>
            <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.5', marginBottom: '20px' }}>
              Deseja salvar as alterações no produto <strong>“{editingProduct?.nome || ''}”</strong>?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={cancelConfirm}
                style={{
                  background: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '40px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmEdit}
                style={{
                  background: '#646cff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '40px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação para eliminação */}
      {showDeleteModal && (
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
          onClick={cancelDelete}
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
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>Confirmar eliminação</h3>
            <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.5', marginBottom: '20px' }}>
              Tem a certeza que deseja eliminar o produto <strong>“{deleteTargetName}”</strong> (#{deleteTargetId})?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={cancelDelete}
                style={{
                  background: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '40px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  background: '#ff4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '40px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sucesso (para criação e edição) */}
      {showSuccessModal && (
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
          onClick={closeSuccessModal}
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
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>{successData.isEdit ? '✅' : '🎉'}</div>
            <h3 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>
              {successData.isEdit ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!'}
            </h3>
            <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.6', marginBottom: '20px' }}>
              <strong>{successData.nome}</strong>
              <br />
              Marca: <strong>{successData.marca}</strong>
              <br />
              Preço: <strong>€{successData.preco.toFixed(2)}</strong>
            </p>
            <button
              onClick={closeSuccessModal}
              style={{
                background: '#646cff',
                color: '#fff',
                border: 'none',
                borderRadius: '40px',
                padding: '10px 32px',
                fontSize: '15px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </Wrapper>
  );
}