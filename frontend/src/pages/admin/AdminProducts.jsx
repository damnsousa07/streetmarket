// ================================================================
// ADMINPRODUCTS.JSX – Gestão de produtos (painel administrativo)
// ================================================================
// Este componente permite ao administrador gerir produtos:
// - Listagem com paginação (12 produtos por página)
// - Pesquisa e filtros (categoria, marca, preço, género)
// - Criação de novos produtos (com imagens, stock, género)
// - Edição inline com confirmação modal
// - Eliminação com confirmação modal
// - Gestão de imagens (arrastar/reordenar, adicionar/remover)
// ================================================================

// Importação dos módulos necessários
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

// ================================================================
// FUNÇÃO AUXILIAR: Verificar chave de administrador
// ================================================================

function requireAdminKey() {
  const key = localStorage.getItem('admin_key');
  return !!key && key.trim().length > 0;
}

// ================================================================
// CONSTANTES
// ================================================================

// Opções de ordenação disponíveis para a lista de produtos
const SORT_OPTIONS = [
  { value: 'id_desc', label: 'ID: mais recente primeiro' },
  { value: 'id_asc', label: 'ID: mais antigo primeiro' },
  { value: 'name_asc', label: 'Nome: A → Z' },
  { value: 'name_desc', label: 'Nome: Z → A' },
  { value: 'price_asc', label: 'Preço: menor → maior' },
  { value: 'price_desc', label: 'Preço: maior → menor' },
];

// ================================================================
// COMPONENTE: SearchBar (barra de pesquisa e filtros)
// ================================================================

const SearchBar = memo(({ onSearch, onFilterChange, filters, categories, brands }) => {
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const debounceTimer = useRef(null);

  // Sincroniza o estado local com o filtro de pesquisa (quando muda externamente)
  useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  // Handler para pesquisa com debounce (500ms)
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
      {/* Campo de pesquisa por nome ou marca */}
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

// ================================================================
// COMPONENTE: ProductForm (formulário de criação/edição)
// ================================================================

// Formulário isolado e memoizado para evitar re-renderizações desnecessárias
// Utiliza refs para ler os valores apenas no submit (mantém o foco)
const ProductForm = memo(({
  editingProduct,
  categories,
  loadingCats,
  onRequestConfirm,
  onCancel,
  submitting,
  existingImages,
  setExistingImages,
  imageFiles,
  previewUrls,
  handleImageChange,
  removeExistingImage,
  setModalImage,
}) => {
  // REFS para os campos do formulário
  const nomeRef = useRef(null);
  const marcaRef = useRef(null);
  const precoRef = useRef(null);
  const descricaoRef = useRef(null);
  const categoryIdRef = useRef(null);
  const tamanhosRef = useRef(null);
  const genderRef = useRef(null);
  const stockRef = useRef(null);

  // Submissão do formulário: lê valores das refs e pede confirmação
  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      nome: nomeRef.current?.value || '',
      marca: marcaRef.current?.value || '',
      preco: precoRef.current?.value || '',
      descricao: descricaoRef.current?.value || '',
      category_id: categoryIdRef.current?.value || '',
      tamanhos: tamanhosRef.current?.value || '',
      gender: genderRef.current?.value || 'Unisexo',
      stock: parseInt(stockRef.current?.value) || 0,
    };
    onRequestConfirm(data);
  };

  return (
    <div className="card admin-product-form" style={{ padding: 14, marginTop: 16 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>
        {editingProduct ? '✏️ Editar produto' : '➕ Criar produto'}
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Nome (obrigatório) */}
        <div>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Nome *</label>
          <input className="input" name="nome" ref={nomeRef} defaultValue={editingProduct?.nome || ''} required />
        </div>
        {/* Marca (obrigatório) */}
        <div>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Marca *</label>
          <input className="input" name="marca" ref={marcaRef} defaultValue={editingProduct?.marca || ''} required />
        </div>
        {/* Preço (obrigatório) */}
        <div>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Preço (€) *</label>
          <input
            className="input"
            name="preco"
            type="text"
            ref={precoRef}
            defaultValue={editingProduct?.preco || ''}
            required
            placeholder="Ex: 99.99"
          />
        </div>
        {/* Categoria (obrigatório) */}
        <div>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Categoria *</label>
          <select
            className="input"
            name="category_id"
            ref={categoryIdRef}
            defaultValue={editingProduct?.category_id || ''}
            disabled={loadingCats}
            required
          >
            <option value="">{loadingCats ? 'A carregar...' : 'Seleciona uma categoria'}</option>
            {categories.map(c => (
              <option key={c.category_id} value={c.category_id}>{c.nome} (#{c.category_id})</option>
            ))}
          </select>
        </div>
        {/* Género */}
        <div>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Género</label>
          <select
            className="input"
            name="gender"
            ref={genderRef}
            defaultValue={editingProduct?.gender || 'Unisexo'}
          >
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
            <option value="Unisexo">Unisexo</option>
          </select>
        </div>
        {/* Stock */}
        <div>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Stock</label>
          <input
            className="input"
            name="stock"
            type="number"
            ref={stockRef}
            defaultValue={editingProduct?.stock ?? 0}
            min="0"
          />
        </div>
        {/* Tamanhos (obrigatório) */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>
            Tamanhos (separados por vírgula) *
          </label>
          <input
            className="input"
            name="tamanhos"
            ref={tamanhosRef}
            defaultValue={editingProduct?.tamanhos || ''}
            placeholder="Ex: XS,S,M,L,XL"
            required
          />
        </div>

        {/* Gestão de imagens existentes (apenas em modo edição) */}
        {editingProduct && existingImages.length > 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>
              Imagens atuais (arraste para reordenar | clique na imagem para ampliar | ✖ para remover)
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} onDragOver={(e) => e.preventDefault()}>
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

        {/* Upload de novas imagens (obrigatório) */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>
            {editingProduct ? 'Adicionar novas imagens (ou mantenha as existentes) *' : 'Imagens (até 6) *'}
          </label>
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleImageChange} 
            className="input" 
          />
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
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancelar edição
            </button>
          )}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? (editingProduct ? 'A atualizar...' : 'A criar...') : (editingProduct ? 'Atualizar produto' : 'Criar produto')}
          </button>
        </div>
      </form>
    </div>
  );
});

