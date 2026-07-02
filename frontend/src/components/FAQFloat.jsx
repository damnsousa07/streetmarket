// ================================================================
// FAQFLOAT.JSX – Botao flutuante para a pagina de FAQs
// ================================================================
// Exibe um botao circular com interrogacao no canto inferior esquerdo.
// Ao clicar, redireciona o utilizador para a pagina de Perguntas Frequentes.
// ================================================================

import { useNavigate } from 'react-router-dom';

// ================================================================
// COMPONENTE: FAQFloat
// ================================================================

export default function FAQFloat() {
  const navigate = useNavigate();

  return (
    // Container com posicao fixa no canto inferior esquerdo
    // Fica acima de todos os outros elementos (zIndex 9999)
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9999,
      }}
    >
      {/* Botao circular com efeito de hover */}
      <button
        onClick={() => navigate('/faq')}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#007bff',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          fontSize: '28px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s',
        }}
        aria-label="FAQ"
      >
        ❓
      </button>
    </div>
  );
}