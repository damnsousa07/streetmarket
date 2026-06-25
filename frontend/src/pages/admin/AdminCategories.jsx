// AdminCategories.jsx
// Página de administração de categorias (CRUD completo) com imagens.

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
    getAdminCategories,
    createAdminCategory,
    updateAdminCategory,
    deleteAdminCategory,
} from '../../api/admin';

function requireAdminKey() {
    const key = localStorage.getItem('admin_key');
    return !!key && key.trim().length > 0;
}

const emptyForm = { nome: '', descricao: '', image: null, imagePreview: '' };

const SORT_OPTIONS = [
    { value: 'name_asc', label: 'Nome: A → Z' },
    { value: 'name_desc', label: 'Nome: Z → A' },
];

// ------------------------------------------------------------
// Barra de pesquisa
const SearchBar = ({ onSearch, onSortChange, sortValue }) => {
    const [localSearch, setLocalSearch] = useState('');
    const debounceTimer = useRef(null);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setLocalSearch(value);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            onSearch(value);
        }, 500);
    };

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
// Componente principal
export default function AdminCategories() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sort, setSort] = useState('name_asc');

    // Formulário de criação
    const [form, setForm] = useState(emptyForm);
    const [creating, setCreating] = useState(false);

    // Formulário de edição (inline)
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(emptyForm);
    const [savingEdit, setSavingEdit] = useState(false);

    // Modais
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [successDetail, setSuccessDetail] = useState('');

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [deleteTargetName, setDeleteTargetName] = useState('');

    const [showConfirmEditModal, setShowConfirmEditModal] = useState(false);
    const [editConfirmData, setEditConfirmData] = useState({ id: null, nome: '' });

    const hasKey = useMemo(() => requireAdminKey(), []);

    // ------------------------------------------------------------
    const load = useCallback(async () => {
        if (!requireAdminKey()) {
            setError('Sem admin key. Vai a /admin/login e define a chave.');
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError('');
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (sort) params.append('sort', sort);
            const data = await getAdminCategories(params.toString());
            setRows(Array.isArray(data) ? data : []);
        } catch (e) {
            const status = e?.response?.status;
            const msg = e?.response?.data?.message;
            setError(`Não foi possível carregar categorias. ${status ? `(HTTP ${status})` : ''} ${msg ? `- ${msg}` : ''}`);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, sort]);

    useEffect(() => {
        load();
    }, [load]);

    const handleSearch = useCallback((term) => setSearchTerm(term), []);
    const handleSortChange = useCallback((newSort) => setSort(newSort), []);

    // ------------------------------------------------------------
    function onChange(setter) {
        return (e) => {
            const { name, value } = e.target;
            setter((prev) => ({ ...prev, [name]: value }));
        };
    }

    function onImageChange(setter) {
        return (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                setter((prev) => ({
                    ...prev,
                    image: file,
                    imagePreview: reader.result,
                }));
            };
            reader.readAsDataURL(file);
        };
    }

    function validateCategory(p) {
        if (!p.nome || !p.nome.trim()) return 'Nome é obrigatório.';
        return '';
    }

    // ------------------------------------------------------------
    const showSuccess = (message, detail = '') => {
        setSuccessMessage(message);
        setSuccessDetail(detail);
        setShowSuccessModal(true);
    };

    const closeSuccessModal = () => setShowSuccessModal(false);

    // ------------------------------------------------------------
    // ELIMINAÇÃO
    const openDeleteConfirm = (id, nome) => {
        setDeleteTargetId(id);
        setDeleteTargetName(nome || '');
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        const id = deleteTargetId;
        setShowDeleteModal(false);
        try {
            setError('');
            await deleteAdminCategory(id);
            await load();
            showSuccess('Categoria apagada com sucesso!', `ID: #${id}`);
        } catch (e) {
            const status = e?.response?.status;
            const m = e?.response?.data?.message;
            setError(`Falha ao apagar categoria. ${status ? `(HTTP ${status})` : ''} ${m ? `- ${m}` : ''}`);
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
    // CRIAÇÃO
    async function handleCreate(e) {
        e.preventDefault();
        const msg = validateCategory(form);
        if (msg) {
            setError(msg);
            return;
        }

        const formData = new FormData();
        formData.append('nome', form.nome.trim());
        formData.append('descricao', form.descricao.trim() || '');
        if (form.image) {
            formData.append('image', form.image);
        }

        try {
            setCreating(true);
            setError('');
            await createAdminCategory(formData);
            setForm(emptyForm);
            await load();
            showSuccess('Categoria criada com sucesso!', `Nome: ${form.nome.trim()}`);
        } catch (e) {
            const status = e?.response?.status;
            const m = e?.response?.data?.message;
            setError(`Falha ao criar categoria. ${status ? `(HTTP ${status})` : ''} ${m ? `- ${m}` : ''}`);
        } finally {
            setCreating(false);
        }
    }

    // ------------------------------------------------------------
    // EDIÇÃO
    function startEdit(row) {
        setEditingId(row.category_id);
        setEditForm({
            nome: row.nome ?? '',
            descricao: row.descricao ?? '',
            image: null,
            imagePreview: row.image_url ? `${import.meta.env.VITE_API_URL}${row.image_url}` : '',
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditForm(emptyForm);
        setSavingEdit(false);
    }

    // Abre o modal de confirmação com os dados atuais
    const openConfirmEdit = (id, nome) => {
        setEditConfirmData({ id, nome });
        setShowConfirmEditModal(true);
    };

    // Confirmar edição – chama a função que guarda
    const confirmEdit = async () => {
        const id = editConfirmData.id;
        setShowConfirmEditModal(false);
        if (id) {
            await performSaveEdit(id);
        } else {
            setError('ID da categoria inválido.');
        }
        setEditConfirmData({ id: null, nome: '' });
    };

    // Cancela a edição a partir do modal
    const cancelConfirmEdit = () => {
        setShowConfirmEditModal(false);
        setEditConfirmData({ id: null, nome: '' });
    };

    // Função que efetivamente guarda a edição
    const performSaveEdit = async (id) => {
        const msg = validateCategory(editForm);
        if (msg) {
            setError(msg);
            return;
        }

        const formData = new FormData();
        formData.append('nome', editForm.nome.trim());
        formData.append('descricao', editForm.descricao.trim() || '');
        if (editForm.image) {
            formData.append('image', editForm.image);
        }

        console.log('🔵 A enviar edição para ID:', id);
        const formDataEntries = {};
        for (let [key, value] of formData.entries()) {
            if (key === 'image' && value instanceof File) {
                formDataEntries[key] = `File: ${value.name} (${value.size} bytes)`;
            } else {
                formDataEntries[key] = value;
            }
        }
        console.log('🔵 FormData:', formDataEntries);

        try {
            setSavingEdit(true);
            setError('');
            await updateAdminCategory(id, formData);
            await load();
            showSuccess('Categoria atualizada com sucesso!', `Nome: ${editForm.nome.trim()}`);
            cancelEdit();
        } catch (e) {
            const status = e?.response?.status;
            const m = e?.response?.data?.message;
            setError(`Falha ao atualizar categoria. ${status ? `(HTTP ${status})` : ''} ${m ? `- ${m}` : ''}`);
        } finally {
            setSavingEdit(false);
        }
    };

    const handleSaveEditClick = (id, nome) => {
        openConfirmEdit(id, nome);
    };

    // ------------------------------------------------------------
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

    // Função segura para tratar erro de imagem
    const handleImageError = (e) => {
        const img = e.currentTarget;
        // Verifica se o elemento ainda está no DOM e tem pai
        if (img && img.parentNode) {
            // Substitui a imagem por um ícone 📁
            const parent = img.parentNode;
            // Remove a imagem
            img.style.display = 'none';
            // Adiciona um span com o ícone
            const icon = document.createElement('span');
            icon.textContent = '📁';
            icon.style.fontSize = '28px';
            icon.style.display = 'flex';
            icon.style.alignItems = 'center';
            icon.style.justifyContent = 'center';
            icon.style.width = '100%';
            icon.style.height = '100%';
            parent.appendChild(icon);
        }
    };

    return (
        <div className="container" style={{ padding: '32px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Admin • Categorias</h1>
                    <p style={{ color: 'var(--muted)', marginTop: 6 }}>Criar, editar e apagar categorias com imagem.</p>
                </div>
                <button className="btn btn-primary" onClick={load} disabled={loading}>
                    Atualizar
                </button>
            </div>

            <SearchBar
                onSearch={handleSearch}
                onSortChange={handleSortChange}
                sortValue={sort}
            />

            {error && <p style={{ color: 'salmon', marginTop: 16 }}>{error}</p>}

            {/* Formulário de criação */}
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
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Imagem (opcional)</label>
                        <input type="file" accept="image/*" onChange={onImageChange(setForm)} className="input" />
                        {form.imagePreview && (
                            <div style={{ marginTop: 8 }}>
                                <img src={form.imagePreview} alt="Pré-visualização" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                            </div>
                        )}
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" type="submit" disabled={creating}>
                            {creating ? 'A criar...' : 'Criar'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Lista de categorias */}
            <div className="card" style={{ padding: 12, marginTop: 16, overflowX: 'auto' }}>
                {loading ? (
                    <p style={{ color: 'var(--muted)' }}>A carregar...</p>
                ) : rows.length === 0 ? (
                    <p style={{ color: 'var(--muted)', marginTop: 16 }}>Nenhuma categoria encontrada.</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: 13 }}>
                                <th style={{ padding: 10, width: '80px' }}>Imagem</th>
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
                                        <td style={{ padding: 10 }}>
                                            {isEditing ? (
                                                <>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={onImageChange(setEditForm)}
                                                        className="input"
                                                        style={{ width: 120 }}
                                                    />
                                                    {editForm.imagePreview && (
                                                        <div style={{ marginTop: 4 }}>
                                                            <img
                                                                src={editForm.imagePreview}
                                                                alt="prévia"
                                                                style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                                                            />
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div
                                                    style={{
                                                        width: 56,
                                                        height: 56,
                                                        borderRadius: 12,
                                                        overflow: 'hidden',
                                                        background: 'var(--surface-2)',
                                                        border: '1px solid var(--border)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    {r.image_url ? (
                                                        <img
                                                            src={`${import.meta.env.VITE_API_URL}${r.image_url}`}
                                                            alt={r.nome}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            onError={handleImageError}
                                                        />
                                                    ) : (
                                                        <span style={{ fontSize: 28 }}>📁</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
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

            {/* Modais */}
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
                            <button onClick={cancelDelete} style={{ background: '#e0e0e0', color: '#333', border: 'none', borderRadius: '40px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                            <button onClick={confirmDelete} style={{ background: '#ff4444', color: '#fff', border: 'none', borderRadius: '40px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

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
                            <button onClick={cancelConfirmEdit} style={{ background: '#e0e0e0', color: '#333', border: 'none', borderRadius: '40px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                            <button onClick={confirmEdit} style={{ background: '#646cff', color: '#fff', border: 'none', borderRadius: '40px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}