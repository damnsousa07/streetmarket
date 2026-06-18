// FAQFloat.jsx
// Botão flutuante com ❓ no canto inferior esquerdo que redireciona para a página de FAQs.

import { useNavigate } from 'react-router-dom';

export default function FAQFloat() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9999,
      }}
    >
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