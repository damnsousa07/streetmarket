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
    const userTipo = useMemo(() => localStorage.getItem('user_tipo') || '', [loggedIn]); // <-- ADICIONADO

    function logout() {
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_nome');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_tipo'); // <-- também remover o tipo
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
        <header className="navbar">
            <div className="container navbar-inner">
                <Link to="/" className="navbar-logo" aria-label="Ir para a página inicial">
                    <img src="/LogoStreetmarket.png" alt="StreetMarket" />
                </Link>

                <nav className="navbar-links">
                    <NavLink to="/" end className="btn btn-ghost">
                        Produtos
                    </NavLink>

                    <NavLink to="/categories" className="btn btn-ghost">
                        Categorias
                    </NavLink>

                    {loggedIn && (
                        <>
                            <NavLink to="/notifications" className="btn btn-ghost">
                                Notificações
                            </NavLink>
                            <NavLink to="/orders" className="btn btn-ghost">
                                Encomendas
                            </NavLink>
                        </>
                    )}

                    {/* ADMIN – visível apenas para Administradores */}
                    {loggedIn && userTipo === 'Administrador' && (
                        <NavLink to="/admin" className="btn btn-ghost">
                            Admin
                        </NavLink>
                    )}

                    <button onClick={handleOpenSearch} className="btn btn-ghost" style={{ padding: '6px 12px' }}>
                        Pesquisar / Filtrar
                    </button>

                    {!loggedIn ? (
                        <>
                            <NavLink to="/login" className="btn btn-ghost">
                                Login
                            </NavLink>
                            <NavLink to="/register" className="btn btn-primary">
                                Registar
                            </NavLink>
                        </>
                    ) : (
                        <>
                            <span className="navbar-user">Olá, {userNome || 'Utilizador'}</span>
                            <button className="btn btn-ghost" onClick={logout}>
                                Sair
                            </button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}