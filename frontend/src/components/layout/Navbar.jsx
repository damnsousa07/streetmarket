// ================================================================
// NAVBAR.JSX – Barra de navegacao principal
// ================================================================
// Componente da barra de navegacao principal da aplicacao.
// Inclui logo, links de navegacao, pesquisa e autenticacao.
// Verifica automaticamente a sessao a cada segundo.
// ================================================================

import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

// ================================================================
// FUNCAO AUXILIAR: Verificar se a sessao do utilizador e valida
// ================================================================

// Verifica se o utilizador esta autenticado e se a sessao nao expirou
function isSessionValid() {
    const userId = localStorage.getItem('user_id');
    const expiresAt = Number(localStorage.getItem('auth_expires_at') || 0);
    return !!userId && Date.now() < expiresAt;
}

// ================================================================
// COMPONENTE: Navbar
// ================================================================

export default function Navbar() {
    const navigate = useNavigate();

    // Estados para controlar o login e dados do utilizador
    const [loggedIn, setLoggedIn] = useState(isSessionValid());
    const userNome = useMemo(() => localStorage.getItem('user_nome') || '', [loggedIn]);
    const userTipo = useMemo(() => localStorage.getItem('user_tipo') || '', [loggedIn]);

    // ================================================================
    // FUNCAO: Logout
    // ================================================================

    // Remove todos os dados do utilizador do localStorage e redireciona para login
    function logout() {
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_nome');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_tipo');
        localStorage.removeItem('auth_expires_at');

        setLoggedIn(false);
        navigate('/login');
    }

    // ================================================================
    // EFFECT: Verificar sessao a cada segundo
    // ================================================================

    // Verifica periodicamente se a sessao ainda e valida.
    // Se expirar, faz logout automaticamente.
    useEffect(() => {
        const tick = () => {
            const ok = isSessionValid();
            if (!ok && loggedIn) logout();
            else setLoggedIn(ok);
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [loggedIn]);

    // ================================================================
    // FUNCAO: Abrir pagina de pesquisa
    // ================================================================

    const handleOpenSearch = () => {
        navigate('/search');
    };

    // ================================================================
    // RENDERIZACAO
    // ================================================================

    return (
        <header className="navbar" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
            <div className="container navbar-inner" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '16px',
                padding: '14px 20px',
                minHeight: '100px',
                flexWrap: 'nowrap',
                width: '100%',
            }}>
                {/* Logo da marca com link para a pagina inicial */}
                <Link
                    to="/"
                    aria-label="Ir para a pagina inicial"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        textDecoration: 'none',
                        flexShrink: 0,
                        marginLeft: '8px',
                    }}
                >
                    <img
                        src="/LogoStreetmarket.png"
                        alt="StreetMarket"
                        style={{
                            height: '90px',
                            width: 'auto',
                            display: 'block',
                        }}
                    />
                </Link>

                {/* Links de navegacao centrais */}
                <nav className="navbar-links" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    flexWrap: 'nowrap',
                    flex: '1 1 auto',
                    justifyContent: 'center',
                    minWidth: 0,
                }}>
                    <NavLink to="/" end className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                        Produtos
                    </NavLink>

                    <NavLink to="/categories" className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                        Categorias
                    </NavLink>

                    {/* Links visiveis apenas se o utilizador estiver logado */}
                    {loggedIn && (
                        <>
                            <NavLink to="/notifications" className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                                Notificacoes
                            </NavLink>
                            <NavLink to="/orders" className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                                Encomendas
                            </NavLink>
                        </>
                    )}

                    {/* Link Admin – visivel apenas para Administradores */}
                    {loggedIn && userTipo === 'Administrador' && (
                        <NavLink to="/admin" className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                            Admin
                        </NavLink>
                    )}

                    <button onClick={handleOpenSearch} className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                        Pesquisar / Filtrar
                    </button>
                </nav>

                {/* Grupo da direita com autenticacao */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    flexShrink: 0,
                    flexWrap: 'nowrap',
                    marginRight: '8px',
                }}>
                    {loggedIn ? (
                        // Utilizador logado: mostra nome e botao Sair
                        <>
                            <span className="navbar-user" style={{ whiteSpace: 'nowrap', fontSize: '16px' }}>
                                Ola, {userNome || 'Utilizador'}
                            </span>
                            <button className="btn btn-ghost" onClick={logout} style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                                Sair
                            </button>
                        </>
                    ) : (
                        // Utilizador nao logado: mostra Login e Registar
                        <>
                            <NavLink to="/login" className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                                Login
                            </NavLink>
                            <NavLink to="/register" className="btn btn-primary" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                                Registar
                            </NavLink>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}