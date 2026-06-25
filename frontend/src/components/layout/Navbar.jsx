// Navbar.jsx
// Barra de navegação principal da aplicação com autenticação, links e pesquisa.

import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

// ------------------------------------------------------------
// Verifica se a sessão do utilizador ainda é válida
function isSessionValid() {
    const userId = localStorage.getItem('user_id');
    const expiresAt = Number(localStorage.getItem('auth_expires_at') || 0);
    return !!userId && Date.now() < expiresAt;
}

export default function Navbar() {
    const navigate = useNavigate();

    const [loggedIn, setLoggedIn] = useState(isSessionValid());
    const userNome = useMemo(() => localStorage.getItem('user_nome') || '', [loggedIn]);
    const userTipo = useMemo(() => localStorage.getItem('user_tipo') || '', [loggedIn]);

    function logout() {
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_nome');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_tipo');
        localStorage.removeItem('auth_expires_at');

        setLoggedIn(false);
        navigate('/login');
    }

    useEffect(() => {
        const tick = () => {
            const ok = isSessionValid();
            if (!ok && loggedIn) logout();
            else setLoggedIn(ok);
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loggedIn]);

    const handleOpenSearch = () => {
        navigate('/search');
    };

    return (
        <header className="navbar" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
            <div className="container navbar-inner" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '16px',
                padding: '14px 20px',   // Padding lateral para dar respiro
                minHeight: '100px',
                flexWrap: 'nowrap',
                width: '100%',
            }}>
                {/* Logotipo – com margem esquerda para a centrar ligeiramente */}
                <Link
                    to="/"
                    aria-label="Ir para a página inicial"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        textDecoration: 'none',
                        flexShrink: 0,
                        marginLeft: '8px',   // Pequeno deslocamento para a direita
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

                {/* Grupo central: links de navegação e pesquisa/filtro */}
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

                    {loggedIn && (
                        <>
                            <NavLink to="/notifications" className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                                Notificações
                            </NavLink>
                            <NavLink to="/orders" className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                                Encomendas
                            </NavLink>
                        </>
                    )}

                    {loggedIn && userTipo === 'Administrador' && (
                        <NavLink to="/admin" className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                            Admin
                        </NavLink>
                    )}

                    <button onClick={handleOpenSearch} className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                        Pesquisar / Filtrar
                    </button>
                </nav>

                {/* Grupo da direita – com margem direita para centralizar o "Sair" */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    flexShrink: 0,
                    flexWrap: 'nowrap',
                    marginRight: '8px',   // Pequeno deslocamento para a esquerda
                }}>
                    {loggedIn ? (
                        <>
                            <span className="navbar-user" style={{ whiteSpace: 'nowrap', fontSize: '16px' }}>
                                Olá, {userNome || 'Utilizador'}
                            </span>
                            <button className="btn btn-ghost" onClick={logout} style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                                Sair
                            </button>
                        </>
                    ) : (
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