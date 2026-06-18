// SocialFloat.jsx
// Componente flutuante com redes sociais (Instagram e Email) no canto inferior direito.
// Ao clicar no email, copia para a área de transferência e mostra um aviso.

import { useState } from 'react';

export default function SocialFloat() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(''); // estado para a mensagem do toast

  const toggle = () => setOpen(!open);

  // Função que copia o email e mostra o toast
  const handleCopyEmail = (email) => {
    navigator.clipboard.writeText(email).then(() => {
      setToast('📧 Email copiado! Pronto para colar.');
      // Remove o toast após 2.5 segundos
      setTimeout(() => setToast(''), 2500);
    }).catch(() => {
      // Fallback se o navigator.clipboard não funcionar
      alert('Não foi possível copiar. Copia manualmente: ' + email);
    });
  };

  return (
    <>
      {/* TOAST (aviso) – aparece quando o email é copiado */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '30px',
          backgroundColor: '#333',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          fontSize: '14px',
          zIndex: 10000,
          animation: 'fadeInOut 2.5s ease forwards',
        }}>
          {toast}
        </div>
      )}

      {/* Componente flutuante */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
      }}>
        {/* Botão principal (abre/fecha o popover) */}
        <button
          onClick={toggle}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s',
          }}
          aria-label="Redes sociais"
        >
          {open ? '✕' : '📱'}
        </button>

        {/* Popover com os links */}
        {open && (
          <div
            style={{
              position: 'absolute',
              bottom: '70px',
              right: '0',
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minWidth: '140px',
            }}
          >
            {/* Instagram */}
            <a
              href="https://instagram.com/streetmarketpt"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
                color: '#333',
                padding: '6px 8px',
                borderRadius: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span style={{ fontSize: '20px' }}>📸</span> Instagram
            </a>

            {/* Email – em vez de link, usa um botão para copiar */}
            <button
              onClick={() => handleCopyEmail('streetmarketptt@gmail.com')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
                color: '#333',
                padding: '6px 8px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 'inherit',
                fontFamily: 'inherit',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span style={{ fontSize: '20px' }}>✉️</span> Email
            </button>
          </div>
        )}
      </div>

      {/* Estilos para a animação do toast */}
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(10px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>
    </>
  );
}