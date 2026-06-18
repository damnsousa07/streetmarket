// Navbar.jsx
// Barra de navegação principal da aplicação com autenticação, links e pesquisa.

import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

// ------------------------------------------------------------
// Verifica se a sessão do utilizador ainda é válida
// (utilizador logado e dentro do tempo de expiração)
function isSessionValid() {
    const userId = localStorage.getItem('user_id');
    const expiresAt = Number(localStorage.getItem('auth_expires_at') || 0);
    return !!userId && Date.now() < expiresAt;
}

export default function Navbar() {
    const navigate = useNavigate();

    // Estado que indica se o utilizador está logado
    const [loggedIn, setLoggedIn] = useState(isSessionValid());
    // Nome do utilizador (atualizado quando o estado loggedIn muda)
    const userNome = useMemo(() => localStorage.getItem('user_nome') || '', [loggedIn]);

    // Função para terminar a sessão
    function logout() {
        // Remove todos os dados de autenticação do localStorage
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_nome');
        localStorage.removeItem('user_email');
        localStorage.removeItem('auth_expires_at');

        setLoggedIn(false);      // Atualiza o estado
        navigate('/login');      // Redireciona para o login
    }

    // Efeito para verificar a validade da sessão a cada segundo
    useEffect(() => {
        const tick = () => {
            const ok = isSessionValid();
            // Se a sessão expirou mas o estado ainda diz que está logado, faz logout
            if (!ok && loggedIn) logout();
            else setLoggedIn(ok);
        };

        tick(); // Executa imediatamente ao montar
        const interval = setInterval(tick, 1000); // Verifica a cada 1 segundo
        return () => clearInterval(interval);      // Limpa o intervalo ao desmontar
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loggedIn]);

    // Abre a página de pesquisa sem filtros pré-definidos
    const handleOpenSearch = () => {
        navigate('/search');
    };

    // ------------------------------------------------------------
    // Renderização da barra de navegação
    return (
        <header className="navbar">
            <div className="container navbar-inner">
                {/* Logo – link para a página inicial */}
                <Link to="/" className="navbar-logo" aria-label="Ir para a página inicial">
                    <img src="/LogoStreetmarket.png" alt="StreetMarket" />
                </Link>

                <nav className="navbar-links">
                    {/* Links principais (visíveis para todos) */}
                    <NavLink to="/" end className="btn btn-ghost">
                        Produtos
                    </NavLink>

                    <NavLink to="/categories" className="btn btn-ghost">
                        Categorias
                    </NavLink>

                
                    {/* Links visíveis apenas para utilizadores autenticados */}
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

                    {/* Link para admin (visível apenas quando NÃO está logado) */}
                    {!loggedIn && (
                        <NavLink to="/admin/login" className="btn btn-ghost">
                            Admin
                        </NavLink>
                    )}

                    {/* Botão de pesquisa/filtro (visível para todos) */}
                    <button onClick={handleOpenSearch} className="btn btn-ghost" style={{ padding: '6px 12px' }}>
                        Pesquisar / Filtrar
                    </button>

                    {/* Renderização condicional: login/registo vs. saudação + logout */}
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