// AdminCategories.jsx
// Página de administração de categorias (CRUD completo).
// Permite criar, editar, apagar e pesquisar categorias com confirmações modais.

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
    getAdminCategories,
    createAdminCategory,
    updateAdminCategory,
    deleteAdminCategory,
} from '../../api/admin';

// ------------------------------------------------------------
// Verifica se existe uma chave de administrador no localStorage
function requireAdminKey() {
    const key = localStorage.getItem('admin_key');
    return !!key && key.trim().length > 0;
}

// Estado inicial do formulário (vazio)
const emptyForm = { nome: '', descricao: '' };

// Opções de ordenação disponíveis
const SORT_OPTIONS = [
    { value: 'name_asc', label: 'Nome: A → Z' },
    { value: 'name_desc', label: 'Nome: Z → A' },
];

// ------------------------------------------------------------
// Componente de barra de pesquisa (isolado para evitar re-renders desnecessários)
// Inclui campo de texto (com debounce) e seletor de ordenação
const SearchBar = ({ onSearch, onSortChange, sortValue }) => {
    // Estado local do termo de pesquisa
    const [localSearch, setLocalSearch] = useState('');
    // Referência para o timer do debounce
    const debounceTimer = useRef(null);

    // Quando o utilizador escreve, aplica debounce de 500ms antes de chamar o callback
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setLocalSearch(value);
        // Limpa o timer anterior para evitar chamadas desnecessárias
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            onSearch(value);
        }, 500);
    };

    // Quando a ordenação muda, chama o callback imediatamente
    const handleSortChange = (e) => {
        onSortChange(e.target.value);
    };

    return (
        <div style={{ display: 'flex', gap: '12px', margin: '20px 0', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
                type="text"
                value={localSearch}
                onChange={handleSearchChange}
                placeholder="Pesquisar categoria..."
                className="input"
                style={{ flex: 2, minWidth: '200px' }}
            />
            <select
                value={sortValue}
                onChange={handleSortChange}
                className="input"
                style={{ width: '160px' }}
            >
                {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
};

// ------------------------------------------------------------
// Componente principal de gestão de categorias (admin)
export default function AdminCategories() {
    // Estados para a lista de categorias, carregamento e erro
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sort, setSort] = useState('name_asc');

    // Estados para o formulário de criação
    const [form, setForm] = useState(emptyForm);
    const [creating, setCreating] = useState(false);

    // Estados para o formulário de edição (inline)
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(emptyForm);
    const [savingEdit, setSavingEdit] = useState(false);

    // Modal de sucesso (criação/edição/eliminação)
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [successDetail, setSuccessDetail] = useState('');

    // Modal de confirmação de eliminação
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [deleteTargetName, setDeleteTargetName] = useState('');

    // Modal de confirmação de edição (antes de guardar)
    const [showConfirmEditModal, setShowConfirmEditModal] = useState(false);
    const [editConfirmData, setEditConfirmData] = useState({ id: null, nome: '' });

    // Verifica se a chave de administrador está definida
    const hasKey = useMemo(() => requireAdminKey(), []);

    // ------------------------------------------------------------
    // Função que carrega as categorias com os filtros atuais (search + sort)
    const load = useCallback(async () => {
        // Se não houver chave, mostra erro e interrompe
        if (!requireAdminKey()) {
            setError('Sem admin key. Vai a /admin/login e define a chave.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');
            // Constrói a query string com os parâmetros de pesquisa e ordenação
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (sort) params.append('sort', sort);
            const data = await getAdminCategories(params.toString());
            setRows(Array.isArray(data) ? data : []);
        } catch (e) {
            // Extrai detalhes do erro para mostrar ao utilizador
            const status = e?.response?.status;
            const msg = e?.response?.data?.message;
            setError(
                `Não foi possível carregar categorias. ${status ? `(HTTP ${status})` : ''} ${msg ? `- ${msg}` : ''}`
            );
        } finally {
            setLoading(false);
        }
    }, [searchTerm, sort]);

    // Recarrega sempre que os filtros mudarem (search ou sort)
    useEffect(() => {
        load();
    }, [load]);

    // Handlers para atualizar o termo de pesquisa e a ordenação
    const handleSearch = useCallback((term) => {
        setSearchTerm(term);
    }, []);

    const handleSortChange = useCallback((newSort) => {
        setSort(newSort);
    }, []);

    // ------------------------------------------------------------
    // Função helper para atualizar estados de formulário (criação/edição)
    function onChange(setter) {
        return (e) => {
            const { name, value } = e.target;
            setter((prev) => ({ ...prev, [name]: value }));
        };
    }

    // Validação básica: nome não pode ser vazio
    function validateCategory(p) {
        if (!p.nome || !p.nome.trim()) return 'Nome é obrigatório.';
        return '';
    }

    // ------------------------------------------------------------
    // Funções para o modal de sucesso
    const showSuccess = (message, detail = '') => {
        setSuccessMessage(message);
        setSuccessDetail(detail);
        setShowSuccessModal(true);
    };

    const closeSuccessModal = () => {
        setShowSuccessModal(false);
    };

    // ------------------------------------------------------------
    // Funções para o modal de eliminação
    const openDeleteConfirm = (id, nome) => {
        setDeleteTargetId(id);
        setDeleteTargetName(nome || '');
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        const id = deleteTargetId;
        setShowDeleteModal(false); // Fecha o modal
        try {
            setError('');
            await deleteAdminCategory(id); // Chama a API para eliminar
            await load(); // Recarrega a lista
            showSuccess('Categoria apagada com sucesso!', `ID: #${id}`);
        } catch (e) {
            const status = e?.response?.status;
            const m = e?.response?.data?.message;
            setError(`Falha ao apagar categoria. ${status ? `(HTTP ${status})` : ''} ${m ? `- ${m}` : ''}`);
        } finally {
            // Limpa os dados do alvo
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
    // Criação de nova categoria
    async function handleCreate(e) {
        e.preventDefault();

        // Valida o nome
        const msg = validateCategory(form);
        if (msg) {
            setError(msg);
            return;
        }

        // Prepara o payload
        const payload = {
            nome: form.nome.trim(),
            descricao: form.descricao.trim() || null,
        };

        try {
            setCreating(true);
            setError('');
            await createAdminCategory(payload); // Chama a API
            setForm(emptyForm); // Limpa o formulário
            await load(); // Recarrega a lista
            showSuccess('Categoria criada com sucesso!', `Nome: ${payload.nome}`);
        } catch (e) {
            const status = e?.response?.status;
            const m = e?.response?.data?.message;
            setError(`Falha ao criar categoria. ${status ? `(HTTP ${status})` : ''} ${m ? `- ${m}` : ''}`);
        } finally {
            setCreating(false);
        }
    }

    // ------------------------------------------------------------
    // Edição de categoria (inline)
    // Inicia o modo de edição para uma linha específica
    function startEdit(row) {
        setEditingId(row.category_id);
        setEditForm({
            nome: row.nome ?? '',
            descricao: row.descricao ?? '',
        });
    }

    // Cancela o modo de edição
    function cancelEdit() {
        setEditingId(null);
        setEditForm(emptyForm);
        setSavingEdit(false);
    }

    // Abre o modal de confirmação antes de guardar a edição
    const openConfirmEdit = (id, nome) => {
        setEditConfirmData({ id, nome });
        setShowConfirmEditModal(true);
    };

    // Confirma a edição (chamado pelo modal)
    const confirmEdit = async () => {
        const id = editConfirmData.id;
        setShowConfirmEditModal(false);
        await performSaveEdit(id);
    };

    // Cancela a edição a partir do modal
    const cancelConfirmEdit = () => {
        setShowConfirmEditModal(false);
        setEditConfirmData({ id: null, nome: '' });
    };

    // Função que efetivamente guarda a edição (chamada após confirmação)
    const performSaveEdit = async (id) => {
        // Valida o nome
        const msg = validateCategory(editForm);
        if (msg) {
            setError(msg);
            return;
        }

        const payload = {
            nome: editForm.nome.trim(),
            descricao: editForm.descricao.trim() || null,
        };

        try {
            setSavingEdit(true);
            setError('');
            await updateAdminCategory(id, payload); // Chama a API
            await load(); // Recarrega a lista
            showSuccess('Categoria atualizada com sucesso!', `Nome: ${payload.nome}`);
            cancelEdit(); // Sai do modo de edição
        } catch (e) {
            const status = e?.response?.status;
            const m = e?.response?.data?.message;
            setError(`Falha ao atualizar categoria. ${status ? `(HTTP ${status})` : ''} ${m ? `- ${m}` : ''}`);
        } finally {
            setSavingEdit(false);
        }
    };

    // Handler do botão "Guardar" na linha de edição (abre o modal)
    const handleSaveEditClick = (id, nome) => {
        openConfirmEdit(id, nome);
    };

    // ------------------------------------------------------------
    // Renderização condicional: se não houver chave, mostra aviso
    if (!hasKey) {
        return (
            <div className="container" style={{ padding: '32px 0' }}>
                <h1>Admin • Categorias</h1>
                <p style={{ color: 'salmon' }}>
                    Sem admin key. Vai a <strong>/admin/login</strong> e define a chave.
                </p>
            </div>
        );
    }

    // ------------------------------------------------------------
    // Renderização principal
    return (
        <div className="container" style={{ padding: '32px 0' }}>
            {/* Cabeçalho */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Admin • Categorias</h1>
                    <p style={{ color: 'var(--muted)', marginTop: 6 }}>Criar, editar e apagar categorias.</p>
                </div>
                <div>
                    <button className="btn btn-primary" onClick={load} disabled={loading}>
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Barra de pesquisa e ordenação */}
            <SearchBar
                onSearch={handleSearch}
                onSortChange={handleSortChange}
                sortValue={sort}
            />

            {/* Mensagem de erro geral */}
            {error && <p style={{ color: 'salmon', marginTop: 16 }}>{error}</p>}

            {/* Formulário de criação de categoria */}
            <div className="card" style={{ padding: 14, marginTop: 16 }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Criar categoria</div>
                <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                        <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Nome *</label>
                        <input className="input" name="nome" value={form.nome} onChange={onChange(setForm)} />
                    </div>
                    <div>
                        <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Descrição</label>
                        <input className="input" name="descricao" value={form.descricao} onChange={onChange(setForm)} />
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" type="submit" disabled={creating}>
                            {creating ? 'A criar...' : 'Criar'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Lista de categorias (tabela) */}
            <div className="card" style={{ padding: 12, marginTop: 16, overflowX: 'auto' }}>
                {loading ? (
                    <p style={{ color: 'var(--muted)' }}>A carregar...</p>
                ) : rows.length === 0 ? (
                    <p style={{ color: 'var(--muted)', marginTop: 16 }}>Nenhuma categoria encontrada.</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: 13 }}>
                                <th style={{ padding: 10 }}>ID</th>
                                <th style={{ padding: 10 }}>Nome</th>
                                <th style={{ padding: 10 }}>Descrição</th>
                                <th style={{ padding: 10 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => {
                                const isEditing = editingId === r.category_id;
                                return (
                                    <tr key={r.category_id} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: 10, fontWeight: 800 }}>#{r.category_id}</td>
                                        <td style={{ padding: 10 }}>
                                            {isEditing ? (
                                                <input className="input" name="nome" value={editForm.nome} onChange={onChange(setEditForm)} />
                                            ) : (
                                                r.nome
                                            )}
                                        </td>
                                        <td style={{ padding: 10, color: 'var(--muted)' }}>
                                            {isEditing ? (
                                                <input className="input" name="descricao" value={editForm.descricao} onChange={onChange(setEditForm)} />
                                            ) : (
                                                r.descricao || '—'
                                            )}
                                        </td>
                                        <td style={{ padding: 10, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {!isEditing ? (
                                                <>
                                                    <button className="btn btn-ghost" onClick={() => startEdit(r)}>Editar</button>
                                                    <button className="btn btn-ghost" onClick={() => openDeleteConfirm(r.category_id, r.nome)} style={{ marginLeft: 8 }}>Apagar</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button className="btn btn-primary" onClick={() => handleSaveEditClick(r.category_id, editForm.nome || r.nome)} disabled={savingEdit}>
                                                        {savingEdit ? 'A guardar...' : 'Guardar'}
                                                    </button>
                                                    <button className="btn btn-ghost" onClick={cancelEdit} style={{ marginLeft: 8 }}>Cancelar</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal de sucesso (criação/edição/eliminação) */}
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
                        <h3 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>{successMessage}</h3>
                        {successDetail && <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.5', marginBottom: '20px' }}>{successDetail}</p>}
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
                            Tem a certeza que deseja eliminar a categoria <strong>“{deleteTargetName}”</strong> (#{deleteTargetId})?
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

            {/* Modal de confirmação de edição */}
            {showConfirmEditModal && (
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
                    onClick={cancelConfirmEdit}
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
                            Deseja salvar as alterações na categoria <strong>“{editConfirmData.nome}”</strong>?
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={cancelConfirmEdit}
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
        </div>
    );
}