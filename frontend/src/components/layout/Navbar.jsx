// ================================================================
// NAVBAR.JSX – Barra de navegação principal
// ================================================================
// Este componente é a barra de navegação principal da aplicação.
// Inclui:
// - Logotipo (com link para a página inicial)
// - Links de navegação (Produtos, Categorias, etc.)
// - Links condicionais (Notificações, Encomendas, Admin)
// - Botão de pesquisa
// - Autenticação (Login/Registar ou Olá, Utilizador + Sair)
// - Verificação automática de sessão (expiração a cada segundo)
// ================================================================

// Importação dos módulos necessários
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

// ================================================================
// FUNÇÃO AUXILIAR: Verificar se a sessão do utilizador é válida
// ================================================================

// Verifica se o utilizador está autenticado e se a sessão não expirou
function isSessionValid() {
    const userId = localStorage.getItem('user_id');                 // ID do utilizador
    const expiresAt = Number(localStorage.getItem('auth_expires_at') || 0); // Timestamp de expiração
    return !!userId && Date.now() < expiresAt;                     // Válido se user_id existe e não expirou
}

// ================================================================
// COMPONENTE: Navbar
// ================================================================

export default function Navbar() {
    const navigate = useNavigate();                                 // Hook para navegação programática

    // Estados para controlar o login e dados do utilizador
    const [loggedIn, setLoggedIn] = useState(isSessionValid());     // Se o utilizador está logado
    const userNome = useMemo(() => localStorage.getItem('user_nome') || '', [loggedIn]); // Nome do utilizador
    const userTipo = useMemo(() => localStorage.getItem('user_tipo') || '', [loggedIn]); // Tipo (Administrador/Utilizador)

    // ================================================================
    // FUNÇÃO: Logout
    // ================================================================

    // Remove todos os dados do utilizador do localStorage e redireciona para login
    function logout() {
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_nome');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_tipo');
        localStorage.removeItem('auth_expires_at');

        setLoggedIn(false);                                         // Atualiza o estado
        navigate('/login');                                         // Redireciona para a página de login
    }

    // ================================================================
    // EFFECT: Verificar sessão a cada segundo
    // ================================================================

    // Verifica periodicamente se a sessão ainda é válida.
    // Se expirar, faz logout automaticamente.
    useEffect(() => {
        const tick = () => {
            const ok = isSessionValid();
            if (!ok && loggedIn) logout();                          // Se expirou, faz logout
            else setLoggedIn(ok);                                   // Caso contrário, mantém o estado
        };

        tick();                                                     // Verifica imediatamente
        const interval = setInterval(tick, 1000);                   // Verifica a cada 1 segundo
        return () => clearInterval(interval);                       // Limpa o intervalo ao desmontar
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loggedIn]);

    // ================================================================
    // FUNÇÃO: Abrir página de pesquisa
    // ================================================================

    const handleOpenSearch = () => {
        navigate('/search');                                        // Navega para a página de pesquisa
    };

    // ================================================================
    // RENDERIZAÇÃO
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
                {/* ----- LOGOTIPO ----- */}
                <Link
                    to="/"
                    aria-label="Ir para a página inicial"
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

                {/* ----- LINKS DE NAVEGAÇÃO CENTRAIS ----- */}
                <nav className="navbar-links" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    flexWrap: 'nowrap',
                    flex: '1 1 auto',
                    justifyContent: 'center',
                    minWidth: 0,
                }}>
                    {/* Link para a página inicial */}
                    <NavLink to="/" end className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                        Produtos
                    </NavLink>

                    {/* Link para a página de categorias */}
                    <NavLink to="/categories" className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                        Categorias
                    </NavLink>

                    {/* Links visíveis apenas se o utilizador estiver logado */}
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

                    {/* Link Admin – visível apenas para Administradores */}
                    {loggedIn && userTipo === 'Administrador' && (
                        <NavLink to="/admin" className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                            Admin
                        </NavLink>
                    )}

                    {/* Botão para abrir a página de pesquisa */}
                    <button onClick={handleOpenSearch} className="btn btn-ghost" style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                        Pesquisar / Filtrar
                    </button>
                </nav>

                {/* ----- GRUPO DA DIREITA (Autenticação) ----- */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    flexShrink: 0,
                    flexWrap: 'nowrap',
                    marginRight: '8px',
                }}>
                    {loggedIn ? (
                        // Utilizador logado: mostra nome e botão Sair
                        <>
                            <span className="navbar-user" style={{ whiteSpace: 'nowrap', fontSize: '16px' }}>
                                Olá, {userNome || 'Utilizador'}
                            </span>
                            <button className="btn btn-ghost" onClick={logout} style={{ whiteSpace: 'nowrap', fontSize: '16px', height: '40px', padding: '0 14px' }}>
                                Sair
                            </button>
                        </>
                    ) : (
                        // Utilizador não logado: mostra Login e Registar
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