// ================================================================
// COMPONENTE PRINCIPAL: AdminProducts
// ================================================================

export default function AdminProducts({ embedded = false }) {
  // ----- ESTADOS DA LISTA -----
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCats, setLoadingCats] = useState(true);
  const [error, setError] = useState('');

  // ----- ESTADO DOS FILTROS -----
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    brand: '',
    min_price: '',
    max_price: '',
    sort: 'id_desc',
  });

  // ----- ESTADOS DE PAGINAÇÃO -----
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState('');
  const limit = 12; // Produtos por página

  // ----- ESTADOS DE EDIÇÃO -----
  const [editingProduct, setEditingProduct] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [modalImage, setModalImage] = useState(null);

  // ----- ESTADOS DE IMAGEM -----
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // ----- ESTADO DE CONFIRMAÇÃO -----
  const [pendingFormData, setPendingFormData] = useState(null);

  // ----- MODAIS -----
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteErrorModal, setShowDeleteErrorModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');
  const [successData, setSuccessData] = useState({
    nome: '',
    marca: '',
    preco: 0,
    isEdit: false,
    isDelete: false,
  });

  // Verifica se o utilizador tem chave de administrador
  const hasKey = useMemo(() => requireAdminKey(), []);

  // ================================================================
  // FUNÇÃO: Buscar produtos (com paginação e filtros)
  // ================================================================

  const fetchProducts = useCallback(async (page = currentPage) => {
    if (!requireAdminKey()) {
      setError('Sem admin key.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Constrói os parâmetros da query string
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category_id) params.append('category_id', filters.category_id);
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.min_price) params.append('min_price', filters.min_price);
      if (filters.max_price) params.append('max_price', filters.max_price);
      if (filters.sort) params.append('sort', filters.sort);
      params.append('page', page);
      params.append('limit', limit);
      // Chama a API
      const data = await getAdminProducts(params.toString());
      setRows(data.data || []);
      setCurrentPage(data.meta?.currentPage || 1);
      setTotalPages(data.meta?.totalPages || 1);
      setPageInput((data.meta?.currentPage || 1).toString());
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;
      setError(`Não foi possível carregar produtos. ${status ? `(HTTP ${status})` : ''} ${msg ? `- ${msg}` : ''}`);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  // Carrega produtos inicialmente e quando os filtros mudarem
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ================================================================
  // FUNÇÕES: Carregar categorias e marcas
  // ================================================================

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

  // ================================================================
  // HANDLERS: Filtros e pesquisa
  // ================================================================

  const handleSearch = useCallback((searchValue) => {
    setFilters(prev => ({ ...prev, search: searchValue }));
    setCurrentPage(1); // Reset para a primeira página ao pesquisar
  }, []);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset para a primeira página ao filtrar
  }, []);

  const handleRefresh = () => {
    fetchProducts(currentPage);
  };

  // ================================================================
  // FUNÇÕES: Edição de produtos
  // ================================================================

  // Inicia a edição de um produto (carrega os dados completos)
  async function startEdit(product) {
    try {
      const productId = product.product_id ?? product.Product_id;
      if (!productId) {
        console.error('Produto sem ID:', product);
        setError('ID do produto não encontrado.');
        return;
      }
      const fullProduct = await getAdminProductById(productId);
      setEditingProduct(fullProduct);
      setExistingImages(fullProduct.images || []);
      setImageFiles([]);
      setPreviewUrls([]);
      document.querySelector('.admin-product-form')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error('Erro ao carregar produto para edição:', err);
      setError('Não foi possível carregar os detalhes do produto.');
    }
  }

  // Cancela o modo de edição
  function cancelEdit() {
    setEditingProduct(null);
    setExistingImages([]);
    setImageFiles([]);
    setPreviewUrls([]);
    setPendingFormData(null);
  }

  // ================================================================
  // FUNÇÕES: Imagens
  // ================================================================

  // Atualiza as imagens selecionadas para upload
  function handleImageChange(e) {
    const files = Array.from(e.target.files);
    setImageFiles(files);
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  }

  // Remove uma imagem existente (apenas do estado, não do disco)
  function removeExistingImage(imageId) {
    setExistingImages(prev => prev.filter(img => img.image_id !== imageId));
  }

  // ================================================================
  // FUNÇÕES: Modais de confirmação
  // ================================================================

  // Abre o modal de confirmação de edição
  const onRequestConfirm = (formData) => {
    setPendingFormData(formData);
    setShowConfirmModal(true);
  };

  // Confirma a edição (chama a API)
  const confirmEdit = async () => {
    setShowConfirmModal(false);
    if (pendingFormData) {
      await handleFormSubmit(pendingFormData);
      setPendingFormData(null);
    }
  };

  // Cancela a edição a partir do modal
  const cancelConfirm = () => {
    setShowConfirmModal(false);
    setPendingFormData(null);
  };

  // ================================================================
  // FUNÇÕES: Eliminação de produtos
  // ================================================================

  const openDeleteConfirm = (id, nome) => {
    setDeleteTargetId(id);
    setDeleteTargetName(nome || '');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    const id = deleteTargetId;
    const nome = deleteTargetName;
    try {
      setError('');
      await deleteAdminProduct(id);
      await fetchProducts(currentPage);
      setSuccessData({
        nome: nome,
        marca: '',
        preco: 0,
        isEdit: false,
        isDelete: true,
      });
      setShowSuccessModal(true);
    } catch (e) {
      console.log('ERRO COMPLETO:', e);
      console.log('RESPONSE:', e?.response);
      console.log('DATA:', e?.response?.data);

      const data = e?.response?.data || {};
      const errno = data.errno ?? e.errno ?? null;
      const sqlMessage = data.sqlMessage ?? data.message ?? e.sqlMessage ?? '';

      // Erro 1451 = foreign key constraint (produto tem encomendas)
      if (errno === 1451 || sqlMessage.toLowerCase().includes('foreign key constraint') || sqlMessage.includes('Cannot delete')) {
        setShowDeleteErrorModal(true);
      } else {
        const status = e?.response?.status;
        const m = data.message || e.message;
        setError(`Falha ao apagar produto. ${status ? `(HTTP ${status})` : ''} ${m ? `- ${m}` : ''}`);
      }
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

  const closeDeleteErrorModal = () => setShowDeleteErrorModal(false);

  // Função para fechar o modal de sucesso
  const closeSuccessModal = () => setShowSuccessModal(false);

  // ================================================================
  // FUNÇÃO: Submeter formulário (criação ou edição)
  // ================================================================

  const handleFormSubmit = async (formDataRaw) => {
    const { nome, marca, preco, descricao, category_id, tamanhos, gender, stock } = formDataRaw;

    const nomeValue = nome.trim();
    const marcaValue = marca.trim();
    const precoValue = preco.trim();
    const descricaoValue = descricao.trim();
    const categoryIdValue = category_id;
    const tamanhosValue = tamanhos.trim();
    const genderValue = gender || 'Unisexo';
    const stockValue = parseInt(stock) || 0;

    console.log('📝 VALORES RECEBIDOS DO FORM:', { nomeValue, marcaValue, precoValue, descricaoValue, categoryIdValue, tamanhosValue, genderValue, stockValue });

    // Validação dos campos obrigatórios
    if (!nomeValue || !marcaValue || !precoValue || !categoryIdValue) {
      setError('Nome, marca, preço e categoria são obrigatórios.');
      return;
    }
    const precoNum = Number(precoValue);
    if (isNaN(precoNum) || precoNum < 0) {
      setError('Preço inválido.');
      return;
    }

    // Validação: tamanhos obrigatório (criação e edição)
    if (!tamanhosValue) {
      setError('Tamanhos são obrigatórios. Ex: XS,S,M,L,XL');
      return;
    }

    // Validação: pelo menos uma imagem (criação e edição)
    if (editingProduct) {
      // Na edição: verifica se há imagens existentes OU novas imagens
      if (existingImages.length === 0 && imageFiles.length === 0) {
        setError('Pelo menos uma imagem é obrigatória.');
        return;
      }
    } else {
      // Na criação: verifica se há novas imagens
      if (imageFiles.length === 0) {
        setError('Pelo menos uma imagem é obrigatória.');
        return;
      }
    }

    // Prepara o FormData (para upload de imagens)
    const formData = new FormData();
    formData.append('nome', nomeValue);
    formData.append('marca', marcaValue);
    formData.append('preco', precoNum);
    formData.append('descricao', descricaoValue || '');
    formData.append('category_id', Number(categoryIdValue));
    formData.append('tamanhos', tamanhosValue || '');
    formData.append('gender', genderValue);
    formData.append('stock', stockValue);
    // NOTA: O campo 'updated_at' é gerido automaticamente pelo MySQL (DEFAULT CURRENT_TIMESTAMP)
    // Não é necessário enviar data_criacao nem updated_at no FormData
    imageFiles.forEach(file => formData.append('images', file));

    try {
      setSubmitting(true);
      setError('');

      if (editingProduct) {
        // Modo edição
        const productId = editingProduct.product_id ?? editingProduct.Product_id;
        const originalIds = (editingProduct.images || []).map(img => img.image_id);
        const currentIds = existingImages.map(img => img.image_id);
        const imagesToDelete = originalIds.filter(id => !currentIds.includes(id));
        if (imagesToDelete.length > 0) {
          formData.append('imagesToDelete', JSON.stringify(imagesToDelete));
        }
        const newOrder = existingImages.map(img => img.image_id);
        formData.append('imagesOrder', JSON.stringify(newOrder));

        console.log('📤 A enviar para update:', {
          nome: nomeValue,
          marca: marcaValue,
          preco: precoNum,
          descricao: descricaoValue,
          category_id: categoryIdValue,
          tamanhos: tamanhosValue,
          gender: genderValue,
          stock: stockValue,
          imagesToDelete,
          imagesOrder: newOrder
        });

        await updateAdminProduct(productId, formData);
        setSuccessData({
          nome: nomeValue,
          marca: marcaValue,
          preco: precoNum,
          isEdit: true,
          isDelete: false,
        });
        setShowSuccessModal(true);
        cancelEdit();
      } else {
        // Modo criação
        await createAdminProduct(formData);
        setSuccessData({
          nome: nomeValue,
          marca: marcaValue,
          preco: precoNum,
          isEdit: false,
          isDelete: false,
        });
        setShowSuccessModal(true);
        cancelEdit();
      }
      await fetchProducts(currentPage);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      setError(`Falha ao ${editingProduct ? 'atualizar' : 'criar'} produto. ${status ? `(HTTP ${status})` : ''} ${msg ? `- ${msg}` : ''}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ================================================================
  // HANDLERS: Paginação
  // ================================================================

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

  // ================================================================
  // COMPONENTE Wrapper (para embedding)
  // ================================================================

  const Wrapper = ({ children }) =>
    embedded ? <div>{children}</div> : <div className="container" style={{ padding: '32px 0' }}>{children}</div>;

  // ================================================================
  // RENDERIZAÇÃO CONDICIONAL (sem chave admin)
  // ================================================================

  if (!hasKey) {
    return (
      <Wrapper>
        {!embedded && <h1>Admin • Produtos</h1>}
        <p style={{ color: 'salmon' }}>Sem admin key. Vai a <strong>/admin/login</strong> e define a chave.</p>
      </Wrapper>
    );
  }

  // ================================================================
  // RENDERIZAÇÃO PRINCIPAL
  // ================================================================

  return (
    <Wrapper>
      {/* ----- CABEÇALHO ----- */}
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

      {/* Mensagem de erro */}
      {error && <p style={{ color: 'salmon', marginTop: 16 }}>{error}</p>}

      {/* Barra de pesquisa e filtros */}
      <SearchBar
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filters={filters}
        categories={categories}
        brands={brands}
      />

      {/* Formulário de criação/edição */}
      <ProductForm
        editingProduct={editingProduct}
        categories={categories}
        loadingCats={loadingCats}
        onRequestConfirm={onRequestConfirm}
        onCancel={cancelEdit}
        submitting={submitting}
        existingImages={existingImages}
        setExistingImages={setExistingImages}
        imageFiles={imageFiles}
        previewUrls={previewUrls}
        handleImageChange={handleImageChange}
        removeExistingImage={removeExistingImage}
        setModalImage={setModalImage}
      />

      {/* ----- LISTA DE PRODUTOS (tabela com paginação) ----- */}
      <div className="card" style={{ padding: 12, marginTop: 16, overflowX: 'auto' }}>
        {loading ? (
          <p style={{ color: 'var(--muted)' }}>A carregar...</p>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: 13 }}>
                  <th style={{ padding: 10 }}>ID</th>
                  <th style={{ padding: 10 }}>Imagem</th>
                  <th style={{ padding: 10 }}>Nome</th>
                  <th style={{ padding: 10 }}>Marca</th>
                  <th style={{ padding: 10 }}>Preço</th>
                  <th style={{ padding: 10 }}>Categoria</th>
                  <th style={{ padding: 10 }}>Género</th>
                  <th style={{ padding: 10 }}>Stock</th>
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
                      <td style={{ padding: 10 }}>{r.gender || 'Unisexo'}</td>
                      <td style={{ padding: 10 }}>{r.stock ?? 0}</td>
                      <td style={{ padding: 10, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-ghost" onClick={() => startEdit(r)}>Editar</button>
                        <button className="btn btn-ghost" onClick={() => openDeleteConfirm(id, r.nome)} style={{ marginLeft: 8 }}>Apagar</button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: 14, color: 'var(--muted)' }}>Sem produtos.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Paginação */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
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

      {/* ================================================================ */}
      {/* MODAIS */}
      {/* ================================================================ */}

      {/* Modal para ampliar imagem */}
      {modalImage && (
        <ImageModal src={modalImage} alt="Produto" onClose={() => setModalImage(null)} />
      )}

      {/* Modal de confirmação de edição */}
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
              <button onClick={cancelConfirm} style={{ background: '#e0e0e0', color: '#333', border: 'none', borderRadius: '40px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
              <button onClick={confirmEdit} style={{ background: '#646cff', color: '#fff', border: 'none', borderRadius: '40px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de eliminação */}
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
              <button onClick={cancelDelete} style={{ background: '#e0e0e0', color: '#333', border: 'none', borderRadius: '40px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
              <button onClick={confirmDelete} style={{ background: '#ff4444', color: '#fff', border: 'none', borderRadius: '40px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de erro de eliminação (produto com encomendas) */}
      {showDeleteErrorModal && (
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
          onClick={closeDeleteErrorModal}
        >
          <div
            style={{
              backgroundColor: '#E6F2FF',
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
            <h3 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>Não é possível apagar</h3>
            <p style={{ color: '#333', fontSize: '15px', lineHeight: '1.5', marginBottom: '20px' }}>
              Este produto está associado a uma ou mais encomendas. Não pode ser apagado enquanto existirem registos de compras associados.
            </p>
            <button
              onClick={closeDeleteErrorModal}
              style={{
                background: '#4A90D9',
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

      {/* Modal de sucesso */}
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
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <h3 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>
              {successData.isDelete
                ? 'Produto apagado com sucesso!'
                : successData.isEdit
                ? 'Produto atualizado com sucesso!'
                : 'Produto criado com sucesso!'}
            </h3>
            {!successData.isDelete && (
              <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.6', marginBottom: '20px' }}>
                <strong>{successData.nome}</strong>
                <br />
                Marca: <strong>{successData.marca}</strong>
                <br />
                Preço: <strong>€{successData.preco.toFixed(2)}</strong>
              </p>
            )}
            {successData.isDelete && (
              <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.6', marginBottom: '20px' }}>
                O produto <strong>“{successData.nome}”</strong> foi removido com sucesso.
              </p>
            )}
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