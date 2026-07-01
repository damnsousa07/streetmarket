// ================================================================
// FAQFLOAT.JSX – Botão flutuante para a página de FAQs
// ================================================================
// Este componente exibe um botão circular com ❓ no canto inferior esquerdo.
// Ao clicar, redireciona o utilizador para a página de Perguntas Frequentes (FAQs).
// ================================================================

// Importação dos módulos necessários
import { useNavigate } from 'react-router-dom';

// ================================================================
// COMPONENTE: FAQFloat
// ================================================================

export default function FAQFloat() {
  const navigate = useNavigate();   // Hook para navegação programática

  // ----- RENDERIZAÇÃO -----
  return (
    // Container do botão (posição fixa no canto inferior esquerdo)
    <div
      style={{
        position: 'fixed',          // Fixo na janela do navegador
        bottom: '24px',            // Distância do fundo
        left: '24px',              // Distância da esquerda
        zIndex: 9999,              // Fica acima de todos os outros elementos
      }}
    >
      {/* Botão circular */}
      <button
        onClick={() => navigate('/faq')}   // Redireciona para a página /faq
        style={{
          width: '56px',                    // Largura do botão
          height: '56px',                   // Altura do botão
          borderRadius: '50%',              // Torna o botão circular
          backgroundColor: '#007bff',       // Cor de fundo azul
          color: '#fff',                    // Texto branco
          border: 'none',                   // Remove a borda padrão
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', // Sombra para profundidade
          fontSize: '28px',                 // Tamanho do ícone
          cursor: 'pointer',                // Cursor de mão
          display: 'flex',                  // Centraliza o ícone
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s',     // Animação suave ao passar o rato
        }}
        aria-label="FAQ"                    // Rótulo para acessibilidade
      >
        ❓                                   // Ícone de interrogação
      </button>
    </div>
  );
}